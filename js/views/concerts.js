// Concerts tab — the heart of the app (modelled on Sheng's Concerts tab).
// The listings are REAL: read daily from the Swiss venues' and orchestras' own websites (feed.js), plus
// the user's own imports. Filter chips: Date (calendar → jump, or Look back for past days) · Location
// (Swiss cities / cantons with live counts, and Sheng's "Other countries" — no listings there yet) ·
// Type · Featured only · Favourites. Month rail on the right edge. Pull down to refresh the listings.
// The list is rendered in chunks as you scroll. Interface text is English or 简体中文 (i18n.js).

import { h, icon, clear, toast, TYPE_LABELS, normalize } from '../util.js';
import * as repo from '../repo.js';
import * as store from '../store.js';
import { openSheet } from '../ui/sheet.js';
import { concertCard, chip, emptyState, skeletonList } from '../ui/components.js';
import {
  todayKey, addDays, monthKeyOf, monthShort, dayNum, weekdayShort, weekdayOf, daysBetween, dayKeyOf, timeOf,
} from '../time.js';
import {
  t, tn, isZh, dayMonth, monthYear, cityName, cantonName, countryName, typeLabel as typeName,
} from '../i18n.js';
import { COUNTRIES, country as countryOf, countryCities } from '../data/countries.js';
import { ZH_REGIONS, ZH_PLACES } from '../i18n/zh-concerts.js';

const CHUNK = 40;
const KEEP_PAST_DAYS = daysBetween(repo.pastStart(), todayKey()); // how long Look back keeps concerts
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

// ---------- other countries (Sheng's list; Klang has no listings outside Switzerland yet) ----------
// A country other than Switzerland is kept in the location filter itself, so any other screen that
// sets cityIds (map, city page, Your region) brings the list back to Switzerland:
//   ['country:germany'] = all of Germany · ['country:germany|Berlin', …] = some of its cities.
// No concert has such a city id, so the list is (honestly) empty there.
const CC = 'country:';
const isCountryId = (id) => typeof id === 'string' && id.startsWith(CC);
function browseCountry(ids = f.cityIds) {
  return ids.length && isCountryId(ids[0]) ? countryOf(ids[0].slice(CC.length).split('|')[0]) : null;
}
function browseCountryCities(ids = f.cityIds) { // city names, or null for the whole country
  const names = ids.filter(isCountryId).map((id) => id.split('|')[1]).filter(Boolean);
  return names.length ? names : null;
}
const countryCityIds = (x, names) => (names ? names.map((n) => `${CC}${x.id}|${n}`) : [`${CC}${x.id}`]);
// Chinese names of other countries' regions and cities where Chinese has one ("Bavaria" → "巴伐利亚州")
const regionName = (n) => (isZh() && ZH_REGIONS[n]) || n;
const placeName = (n) => (isZh() && ZH_PLACES[n]) || n;
const placeMatches = (n, q) => !q || normalize(n).includes(q) || normalize(placeName(n)).includes(q);
// replaceChildren, skipping empty parts (null / false) and flattening arrays
const fill = (el, ...parts) => el.replaceChildren(...parts.flat(Infinity).filter((x) => x != null && x !== false));

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
  if (f.lookBack && f.day) return dayMonth(f.day);
  if (f.day && f.day > todayKey()) return dayMonth(f.day);
  return t('Date');
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
function searchField(onInput, placeholder = t('Search cities')) {
  const input = h('input', { class: 'input', type: 'search', placeholder, 'aria-label': placeholder, oninput: () => onInput(normalize(input.value.trim())) });
  const field = h('label', { class: 'cr-search' }, icon('search', 14), input);
  field.setPlaceholder = (text) => { input.placeholder = text; input.setAttribute('aria-label', text); };
  field.reset = () => { input.value = ''; };
  return field;
}
// a city matches the search by its own name, its Chinese name or its canton ("Vaud", "沃州")
const cityMatches = (c, q) => !q || normalize(c.name).includes(q) || normalize(cityName(c)).includes(q) ||
  (c.canton && (normalize(repo.cantonName(c.canton)).includes(q) || normalize(cantonName(c.canton, '')).includes(q)));
