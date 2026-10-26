// Discover tab (modelled on Sheng's Discover, SPEC §3.1), top to bottom exactly as Sheng:
// floating album-cover collage with the profile button, editorial hero, Concerts / Assistant
// buttons, "Today's Pick" masonry (work cards + concert programmes, chosen deterministically
// per day), "Widely Loved" (story-style auto-advancing categories) and "New on Record"
// (Apple Music Switzerland classical chart; tapping an album plays its preview, as in Sheng).
// No social features; everything is local.
//
// Route: #/discover  → render() (header: false; the page draws its own top area).

import { h, icon, toast, TYPE_LABELS } from '../util.js';
import * as repo from '../repo.js';
import * as store from '../store.js';
import { player, playerState, classicalChart, searchAlbums, albumTracks, ITUNES_CREDIT, classicalSearchURL } from '../music.js';
import { chosenTracks } from '../ui/listen.js';
import '../ui/player.js'; // side effect: lets the full player record each queue for "Up next"
import { href, avatar, venueLabel } from '../ui/components.js';
import { todayKey, addDays, daysBetween, weekdayOf, monthShort, dayNum, yearOf, timeOf, relDayLabel, isPast } from '../time.js';

const WEEKDAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAY_CAPS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const WORK_CARDS = 7; // Sheng: ~7 single works …
const PROGRAMME_CARDS = 6; // … and ~6 concert programmes
const PROGRAMME_WORKS = 3; // works shown (and played) per programme card
const ADVANCE_MS = 6000; // Widely Loved: one category per 6 s (the progress bar runs this long)

const CATS = [
  { id: 'solo', label: 'Solo', genres: ['solo', 'piano'] },
  { id: 'symphonic', label: 'Symphonic', genres: ['symphony', 'concerto', 'orchestral'] },
  { id: 'chamber', label: 'Chamber', genres: ['chamber'] },
  { id: 'vocal', label: 'Vocal', genres: ['song', 'opera', 'sacred'] },
];

// Collage slots, measured from Sheng's header (five covers clustered right of centre, the
// largest first so the chart's #1 gets it): x = centre in % of width, y = top in px,
// s = size px, r = tilt, ry = 3D turn, z = stacking, d = float delay.
const SLOTS = [
  { x: 62.8, y: 41, s: 99, r: 1, ry: -9, z: 2, d: 1.2 },
  { x: 39.4, y: 18, s: 63, r: -2, ry: 12, z: 1, d: 0 },
  { x: 46.4, y: 105, s: 70, r: -2, ry: 10, z: 3, d: 2.1 },
  { x: 85.6, y: 39, s: 52, r: 3, ry: -14, z: 1, d: 0.6 },
  { x: 82.4, y: 136, s: 47, r: -3, ry: -12, z: 2, d: 1.7 },
];

// ---------- small helpers ----------
function hashStr(s) {
  let x = 2166136261;
  for (let i = 0; i < s.length; i++) {
    x ^= s.charCodeAt(i);
    x = Math.imul(x, 16777619);
  }
  return x >>> 0;
}

