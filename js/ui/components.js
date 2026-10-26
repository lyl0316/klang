// Shared building blocks. Views compose these; styling lives in css/app.css.

import { h, icon, TYPE_LABELS, toast } from '../util.js';
import * as repo from '../repo.js';
import * as store from '../store.js';
import { dayKeyOf, timeOf, todayKey, relDayLabel, monthShort, dayNum, yearOf, isPast, weekdayShort as weekdayShortOf } from '../time.js';
import { portraitOf } from '../content/portraits.js';

export const href = {
  concert: (id) => `#/concert/${encodeURIComponent(id)}`,
  composer: (id) => `#/composer/${encodeURIComponent(id)}`,
  work: (id) => `#/work/${encodeURIComponent(id)}`,
  artist: (id) => `#/artist/${encodeURIComponent(id)}`,
  venue: (id) => `#/venue/${encodeURIComponent(id)}`,
  city: (id) => `#/city/${encodeURIComponent(id)}`,
};

export function initials(name) {
  return (name || '?').split(/\s+/).filter((w) => /^[A-ZÀ-Ý]/.test(w)).slice(0, 2).map((w) => w[0]).join('') || name[0];
}

// Initials, topped by the composer's public-domain portrait when there is one. If the image
// can't load (offline, blocked) it is removed and the initials show through.
export function withFace(el, name, composerId = null, letters = null) {
  el.append(letters || initials(name));
  const p = portraitOf(composerId);
  if (!p) return el;
  const img = h('img', { class: 'face', src: p.src, alt: '', loading: 'lazy', decoding: 'async', referrerpolicy: 'no-referrer' });
  img.addEventListener('load', () => el.classList.add('has-face'));
  img.addEventListener('error', () => { img.remove(); el.classList.remove('has-face'); });
  el.append(img);
  return el;
}

export function avatar(name, small = false, composerId = null) {
  return withFace(h('div', { class: ['avatar', small && 'sm'] }), name, composerId);
}

export function venueLabel(c) {
  return repo.venue(c.venueId)?.name || c.venueName || 'Venue to be announced';
}

export function cityLabel(c) {
  return repo.city(c.cityId)?.name || '';
}

export function statusTags(c) {
  const tags = [];
  if (c.status === 'cancelled') tags.push(h('span', { class: 'tag cancelled' }, 'Cancelled'));
  else if (isPast(c.start, c.durationMin)) tags.push(h('span', { class: 'tag ended' }, '○ Ended'));
  if (c.featured) tags.push(h('span', { class: 'tag featured' }, '★ Featured'));
  if (c.source === 'import' || c.source === 'feed') tags.push(h('span', { class: 'tag import' }, 'Imported'));
  if (c.demo) tags.push(h('span', { class: 'tag demo' }, 'Demo'));
  return tags;
}

const MARK_LABEL = { saved: 'Saved', going: 'Going', attended: 'Attended' };
function markDots(id) {
  const m = store.markOf(id);
  const kinds = store.MARK_KINDS.filter((k) => m[k]);
  return kinds.length ? kinds.map((k) => h('span', { class: `tag mark ${k}` }, h('i', { class: `mark-dot ${k}` }), MARK_LABEL[k])) : null;
}