function locationLabel() {
  const x = browseCountry();
  if (x) {
    const names = browseCountryCities();
    if (!names) return countryName(x.name);
    return names.length === 1 ? placeName(names[0]) : tn(names.length, '{n} city', '{n} cities');
  }
  if (!f.cityIds.length) return t('Switzerland');
  if (f.cityIds.length === 1) return cityName(repo.city(f.cityIds[0])) || tn(1, '{n} city', '{n} cities');
  return tn(f.cityIds.length, '{n} city', '{n} cities');
}
const typeText = (type) => typeName(type, TYPE_LABELS[type]);
function typeLabel() {
  if (!f.types.length || f.types.length === TYPES.length) return t('All types');
  if (f.types.length === 1) return typeText(f.types[0]);
  return tn(f.types.length, '{n} type', '{n} types');
}
// t() for templates whose values carry their own spacing: t() with values removes spaces between Chinese
// characters, which would turn the date "10月30日 周五" into "10月30日周五".
const tKeep = (key, vars) => t(key).replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m));
// "Oct 30 · Fri" / "10月30日 周五"
const dayWithWeekday = (day) => (isZh() ? `${dayMonth(day)} ${weekdayShort(day)}` : `${dayMonth(day)} · ${weekdayShort(day)}`);
// rail labels: "OCT" / "10月", weeks "OCT 26" / "10月26日"
const railMonth = (day) => monthShort(day).toUpperCase();
const railDay = (day) => (isZh() ? dayMonth(day) : `${monthShort(day).toUpperCase()} ${dayNum(day)}`);