function mulberry32(a) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(rng, arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const fmtN = (n) => n.toLocaleString('en-US');
const titleOf = (w) => (w.catalog && !w.title.includes(w.catalog) ? `${w.title}, ${w.catalog}` : w.title);
const svg = (markup, cls = '') => h('span', { class: `dc-svg ${cls}`.trim(), 'aria-hidden': 'true', html: markup });
const TRI = '<svg width="8" height="9" viewBox="0 0 8 9"><path d="M1 1v7l6-3.5z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>';
const BARS = '<svg width="8" height="9" viewBox="0 0 8 9"><path d="M1 1h2v7H1zM5 1h2v7H5z" fill="currentColor"/></svg>';
const RING = '<svg width="9" height="9" viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="15 9" stroke-linecap="round"/></svg>';

// Content files are written in parallel; a missing or broken one must not break Discover.
async function loadContent() {
  const [ed, gd] = await Promise.allSettled([import('../content/editorials.js'), import('../content/guides.js')]);
  const articles = ed.status === 'fulfilled' && Array.isArray(ed.value.ARTICLES) ? ed.value.ARTICLES : [];
  const loved = gd.status === 'fulfilled' && gd.value.WIDELY_LOVED && typeof gd.value.WIDELY_LOVED === 'object' ? gd.value.WIDELY_LOVED : {};
  return { articles, loved };
}

function workCounts(list) {
  const counts = new Map();
  for (const c of list) {
    if (c.status === 'cancelled') continue;
    for (const id of new Set(c.program.map((p) => p.workId).filter(Boolean))) counts.set(id, (counts.get(id) || 0) + 1);
  }
  return counts;
}

const liveOn = (list, day) => list.filter((c) => c.day === day && c.status !== 'cancelled' && !isPast(c.start, c.durationMin || 120));

// ---------- top: collage + profile ----------
function topArea(chartP, fallbackTerm) {
  const collage = h('div', { class: 'dc-collage loading', 'aria-hidden': 'true' },
    SLOTS.map((s) => h('span', { class: 'dc-cover ph', style: slotStyle(s) })));
  const profile = h('a', { class: 'dc-profile', href: '#/me', 'aria-label': 'Me' }, icon('person', 20));
  const top = h('div', { class: 'dc-top' }, collage, profile);

  const fill = (albums) => {
    const covers = albums.filter((a) => a.artwork).slice(0, SLOTS.length);
    if (covers.length < 3) throw new Error('not enough covers');
    collage.replaceChildren(...covers.map((a, i) => {
      const img = h('img', { class: 'dc-cover', src: a.artwork, alt: '', loading: 'eager', decoding: 'async', style: slotStyle(SLOTS[i]) });
      img.addEventListener('error', () => img.remove());
      return img;
    }));
    collage.classList.remove('loading');
  };
  chartP
    .then(fill)
    .catch(() => searchAlbums(fallbackTerm, 10).then(fill))
    .catch(() => {
      collage.replaceChildren();
      collage.classList.remove('loading');
      top.classList.add('no-art');
    });
  return top;
}

function slotStyle(s) {
  return {
    left: `calc(${s.x}% - ${s.s / 2}px)`, top: `${s.y}px`, width: `${s.s}px`, height: `${s.s}px`, zIndex: String(s.z || 1),
    transform: `perspective(420px) rotateY(${s.ry}deg) rotate(${s.r}deg)`, animationDelay: `${-s.d}s`,
  };
}

// ---------- editorial hero ----------
function newestArticle(articles, today) {
  const list = articles.filter((a) => a && a.id && a.title);
  if (!list.length) return null;
  const sorted = [...list].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  return sorted.find((a) => !a.date || a.date <= today) || sorted[sorted.length - 1];
}

function notableConcert(upcomingList, today) {
  const score = (c) => {
    const v = repo.venue(c.venueId);
    const city = repo.city(c.cityId);
    return (c.featured ? 3 : 0) + (c.type === 'orchestral' || c.type === 'vocal-opera' ? 2 : 0) +
      (v && (v.kind === 'hall' || v.kind === 'opera') ? 1.5 : 0) + Math.min(2, (city?.snapshot || 0) / 120) +
      Math.min(1, (c.program?.length || 0) / 3);
  };
  for (let d = 0; d < 7; d++) {
    const day = addDays(today, d);
    const list = liveOn(upcomingList, day);
    if (list.length) return [...list].sort((a, b) => score(b) - score(a) || a.id.localeCompare(b.id))[0];
  }
  return null;
}

function heroBlock(articles, upcomingList, today) {
  const art = newestArticle(articles, today);
  if (art) {
    return h('a', { class: 'dc-hero', href: `#/article/${encodeURIComponent(art.id)}` },
      h('div', { class: 'dc-kicker' }, h('i', {}, '◆'), 'Editorial'),
      h('h1', { class: 'dc-hero-title' }, art.title),
      art.dek ? h('p', { class: 'dc-hero-dek' }, art.dek) : null);
  }
  const c = notableConcert(upcomingList, today);
  if (c) {
    const items = repo.programItems(c);
    const rel = relDayLabel(c.day, today);
    const hour = Number(timeOf(c.start).slice(0, 2));
    const when = c.day === today ? (hour >= 17 ? 'Tonight' : 'Today') : rel;
    const cityName = repo.city(c.cityId)?.name;
    const lead = items.find((it) => it.work?.blurb);
    const names = [...new Set(items.map((it) => it.composerShort).filter(Boolean))].slice(0, 3);
    const dek = [
      names.length ? `${names.join(', ')} at ${venueLabel(c)}, ${timeOf(c.start)}.` : `${venueLabel(c)}, ${timeOf(c.start)}.`,
      lead ? lead.work.blurb : null,
    ].filter(Boolean).join(' ');
    return h('a', { class: 'dc-hero', href: href.concert(c.id) },
      h('div', { class: 'dc-kicker' }, h('i', {}, '◆'), [when, cityName].filter(Boolean).join(' · ')),
      h('h1', { class: 'dc-hero-title' }, c.title),
      h('p', { class: 'dc-hero-dek' }, dek));
  }
  return h('a', { class: 'dc-hero', href: '#/me/data' },
    h('div', { class: 'dc-kicker' }, h('i', {}, '◆'), 'Welcome'),
    h('h1', { class: 'dc-hero-title' }, 'Classical concerts across Switzerland'),
    h('p', { class: 'dc-hero-dek' }, 'Import concert listings or turn on the demo programme to fill your calendar, then save, plan and listen ahead.'));
}

function bigButtons(upcomingCount) {
  return h('div', { class: 'dc-buttons' },
    h('a', { class: 'dc-btn red', href: '#/concerts' },
      h('span', { class: 'l' }, icon('calendar', 17), 'Concerts'),
      h('span', { class: 's' }, `• ${fmtN(upcomingCount)} upcoming`)),
    h('a', { class: 'dc-btn dark', href: '#/search' },
      h('span', { class: 'l' }, svg(ORB, 'dc-orb'), 'Assistant'),
      h('span', { class: 's' }, 'Ask or search')));
}

// Sheng's Assistant glyph: a red ring with a small dot inside.
const ORB = '<svg width="19" height="19" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8.3" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="8.1" cy="8.1" r="2.1" fill="currentColor"/></svg>';

// ---------- Today's Pick ----------
function buildPicks(today, upcomingList, counts) {
  const rng = mulberry32(hashStr(`klang-pick-${today}`));
  const md = today.slice(5);
  const popular = new Set([...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 12).map(([id]) => id));
  const tonight = new Set(liveOn(upcomingList, today).flatMap((c) => c.program.map((p) => p.workId)).filter(Boolean));
  const usedWorks = new Set();
  const usedComposers = new Set();
  const works = [];
  const add = (w, badge = null) => {
    if (!w || usedWorks.has(w.id) || works.length >= WORK_CARDS) return;
    usedWorks.add(w.id);
    usedComposers.add(w.composerId);
    works.push({ kind: 'work', work: w, badge });
  };
  const byCount = (a, b) => (counts.get(b.id) || 0) - (counts.get(a.id) || 0) || a.id.localeCompare(b.id);

  // birthdays first (Sheng's "🎂 Age 188")
  for (const comp of repo.allComposers().filter((c) => c.bornDate === md && c.born).slice(0, 2)) {
    const ws = repo.worksOf(comp.id).sort(byCount);
    const w = ws.find((x) => !x.opera && x.minutes <= 60) || ws[0];
    add(w, { kind: 'age', n: yearOf(today) - comp.born });
  }
  // two or three of the most performed works
  for (const id of shuffle(rng, [...popular]).slice(0, 3)) {
    const w = repo.work(id);
    if (w && !usedComposers.has(w.composerId)) add(w);
  }
  // one work that is on stage tonight
  const tn = shuffle(rng, [...tonight]).map((id) => repo.work(id)).find((w) => w && !usedComposers.has(w.composerId));
  add(tn);
  // fill with shorter, listenable pieces from different composers
  const pool = shuffle(rng, repo.allWorks().filter((w) => !w.opera && w.minutes && w.minutes <= 45));
  for (const w of pool) if (!usedComposers.has(w.composerId)) add(w);
  for (const w of pool) add(w);

  // badges like Sheng's mix: age > ♥ Popular (two at most) > ☀ weekday (works on stage today,
  // two at most; otherwise one "today's" pick) — the rest stay plain.
  const wdLabel = WEEKDAY_CAPS[weekdayOf(today)];
  let popularLeft = 2;
  let weekdayLeft = 2;
  for (const p of works) {
    if (p.badge) continue;
    if (popular.has(p.work.id) && popularLeft > 0) {
      p.badge = { kind: 'popular' };
      popularLeft--;
    } else if (tonight.has(p.work.id) && weekdayLeft > 0) {
      p.badge = { kind: 'weekday', label: wdLabel, onStage: true };
      weekdayLeft--;
    }
  }
  const plain = works.filter((p) => !p.badge);
  if (weekdayLeft === 2 && plain.length) plain[Math.floor(rng() * plain.length)].badge = { kind: 'weekday', label: wdLabel };
  const ordered = shuffle(rng, works);

  // programme cards: tonight's (then the next days') concerts, distinct cities
  const programmes = [];
  const cities = new Set();
  for (let d = 0; d < 7 && programmes.length < PROGRAMME_CARDS; d++) {
    const day = addDays(today, d);
    const list = shuffle(rng, liveOn(upcomingList, day).filter((c) => (c.program?.length || 0) >= 2));
    for (const pass of [0, 1]) {
      for (const c of list) {
        if (programmes.length >= PROGRAMME_CARDS) break;
        if (programmes.some((p) => p.concert.id === c.id)) continue;
        if (pass === 0 && cities.has(c.cityId)) continue;
        const items = repo.programItems(c).filter((it) => it.composerShort || it.title);
        if (items.length < 2) continue;
        cities.add(c.cityId);
        // Sheng shows a few works per programme and the chip times exactly those (e.g. 49 min)
        const shown = items.slice(0, PROGRAMME_WORKS);
        const playable = shown.map((it) => it.work).filter(Boolean);
        programmes.push({
          kind: 'programme', concert: c, items: shown,
          works: playable,
          minutes: playable.reduce((s, w) => s + (w.minutes || 0), 0),
        });
      }
    }
  }

  // Sheng: single works first, then programmes woven in
  const out = ordered.slice(0, 6);
  const rest = ordered.slice(6);
  programmes.forEach((p, i) => {
    out.push(p);
    if (rest[i]) out.push(rest[i]);
  });
  out.push(...rest.slice(programmes.length));
  return out;
}

// First-paint guess of a card's height (px); the real masonry is laid out from measured heights.
const lineCount = (s, per) => Math.max(1, Math.ceil(String(s || '').length / per));
function estimate(item) {
  if (item.kind === 'work') return 40 + (item.badge ? 23 : 0) + 24 + lineCount(titleOf(item.work), 23) * 18.5 + 33;
  return 40 + 21 + item.items.reduce((s, it) => s + 30 + lineCount(it.title, 23) * 18.5, 0) + 38 + 19;
}

function badgeEl(b, today) {
  if (!b) return null;
  if (b.kind === 'popular') return h('div', { class: 'dc-badge popular' }, icon('heart', 13), 'Popular');
  if (b.kind === 'age') return h('div', { class: 'dc-badge age' }, h('span', {}, icon('cake', 13), `Age ${b.n}`));
  if (b.kind === 'weekday') {
    const title = b.onStage ? 'On stage in Switzerland today' : `${WEEKDAY_LONG[weekdayOf(today)]} pick`;
    return h('div', { class: 'dc-badge gold', title }, h('i', { class: 'dc-sun', 'aria-hidden': 'true' }), b.label);
  }
  return null;
}

// Two-column masonry like Sheng: cards in order, each into the shorter column. Placed by
// estimate first, then re-laid out from measured heights whenever the width changes (watched on
// `probe`, an element as wide as the grid whose size the re-layout itself never changes).
function masonry(cards, estimates, probe) {
  const cols = [h('div', { class: 'dc-col' }), h('div', { class: 'dc-col' })];
  const place = (heights) => {
    const t = [0, 0];
    cols.forEach((c) => c.replaceChildren());
    cards.forEach((card, i) => {
      const k = t[0] <= t[1] ? 0 : 1;
      cols[k].append(card);
      t[k] += heights[i];
    });
  };
  place(estimates);
  const el = h('div', { class: 'dc-masonry' }, cols);
  let lastW = 0;
  const relayout = (force = false) => {
    const w = cols[0].clientWidth;
    if (!w || (!force && w === lastW)) return;
    lastW = w;
    place(cards.map((c) => c.offsetHeight));
  };
  let ro = null;
  if (typeof ResizeObserver === 'function') {
    ro = new ResizeObserver(() => relayout());
    ro.observe(probe);
  }
  document.fonts?.ready?.then(() => el.isConnected && relayout(true)).catch(() => {});
  return { el, cleanup: () => ro?.disconnect() };
}

function todaysPick(today, upcomingList, counts, playback) {
  const items = buildPicks(today, upcomingList, counts);
  const cards = items.map((it) => (it.kind === 'work' ? workCard(it, today, playback) : programmeCard(it, today, playback)));
  const wd = WEEKDAY_LONG[weekdayOf(today)];
  const sub = h('p', { class: 'dc-sub' }, `Tap a work for details. Today is ${monthShort(today)} ${dayNum(today)}, ${wd}`);
  const grid = masonry(cards, items.map(estimate), sub);
  const el = h('section', { class: 'dc-section dc-pick' },
    h('h2', { class: 'dc-h2 sans' }, 'Today\'s Pick'),
    sub,
    grid.el);
  return { el, cleanup: grid.cleanup };
}

function workCard(it, today, playback) {
  const w = it.work;
  const comp = repo.composer(w.composerId);
  const fav = comp && store.isFollowing('composer', comp.id);
  return h('a', { class: 'dc-card', href: href.work(w.id) },
    badgeEl(it.badge, today),
    h('div', { class: 'dc-comp' }, comp?.short || comp?.name || '', fav ? icon('heart', 11, 'dc-fav') : null),
    h('div', { class: 'dc-work' }, titleOf(w)),
    w.minutes ? playback.chip(`w:${w.id}`, [w], `${w.minutes} min`, `${comp?.short || ''} — ${w.title}`, 'red') : null);
}

// Programme card: type label, composer + work(s) — consecutive works by one composer share
// the name, as in Sheng — a white duration chip that plays them, and the city.
function programmeCard(it, today, playback) {
  const c = it.concert;
  const groups = [];
  for (const p of it.items) {
    const name = p.composerShort || p.composerName;
    const last = groups[groups.length - 1];
    if (last && name && last.name === name) last.items.push(p);
    else groups.push({ name, items: [p] });
  }
  const cityName = repo.city(c.cityId)?.name || '';
  const when = c.day === today ? `Today, ${timeOf(c.start)}` : `${relDayLabel(c.day, today)}, ${timeOf(c.start)}`;
  return h('a', { class: 'dc-card prog', href: href.concert(c.id), title: [c.title, when].filter(Boolean).join(' · ') },
    h('div', { class: 'dc-type' }, (TYPE_LABELS[c.type] || 'concert').toLowerCase()),
    groups.map((g) => h('div', { class: 'dc-pair' },
      g.name ? h('div', { class: 'dc-comp' }, g.name) : null,
      g.items.map((p) => (p.title ? h('div', { class: 'dc-work' }, p.work ? titleOf(p.work) : [p.title, p.catalog].filter(Boolean).join(', ')) : null)))),
    it.works.length ? playback.chip(`c:${c.id}`, it.works, it.minutes ? `${it.minutes} min` : 'Listen', c.title, 'white') : null,
    cityName ? h('div', { class: 'dc-city' }, cityName) : null);
}

// Preview playback for pick chips: first matching recording of each work (the user's chosen
// version, see listen.js), queued as one playlist. Chips mirror the player state.
// key -> Set<trackId>; module-level so a pick that is still playing shows as playing on return.
const trackIds = new Map();

function makePlayback() {
  const chips = new Map(); // key -> Set<el>
  let loadingKey = null;

  function stateOf(key, st) {
    if (loadingKey === key) return 'loading';
    const ids = trackIds.get(key);
    if (st.track && ids && ids.has(st.track.id)) return st.playing ? 'playing' : 'paused';
    return 'idle';
  }

  function paint(st = playerState()) {
    for (const [key, set] of chips) {
      const s = stateOf(key, st);
      for (const el of set) {
        if (el.dataset.state === s) continue;
        el.dataset.state = s;
        el.querySelector('.dc-svg')?.replaceWith(svg(s === 'loading' ? RING : s === 'playing' ? BARS : TRI, s === 'loading' ? 'spin' : ''));
        el.setAttribute('aria-label', `${s === 'playing' ? 'Pause' : 'Play'} preview: ${el.dataset.label}`);
      }
    }
  }

  async function start(key, works, label) {
    const st = playerState();
    const ids = trackIds.get(key);
    if (st.track && ids && ids.has(st.track.id)) {
      player.toggle();
      return;
    }
    if (loadingKey === key) return;
    loadingKey = key;
    paint();
    let queue = [];
    let started = false;
    try {
      for (const w of works) {
        let res;
        try {
          res = await chosenTracks(w);
        } catch {
          continue;
        }
        const tracks = (res?.tracks || []).filter((t) => t.preview);
        if (!tracks.length) continue;
        queue = queue.concat(tracks);
        trackIds.set(key, new Set(queue.map((t) => t.id)));
        if (!started) {
          if (loadingKey !== key) return; // the user started something else meanwhile
          started = true;
          loadingKey = null;
          player.play(tracks[0], queue);
          toast(`30-second preview · ${label}`);
        } else {
          const now = playerState();
          if (now.playing && now.track && queue.some((t) => t.id === now.track.id)) player.play(now.track, queue);
          else break;
        }
      }
      if (!started && loadingKey === key) toast('No preview found — open the work for more recordings');
    } finally {
      if (loadingKey === key) loadingKey = null;
      paint();
    }
  }

  function chip(key, works, text, label, tone) {
    const el = h('span', { class: `dc-chip ${tone}`, role: 'button', tabindex: '0', dataset: { label } }, text, ' ', svg(TRI));
    const go = (e) => {
      e.preventDefault();
      e.stopPropagation();
      start(key, works, label);
    };
    el.addEventListener('click', go);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') go(e);
    });
    if (!chips.has(key)) chips.set(key, new Set());
    chips.get(key).add(el);
    return el;
  }

  const unsub = player.subscribe((st) => paint(st));
  return { chip, paint, cleanup: () => unsub() };
}

