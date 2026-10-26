// Shared building blocks. Views compose these; styling lives in css/app.css.
// Interface text goes through i18n.js (English / 简体中文); concert titles, venue names, performers and
// work titles stay as the venues publish them.

import { h, icon, TYPE_LABELS, toast } from '../util.js';
import * as repo from '../repo.js';
import * as store from '../store.js';
import { dayKeyOf, timeOf, todayKey, monthShort, dayNum, yearOf, isPast, daysBetween } from '../time.js';
import {
  t, tn, fmtN, isZh, relDay, dayMonth, dayMonthLong, weekdayName, weekdayLong, yearLabel,
  cityName, typeLabel, roleLabel, composerShort,
} from '../i18n.js';
import { portraitOf } from '../content/portraits.js';
import { ZH_ROLES_MORE } from '../i18n/zh-concert.js';

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

// Venue names stay as the venues publish them (never translated).
export function venueLabel(c) {
  return repo.venue(c.venueId)?.name || c.venueName || t('Venue to be announced');
}

// City in the interface language ("Zurich" / "苏黎世"); towns without a Chinese name keep their own.
export function cityLabel(c) {
  return cityName(repo.city(c.cityId)) || '';
}

// A listing's role ("Conductor", "Violin & direction", an opera character …) in the interface language.
// The one translator for roles (list cards, concert page, artist pages): Klang's shared names, a few
// more the listings use (ZH_ROLES_MORE), play-and-lead pairs ("Violin & direction" → "小提琴兼领奏"),
// instrument pairs ("Oboe & Cor anglais" → "双簧管、英国管") and "Tenor (Évangéliste)" → "男高音（Évangéliste）".
// Roles nobody has translated (opera characters, German credits) stay as published.
export function roleText(role) {
  if (!role) return '';
  const text = String(role).trim();
  if (!isZh()) return text;
  const one = (x) => {
    const r = t(x);
    if (r !== x) return r;
    const l = roleLabel(x);
    if (l !== x) return l;
    return ZH_ROLES_MORE[x] || ZH_ROLES_MORE[x.toLowerCase()] || null;
  };
  const whole = one(text);
  if (whole) return whole;
  const paren = text.match(/^(.+?)\s*\((.+)\)$/);
  if (paren && one(paren[1])) return `${one(paren[1])}（${paren[2]}）`;
  const parts = text.split(/\s*&\s*/);
  if (parts.length < 2) return text;
  const zh = parts.map(one);
  if (zh.some((x) => !x)) return text;
  return parts.some((p) => /^(conductor|direction)$/i.test(p)) ? zh.join('兼') : zh.join('、');
}

// A source's credit line from the feed ("Source: Casino Bern (casinobern.ch). Facts only; details and
// tickets via casinobern.ch."): in English as published; in Chinese rebuilt from its parts
// ("来源：Casino Bern（casinobern.ch）。此处仅列出基本信息……"). Used by the concert page and Legal.
export function sourceCredit(attribution, name = '') {
  const a = attribution || '';
  if (!isZh()) return a || null;
  const m = /^Source:\s*(.+?)\s*\(([^()]+)\)\.?\s*(.*)$/.exec(a);
  const who = m ? `${m[1]}（${m[2]}）` : name || '';
  if (!who) return null;
  const rest = m ? m[3] : '';
  const extra = [
    /facts only/i.test(rest) ? t('Facts only; details and tickets on the organiser’s site.') : null,
    /licen[cs]e: open use/i.test(rest) ? t('Licence: open use, source must be given.') : null,
  ].filter(Boolean).join('');
  return `${t('Source: {name}', { name: who })}。${extra}`;
}

// "Orchestral" / "管弦乐"
export const concertType = (type) => typeLabel(type, TYPE_LABELS[type]) || t('Concert');

export function statusTags(c) {
  const tags = [];
  if (c.status === 'cancelled') tags.push(h('span', { class: 'tag cancelled' }, t('Cancelled')));
  else if (isPast(c.start, c.durationMin)) tags.push(h('span', { class: 'tag ended' }, `○ ${t('Ended')}`));
  if (c.featured) tags.push(h('span', { class: 'tag featured' }, `★ ${t('Featured')}`));
  if (c.imported) tags.push(h('span', { class: 'tag import' }, t('Imported')));
  return tags;
}

const MARK_LABEL = { saved: 'Saved', going: 'Going', attended: 'Attended' };
function markDots(id) {
  const m = store.markOf(id);
  const kinds = store.MARK_KINDS.filter((k) => m[k]);
  return kinds.length ? kinds.map((k) => h('span', { class: `tag mark ${k}` }, h('i', { class: `mark-dot ${k}` }), t(MARK_LABEL[k]))) : null;
}

