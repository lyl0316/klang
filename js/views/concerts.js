// Concerts tab — the heart of the app (modelled on Sheng's Concerts tab, Switzerland only).
// Filter chips: Date (calendar → jump, or Look back for past days) · Location (cities / cantons
// with live counts) · Type · Featured only · Following. Month rail on the right edge.
// The list is grouped by day and rendered in chunks as you scroll.

import { h, icon, clear, toast, plural, TYPE_LABELS, normalize } from '../util.js';
import * as repo from '../repo.js';
import * as store from '../store.js';
import { openSheet } from '../ui/sheet.js';
import { concertCard, chip, emptyState } from '../ui/components.js';
import {
  todayKey, addDays, monthKeyOf, monthShort, monthLong, dayNum, weekdayShort, weekdayOf, daysBetween, relDayLabel,
} from '../time.js';
import { DEMO_PAST_START } from '../data/generate.js';

const CHUNK = 40;
const scrollMode = () => (document.visibilityState === 'visible' && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'auto');
const TYPES = ['recital', 'orchestral', 'chamber', 'vocal-opera', 'mixed'];
const f = store.filters;

// ---------- query helpers ----------
function followingFilter() {
  const venues = new Set(store.followed('venue'));
  const cities = new Set(store.followed('city'));
  const composers = new Set(store.followed('composer'));
  const artists = new Set(store.followed('artist'));
  const works = new Set(store.followed('work'));
  return (c) =>
    venues.has(c.venueId) || cities.has(c.cityId) ||
    c.program.some((p) => composers.has(p.composerId || repo.work(p.workId)?.composerId) || works.has(p.workId)) ||
    c.credits.some((cr) => artists.has(cr.artistId));
}

// base options shared by list, counts and rail (no date window)
function baseOpts(overrides = {}) {
  return { cityIds: f.cityIds, types: f.types, featuredOnly: f.featuredOnly, ...overrides };
}

function applyFollowing(list) {
  if (!f.following) return list;
  const keep = followingFilter();
  return list.filter(keep);
}

// Upcoming mode always lists from today; a picked date only *scrolls* the list (like Sheng).
// Look back lists from the picked past day up to yesterday.
function windowRange() {
  const today = todayKey();
  if (f.lookBack) return { from: f.day || addDays(today, -7), to: addDays(today, -1) };
  return { from: today, to: null };
}

function listConcerts() {
  const { from, to } = windowRange();
  return applyFollowing(repo.query({ ...baseOpts(), from, to }));
}

function countFor(overrides) {
  const { from, to } = windowRange();
  return applyFollowing(repo.query({ ...baseOpts(overrides), from, to })).length;
}

function defaultFilters() {
  return { day: null, lookBack: false, cityIds: [...(store.pref('regionCityIds') || [])], types: [], featuredOnly: true, following: false };
}

// ---------- chips ----------
// Sheng's filter chips: small dark pills "[icon] Label ⌄"; Date and Featured only turn white when set.
function dateLabel() {
  if (f.lookBack) return `${monthShort(f.day)} ${dayNum(f.day)}`;
  if (f.day && f.day > todayKey()) return `${monthShort(f.day)} ${dayNum(f.day)}`;
  return 'Date';
}
// SF Symbols-like "mappin.and.ellipse" (Sheng's location chip)
function locIcon(size = 13) {
  return h('span', {
    class: 'icon',
    'aria-hidden': 'true',
    html: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="6.5" r="3.5"/><path d="M12 10v8"/><ellipse cx="12" cy="18.5" rx="7.5" ry="2.5"/></svg>`,
  });
}
function calIcon(size = 13) {
  return h('span', {
    class: 'icon',
    'aria-hidden': 'true',
    html: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path d="M3.5 9.5h17"/></svg>`,
  });
}
function filterChip(label, { lead = null, caret = false, active = false, onClick, ariaLabel = null } = {}) {
  return h('button', {
    type: 'button',
    class: ['chip', 'cr-chip', active && 'active'],
    'aria-pressed': active ? 'true' : 'false',
    'aria-label': ariaLabel,
    onclick: onClick,
  }, lead, h('span', { class: 'lbl' }, label), caret ? icon('down', 10, 'caret') : null);
}
// Sheng's sheets: no close button (tap outside / swipe), rounded-rect CTA
function crSheet(sheet, cls) {
  sheet.el.classList.add('cr-sheet', cls);
  return sheet;
}
function searchField(onInput) {
  const input = h('input', { class: 'input', type: 'search', placeholder: 'Search cities', 'aria-label': 'Search cities', oninput: () => onInput(normalize(input.value)) });
  return h('label', { class: 'cr-search' }, icon('search', 14), input);
}
function locationLabel() {
  if (!f.cityIds.length) return 'Switzerland';
  if (f.cityIds.length === 1) return repo.city(f.cityIds[0])?.name || '1 city';
  return `${f.cityIds.length} cities`;
}
function typeLabel() {
  if (!f.types.length || f.types.length === TYPES.length) return 'All types';
  if (f.types.length === 1) return TYPE_LABELS[f.types[0]];
  return `${f.types.length} types`;
}