// ---------- Widely Loved ----------
function normEntry(e) {
  if (!e) return null;
  if (typeof e === 'string') return { workId: e, hook: null };
  const workId = e.workId || (typeof e.work === 'string' ? e.work : e.work?.id) || e.id;
  return workId ? { workId, hook: e.hook || e.listenFor || e.quote || e.text || null } : null;
}

function lovedPick(cat, loved, counts, dayIdx) {
  const raw = Array.isArray(loved?.[cat.id]) ? loved[cat.id] : [];
  const entries = raw.map(normEntry).filter((e) => e && repo.work(e.workId));
  if (entries.length) {
    const e = entries[dayIdx % entries.length];
    const w = repo.work(e.workId);
    return { work: w, hook: e.hook || w.blurb };
  }
  const pool = repo.allWorks().filter((w) => cat.genres.includes(w.genre))
    .sort((a, b) => (counts.get(b.id) || 0) - (counts.get(a.id) || 0) || a.id.localeCompare(b.id)).slice(0, 5);
  if (!pool.length) return null;
  const w = pool[dayIdx % pool.length];
  return { work: w, hook: w.blurb };
}

// Sheng's Widely Loved: four story-style segments (a progress bar over each label) that
// auto-advance; tapping a label or swiping the card picks one and stops the advance. All four
// cards share one grid cell, so the section keeps the tallest card's height and the page below
// doesn't jump when the category changes.
function widelyLoved(loved, counts, today) {
  const dayIdx = Math.max(0, daysBetween('2026-01-01', today));
  const picks = CATS.map((cat) => ({ cat, pick: lovedPick(cat, loved, counts, dayIdx) })).filter((x) => x.pick);
  const section = h('section', { class: 'dc-section dc-loved hold' });
  section.style.setProperty('--dc-advance', `${ADVANCE_MS}ms`);
  if (!picks.length) return { el: section, cleanup() {} };

  let idx = 0;
  let hovering = false;
  let visible = typeof IntersectionObserver !== 'function';
  const tabs = h('div', { class: 'dc-tabs', role: 'tablist' });
  const stage = h('div', { class: 'dc-wl-stage', 'aria-live': 'polite' });

  const card = ({ pick }) => {
    const w = pick.work;
    const comp = repo.composer(w.composerId);
    const n = repo.upcoming({ workId: w.id }).length;
    let hook = String(pick.hook || '').trim();
    hook = hook.replace(/^[“"]+|[”"]+$/g, '');
    return h('a', { class: 'dc-wl-card', href: href.work(w.id) },
      h('div', { class: 'dc-wl-head' },
        avatar(comp?.name || w.title, true, comp?.id),
        h('div', { class: 'dc-wl-names' },
          h('div', { class: 'dc-wl-title' }, titleOf(w)),
          h('div', { class: 'dc-wl-comp' }, comp?.name || ''))),
      hook ? h('div', { class: 'dc-wl-hook' }, h('span', { class: 'q', 'aria-hidden': 'true' }, '“'), h('p', {}, hook)) : null,
      h('div', { class: 'dc-wl-count' }, n ? [h('b', {}, fmtN(n)), ` upcoming performance${n === 1 ? '' : 's'}`] : 'Not on stage in Switzerland right now'));
  };
  const cards = picks.map(card);
  stage.append(...cards);

  // the bar (and so the advance) holds while the mouse is over the section or it's off screen;
  // a hidden tab needs no check — the bar just finishes and advances once when you come back
  const updateHold = () => section.classList.toggle('hold', hovering || !visible);
  const stop = () => section.classList.add('paused');

  const show = (i, animate = true) => {
    idx = (i + picks.length) % picks.length;
    [...tabs.children].forEach((b, j) => {
      b.classList.toggle('active', j === idx);
      b.classList.toggle('done', j < idx);
      b.setAttribute('aria-selected', j === idx ? 'true' : 'false');
    });
    cards.forEach((c, j) => {
      const on = j === idx;
      c.classList.toggle('on', on);
      c.toggleAttribute('inert', !on);
      c.classList.remove('enter');
      if (on && animate) {
        void c.offsetWidth; // restart the fade-in
        c.classList.add('enter');
      }
    });
  };

  picks.forEach(({ cat }, i) => {
    const fill = h('i');
    // the active segment's bar runs for ADVANCE_MS; when it fills, move on (pauses with it)
    fill.addEventListener('animationend', () => {
      if (i === idx && !section.classList.contains('paused')) show(idx + 1);
    });
    tabs.append(h('button', {
      type: 'button', role: 'tab', class: 'dc-tab',
      onclick: () => {
        stop();
        show(i);
      },
    }, h('span', { class: 'bar', 'aria-hidden': 'true' }, fill), h('span', { class: 'lbl' }, cat.label)));
  });
  if (picks.length < 2) stop();

  // swipe between categories
  let sx = null;
  let sy = null;
  let swiped = false;
  stage.addEventListener('pointerdown', (e) => {
    sx = e.clientX;
    sy = e.clientY;
    swiped = false;
  });
  stage.addEventListener('pointerup', (e) => {
    if (sx == null) return;
    const dx = e.clientX - sx;
    const dy = e.clientY - sy;
    sx = null;
    if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      swiped = true;
      stop();
      show(idx + (dx < 0 ? 1 : -1));
    }
  });
  stage.addEventListener('click', (e) => {
    if (swiped) {
      e.preventDefault();
      swiped = false;
    }
  }, true);
  section.addEventListener('pointerenter', (e) => {
    if (e.pointerType === 'mouse') {
      hovering = true;
      updateHold();
    }
  });
  section.addEventListener('pointerleave', () => {
    hovering = false;
    updateHold();
  });
  section.addEventListener('focusin', stop);

  let io = null;
  if (!visible) {
    io = new IntersectionObserver((entries) => {
      visible = entries.some((en) => en.isIntersecting);
      updateHold();
    }, { threshold: 0.4 });
    io.observe(section);
  }

  section.append(
    h('div', { class: 'dc-head-row' }, h('h2', { class: 'dc-h2' }, 'Widely Loved'), h('span', { class: 'dc-newcomers' }, 'Good for newcomers')),
    tabs, stage);
  show(0, false);
  updateHold();
  return {
    el: section,
    cleanup() {
      io?.disconnect();
    },
  };
}