// Concert card like Sheng's list card. opts.hideCity when the list is filtered to one city;
// opts.showDate to print the date (lists not grouped by day).
export function concertCard(c, { hideCity = false, showDate = false } = {}) {
  const day = c.day || dayKeyOf(c.start);
  const isToday = day === todayKey();
  const where = [venueLabel(c), hideCity ? null : cityLabel(c)].filter(Boolean).join(' · ');
  const items = repo.programItems(c);
  const byComposer = [];
  for (const it of items) {
    const last = byComposer[byComposer.length - 1];
    if (last && last.name === it.composerShort) last.works.push(it.title);
    else byComposer.push({ name: it.composerShort || it.composerName, works: [it.title].filter(Boolean) });
  }
  const credits = (c.credits || []).filter((cr) => cr.role !== 'Orchestra' && cr.role !== 'Ensemble' && cr.role !== 'Choir');
  const ensembles = (c.credits || []).filter((cr) => cr.role === 'Orchestra' || cr.role === 'Ensemble' || cr.role === 'Choir');
  // Sheng's list meta line: "Today Oct 26 · Venue · City" / "Oct 28, Wed · Venue · City"
  const rel = relDayLabel(day);
  const md = `${monthShort(day)} ${dayNum(day)}`;
  // Sheng: only "Today" is red; "Tomorrow Oct 27" is plain bold white.
  const whenParts = rel === 'Today' || rel === 'Tomorrow' || rel === 'Yesterday'
    ? [h('span', { class: ['rel', rel === 'Today' && 'is-today'] }, rel), md]
    : [`${md}, ${weekdayShortOf(day)}`, yearOf(day) !== yearOf(todayKey()) ? ` ${yearOf(day)}` : ''];
  const status = c.status === 'cancelled' ? h('span', { class: 'cc-status cancelled' }, 'Cancelled')
    : isPast(c.start, c.durationMin) ? h('span', { class: 'cc-status' }, h('span', { class: 'ring', 'aria-hidden': 'true' }), 'Ended') : null;
  return h('a', { class: ['concert-card', c.status === 'cancelled' && 'is-cancelled'], href: href.concert(c.id), dataset: { day } },
    h('div', { class: 'cc-meta' },
      h('span', { class: ['when', isToday && 'today'] }, showDate !== 'time' ? whenParts : timeOf(c.start)),
      where ? h('span', { class: 'where' }, h('span', { class: 'sep', 'aria-hidden': 'true' }, '·'), where) : null,
      status),
    h('div', { class: 'cc-badges' }, markDots(c.id), c.demo ? h('span', { class: 'tag demo' }, 'Demo') : null,
      (c.source === 'import' || c.source === 'feed') ? h('span', { class: 'tag import' }, 'Imported') : null),
    h('div', { class: 'cc-title' }, c.title),
    c.series && h('div', { class: 'cc-series' }, c.series),
    (credits.length > 0 || ensembles.length > 0) ? h('div', { class: 'cc-credits' },
      [...credits.slice(0, 8).map((cr) => [h('b', {}, `${cr.role}: `), cr.name]), ...ensembles.map((cr) => [cr.name])]
        .map((parts, i) => [i ? h('span', { class: 'sep' }, ' · ') : '', h('span', { class: 'cr' }, parts)])) : null,
    byComposer.length > 0 ? h('div', { class: 'cc-program' },
      byComposer.slice(0, 10).map((g) => h('div', { class: 'row' },
        h('div', { class: 'comp' }, g.name),
        g.works.map((w) => h('div', { class: 'work' }, w))))) : null,
    h('div', { class: 'cc-tags' }, h('span', { class: 'tag' }, TYPE_LABELS[c.type] || 'Concert'), statusTags(c)));
}

const WEEKDAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Day header: small kicker (Today / Tomorrow / weekday) above a serif date ("26 October").
export function dayHeader(dayKey, count) {
  const today = todayKey();
  const rel = relDayLabel(dayKey, today);
  const isToday = dayKey === today;
  const [y, m, d] = dayKey.split('-').map(Number);
  const weekday = WEEKDAY_LONG[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  const kicker = rel === 'Today' || rel === 'Tomorrow' || rel === 'Yesterday' ? `${rel} · ${weekday}` : weekday;
  const date = `${d} ${MONTH_LONG[m - 1]}${y !== yearOf(today) ? ` ${y}` : ''}`;
  return h('div', { class: 'day-header', dataset: { day: dayKey } },
    h('div', { class: 'dh-main' },
      h('span', { class: ['dh-kicker', isToday && 'today'] }, kicker),
      h('span', { class: 'dh-date' }, date)),
    count != null && h('span', { class: 'n' }, `${count} concert${count === 1 ? '' : 's'}`));
}

// Compact row: date block + title + venue/city. Used on entity pages.
export function eventRow(c) {
  const day = c.day || dayKeyOf(c.start);
  const showYear = yearOf(day) !== yearOf(todayKey());
  return h('a', { class: 'event-row', href: href.concert(c.id) },
    h('div', { class: 'date-block' },
      h('div', { class: 'd' }, dayNum(day)),
      h('div', { class: 'm' }, monthShort(day)),
      showYear ? h('div', { class: 'y' }, yearOf(day)) : null,
      h('div', { class: 'tm' }, timeOf(c.start))),
    h('div', { class: 'main' },
      h('div', { class: 't' }, c.title),
      h('div', { class: 's' }, [venueLabel(c), cityLabel(c)].filter(Boolean).join(' · ')),
      h('div', { class: 'cc-tags' }, statusTags(c))),
    icon('chevron', 16, 'faint'));
}

export function sectionHead(title, more = null) {
  return h('div', { class: 'section-head' }, h('h2', { class: 'h2' }, title), more);
}

export function moreLink(label, to) {
  return h('a', { class: 'more', href: to }, label, icon('chevron', 14));
}

export function emptyState(iconName, title, text, action = null) {
  return h('div', { class: 'empty' }, icon(iconName, 34), h('h3', {}, title), text && h('p', {}, text), action);
}

export function chip(label, { active = false, count = null, onClick = null, iconName = null, cls = '' } = {}) {
  return h('button', { class: ['chip', active && 'active', count === 0 && 'zero', cls], onclick: onClick, 'aria-pressed': active ? 'true' : 'false' },
    iconName && icon(iconName, 15), label, count != null && h('span', { class: 'count' }, count.toLocaleString('en-US')));
}

export function segmented(options, value, onChange) {
  const wrap = h('div', { class: 'segmented', role: 'tablist' });
  for (const [val, label] of options) {
    wrap.append(h('button', { class: val === value ? 'active' : '', role: 'tab', 'aria-selected': val === value ? 'true' : 'false', onclick: () => onChange(val) }, label));
  }
  return wrap;
}

export function toggle(checked, onChange, label) {
  const input = h('input', { type: 'checkbox', 'aria-label': label });
  input.checked = !!checked;
  input.addEventListener('change', () => onChange(input.checked));
  return h('label', { class: 'switch' }, input, h('span'));
}

export function rowItem({ title, subtitle = null, to = null, onClick = null, right = null, leadIcon = null }) {
  const tag = to ? 'a' : onClick ? 'button' : 'div';
  return h(tag, { class: 'row-item', href: to, onclick: onClick, style: tag === 'button' ? { width: '100%', textAlign: 'left' } : null },
    leadIcon && h('span', { class: 'lead-icon' }, icon(leadIcon, 18)),
    h('div', { class: 'main' }, h('div', { class: 't' }, title), subtitle && h('div', { class: 's' }, subtitle)),
    h('div', { class: 'right' }, right, (to || onClick) && icon('chevron', 16)));
}

// Follow button for venue / city / composer / artist / work
// Favourite (♡) toggle like Sheng's hearts — personal only, stored on this device.
export function followButton(kind, id, { labelOn = 'Favourite', labelOff = 'Favourite', iconName = 'heart' } = {}) {
  const btn = h('button', { class: 'btn small' });
  const paint = () => {
    const on = store.isFollowing(kind, id);
    btn.className = `btn small ${on ? 'on' : ''}`;
    btn.replaceChildren(icon(iconName, 15), on ? labelOn : labelOff);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  };
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const on = store.toggleFollow(kind, id);
    toast(on ? 'Added to your favourites' : 'Removed from your favourites');
    paint();
  });
  paint();
  return btn;
}

export function demoBanner() {
  return h('div', { class: 'demo-banner' }, icon('sparkle', 16),
    h('div', {}, 'Showing demo concerts (real venues and works, invented performers). ',
      h('a', { href: '#/settings' }, 'Import real listings'), ' or turn demo data off in Settings.'));
}

export function skeletonList(n = 3) {
  return h('div', {}, Array.from({ length: n }, () => h('div', { class: 'skeleton', style: { height: '130px', marginBottom: '10px' } })));
}