// Sheng's list meta date: "Today Oct 26" / "Oct 28, Wed" — Chinese "今天 10月26日" / "10月28日 周三".
// Only "Today" is red (Sheng); other years add the year.
function whenLine(day) {
  const today = todayKey();
  const diff = daysBetween(today, day);
  const rel = Math.abs(diff) <= 1 ? relDay(day, today) : null;
  const md = dayMonth(day);
  const otherYear = yearOf(day) !== yearOf(today);
  if (rel) return [h('span', { class: ['rel', diff === 0 && 'is-today'] }, rel), md];
  if (isZh()) return `${otherYear ? yearLabel(yearOf(day)) : ''}${md} ${weekdayName(day)}`;
  return [`${md}, ${weekdayName(day)}`, otherYear ? ` ${yearOf(day)}` : ''];
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
    const name = it.composer ? composerShort(it.composer) : it.composerShort || it.composerName;
    const last = byComposer[byComposer.length - 1];
    if (last && last.name === name) last.works.push(it.title);
    else byComposer.push({ name, works: [it.title].filter(Boolean) });
  }
  const ENS = new Set(['Orchestra', 'Ensemble', 'Choir']);
  const credits = (c.credits || []).filter((cr) => !ENS.has(cr.role));
  const ensembles = (c.credits || []).filter((cr) => ENS.has(cr.role));
  const colon = isZh() ? '：' : ': ';
  const status = c.status === 'cancelled' ? h('span', { class: 'cc-status cancelled' }, t('Cancelled'))
    : isPast(c.start, c.durationMin) ? h('span', { class: 'cc-status' }, h('span', { class: 'ring', 'aria-hidden': 'true' }), t('Ended')) : null;
  return h('a', { class: ['concert-card', c.status === 'cancelled' && 'is-cancelled'], href: href.concert(c.id), dataset: { day } },
    h('div', { class: 'cc-meta' },
      h('span', { class: ['when', isToday && 'today'] }, showDate !== 'time' ? whenLine(day) : timeOf(c.start)),
      where ? h('span', { class: 'where' }, h('span', { class: 'sep', 'aria-hidden': 'true' }, '·'), where) : null,
      status),
    h('div', { class: 'cc-badges' }, markDots(c.id), c.imported ? h('span', { class: 'tag import' }, t('Imported')) : null),
    h('div', { class: 'cc-title' }, c.title),
    c.series && h('div', { class: 'cc-series' }, c.series),
    // Who plays: the orchestra / ensemble / choir gets its own labelled line (recitals have none).
    ensembles.length > 0 ? h('div', { class: 'cc-ens' },
      ensembles.map((cr, i) => [i ? h('span', { class: 'sep', 'aria-hidden': 'true' }, ' · ') : '',
        h('span', { class: 'cr' }, h('span', { class: 'k' }, roleText(cr.role)), ' ', h('span', { class: 'n' }, cr.name))])) : null,
    credits.length > 0 ? h('div', { class: 'cc-credits' },
      credits.slice(0, 8).map((cr) => [h('b', {}, `${roleText(cr.role)}${colon}`), cr.name])
        .map((parts, i) => [i ? h('span', { class: 'sep' }, ' · ') : '', h('span', { class: 'cr' }, parts)])) : null,
    byComposer.length > 0 ? h('div', { class: 'cc-program' },
      byComposer.slice(0, 10).map((g) => h('div', { class: 'row' },
        h('div', { class: 'comp' }, g.name),
        g.works.map((w) => h('div', { class: 'work' }, w))))) : null,
    h('div', { class: 'cc-tags' }, h('span', { class: 'tag' }, concertType(c.type)), statusTags(c)));
}

// Day header: small kicker (Today / Tomorrow / weekday) above a serif date ("26 October" / "10月26日").
export function dayHeader(dayKey, count) {
  const today = todayKey();
  const rel = relDay(dayKey, today);
  const isToday = dayKey === today;
  const weekday = weekdayLong(dayKey);
  const kicker = rel ? `${rel} · ${weekday}` : weekday;
  const y = yearOf(dayKey);
  const date = y === yearOf(today) ? dayMonthLong(dayKey) : isZh() ? `${yearLabel(y)}${dayMonthLong(dayKey)}` : `${dayMonthLong(dayKey)} ${y}`;
  return h('div', { class: 'day-header', dataset: { day: dayKey } },
    h('div', { class: 'dh-main' },
      h('span', { class: ['dh-kicker', isToday && 'today'] }, kicker),
      h('span', { class: 'dh-date' }, date)),
    count != null && h('span', { class: 'n' }, tn(count, '{n} concert', '{n} concerts')));
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
    iconName && icon(iconName, 15), label, count != null && h('span', { class: 'count' }, fmtN(count)));
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
    btn.replaceChildren(icon(iconName, 15), t(on ? labelOn : labelOff));
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (!(on ? labelOn : labelOff)) btn.setAttribute('aria-label', t('Favourite'));
  };
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const on = store.toggleFollow(kind, id);
    toast(t(on ? 'Added to your favourites' : 'Removed from your favourites'));
    paint();
  });
  paint();
  return btn;
}

export function skeletonList(n = 3) {
  return h('div', {}, Array.from({ length: n }, () => h('div', { class: 'skeleton', style: { height: '130px', marginBottom: '10px' } })));
}