// ---------- New on Record ----------
// albumId -> Set<trackId> of the previews queued from it (module-level: survives re-renders)
const albumTrackIds = new Map();

// Sheng: tapping an album starts playback. Here: its 30-second previews, queued in order.
// Cmd/Ctrl/middle-click still opens the album in Apple Music.
async function playAlbum(a, el) {
  const st = playerState();
  const ids = albumTrackIds.get(a.id);
  if (st.track && ids && ids.has(st.track.id)) {
    player.toggle();
    return;
  }
  if (el.classList.contains('loading')) return;
  el.classList.add('loading');
  try {
    const res = await albumTracks(a.id);
    const tracks = (res?.tracks || []).filter((t) => t.preview);
    if (!tracks.length) throw new Error('no previews');
    albumTrackIds.set(a.id, new Set(tracks.map((t) => t.id)));
    player.play(tracks[0], tracks);
    toast(`30-second preview · ${a.title}`);
  } catch {
    toast('No preview for this album — Cmd/Ctrl-click opens it in Apple Music');
  } finally {
    el.classList.remove('loading');
  }
}

function newOnRecord(chartP) {
  const strip = h('div', { class: 'h-scroll dc-records', 'aria-label': 'New classical albums' });
  const section = h('section', { class: 'dc-section dc-new' }, h('h2', { class: 'dc-h2' }, 'New on Record'), strip);
  const albums = new Map(); // album id -> element

  const paintState = (st = playerState()) => {
    for (const [id, el] of albums) {
      const ids = albumTrackIds.get(id);
      const mine = !!(st.track && ids && ids.has(st.track.id));
      el.dataset.state = mine ? (st.playing ? 'playing' : 'paused') : 'idle';
    }
  };

  const skeleton = () => strip.replaceChildren(...Array.from({ length: 4 }, () => h('div', { class: 'dc-album' }, h('div', { class: 'art skeleton' }),
    h('div', { class: 'skeleton dc-line' }), h('div', { class: 'skeleton dc-line short' }))));

  const paint = (list0) => {
    const list = list0.filter((a) => a.title);
    if (!list.length) throw new Error('empty chart');
    albums.clear();
    strip.replaceChildren(...list.map((a) => {
      const el = h('a', { class: 'dc-album', href: a.url || '#', target: '_blank', rel: 'noopener', title: `${a.title} — ${a.artist || ''}` },
        h('span', { class: 'art-wrap' },
          a.artwork ? h('img', { class: 'art', src: a.artwork, alt: '', loading: 'lazy', decoding: 'async' }) : h('div', { class: 'art ph' }, icon('album', 28)),
          svg(BARS, 'dc-album-state')),
        h('div', { class: 't' }, a.title),
        h('div', { class: 's' }, a.artist || ''));
      el.addEventListener('click', (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0 || !a.id) return; // let the browser open Apple Music
        e.preventDefault();
        playAlbum(a, el);
      });
      albums.set(a.id, el);
      return el;
    }));
    paintState();
  };

  const fail = () => {
    const retry = h('button', { class: 'dc-retry', type: 'button' }, icon('versions', 14), 'Retry');
    retry.addEventListener('click', () => {
      skeleton();
      classicalChart(20).then(paint).catch(fail);
    });
    strip.replaceChildren(h('div', { class: 'dc-offline' }, h('span', {}, 'Couldn’t reach the Apple Music chart.'), retry));
  };

  skeleton();
  chartP.then(paint).catch(fail);
  const unsub = player.subscribe((st) => paintState(st));
  return { el: section, cleanup: () => unsub() };
}