export function render() {
  const toolbar = h('div', { class: 'list-toolbar' });
  const listEl = h('div', { class: 'concert-list' });
  const rail = h('nav', { class: 'rail cr-rail', 'aria-label': t('Jump to month') });
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
        filterChip(t('Featured only'), { lead: f.featuredOnly ? icon('check', 12) : null, active: f.featuredOnly, onClick: () => store.setFilters({ featuredOnly: !f.featuredOnly }) }),
        showFav ? filterChip(t('Favourites'), { lead: icon('heart', 12), active: !!f.following, onClick: () => store.setFilters({ following: !f.following }) }) : null));
  }

  // End of the list: where the listings come from (details and per-source credits in Me › Data).
  function sourceNote() {
    const info = repo.feedInfo();
    if (!info.loaded) return null;
    const n = info.sources.filter((s) => s.count > 0).length;
    const at = info.generatedAt || info.fetchedAt;
    const when = at ? `${dayMonth(dayKeyOf(at))} ${timeOf(at)}` : null;
    return h('a', { class: 'cr-source', href: '#/me/data' },
      h('span', {}, t('Real listings from the venues’ and orchestras’ own websites, updated daily.')),
      h('span', { class: 'sub' }, [tn(n, '{n} source', '{n} sources'), when ? t('Updated {date}', { date: when }) : null].filter(Boolean).join(' · '), icon('chevron', 11)));
  }
  const endNote = () => h('div', { class: 'cr-end' },
    h('span', { class: 'faint' }, f.lookBack ? t('That’s everything up to yesterday.') : t('That’s all the venues have published so far.')),
    sourceNote());

  // Empty list: say why, with real data in mind (another country, a quiet town, the filters, the feed).
  function emptyList() {
    const toSwitzerland = (label = t('Show all of Switzerland')) =>
      h('button', { class: 'btn small', onclick: () => { store.setFilters({ cityIds: [], day: null, lookBack: false }); window.scrollTo(0, 0); } }, label);
    const x = browseCountry();
    if (x) {
      return emptyState('globe', t('No concerts here yet'),
        t('No listings for {country} yet — Klang reads Swiss venues’ own calendars.', { country: countryName(x.name) }),
        toSwitzerland(t('Back to Switzerland')));
    }
    const info = repo.feedInfo();
    if (!info.loaded && !repo.allConcerts().length) {
      if (!info.error) return h('div', { class: 'cr-loading', 'aria-busy': 'true' }, h('p', { class: 'faint' }, t('Loading the listings…')), skeletonList(3));
      return emptyState('calendar', t('Could not load the listings'), t('Check your connection, then pull down to try again.'),
        h('button', { class: 'btn small', onclick: (e) => { e.target.disabled = true; import('../feed.js').then((m) => m.refreshFeed()).finally(() => { if (listEl.isConnected) paintList(); }); } }, t('Try again')));
    }
    const reset = h('button', { class: 'btn small', onclick: () => store.setFilters(defaultFilters()) }, t('Reset filters'));
    if (f.following) return emptyState('calendar', t('No concerts match'), t('Nothing from your favourites in this range. Add more favourite cities, venues, composers or performers.'), reset);
    // nothing at all in the chosen cities for this range (whatever the other filters)
    const { from, to } = windowRange();
    const any = repo.query({ from, to, cityIds: f.cityIds }).length;
    if (!any && f.lookBack) {
      return emptyState('history', t('No past concerts here'),
        t('Klang keeps the concerts it has listed for {n} days after they take place, so Look back fills up as the days go by.', { n: KEEP_PAST_DAYS }),
        h('button', { class: 'btn small', onclick: () => { store.setFilters({ day: null, lookBack: false }); window.scrollTo(0, 0); } }, t('Back to upcoming concerts')));
    }
    if (!any && f.cityIds.length) {
      const one = f.cityIds.length === 1 ? repo.city(f.cityIds[0]) : null;
      return emptyState('calendar', one ? t('No concerts in {city} right now', { city: cityName(one) }) : t('No concerts in these cities right now'),
        t('Klang reads the venues’ own calendars every day; nothing is listed here at the moment.'), toSwitzerland());
    }
    return emptyState('calendar', t('No concerts match'), t('Try another date, more cities, or fewer filters.'), reset);
  }

  function paintList() {
    observer?.disconnect();
    clear(listEl);
    const all = listConcerts();
    const today = todayKey();
    if (!all.length) {
      listEl.append(emptyList());
      paintRail([]);
      return;
    }
    const hideCity = f.cityIds.length === 1;
    let i = 0;
    const sentinel = h('div', { class: 'load-more' });
    let chunks = 0;
    const appendChunk = () => {
      const end = Math.min(i + CHUNK, all.length);
      if (chunks++ > 0 && end > i) toast(tn(end - i, '{n} new concert', '{n} new concerts'));
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
      sentinel.append(h('button', { class: 'btn small', onclick: appendChunk }, t('Load more')));
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
    const range = f.lookBack ? { from: repo.pastStart(today), to: addDays(today, -1) } : { from: today, to: null };
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
      const label = railMonth(`${m}-01`);
      rail.append(h('button', {
        type: 'button',
        class: 'm',
        dataset: { day: info.first, month: m, label, count: info.count, kind: 'month' },
        'aria-label': t('{label}: {count}', { label: monthYear(m), count: tn(info.count, '{n} concert', '{n} concerts') }),
        // pointer taps are handled in pointerup (the rail captures the pointer); this is for keyboards
        onclick: (e) => {
          if (e.detail !== 0) return;
          showBubble(label, info.count, t('Slide left to pick a day'));
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
          dataset: { wk: `${m}-${w}`, day: first, month: m, label: railDay(first), count: wk ? wk.count : 0, kind: 'week' },
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
    let now = ticks.find((x) => x.dataset.wk === wk) || null;
    if (!now) now = ticks.find((x) => x.dataset.month === m) || null;
    ticks.forEach((x) => x.classList.toggle('now', x === now));
  }
  let spyTimer = 0;
  const onScroll = () => {
    if (spyTimer) return;
    spyTimer = setTimeout(() => { spyTimer = 0; syncRail(); }, 50);
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  let bubbleTimer;
  function showBubble(label, count, hint, y = null, hold = false) {
    bubble.replaceChildren(h('b', {}, label), h('span', { class: 'hint' }, hint), h('span', { class: 'n' }, tn(Number(count), '{n} event', '{n} events')));
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
    const tg = scrubbing.target;
    if (!tg) return;
    const dx = scrubbing.x0 - e.clientX;
    if (dx > RAIL_DAY_START) {
      // slide left: pick a day of the target's month, starting at the target week / month start
      const m = tg.dataset.month;
      const base = Number(tg.dataset.day.slice(8, 10));
      const d = Math.max(1, Math.min(daysIn(m), base + Math.floor((dx - RAIL_DAY_START) / RAIL_DAY_PX)));
      let key = `${m}-${String(d).padStart(2, '0')}`;
      if (key < railRange.from) key = railRange.from;
      if (railRange.to && key > railRange.to) key = railRange.to;
      scrubbing.day = key;
      showBubble(railDay(key), railDayCounts.get(key) || 0, t('{weekday} · release to jump', { weekday: weekdayShort(key) }), e.clientY, true);
    } else {
      scrubbing.day = null;
      showBubble(tg.dataset.label, tg.dataset.count, tg.dataset.kind === 'month' ? t('Slide left to pick a day') : t('Release to jump'), e.clientY, true);
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
    const q = (x) => sortedN[Math.min(sortedN.length - 1, Math.floor(sortedN.length * x))] || 0;
    const [lowCut, highCut] = [q(1 / 3), q(2 / 3)];
    // past months back to what Look back keeps; forward to the last listed day
    const minMonth = monthKeyOf([allDays[0], repo.pastStart(today)].filter(Boolean).sort()[0]);
    const maxMonth = monthKeyOf([allDays[allDays.length - 1], today].filter(Boolean).sort().pop());
    const WD = isZh() ? ['一', '二', '三', '四', '五', '六', '日'] : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

    const body = h('div');
    const cta = h('button', { class: 'btn primary block' });
    const footer = h('div', {}, cta, h('div', { class: 'hint' }, t('Same jump as the rail — the list lands on that day or the nearest with events')));
    const sheet = crSheet(openSheet({ title: t('Date'), subtitle: t('This browse only · picking a past day enters Look back'), body, footer }), 'cr-date');

    function paint() {
      const [y, mo] = month.split('-').map(Number);
      const first = `${month}-01`;
      const daysInMonth = new Date(Date.UTC(y, mo, 0)).getUTCDate();
      const lead = (weekdayOf(first) + 6) % 7; // Monday-first grid
      const grid = h('div', { class: 'cal-grid' }, WD.map((d) => h('div', { class: 'wd' }, d)));
      for (let k = 0; k < lead; k++) grid.append(h('div'));
      for (let d = 1; d <= daysInMonth; d++) {
        const key = `${month}-${String(d).padStart(2, '0')}`;
        const n = counts.get(key) || 0;
        const dots = n === 0 ? 0 : n <= lowCut ? 1 : n <= highCut ? 2 : 3;
        grid.append(h('button', {
          class: ['cal-day', key < today && 'past', key === today && 'today', key === selected && 'selected'],
          'aria-label': tKeep('{label}: {count}', { label: dayWithWeekday(key), count: tn(n, '{n} concert', '{n} concerts') }),
          onclick: () => { selected = key; paint(); },
        },
        h('span', { class: 'n' }, d),
        h('span', { class: 'dots' }, Array.from({ length: dots }, () => h('i'))),
        marksByDay.has(key) ? h('span', { class: 'mine' }) : null));
      }
      clear(body).append(
        h('div', { class: 'caps-label', style: { marginTop: '4px' } }, t('By month')),
        h('div', { class: 'cal-head' },
          h('b', {}, monthYear(month)),
          h('div', { style: { display: 'flex', gap: '8px' } },
            h('button', { class: 'icon-btn cr-cal-nav', 'aria-label': t('Previous month'), disabled: month <= minMonth, onclick: () => { month = shiftMonth(month, -1); paint(); } }, icon('back', 14)),
            h('button', { class: 'icon-btn cr-cal-nav', 'aria-label': t('Next month'), disabled: month >= maxMonth, onclick: () => { month = shiftMonth(month, 1); paint(); } }, icon('chevron', 14)))),
        grid,
        h('div', { class: 'cal-legend' }, h('span', {}, `• ${t('Event density')}`), h('span', {}, h('b', { class: 'mk' }, '—'), ` ${t('My marks')}`), h('span', { class: 'past' }, t('Past'))));
      if (!selected) {
        cta.textContent = t('Pick a date');
        cta.disabled = true;
      } else {
        cta.disabled = false;
        cta.textContent = tKeep('Jump to {date}', { date: dayWithWeekday(selected) });
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
  // Past concerts are the real listings Klang has kept (feed.js keeps them for 120 days).
  function openLookBackCitySheet(fromDay) {
    const today = todayKey();
    const counts = new Map();
    for (const c of repo.query({ from: fromDay, to: addDays(today, -1) })) if (c.cityId) counts.set(c.cityId, (counts.get(c.cityId) || 0) + 1);
    const cities = repo.allCities().filter((c) => counts.get(c.id)).sort((a, b) => counts.get(b.id) - counts.get(a.id) || a.name.localeCompare(b.name));
    let picked = null; // like Sheng, Look back needs one city
    let q = '';
    const body = h('div');
    const cta = h('button', { class: 'btn primary block', disabled: true }, t('Confirm'));
    const sheet = crSheet(openSheet({ title: t('Pick one city to look back'), subtitle: t('Only affects this browse · won’t change your followed regions'), body, footer: cta }), 'cr-lookback');
    const search = searchField((v) => { q = v; paint(); });
    const wrap = h('div', { class: 'chip-wrap cr-city-chips', style: { marginTop: '12px' } });
    function paint() {
      clear(wrap).append(
        ...cities.filter((c) => cityMatches(c, q)).map((c) => chip(cityName(c), { count: counts.get(c.id), active: picked === c.id, onClick: () => { picked = picked === c.id ? null : c.id; paint(); } })));
      cta.disabled = !picked;
    }
    cta.onclick = () => {
      if (!picked) return;
      store.setFilters({ day: fromDay, lookBack: true, cityIds: [picked] });
      sheet.close();
      toast(tn(countFor({}), '{n} concert in total', '{n} concerts in total'));
      window.scrollTo(0, 0);
    };
    if (cities.length) body.append(search, wrap);
    else {
      const keptFrom = repo.pastStart(today);
      body.append(h('div', { class: 'cr-note' }, icon('history', 15),
        h('p', {}, fromDay < keptFrom
          ? t('Klang keeps past concerts for {n} days, back to {date}.', { n: KEEP_PAST_DAYS, date: dayMonth(keptFrom) })
          : t('No past concerts from {date} yet. Klang keeps the concerts it has listed for {n} days after they take place, so Look back fills up as the days go by.', { date: dayMonth(fromDay), n: KEEP_PAST_DAYS }))));
    }
    paint();
  }

  // ---------- Location sheet ----------
  // Like Sheng: every city starts selected ("Select all"); tapping a city excludes it. "Other countries ›"
  // opens Sheng's 47 country chips. Klang reads Swiss venues only, so another country shows its regions
  // and cities with 0 events and a calm note; confirming it shows an empty list (never invented concerts).
  function openLocationSheet() {
    const swissCities = repo.allCities();
    const allIds = swissCities.map((c) => c.id);
    const startCountry = browseCountry();
    let current = startCountry ? startCountry.id : null; // null = Switzerland
    let picked = new Set(!startCountry && f.cityIds.length ? f.cityIds : allIds); // Swiss city ids
    let xPicked = new Set(startCountry ? browseCountryCities() || countryCities(startCountry) : []); // city names of another country
    const initialKey = () => (startCountry ? countryCityIds(startCountry, browseCountryCities()) : f.cityIds.length ? f.cityIds : allIds).slice().sort().join(',');
    let countriesOpen = false;
    const openRegions = new Set();
    let q = '';
    // Like Sheng: city chips show every listing in that city (ignoring type / featured filters);
    // the button count below respects all filters.
    const { from, to } = windowRange();
    const counts = new Map(swissCities.map((c) => [c.id, 0]));
    for (const c of repo.query({ from, to })) if (c.cityId) counts.set(c.cityId, (counts.get(c.cityId) || 0) + 1);
    const swissTotal = [...counts.values()].reduce((a, b) => a + b, 0);
    const cities = [...swissCities].sort((a, b) => (counts.get(b.id) - counts.get(a.id)) || a.name.localeCompare(b.name));
    // Sheng orders countries by their number of listings: Switzerland (the only one with listings here)
    // first, the others in Sheng's order.
    const countries = [...COUNTRIES].sort((a, b) => (b.swiss ? 1 : 0) - (a.swiss ? 1 : 0));
    const otherCountry = () => (current ? countryOf(current) : null);
    function setCountry(id) {
      current = id;
      countriesOpen = false;
      openRegions.clear();
      q = '';
      search.reset();
      const x = otherCountry();
      if (x) {
        const names = startCountry && startCountry.id === x.id ? browseCountryCities() : null;
        xPicked = new Set(names || countryCities(x));
      } else picked = new Set(!startCountry && f.cityIds.length ? f.cityIds : allIds);
      paintChoices();
    }

    const body = h('div');
    const cta = h('button', { class: 'btn primary block' });
    const footer = h('div', {}, cta, h('div', { class: 'hint' }, t('This filter won’t change your region settings')));
    const sheet = crSheet(openSheet({ title: t('Location'), subtitle: t('Only affects this browse · won’t change your followed regions'), body, footer }), 'cr-location');
    // search matches city and canton names ("Vaud", "Ticino") — then "Select all matches"; with the
    // country list open it matches countries
    const search = searchField((v) => { q = v; paintChoices(); });
    const countryRow = h('div', { class: 'loc-country cr-country' });
    const choices = h('div');

    const isAll = () => picked.size === allIds.length;
    function total() {
      if (!picked.size) return 0;
      const ids = isAll() ? [] : [...picked];
      return applyFollowing(repo.query({ ...baseOpts({ cityIds: ids }), from, to })).length;
    }
    function checkRow(list, has, toggle, label, extra = null) {
      const allOn = list.length > 0 && list.every(has);
      const input = h('input', { type: 'checkbox', onchange: (e) => { toggle(list, e.target.checked); paintChoices(); } });
      input.checked = allOn;
      input.indeterminate = !allOn && list.some(has);
      return h('div', { class: 'cr-check-row' }, h('label', { class: 'cr-check' }, input, h('span', {}, label)), extra);
    }
    const flagFor = (x) => (x ? h('span', { class: 'flag-globe', 'aria-hidden': 'true' }, icon('globe', 13)) : h('span', { class: 'flag', 'aria-hidden': 'true' }));

    function paintCountryRow() {
      const x = otherCountry();
      clear(countryRow).append(
        h('b', {}, t('Current country: {country}', { country: x ? countryName(x.name) : t('Switzerland') })),
        h('button', { type: 'button', class: ['cr-other', countriesOpen && 'open'], 'aria-expanded': countriesOpen ? 'true' : 'false', onclick: () => { countriesOpen = !countriesOpen; q = ''; search.reset(); paintChoices(); } },
          flagFor(x), t('Other countries'), icon(countriesOpen ? 'down' : 'chevron', 12)));
      search.setPlaceholder(countriesOpen ? t('Search countries') : t('Search cities'));
    }

    // Sheng's "Other countries": chips with each country's events (only Switzerland has any here).
    function paintCountries() {
      const list = countries.filter((x) => !q || normalize(x.name).includes(q) || normalize(countryName(x.name)).includes(q));
      fill(choices, h('div', { class: 'chip-wrap cr-country-chips' }, list.map((x) => chip(x.swiss ? t('Switzerland') : countryName(x.name), {
        count: x.swiss ? swissTotal : 0,
        active: x.swiss ? !current : current === x.id,
        onClick: () => setCountry(x.swiss ? null : x.id),
      }))), list.length ? null : h('p', { class: 'cr-none' }, t('No country matches')));
    }

    function paintSwiss() {
      const visible = cities.filter((c) => cityMatches(c, q));
      const toggle = (list, on) => { for (const c of list) on ? picked.add(c.id) : picked.delete(c.id); };
      // Like Sheng for a country without sub-regions: "Select all" + city chips with counts
      fill(choices,
        checkRow(visible, (c) => picked.has(c.id), toggle, q ? t('Select all matches') : t('Select all'),
          h('a', { class: 'cr-map', href: '#/map', onclick: () => sheet.close() }, icon('map', 13), t('Map'), icon('chevron', 11))),
        h('div', { class: 'chip-wrap cr-city-chips' }, visible.map((c) => chip(cityName(c), {
          count: counts.get(c.id), active: picked.has(c.id),
          onClick: () => { picked.has(c.id) ? picked.delete(c.id) : picked.add(c.id); paintChoices(); },
        }))),
        visible.length ? null : h('p', { class: 'cr-none' }, t('No city matches')));
    }

    // Another country: Sheng's regions (with › to open their cities) and its other cities, all 0 events.
    function paintOther(x) {
      const toggle = (list, on) => { for (const n of list) on ? xPicked.add(n) : xPicked.delete(n); };
      const cityChip = (n) => chip(placeName(n), { count: 0, active: xPicked.has(n), onClick: () => { xPicked.has(n) ? xPicked.delete(n) : xPicked.add(n); paintChoices(); } });
      const note = h('div', { class: 'cr-note' }, icon('info', 15),
        h('p', {}, t('No listings for {country} yet — Klang reads Swiss venues’ own calendars.', { country: countryName(x.name) })));
      const all = countryCities(x);
      if (q) {
        // a city matches by its name, or by its region's name ("Bavaria" / "巴伐利亚")
        const inRegion = (n) => x.regions.some((r) => r.cities.includes(n) && (normalize(r.name).includes(q) || normalize(regionName(r.name)).includes(q)));
        const hits = all.filter((n) => placeMatches(n, q) || inRegion(n));
        fill(choices, note, checkRow(hits, (n) => xPicked.has(n), toggle, t('Select all matches')),
          h('div', { class: 'chip-wrap cr-city-chips' }, hits.map(cityChip)),
          hits.length ? null : h('p', { class: 'cr-none' }, t('No city matches')));
        return;
      }
      const regions = x.regions.map((r) => {
        const open = openRegions.has(r.name);
        const allOn = r.cities.every((n) => xPicked.has(n));
        const input = h('input', { type: 'checkbox', 'aria-label': regionName(r.name), onchange: (e) => { toggle(r.cities, e.target.checked); paintChoices(); } });
        input.checked = allOn;
        input.indeterminate = !allOn && r.cities.some((n) => xPicked.has(n));
        return h('div', { class: ['cr-region', open && 'open'] },
          h('div', { class: 'cr-region-row' },
            input,
            h('button', { type: 'button', class: 'cr-region-name', 'aria-expanded': open ? 'true' : 'false', onclick: () => { open ? openRegions.delete(r.name) : openRegions.add(r.name); paintChoices(); } },
              h('span', { class: 'nm' }, regionName(r.name)), h('span', { class: 'n' }, tn(r.cities.length, '{n} city', '{n} cities')), icon(open ? 'down' : 'chevron', 12))),
          open ? h('div', { class: 'chip-wrap cr-city-chips' }, r.cities.map(cityChip)) : null);
      });
      fill(choices, note,
        checkRow(all, (n) => xPicked.has(n), toggle, t('Select all')),
        regions.length ? h('div', { class: 'cr-regions' }, regions) : null,
        x.cities.length ? [regions.length ? h('div', { class: 'cr-sub' }, t('Other cities')) : null,
          h('div', { class: 'chip-wrap cr-city-chips' }, x.cities.map(cityChip))] : null);
    }

    function paintChoices() {
      paintCountryRow();
      const x = otherCountry();
      if (countriesOpen) paintCountries();
      else if (x) paintOther(x);
      else paintSwiss();
      // CTA: "Confirm" while nothing changed, else Sheng's live "Show N events"
      if (x) {
        const all = countryCities(x);
        const names = xPicked.size === all.length ? null : all.filter((n) => xPicked.has(n));
        const unchanged = countryCityIds(x, names).sort().join(',') === initialKey();
        cta.textContent = unchanged ? t('Confirm') : tn(0, 'Show {n} event', 'Show {n} events');
        cta.disabled = xPicked.size === 0;
      } else {
        const n = total();
        const unchanged = !startCountry && [...picked].sort().join(',') === initialKey();
        cta.textContent = unchanged ? t('Confirm') : tn(n, 'Show {n} event', 'Show {n} events');
        cta.disabled = n === 0;
      }
    }
    cta.onclick = () => {
      const x = otherCountry();
      if (x) {
        const all = countryCities(x);
        const names = xPicked.size === all.length ? null : all.filter((n) => xPicked.has(n));
        store.setFilters({ cityIds: countryCityIds(x, names), day: null, lookBack: false });
      } else {
        store.setFilters({ cityIds: isAll() ? [] : [...picked] });
      }
      sheet.close();
      window.scrollTo(0, 0);
    };
    clear(body).append(search, countryRow, choices);
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
    const sheet = crSheet(openSheet({ title: t('Type'), body, footer: null }), 'cr-type');
    const chosen = () => (picked.size === TYPES.length ? [] : [...picked]);
    let footerShown = false;
    function paint() {
      clear(body).append(h('div', { class: 'chip-wrap cr-type-chips' }, TYPES.map((type) => chip(typeText(type), {
        active: picked.has(type),
        onClick: () => { picked.has(type) ? picked.delete(type) : picked.add(type); paint(); },
      }))));
      const n = picked.size ? countFor({ types: chosen() }) : 0;
      const unchanged = [...picked].sort().join(',') === initialKey;
      cta.textContent = tn(n, 'Show {n} event', 'Show {n} events');
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
  // Reloads the real listings (and a saved import URL) through feed.pullToRefresh().
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
    ptrStart = !ptrBusy && window.scrollY <= 0 && e.touches.length === 1 && !document.querySelector('.sheet.open') ? e.touches[0].clientY : null;
  };
  const onTouchMove = (e) => {
    if (ptrStart == null) return;
    const dy = e.touches[0].clientY - ptrStart;
    if (dy <= 0 || window.scrollY > 0) { ptr.classList.remove('dragging'); ptrShow(0); return; }
    ptr.classList.add('dragging');
    ptrShow(Math.min(PTR_MAX, dy * 0.5));
  };
  async function refreshListings() {
    ptrBusy = true;
    ptr.classList.add('busy');
    ptrShow(PTR_ARM);
    let added = null;
    try {
      const feed = await import('../feed.js');
      [added] = await Promise.all([feed.pullToRefresh(), new Promise((r) => setTimeout(r, 700))]);
    } catch { /* offline: say so below */ }
    ptrBusy = false;
    ptr.classList.remove('busy');
    ptrShow(0);
    // a change of listings repaints the whole page (main.js); otherwise repaint the list here
    if (listEl.isConnected) paintList();
    toast(added == null ? t('Could not load the listings') : added ? tn(added, '{n} new concert', '{n} new concerts') : t('Up to date'));
  }
  const onTouchEnd = () => {
    if (ptrStart == null) return;
    ptrStart = null;
    ptr.classList.remove('dragging');
    if (!ptr.classList.contains('armed')) { ptrShow(0); return; }
    refreshListings();
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
    title: t('Concerts'),
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