export function render() {
  const toolbar = h('div', { class: 'list-toolbar' });
  const listEl = h('div', { class: 'concert-list' });
  const rail = h('nav', { class: 'rail cr-rail', 'aria-label': 'Jump to month' });
  const bubble = h('div', { class: 'rail-bubble cr-bubble', hidden: true });
  document.body.append(rail, bubble);
  let observer = null;

  function paintToolbar() {
    // Like Sheng: Date · Location · All types · Featured only. The location chip stays dark even
    // when narrowed to a city; Klang's personal "Favourites" filter only appears once you have some.
    const showFav = !!f.following || store.followCount() > 0;
    clear(toolbar).append(
      h('div', { class: 'chip-row cr-chips' },
        filterChip(dateLabel(), { lead: calIcon(), caret: true, active: !!f.day, onClick: openDateSheet }),
        filterChip(locationLabel(), { lead: locIcon(), caret: true, onClick: openLocationSheet }),
        filterChip(typeLabel(), { caret: true, active: f.types.length > 0, onClick: openTypeSheet }),
        filterChip('Featured only', { lead: f.featuredOnly ? icon('check', 12) : null, active: f.featuredOnly, onClick: () => store.setFilters({ featuredOnly: !f.featuredOnly }) }),
        showFav ? filterChip('Favourites', { lead: icon('heart', 12), active: !!f.following, onClick: () => store.setFilters({ following: !f.following }) }) : null));
  }

  function demoNote() {
    if (!store.pref('showDemo') || store.isDismissed('concertsDemoNote')) return null;
    return h('div', { class: 'demo-note cr-demo-note' }, icon('sparkle', 14),
      h('span', {}, 'Demo listings — real venues & works, invented performers. ', h('a', { href: '#/me/data' }, 'Import real listings')),
      h('button', { class: 'icon-btn', 'aria-label': 'Dismiss', onclick: () => store.dismiss('concertsDemoNote') }, icon('close', 14)));
  }
  const endNote = () => h('div', { class: 'cr-end' },
    h('span', { class: 'faint' }, f.lookBack ? 'That’s everything up to yesterday.' : 'End of the published season.'),
    demoNote());

  function paintList() {
    observer?.disconnect();
    clear(listEl);
    const all = listConcerts();
    const today = todayKey();
    if (!all.length) {
      listEl.append(emptyState('calendar', 'No concerts match', f.following ? 'Nothing from your favourites in this range. Add more favourite cities, venues, composers or performers.' : 'Try another date, more cities, or fewer filters.',
        h('button', { class: 'btn small', onclick: () => store.setFilters(defaultFilters()) }, 'Reset filters')));
      paintRail([]);
      return;
    }
    const hideCity = f.cityIds.length === 1;
    let i = 0;
    const sentinel = h('div', { class: 'load-more' });
    let chunks = 0;
    const appendChunk = () => {
      const end = Math.min(i + CHUNK, all.length);
      if (chunks++ > 0 && end > i) toast(`${plural(end - i, 'new concert')}`);
      const frag = document.createDocumentFragment();
      for (; i < end; i++) frag.append(concertCard(all[i], { hideCity }));
      sentinel.before(frag);
      if (i >= all.length) {
        observer?.disconnect();
        sentinel.replaceChildren(endNote());
      }
    };
    listEl.append(sentinel);
    appendChunk();
    // Date / rail jump: render far enough to include the target day, then scroll to it.
    let target = null;
    if (!f.lookBack && f.day && f.day > today) {
      target = all.find((c) => c.day >= f.day)?.day || null;
      while (target && i < all.length && all[i - 1].day < target) {
        const end = Math.min(i + CHUNK, all.length);
        const frag = document.createDocumentFragment();
        for (; i < end; i++) frag.append(concertCard(all[i], { hideCity }));
        sentinel.before(frag);
      }
    }
    if (i < all.length) {
      sentinel.append(h('button', { class: 'btn small', onclick: appendChunk }, 'Load more'));
      observer = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && appendChunk(), { rootMargin: '800px' });
      // start observing after a possible jump-scroll so we don't load extra pages on the way
      setTimeout(() => observer?.observe(sentinel), target ? 600 : 0);
    } else {
      sentinel.replaceChildren(endNote());
    }
    if (target) {
      // after the sheet has closed and the shell has restored scroll
      setTimeout(() => {
        const head = listEl.querySelector(`.concert-card[data-day="${target}"]`);
        if (!head) return;
        // land the day right under the sticky chips (Sheng)
        const top = head.getBoundingClientRect().top + window.scrollY - toolbar.getBoundingClientRect().height + 1;
        window.scrollTo({ top, behavior: scrollMode() });
        setTimeout(syncRail, 0);
        setTimeout(syncRail, 700); // after a smooth scroll
      }, 80);
    }
    paintRail(all);
  }

  // ---------- month rail (Sheng): grey month labels with week ticks down the right edge; the
  // current month is white and a red bar marks where the list is. Tap a month to jump there;
  // press and slide along the rail to scrub weeks, or slide left to pick a day — the bubble
  // ("DEC · Slide left to pick a day · 69 events") shows the target and release jumps there.
  const RAIL_DAY_PX = 9; // horizontal travel per day when sliding left
  const RAIL_DAY_START = 18; // px of leftward travel before day-picking starts
  let railRange = { from: todayKey(), to: null };
  let railDayCounts = new Map();
  const weekOf = (day) => Math.min(3, Math.floor((Number(day.slice(8, 10)) - 1) / 7));
  const daysIn = (m) => {
    const [y, mo] = m.split('-').map(Number);
    return new Date(Date.UTC(y, mo, 0)).getUTCDate();
  };
  function jumpTo(day) {
    const today = todayKey();
    if (f.lookBack) store.setFilters({ day });
    else {
      store.setFilters({ day: day <= today ? null : day });
      if (day <= today) window.scrollTo({ top: 0, behavior: scrollMode() });
    }
  }
  function paintRail() {
    const today = todayKey();
    const range = f.lookBack ? { from: DEMO_PAST_START, to: addDays(today, -1) } : { from: today, to: null };
    railRange = range;
    const months = new Map();
    const weeks = new Map(); // `${month}-${week}` -> { count, first }
    railDayCounts = new Map();
    for (const c of applyFollowing(repo.query({ ...baseOpts(), ...range }))) {
      const m = monthKeyOf(c.day);
      if (!months.has(m)) months.set(m, { count: 0, first: c.day });
      months.get(m).count += 1;
      const wk = `${m}-${weekOf(c.day)}`;
      if (!weeks.has(wk)) weeks.set(wk, { count: 0, first: c.day });
      weeks.get(wk).count += 1;
      railDayCounts.set(c.day, (railDayCounts.get(c.day) || 0) + 1);
    }
    const keys = [...months.keys()].sort();
    clear(rail);
    rail.hidden = keys.length < 2;
    for (const m of keys) {
      const info = months.get(m);
      const label = monthShort(`${m}-01`).toUpperCase();
      rail.append(h('button', {
        type: 'button',
        class: 'm',
        dataset: { day: info.first, month: m, label, count: info.count, kind: 'month' },
        'aria-label': `${monthLong(m)}: ${plural(info.count, 'concert')}`,
        // pointer taps are handled in pointerup (the rail captures the pointer); this is for keyboards
        onclick: (e) => {
          if (e.detail !== 0) return;
          showBubble(label, info.count, 'Slide left to pick a day');
          jumpTo(info.first);
        },
      }, label));
      const ticks = h('div', { class: 'ticks', 'aria-hidden': 'true' });
      const last = daysIn(m);
      for (let w = 0; w < 4; w++) {
        // only weeks inside the browse range (the current month starts at today's week)
        const a = `${m}-${String(w * 7 + 1).padStart(2, '0')}`;
        const b = `${m}-${String(w === 3 ? last : w * 7 + 7).padStart(2, '0')}`;
        if (b < range.from || (range.to && a > range.to)) continue;
        const wk = weeks.get(`${m}-${w}`);
        const first = wk ? wk.first : (a < range.from ? range.from : a);
        ticks.append(h('i', {
          class: wk ? 'has' : '',
          dataset: { wk: `${m}-${w}`, day: first, month: m, label: `${monthShort(first).toUpperCase()} ${dayNum(first)}`, count: wk ? wk.count : 0, kind: 'week' },
        }));
      }
      rail.append(ticks);
    }
    spyDay = null;
    syncRail();
    setTimeout(syncRail, 0); // again once the page is in the document
  }

  // scroll spy: white label for the month on screen, red bar on its week
  let spyDay = null;
  function syncRail() {
    const cards = listEl.isConnected ? listEl.querySelectorAll('.concert-card') : [];
    let day = null;
    if (cards.length) {
      const line = toolbar.getBoundingClientRect().bottom + 4;
      let lo = 0;
      let hi = cards.length - 1;
      let found = cards.length - 1;
      while (lo <= hi) { // first card whose bottom is below the toolbar
        const mid = (lo + hi) >> 1;
        if (cards[mid].getBoundingClientRect().bottom > line) { found = mid; hi = mid - 1; } else lo = mid + 1;
      }
      day = cards[found].dataset.day;
    } else {
      day = f.day || railRange.from;
    }
    if (!day || day === spyDay) return;
    spyDay = day;
    const m = monthKeyOf(day);
    const wk = `${m}-${weekOf(day)}`;
    for (const b of rail.querySelectorAll('button.m')) b.classList.toggle('current', b.dataset.month === m);
    const ticks = [...rail.querySelectorAll('.ticks i')];
    let now = ticks.find((t) => t.dataset.wk === wk) || null;
    if (!now) now = ticks.find((t) => t.dataset.month === m) || null;
    ticks.forEach((t) => t.classList.toggle('now', t === now));
  }
  let spyTimer = 0;
  const onScroll = () => {
    if (spyTimer) return;
    spyTimer = setTimeout(() => { spyTimer = 0; syncRail(); }, 50);
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  let bubbleTimer;
  function showBubble(label, count, hint, y = null, hold = false) {
    bubble.replaceChildren(h('b', {}, label), h('span', { class: 'hint' }, hint), h('span', { class: 'n' }, plural(Number(count), 'event')));
    bubble.hidden = false;
    bubble.style.top = y == null ? '' : `${Math.round(y)}px`;
    clearTimeout(bubbleTimer);
    if (!hold) bubbleTimer = setTimeout(() => { bubble.hidden = true; }, 1600);
  }
  // press-and-slide scrubbing
  let scrubbing = null;
  const railTargetAt = (y) => {
    const r = rail.getBoundingClientRect();
    const x = r.left + r.width / 2;
    let el = document.elementsFromPoint(x, y).find((n) => n.dataset && n.dataset.day && rail.contains(n));
    if (!el) {
      // between items: nearest item vertically
      let best = null;
      let bestD = Infinity;
      for (const n of rail.querySelectorAll('[data-day]')) {
        const b = n.getBoundingClientRect();
        const d = Math.abs((b.top + b.bottom) / 2 - y);
        if (d < bestD) { bestD = d; best = n; }
      }
      el = best;
    }
    return el;
  };
  function scrubShow(e) {
    const t = scrubbing.target;
    if (!t) return;
    const dx = scrubbing.x0 - e.clientX;
    if (dx > RAIL_DAY_START) {
      // slide left: pick a day of the target's month, starting at the target week / month start
      const m = t.dataset.month;
      const base = Number(t.dataset.day.slice(8, 10));
      const d = Math.max(1, Math.min(daysIn(m), base + Math.floor((dx - RAIL_DAY_START) / RAIL_DAY_PX)));
      let key = `${m}-${String(d).padStart(2, '0')}`;
      if (key < railRange.from) key = railRange.from;
      if (railRange.to && key > railRange.to) key = railRange.to;
      scrubbing.day = key;
      showBubble(`${monthShort(key).toUpperCase()} ${dayNum(key)}`, railDayCounts.get(key) || 0, `${weekdayShort(key)} · release to jump`, e.clientY, true);
    } else {
      scrubbing.day = null;
      showBubble(t.dataset.label, t.dataset.count, t.dataset.kind === 'month' ? 'Slide left to pick a day' : 'Release to jump', e.clientY, true);
    }
  }
  rail.addEventListener('pointerdown', (e) => {
    scrubbing = { x0: e.clientX, y0: e.clientY, target: railTargetAt(e.clientY), moved: false, day: null };
    try { rail.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    if (scrubbing.target) scrubShow(e);
  });
  rail.addEventListener('pointermove', (e) => {
    if (!scrubbing) return;
    if (Math.abs(e.clientY - scrubbing.y0) > 4 || Math.abs(e.clientX - scrubbing.x0) > 4) scrubbing.moved = true;
    const dx = scrubbing.x0 - e.clientX;
    // once day-picking has started, keep the month fixed while the finger travels left
    if (dx <= RAIL_DAY_START) {
      const el = railTargetAt(e.clientY);
      if (el) scrubbing.target = el;
    }
    scrubShow(e);
  });
  const endScrub = () => {
    const s = scrubbing;
    scrubbing = null;
    if (!s || !s.target) { bubble.hidden = true; return; }
    const day = s.day || s.target.dataset.day;
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => { bubble.hidden = true; }, s.moved ? 700 : 1600);
    jumpTo(day);
  };
  rail.addEventListener('pointerup', endScrub);
  rail.addEventListener('pointercancel', () => { scrubbing = null; bubble.hidden = true; });

  // ---------- Date sheet ----------
  function openDateSheet() {
    const today = todayKey();
    let selected = f.day;
    let month = monthKeyOf(f.day || today);
    const marksByDay = new Set();
    for (const id of [...store.markedIds('saved'), ...store.markedIds('going'), ...store.markedIds('attended')]) {
      const c = repo.concert(id);
      if (c) marksByDay.add(c.day);
    }
    const counts = new Map();
    for (const c of applyFollowing(repo.query(baseOpts()))) counts.set(c.day, (counts.get(c.day) || 0) + 1);
    const allDays = [...counts.keys()].sort();
    // Density dots are relative, like Sheng's: busiest third of days gets three, quietest third one.
    const sortedN = [...counts.values()].sort((a, b) => a - b);
    const q = (f) => sortedN[Math.min(sortedN.length - 1, Math.floor(sortedN.length * f))] || 0;
    const [lowCut, highCut] = [q(1 / 3), q(2 / 3)];
    const minMonth = monthKeyOf(allDays[0] || today);
    const maxMonth = monthKeyOf(allDays[allDays.length - 1] || today);

    const body = h('div');
    const cta = h('button', { class: 'btn primary block' });
    const footer = h('div', {}, cta, h('div', { class: 'hint' }, 'Same jump as the rail — the list lands on that day or the nearest with events'));
    const sheet = crSheet(openSheet({ title: 'Date', subtitle: 'This browse only · picking a past day enters Look back', body, footer }), 'cr-date');

    function paint() {
      const [y, mo] = month.split('-').map(Number);
      const first = `${month}-01`;
      const daysInMonth = new Date(Date.UTC(y, mo, 0)).getUTCDate();
      const lead = (weekdayOf(first) + 6) % 7; // Monday-first grid
      const grid = h('div', { class: 'cal-grid' }, ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d) => h('div', { class: 'wd' }, d)));
      for (let k = 0; k < lead; k++) grid.append(h('div'));
      for (let d = 1; d <= daysInMonth; d++) {
        const key = `${month}-${String(d).padStart(2, '0')}`;
        const n = counts.get(key) || 0;
        const dots = n === 0 ? 0 : n <= lowCut ? 1 : n <= highCut ? 2 : 3;
        grid.append(h('button', {
          class: ['cal-day', key < today && 'past', key === today && 'today', key === selected && 'selected'],
          'aria-label': `${weekdayShort(key)} ${monthShort(key)} ${d}: ${plural(n, 'concert')}`,
          onclick: () => { selected = key; paint(); },
        },
        h('span', { class: 'n' }, d),
        h('span', { class: 'dots' }, Array.from({ length: dots }, () => h('i'))),
        marksByDay.has(key) ? h('span', { class: 'mine' }) : null));
      }
      clear(body).append(
        h('div', { class: 'caps-label', style: { marginTop: '4px' } }, 'By month'),
        h('div', { class: 'cal-head' },
          h('b', {}, `${monthLong(month)} ${y}`),
          h('div', { style: { display: 'flex', gap: '8px' } },
            h('button', { class: 'icon-btn cr-cal-nav', 'aria-label': 'Previous month', disabled: month <= minMonth, onclick: () => { month = shiftMonth(month, -1); paint(); } }, icon('back', 14)),
            h('button', { class: 'icon-btn cr-cal-nav', 'aria-label': 'Next month', disabled: month >= maxMonth, onclick: () => { month = shiftMonth(month, 1); paint(); } }, icon('chevron', 14)))),
        grid,
        h('div', { class: 'cal-legend' }, h('span', {}, '• Event density'), h('span', {}, h('b', { class: 'mk' }, '—'), ' My marks'), h('span', { class: 'past' }, 'Past')));
      if (!selected) {
        cta.textContent = 'Pick a date';
        cta.disabled = true;
      } else {
        cta.disabled = false;
        const past = selected < today;
        cta.textContent = `Jump to ${monthShort(selected)} ${dayNum(selected)} · ${weekdayShort(selected)}`;
      }
    }
    cta.onclick = () => {
      const past = selected < today;
      // land on the selected day or the nearest following day with concerts
      const target = allDays.find((d) => d >= selected) || selected;
      sheet.close();
      if (past) {
        // Like Sheng: looking back asks for one city first
        setTimeout(() => openLookBackCitySheet(selected), 280);
        return;
      }
      store.setFilters({ day: target === today ? null : target, lookBack: false });
      window.scrollTo(0, 0);
    };
    paint();
  }

  // ---------- Look back: pick one city (Sheng) ----------
  function openLookBackCitySheet(fromDay) {
    const today = todayKey();
    const counts = new Map();
    for (const c of repo.query({ from: fromDay, to: addDays(today, -1) })) if (c.cityId) counts.set(c.cityId, (counts.get(c.cityId) || 0) + 1);
    const cities = repo.allCities().filter((c) => counts.get(c.id)).sort((a, b) => counts.get(b.id) - counts.get(a.id) || a.name.localeCompare(b.name));
    let picked = null; // like Sheng, Look back needs one city
    let q = '';
    const body = h('div');
    const cta = h('button', { class: 'btn primary block', disabled: true }, 'Confirm');
    const sheet = crSheet(openSheet({ title: 'Pick one city to look back', subtitle: 'Only affects this browse · won’t change your followed regions', body, footer: cta }), 'cr-lookback');
    const search = searchField((v) => { q = v; paint(); });
    const wrap = h('div', { class: 'chip-wrap cr-city-chips', style: { marginTop: '12px' } });
    function paint() {
      clear(wrap).append(
        ...cities.filter((c) => !q || normalize(c.name).includes(q)).map((c) => chip(c.name, { count: counts.get(c.id), active: picked === c.id, onClick: () => { picked = picked === c.id ? null : c.id; paint(); } })));
      cta.disabled = !picked;
    }
    cta.onclick = () => {
      if (!picked) return;
      store.setFilters({ day: fromDay, lookBack: true, cityIds: [picked] });
      sheet.close();
      toast(`${plural(countFor({}), 'concert')} total`);
      window.scrollTo(0, 0);
    };
    body.append(search, wrap);
    if (!cities.length) body.append(h('p', { class: 'lead' }, 'No past concerts in this range.'));
    paint();
  }

  // ---------- Location sheet ----------
  // Like Sheng: every city starts selected ("Select all"); tapping a city excludes it.
  function openLocationSheet() {
    const allIds = repo.allCities().map((c) => c.id);
    let picked = new Set(f.cityIds.length ? f.cityIds : allIds);
    const initialKey = [...picked].sort().join(',');
    let q = '';
    // Like Sheng: city chips show every listing in that city (ignoring type / featured filters);
    // the button count below respects all filters.
    const counts = (() => {
      const { from, to } = windowRange();
      const m = new Map(repo.allCities().map((c) => [c.id, 0]));
      for (const c of repo.query({ from, to })) if (c.cityId) m.set(c.cityId, (m.get(c.cityId) || 0) + 1);
      return m;
    })();
    const cities = [...repo.allCities()].sort((a, b) => (counts.get(b.id) - counts.get(a.id)) || a.name.localeCompare(b.name));

    const body = h('div');
    const cta = h('button', { class: 'btn primary block' });
    const footer = h('div', {}, cta, h('div', { class: 'hint' }, 'This filter won’t change your region settings'));
    const sheet = crSheet(openSheet({ title: 'Location', subtitle: 'Only affects this browse · won’t change your followed regions', body, footer }), 'cr-location');
    // search also matches canton names ("Vaud", "Ticino") — then "Select all matches"
    const search = searchField((v) => { q = v; paintChoices(); });
    const choices = h('div');

    const isAll = () => picked.size === allIds.length;
    function total() {
      if (!picked.size) return 0;
      const ids = isAll() ? [] : [...picked];
      const { from, to } = windowRange();
      return applyFollowing(repo.query({ ...baseOpts({ cityIds: ids }), from, to })).length;
    }
    function selectAllRow(list) {
      const allOn = list.length > 0 && list.every((c) => picked.has(c.id));
      return h('label', { class: 'cr-check' },
        h('input', { type: 'checkbox', checked: allOn, onchange: (e) => { for (const c of list) e.target.checked ? picked.add(c.id) : picked.delete(c.id); paintChoices(); } }),
        h('span', {}, q ? 'Select all matches' : 'Select all'));
    }
    function cityChip(c) {
      return chip(c.name, { count: counts.get(c.id), active: picked.has(c.id), onClick: () => { picked.has(c.id) ? picked.delete(c.id) : picked.add(c.id); paintChoices(); } });
    }
    function paintChoices() {
      const visible = cities.filter((c) => !q || normalize(c.name).includes(q) || normalize(repo.cantonName(c.canton)).includes(q));
      // Like Sheng for a country without sub-regions: "Select all" + city chips with counts
      clear(choices).append(selectAllRow(visible), h('div', { class: 'chip-wrap cr-city-chips' }, visible.map(cityChip)));
      const n = total();
      const unchanged = [...picked].sort().join(',') === initialKey;
      cta.textContent = unchanged ? 'Confirm' : `Show ${plural(n, 'event')}`;
      cta.disabled = n === 0;
    }
    cta.onclick = () => {
      store.setFilters({ cityIds: isAll() ? [] : [...picked] });
      sheet.close();
      window.scrollTo(0, 0);
    };
    clear(body).append(search,
      h('div', { class: 'loc-country cr-country' }, h('b', {}, 'Current country: Switzerland'),
        h('a', { href: '#/map', onclick: () => sheet.close() }, h('span', { class: 'flag', 'aria-hidden': 'true' }), 'Map', icon('chevron', 12))),
      choices);
    paintChoices();
  }

  // ---------- Type sheet ----------
  // Like Sheng: all types start selected; tapping a type excludes it.
  function openTypeSheet() {
    const picked = new Set(f.types.length ? f.types : TYPES);
    const initialKey = [...picked].sort().join(',');
    const body = h('div');
    const cta = h('button', { class: 'btn primary block' });
    // Like Sheng: just the title and the type chips; the "Show N events" button appears once you change something
    const sheet = crSheet(openSheet({ title: 'Type', body, footer: null }), 'cr-type');
    const chosen = () => (picked.size === TYPES.length ? [] : [...picked]);
    let footerShown = false;
    function paint() {
      clear(body).append(h('div', { class: 'chip-wrap cr-type-chips' }, TYPES.map((t) => chip(TYPE_LABELS[t], {
        active: picked.has(t),
        onClick: () => { picked.has(t) ? picked.delete(t) : picked.add(t); paint(); },
      }))));
      const n = picked.size ? countFor({ types: chosen() }) : 0;
      const unchanged = [...picked].sort().join(',') === initialKey;
      cta.textContent = `Show ${plural(n, 'event')}`;
      cta.disabled = n === 0;
      if (unchanged === footerShown) {
        footerShown = !unchanged;
        sheet.setFooter(footerShown ? cta : null);
      }
    }
    cta.onclick = () => { store.setFilters({ types: chosen() }); sheet.close(); window.scrollTo(0, 0); };
    paint();
  }

  // ---------- pull to refresh (Sheng): pull down at the top of the list ----------
  const ptr = h('div', { class: 'cr-ptr', 'aria-hidden': 'true' }, h('span', { class: 'spin' }));
  const PTR_MAX = 80;
  const PTR_ARM = 52;
  let ptrStart = null;
  let ptrBusy = false;
  const ptrShow = (px) => {
    ptr.style.height = `${Math.round(px)}px`;
    ptr.style.setProperty('--ptr', String(Math.min(1, px / PTR_ARM)));
    ptr.classList.toggle('armed', px >= PTR_ARM);
  };
  const onTouchStart = (e) => {
    ptrStart = !ptrBusy && window.scrollY <= 0 && e.touches.length === 1 ? e.touches[0].clientY : null;
  };
  const onTouchMove = (e) => {
    if (ptrStart == null) return;
    const dy = e.touches[0].clientY - ptrStart;
    if (dy <= 0 || window.scrollY > 0) { ptr.classList.remove('dragging'); ptrShow(0); return; }
    ptr.classList.add('dragging');
    ptrShow(Math.min(PTR_MAX, dy * 0.5));
  };
  const onTouchEnd = async () => {
    if (ptrStart == null) return;
    ptrStart = null;
    ptr.classList.remove('dragging');
    if (!ptr.classList.contains('armed')) { ptrShow(0); return; }
    ptrBusy = true;
    ptr.classList.add('busy');
    ptrShow(PTR_ARM);
    let added = null;
    try {
      const mod = await import('./settings.js');
      [added] = await Promise.all([mod.refreshSavedFeed(), new Promise((r) => setTimeout(r, 700))]);
    } catch { /* offline or no feed: still repaint */ }
    ptrBusy = false;
    ptr.classList.remove('busy');
    ptrShow(0);
    paintList();
    toast(added ? plural(added, 'new concert') : 'Up to date');
  };
  window.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchmove', onTouchMove, { passive: true });
  window.addEventListener('touchend', onTouchEnd);
  window.addEventListener('touchcancel', onTouchEnd);

  const unsub = store.subscribe((topic) => {
    if (topic === 'filters' || topic === 'follows') { paintToolbar(); paintList(); }
  });
  paintToolbar();
  paintList();

  return {
    title: 'Concerts',
    header: false, // like Sheng: the filter chips sit at the very top
    body: h('div', { class: 'with-rail concerts-page' }, toolbar, ptr, listEl),
    cleanup() {
      unsub();
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
      observer?.disconnect();
      window.removeEventListener('scroll', onScroll);
      clearTimeout(spyTimer);
      clearTimeout(bubbleTimer);
      rail.remove();
      bubble.remove();
    },
  };
}

function shiftMonth(monthKey, delta) {
  const [y, m] = monthKey.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

// exported for tests
export { daysBetween as _daysBetween };