// Small print at the very end of the page (Sheng has none; Apple's terms want the iTunes credit
// wherever previews play, so it sits below the last section instead of between them).
function footnote() {
  return h('p', { class: 'dc-credit dc-foot' }, 'New on Record: Apple Music Switzerland classical chart. ', ITUNES_CREDIT, ' ',
    h('a', { href: classicalSearchURL('classical'), target: '_blank', rel: 'noopener' }, 'Open Apple Music Classical'), '.');
}

// ---------- page ----------
export async function render() {
  const { articles, loved } = await loadContent();
  const today = todayKey();
  const upcomingList = repo.upcoming();
  const counts = workCounts(upcomingList);
  const playback = makePlayback();

  // one chart request feeds both the collage and New on Record
  const chartP = classicalChart(20);
  chartP.catch(() => {}); // handled by each consumer

  const firstWork = repo.allWorks().find((w) => counts.has(w.id)) || repo.allWorks()[0];
  const pick = todaysPick(today, upcomingList, counts, playback);
  const loveBlock = widelyLoved(loved, counts, today);
  const records = newOnRecord(chartP);

  const body = h('div', { class: 'discover' },
    topArea(chartP, firstWork?.q || 'Beethoven symphony'),
    heroBlock(articles, upcomingList, today),
    bigButtons(upcomingList.length),
    pick.el,
    loveBlock.el,
    records.el,
    footnote());
  playback.paint();

  return {
    title: 'Discover',
    header: false,
    body,
    cleanup() {
      pick.cleanup();
      loveBlock.cleanup();
      records.cleanup();
      playback.cleanup();
    },
  };
}
