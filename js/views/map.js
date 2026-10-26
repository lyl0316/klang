// Cities tab — a schematic bubble map of Switzerland (one bubble per city, sized by its
// upcoming concerts), a card for the tapped city, and the full list of cities by size or
// grouped by canton.

import { h, icon, plural } from '../util.js';
import * as repo from '../repo.js';
import * as store from '../store.js';
import { href, followButton, rowItem, segmented, sectionHead, venueLabel } from '../ui/components.js';
import { SWISS_OUTLINE } from '../data/cities.js';
import { relDayLabel, timeOf, isPast } from '../time.js';

const NS = 'http://www.w3.org/2000/svg';
const VW = 360;
const VH = 240;
const PAD = { top: 12, right: 12, bottom: 24, left: 12 }; // bottom leaves room for the caption
const K = Math.cos((46.8 * Math.PI) / 180); // longitude scale at Switzerland's mid-latitude
const LABEL_MIN = 40; // always label cities with at least this many upcoming concerts
const TAP_SLOP = 10; // viewBox units around a bubble that still count as a tap on it

// Kept across re-renders within the session.
let selectedId = null;
let listMode = 'size';

// Minimal SVG element builder (h() only builds HTML elements).
function svg(tag, attrs = {}, ...children) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v);
  }
  for (const c of children) if (c != null) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return el;
}

const r1 = (v) => Math.round(v * 10) / 10;
const radius = (n) => (n > 0 ? 3 + 2.2 * Math.sqrt(n) : 3);

// Equirectangular projection, longitude scaled by cos(46.8°), fitted and centred in the viewBox.
function makeProjection(cities) {
  const pts = [...SWISS_OUTLINE, ...cities.map((c) => [c.lon, c.lat])];
  const lons = pts.map((p) => p[0]);
  const lats = pts.map((p) => p[1]);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const w = VW - PAD.left - PAD.right;
  const ht = VH - PAD.top - PAD.bottom;
  const spanX = (maxLon - minLon) * K;
  const spanY = maxLat - minLat;
  const s = Math.min(w / spanX, ht / spanY);
  const ox = PAD.left + (w - spanX * s) / 2;
  const oy = PAD.top + (ht - spanY * s) / 2;
  return (lon, lat) => [ox + (lon - minLon) * K * s, oy + (maxLat - lat) * s];
}

export function render() {
  const cities = repo.allCities();
  const counts = repo.cityCounts();
  const countOf = (id) => counts.get(id) || 0;
  const total = cities.reduce((sum, c) => sum + countOf(c.id), 0);
  const active = cities.filter((c) => countOf(c.id) > 0).length;
  if (selectedId && !repo.city(selectedId)) selectedId = null;

  // ---------- map ----------
  const project = makeProjection(cities);
  const outlineD = `${SWISS_OUTLINE.map(([lon, lat], i) => {
    const [x, y] = project(lon, lat);
    return `${i ? 'L' : 'M'}${r1(x)} ${r1(y)}`;
  }).join(' ')} Z`;

  // Largest first so small bubbles sit on top and stay tappable.
  const nodes = cities
    .map((city) => {
      const [x, y] = project(city.lon, city.lat);
      const n = countOf(city.id);
      return { city, id: city.id, x, y, n, r: radius(n), el: null };
    })
    .sort((a, b) => b.r - a.r || a.city.name.localeCompare(b.city.name));

  const bubbles = svg('g');
  const labels = svg('g', { 'aria-hidden': 'true' });
  for (const nd of nodes) {
    nd.el = svg('circle', {
      class: 'map-bubble', cx: r1(nd.x), cy: r1(nd.y), r: r1(nd.r),
      tabindex: '0', role: 'button',
      'aria-label': `${nd.city.name}: ${nd.n ? plural(nd.n, 'upcoming concert') : 'no upcoming concerts'}`,
      onkeydown: (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          select(nd.id);
        }
      },
    }, svg('title', {}, `${nd.city.name} · ${nd.n}`));
    bubbles.append(nd.el);
  }
  const map = svg('svg', {
    viewBox: `0 0 ${VW} ${VH}`, role: 'group',
    'aria-label': 'Schematic map of Switzerland. Bubble size shows upcoming concerts per city.',
  }, svg('path', { class: 'map-outline', d: outlineD }), bubbles, labels);

  // Tap → the smallest bubble containing the point, else the nearest bubble edge within TAP_SLOP.
  map.addEventListener('click', (e) => {
    const m = map.getScreenCTM();
    if (!m) return;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    let best = null;
    let bestScore = Infinity;
    for (const nd of nodes) {
      const d = Math.hypot(nd.x - p.x, nd.y - p.y);
      const score = d <= nd.r ? nd.r - 1000 : d - nd.r;
      if (score < bestScore) {
        bestScore = score;
        best = nd;
      }
    }
    if (best && bestScore <= TAP_SLOP) select(best.id);
  });

  function labelFor(nd) {
    const inside = nd.r >= 14;
    return svg('text', {
      class: ['map-label', inside && 'big', nd.id === selectedId && 'sel'].filter(Boolean).join(' '),
      x: r1(nd.x),
      y: r1(inside ? nd.y : nd.y - nd.r - 3),
      dy: inside ? '0.35em' : null,
      'text-anchor': 'middle',
    }, nd.city.name);
  }

  function paintBubbles() {
    for (const nd of nodes) {
      const cls = ['map-bubble', nd.n === 0 && 'zero', store.isFollowing('city', nd.id) && 'followed', nd.id === selectedId && 'selected'];
      nd.el.setAttribute('class', cls.filter(Boolean).join(' '));
      nd.el.setAttribute('aria-pressed', nd.id === selectedId ? 'true' : 'false');
    }
    labels.replaceChildren(...nodes.filter((nd) => nd.n >= LABEL_MIN || nd.id === selectedId).map(labelFor));
  }

  // ---------- selected city card ----------
  const cardWrap = h('div', { 'aria-live': 'polite' });
  function paintCard() {
    const c = repo.city(selectedId);
    if (!c) {
      cardWrap.replaceChildren(h('p', { class: 'map-hint' }, 'Tap a bubble to see a city.'));
      return;
    }
    const n = countOf(c.id);
    const next = n ? repo.upcoming({ cityIds: [c.id] }).find((x) => x.status !== 'cancelled' && !isPast(x.start, x.durationMin)) : null;
    cardWrap.replaceChildren(h('div', { class: 'city-card' },
      h('div', { class: 'top' },
        h('div', { class: 'grow' },
          h('div', { class: 'name' }, c.name),
          h('div', { class: 'canton' }, repo.cantonName(c.canton))),
        followButton('city', c.id),
        h('button', { class: 'icon-btn', 'aria-label': 'Clear selection', onclick: () => select(null) }, icon('close', 16))),
      h('div', { class: 'count' },
        n ? [h('b', {}, n.toLocaleString('en-US')), ` upcoming concert${n === 1 ? '' : 's'}`] : 'No upcoming concerts'),
      next ? h('div', { class: 'next' }, `Next: ${relDayLabel(next.day)} · ${timeOf(next.start)} · ${venueLabel(next)}`) : null,
      h('div', { class: 'btns' },
        h('a', {
          class: ['btn', 'small', n > 0 && 'primary'], href: '#/concerts',
          onclick: () => store.setFilters({ cityIds: [c.id], day: null, lookBack: false }),
        }, icon('calendar', 15), 'Concerts'),
        h('a', { class: 'btn small', href: href.city(c.id) }, icon('pin', 15), 'City page'))));
  }

  function select(id) {
    selectedId = id;
    paintBubbles();
    paintCard();
  }

  // ---------- city list ----------
  const segWrap = h('div', { class: 'cities-seg' });
  const listWrap = h('div');

  function paintSeg() {
    segWrap.replaceChildren(segmented([['size', 'By size'], ['canton', 'By canton']], listMode, (v) => {
      listMode = v;
      paintSeg();
      paintList();
    }));
  }

  function cityRow(c) {
    const n = countOf(c.id);
    const following = store.isFollowing('city', c.id);
    const row = rowItem({
      title: following ? [c.name, ' ', icon('star', 13, 'city-star')] : c.name,
      subtitle: listMode === 'size' ? repo.cantonName(c.canton) : null,
      to: href.city(c.id),
      right: n ? h('span', { class: 'city-count' }, n.toLocaleString('en-US')) : 'No upcoming',
    });
    if (!n) row.classList.add('dim');
    row.setAttribute('aria-label', `${c.name}${following ? ' (following)' : ''}: ${n ? plural(n, 'upcoming concert') : 'no upcoming concerts'}`);
    return row;
  }

  const bySize = (a, b) => countOf(b.id) - countOf(a.id) || a.name.localeCompare(b.name);

  function paintList() {
    if (listMode === 'size') {
      listWrap.replaceChildren(h('div', { class: 'group' }, [...cities].sort(bySize).map(cityRow)));
      return;
    }
    const groups = new Map();
    for (const c of cities) {
      if (!groups.has(c.canton)) groups.set(c.canton, []);
      groups.get(c.canton).push(c);
    }
    const cantons = [...groups.entries()]
      .map(([code, list]) => ({
        code,
        name: repo.cantonName(code),
        list: list.sort(bySize),
        total: list.reduce((sum, c) => sum + countOf(c.id), 0),
      }))
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
    listWrap.replaceChildren(...cantons.flatMap((k) => [
      h('div', { class: 'group-label split' },
        h('span', {}, k.name),
        h('span', {}, k.total ? plural(k.total, 'concert') : 'No upcoming')),
      h('div', { class: 'group' }, k.list.map(cityRow)),
    ]));
  }

  const unsub = store.subscribe((topic) => {
    if (topic === 'follows') {
      paintBubbles();
      paintList();
    }
  });

  paintBubbles();
  paintCard();
  paintSeg();
  paintList();

  return {
    title: 'Cities',
    largeTitle: true,
    body: h('div', { class: 'cities' },
      h('div', { class: 'map-wrap' },
        map,
        h('div', { class: 'map-caption' }, 'Schematic map · bubble size = upcoming concerts')),
      cardWrap,
      h('section', { class: 'section' },
        sectionHead('All cities'),
        h('p', { class: 'lead' }, `${plural(cities.length, 'city', 'cities')} · ${active} with concerts · ${plural(total, 'upcoming concert')}`),
        segWrap,
        listWrap)),
    cleanup: unsub,
  };
}
