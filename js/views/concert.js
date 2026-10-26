// Concert detail (#/concert/:id), mirroring Sheng's concert page in order and look:
//  1. floating back · share (share sheet: Share…, Copy link, Add to calendar, Hide) over a header
//     band: bold centred sans title, grey series, gold Swiss date ("Wed, Dec 2, 7:30 PM" /
//     "12月2日 周三 19:30") plus the viewer's own clock when their time zone differs, "Duration: ≈ N min",
//     gold "City | Venue · room ☆"
//  2. action bar (5 square tiles): Listen · Program · Notes · Podcasts · Ticket — jump to sections,
//     greyed out when there is nothing to show; Ticket opens the organiser's ticket / event page
//  3. ♡ Save + Going (upcoming) / ♡ Save + Attended (started) and the private review
//  4. Listen carousel: one big card per programme work (chosen recording). The round ring plays Apple's
//     30-second preview inside Klang (ui/preview.js), "Apple Music Classical ↗" opens the full
//     recording there; Versions · Add. ▶ Play all previews the whole programme in order, and a
//     separate link opens it in Apple Music Classical (or Apple Music, chosen in Me). iTunes credit.
//  5. red pill "Program": roles table + works as the listing gives them
//  6. red pill "Program book": one chapter per programme work Klang has notes for (none are invented
//     for works outside the repertoire), with a chapter rail and a full-screen reader (double-tap)
//  7. PODCASTS (Apple Podcasts episodes) · 8. FEATURED ARTISTS (composers + performers)
//  9. where the listing comes from ("Listing from <organiser> · Details & tickets ›") and Report a problem
// Every concert is a real listing (feed.js reads the organisers' own websites) or one the user imported.
// Personal only: marks, review, favourites and the playlist live on this device; nothing is social.
// Interface text goes through i18n.js (Chinese strings in js/i18n/zh-concert.js); titles, venue names,
// work titles and the programme notes stay as published.

import { h, icon, clear, toast, download, normalize } from '../util.js';
import * as repo from '../repo.js';
import * as store from '../store.js';
import { isPast, relDayLabel, TZ } from '../time.js';
import { buildICS, searchTitle, englishTitle, englishNumbered, workNumber, arrangerOf } from '../ics.js';
import { artwork, searchAlbums, albumTracks, searchPodcasts, preview, previewState, ITUNES_CREDIT } from '../music.js';
import { listenLink, onListening, workPiece, albumPiece, toPlain, pieceURL, searchURL, playAppName } from '../applemusic.js';
import { openSheet } from '../ui/sheet.js';
import { openVersionsSheet, matchWorkTracks, searchTerm, previewQueue, catalogKeys, oneWorkAlbum } from '../ui/listen.js';
import { previewButton, classicalButton } from '../ui/preview.js';
import { openSaveSheet } from '../ui/save.js';
import { href, emptyState, followButton, avatar, roleText, sourceCredit } from '../ui/components.js';
import { GUIDES, WIDELY_LOVED, HOOKS } from '../content/guides.js';
import { goBack } from '../main.js';
import {
  t, tn, isZh, dayMonth, weekdayName, yearLabel, cityName, composerShort,
} from '../i18n.js';

const SEARCH_LIMIT = 25; // same limit as ui/listen.js, so the Versions sheet reuses the cached search
const PODCAST_WORKS = 2; // search podcasts for the first two works
const PODCAST_PER_WORK = 2;
const PODCAST_MAX = 3;
const PLAY_ALL_WAIT = 8000; // Play all starts with what is lined up by then
const ALBUM_PREVIEW_MAX = 40; // a recording whose work can't be told apart previews from its start

const MARKS = [
  { kind: 'saved', iconName: 'heart', off: 'Save', on: 'Saved', toastOn: 'Saved to My Concerts', toastOff: 'Removed from Saved' },
  { kind: 'going', iconName: 'ticket', off: 'Going', on: 'Going', toastOn: 'Marked as Going', toastOff: 'No longer Going' },
  { kind: 'attended', iconName: 'ticket', off: 'Attended', on: 'Attended', toastOn: 'Marked as Attended — add your review', toastOff: 'Removed from Attended' },
];

// ---------- small helpers ----------
const itemKey = (it, i) => it.work?.id || `item-${i}`;
const sameId = (a, b) => a != null && b != null && String(a) === String(b);
const reduceMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const scrollBehavior = () => (reduceMotion() ? 'auto' : 'smooth');
const jumpTo = (el) => el?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
const extAttrs = { target: '_blank', rel: 'noopener' };
const colon = () => (isZh() ? '：' : ': ');
const comma = () => (isZh() ? '，' : ', ');
// space-padded word tokens, so includes(' mozart ') respects word boundaries
const tok = (s) => ` ${normalize(s || '').replace(/[^a-z0-9]+/g, ' ').trim()} `;
// The same, with German / French / English spellings of a name brought together, so a listing's
// "Prokofjew", "Schostakowitsch" or "Rachmaninow" finds Apple's "Prokofiev", "Shostakovich", "Rachmaninoff".
const nameKey = (s) => tok(s).replace(/ae/g, 'a').replace(/oe/g, 'o').replace(/ue/g, 'u')
  .replace(/tsch/g, 'ch').replace(/sch/g, 'sh').replace(/tch/g, 'ch').replace(/ff /g, 'v ').replace(/w/g, 'v').replace(/j/g, 'i').replace(/y /g, 'i ');

const venueText = (c) => repo.venue(c.venueId)?.name || c.venueName || t('Venue to be announced');
const cityText = (c) => (c.cityId ? cityName(repo.city(c.cityId)) : '');
// The composer as shown (Chinese name when there is one), the listing's own spelling otherwise.
const compLabel = (it) => (it.composer ? composerShort(it.composer) : it.composerShort || it.composerName || '');

// Roles: the shared translator (ui/components.js roleText); opera characters stay as published.

function viewerTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

// { day: 'YYYY-MM-DD', time: 'HH:MM' } of an instant in a time zone
function zonedParts(date, timeZone) {
  const o = {};
  const f = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  for (const p of f.formatToParts(date)) o[p.type] = p.value;
  return { day: `${o.year}-${o.month}-${o.day}`, time: `${o.hour}:${o.minute}` };
}

// "Wed, Dec 2, 7:30 PM" / "12月2日 周三 19:30" in the given time zone (year added when it isn't this year).
function fmtWhen(iso, timeZone) {
  const d = new Date(iso);
  try {
    if (isZh()) {
      const { day, time } = zonedParts(d, timeZone);
      const year = day.slice(0, 4);
      const thisYear = zonedParts(new Date(), timeZone).day.slice(0, 4);
      return `${year !== thisYear ? yearLabel(year) : ''}${dayMonth(day)} ${weekdayName(day)} ${time}`;
    }
    const yearOfDate = (x) => new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric' }).format(x);
    const withYear = yearOfDate(d) !== yearOfDate(new Date());
    const date = new Intl.DateTimeFormat('en-US', {
      timeZone, weekday: 'short', month: 'short', day: 'numeric', ...(withYear ? { year: 'numeric' } : {}),
    }).format(d);
    const time = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit' }).format(d);
    return `${date}, ${time}`;
  } catch {
    return d.toLocaleString();
  }
}

// "New York time: Wed, Dec 2, 1:30 PM" — only when the viewer's clock differs from Swiss time.
function viewerTimeLine(iso) {
  const tz = viewerTimeZone();
  if (!tz || tz === TZ) return null;
  const mine = fmtWhen(iso, tz);
  if (mine === fmtWhen(iso, TZ)) return null;
  return t('{zone} time: {when}', { zone: tz.split('/').pop().replace(/_/g, ' '), when: mine });
}

function durationMinutes(c, items) {
  if (c.durationMin) return c.durationMin;
  const music = items.reduce((s, it) => s + (it.work?.minutes || 0), 0);
  return music || null;
}

function shareURL(c) {
  return `${location.href.split('#')[0]}${href.concert(c.id)}`;
}

function whereLine(c) {
  return [[venueText(c), c.room].filter(Boolean).join(' · '), cityText(c)].filter(Boolean).join(comma());
}

async function copyText(text, ok = 'Link copied') {
  try {
    await navigator.clipboard.writeText(text);
    toast(t(ok));
  } catch {
    toast(t('Couldn’t copy — use the address bar link'));
  }
}

async function shareConcert(c) {
  const url = shareURL(c);
  const text = t('{title} — {when} (Swiss time), {where}', { title: c.title, when: fmtWhen(c.start, TZ), where: whereLine(c) });
  if (navigator.share) {
    try {
      await navigator.share({ title: c.title, text, url });
      return;
    } catch (err) {
      if (err?.name === 'AbortError') return;
    }
  }
  copyText(`${text}\n${url}`);
}

// One programme line as plain text (calendar file, copied details): "Composer: Title, Op. 1"
function programLine(it) {
  return [it.composerName, it.rawTitle || [it.title, it.catalog].filter(Boolean).join(', ')].filter(Boolean).join(': ');
}

function addToCalendar(c, items) {
  const ics = buildICS([{
    concert: c,
    venueName: [venueText(c), c.room].filter(Boolean).join(' – '),
    cityName: repo.city(c.cityId)?.name || '',
    programLines: items.map(programLine),
    creditLines: (c.credits || []).map((cr) => `${cr.role}: ${cr.name}`),
  }], { reminderDays: store.pref('reminderDays') || [] });
  download(`klang-${String(c.id).replace(/[^a-z0-9-]+/gi, '-')}.ics`, ics, 'text/calendar');
  const days = store.pref('reminderDays') || [];
  const list = isZh() ? days.map((d) => `${d} 天`).join('、') : days.map((d) => `${d}d`).join(' & ');
  toast(days.length ? t('Calendar file ready · reminders {days} before', { days: list }) : t('Calendar file ready'));
}

function toggleHide(c) {
  const now = store.toggleHidden(c.id);
  toast(t(now ? 'Hidden from your lists — undo in Me › Hidden concerts' : 'Shown in your lists again'));
}

// Plain text + _italic_ -> nodes
function inline(text) {
  const out = [];
  const re = /_([^_\n]+)_/g;
  let last = 0;
  let m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(h('em', {}, m[1]));
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const paragraphs = (text) => String(text || '').split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);

// SF Symbols look-alikes used by Sheng's concert page (static, trusted markup)
const SYM = {
  listen: '<circle cx="12" cy="12" r="10" fill="currentColor" stroke="none"/><path d="M9.8 7.9v8.2l6.6-4.1z" style="fill: var(--cp-sym-cut, #2a2a2e)" stroke="none"/>',
  program: '<circle cx="4.5" cy="6" r="1.3" fill="currentColor" stroke="none"/><circle cx="4.5" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="4.5" cy="18" r="1.3" fill="currentColor" stroke="none"/><path d="M9 6h12M9 12h12M9 18h12"/>',
  notes: '<path d="M5 4.6A2.6 2.6 0 0 1 7.6 2H19v15.2H7.6A2.6 2.6 0 0 0 5 19.4z" fill="currentColor" stroke="none"/><path d="M5 19.4A2.6 2.6 0 0 0 7.6 22H19v-4.8"/>',
  podcasts: '<path d="M3 10.5v3M6.5 8v8M10 4.5v15M13.5 7v10M17 9.5v5M20.5 11v2"/>',
  ticket: '<rect x="2.5" y="5" width="19" height="14" rx="3"/><rect x="6.5" y="8.6" width="11" height="6.8" rx="1"/>',
  report: '<path d="M8.2 5.6a8 8 0 1 0 7.6 0"/><path d="M12 3v7"/>',
  versions: '<path d="M20 11a8 8 0 0 0-14.3-4.6L4 8.5"/><path d="M4 3.5v5h5"/><path d="M4 13a8 8 0 0 0 14.3 4.6L20 15.5"/><path d="M20 20.5v-5h-5"/>',
};
function sym(name, size = 20, sw = 1.9) {
  return h('span', {
    class: 'icon',
    'aria-hidden': 'true',
    html: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${SYM[name]}</svg>`,
  });
}

function expandIcon() {
  return h('span', {
    class: 'icon',
    'aria-hidden': 'true',
    html: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
  });
}

// ---------- 1. header band ----------
function venueStar(venue) {
  const btn = followButton('venue', venue.id, { labelOn: '', labelOff: '', iconName: 'star' });
  btn.setAttribute('aria-label', t('Favourite venue: {name}', { name: venue.name }));
  btn.title = t('Favourite this venue');
  return h('span', { class: 'venue-follow' }, btn);
}

function headBand(c, items, bar) {
  const city = c.cityId ? repo.city(c.cityId) : null;
  const venue = c.venueId ? repo.venue(c.venueId) : null;
  const cancelled = c.status === 'cancelled';
  const mins = durationMinutes(c, items);
  const other = viewerTimeLine(c.start);
  const hiddenNote = h('div', { class: 'cp-hidden-note', hidden: true });
  const paintHidden = () => {
    const on = store.isHidden(c.id);
    hiddenNote.hidden = !on;
    clear(hiddenNote);
    if (on) {
      hiddenNote.append(icon('eyeoff', 14), h('span', {}, t('Hidden from your lists')),
        h('button', { type: 'button', onclick: () => toggleHide(c) }, t('Show again')));
    }
  };
  paintHidden();
  const el = h('header', { class: 'cp-head' },
    h('h1', { class: ['cp-title', cancelled && 'is-cancelled'] }, c.title),
    c.series ? h('div', { class: 'cp-series' }, c.series) : null,
    h('div', { class: 'cp-when' }, h('time', { datetime: c.start }, fmtWhen(c.start, TZ))),
    other ? h('div', { class: 'cp-when-sub' }, other) : null,
    mins ? h('div', { class: 'cp-when-sub' }, t('Duration: ≈ {n} min', { n: mins })) : null,
    h('div', { class: 'cp-where' },
      city ? h('a', { href: href.city(city.id) }, cityName(city)) : null,
      city ? h('span', { class: 'sep', 'aria-hidden': 'true' }, '|') : null,
      h('span', { class: 'cp-venue' },
        venue ? h('a', { href: href.venue(venue.id) }, venueText(c)) : h('span', {}, venueText(c)),
        c.room ? h('span', { class: 'cp-room' }, ` · ${c.room}`) : null,
        venue ? venueStar(venue) : null)),
    cancelled ? h('p', { class: 'concert-alert' }, t('This concert has been cancelled. Check with the venue about tickets or a new date.')) : null,
    hiddenNote,
    bar.el);
  return { el, paintHidden };
}

// ---------- 2. action bar ----------
function actionBar(c) {
  const tile = (label, symName) => h('button', { type: 'button', class: 'cp-act' }, sym(symName, 22), h('span', {}, t(label)));
  const ticketUrl = c.ticketUrl || c.sourceUrl || null;
  const tiles = {
    listen: tile('Listen', 'listen'),
    program: tile('Program', 'program'),
    notes: tile('Notes', 'notes'),
    podcasts: tile('Podcasts', 'podcasts'),
    ticket: ticketUrl
      ? h('a', { class: 'cp-act', href: ticketUrl, ...extAttrs, 'aria-label': t('Tickets (opens the organiser’s site)') }, sym('ticket', 22), h('span', {}, t('Ticket')))
      : tile('Ticket', 'ticket'),
  };
  const el = h('nav', { class: 'cp-actions', 'aria-label': t('Concert sections') }, Object.values(tiles));
  function set(key, on, target = null) {
    const tl = tiles[key];
    if (!tl || tl.tagName === 'A') return;
    tl.disabled = !on;
    tl.classList.toggle('off', !on);
    if (target !== null) tl.onclick = () => jumpTo(target);
  }
  set('listen', false);
  set('program', false);
  set('notes', false);
  set('podcasts', false);
  if (!ticketUrl) set('ticket', false);
  return { el, set };
}

// ---------- 3. marks + review ----------
// Like Sheng: upcoming concerts offer Save + Going; once a concert has started, Save + Attended.
// A mark that is already set is always shown so it can be undone.
function markButtons(c, m, started) {
  const wanted = started ? ['saved', 'attended'] : ['saved', 'going'];
  return h('div', { class: 'mark-row' }, MARKS.filter((def) => wanted.includes(def.kind) || m[def.kind]).map((def) => {
    const on = !!m[def.kind];
    const locked = def.kind === 'attended' && !on && (!started || c.status === 'cancelled');
    return h('button', {
      type: 'button',
      class: ['btn', 'small', def.kind, on && 'on'],
      dataset: { mark: def.kind },
      'aria-pressed': on ? 'true' : 'false',
      disabled: locked,
      title: locked ? t(c.status === 'cancelled' ? 'This concert was cancelled' : 'Available once the concert has started') : null,
      onclick: () => {
        const now = store.toggleMark(c.id, def.kind);
        toast(t(now ? def.toastOn : def.toastOff));
      },
    }, icon(def.iconName, 15), t(on ? def.on : def.off));
  }));
}

function starsStatic(n) {
  return h('div', { class: 'stars-static', role: 'img', 'aria-label': t('{n} out of 5 stars', { n }) },
    [1, 2, 3, 4, 5].map((i) => icon('star', 17, i <= n ? 'on' : 'off')));
}

const itemText = (it) => [compLabel(it), it.title].filter(Boolean).join(colon());

function reviewCard(c, items, m, keepSheet) {
  const favIndex = m.favoriteWorkId ? items.findIndex((it, i) => itemKey(it, i) === m.favoriteWorkId) : -1;
  const fav = favIndex >= 0 ? items[favIndex] : null;
  const has = !!(m.rating || m.note || fav || m.encores);
  return h('div', { class: 'note-card review-card' },
    h('div', { class: 'head' },
      h('div', { class: 'kicker' }, t('Your review')),
      h('button', { class: 'btn small', type: 'button', onclick: () => openReviewSheet(c, items, keepSheet) }, icon(has ? 'notes' : 'star', 15), t(has ? 'Edit' : 'Write a review'))),
    has
      ? [
        m.rating ? starsStatic(m.rating) : null,
        fav ? h('div', { class: 'line' }, h('b', {}, t('Favourite piece: ')), itemText(fav)) : null,
        m.encores ? h('div', { class: 'line' }, h('b', {}, t('Encores: ')), m.encores) : null,
        m.note ? h('div', { class: 'quote' }, m.note) : null,
        h('div', { class: 'private' }, t('Private · saved on this device only')),
      ]
      : h('div', { class: 'line' }, t('How was it? Rate it, pick your favourite piece and note the encores. Only you can see it.')));
}

function reviewHint(c, started) {
  if (c.status === 'cancelled') return h('div', { class: 'mark-hint' }, h('b', {}, t('Cancelled')), t('There’s nothing to review for this date.'));
  if (!started) return null;
  return h('div', { class: 'mark-hint' }, h('b', {}, t('You haven’t reviewed this performance yet')), t('Mark it as Attended to leave a review'));
}

function openReviewSheet(c, items, keepSheet) {
  const m = store.markOf(c.id);
  let rating = m.rating || 0;

  const stars = h('div', { class: 'stars', role: 'radiogroup', 'aria-labelledby': 'rv-rating' });
  const paintStars = () => clear(stars).append(...[1, 2, 3, 4, 5].map((i) => h('button', {
    type: 'button',
    class: i <= rating ? 'on' : '',
    role: 'radio',
    'aria-checked': i === rating ? 'true' : 'false',
    'aria-label': tn(i, '{n} star', '{n} stars'),
    onclick: () => {
      rating = rating === i ? 0 : i;
      paintStars();
    },
  }, icon('star', 30))));
  paintStars();

  const fav = h('select', { class: 'input', id: 'rv-fav' },
    h('option', { value: '' }, t('No favourite')),
    items.map((it, i) => h('option', { value: itemKey(it, i) }, itemText(it))));
  fav.value = m.favoriteWorkId || '';
  const encores = h('input', { class: 'input', id: 'rv-enc', type: 'text', autocomplete: 'off', placeholder: t('e.g. Chopin: Nocturne Op. 9 No. 2') });
  encores.value = m.encores || '';
  const note = h('textarea', { class: 'input', id: 'rv-note', rows: '4', placeholder: t('What stayed with you?') });
  note.value = m.note || '';

  const body = h('div', { class: 'review-form' },
    h('div', { class: 'field' }, h('label', { id: 'rv-rating' }, t('Rating')), stars),
    items.length ? h('div', { class: 'field' }, h('label', { for: 'rv-fav' }, t('Favourite piece')), fav) : null,
    h('div', { class: 'field' }, h('label', { for: 'rv-enc' }, t('Encores')), encores),
    h('div', { class: 'field' }, h('label', { for: 'rv-note' }, t('Private note')), note));

  const hadReview = !!(m.rating || m.note || m.favoriteWorkId || m.encores);
  const save = h('button', { class: 'btn primary block', type: 'button' }, t('Save review'));
  const footer = h('div', {}, save,
    hadReview ? h('button', {
      class: 'btn small review-clear',
      type: 'button',
      onclick: () => {
        store.setReview(c.id, { rating: null, favoriteWorkId: null, encores: null, note: null });
        sheet.close();
        toast(t('Review cleared'));
      },
    }, t('Clear review')) : null,
    h('div', { class: 'hint' }, t('Stored only on this device · included in your backup')));
  const sheet = keepSheet(openSheet({ title: t('Your review'), subtitle: `${c.title} · ${relDayLabel(c.day)}`, body, footer }));
  save.onclick = () => {
    store.setReview(c.id, {
      rating: rating || null,
      favoriteWorkId: (items.length && fav.value) || null,
      encores: encores.value.trim() || null,
      note: note.value.trim() || null,
    });
    sheet.close();
    toast(t('Review saved'));
  };
}

// ---------- 4. listen carousel ----------
// Two ways to listen, side by side (Apple's free interfaces only):
//  · the round ring plays Apple's 30-second preview of the chosen recording inside Klang (music.js
//    preview, streamed only), the work's movements one after another; ▶ Play all previews the whole
//    programme in order;
//  · "Apple Music Classical ↗" (or Apple Music, chosen in Me) opens the full recording there, at the
//    work's first movement, to play with the listener's own subscription.
// "Add" puts the piece in a playlist and/or its album in the Library (ui/save.js).

// Search text for a programme line: ics.js searchTitle (notes in brackets dropped) and englishTitle
// (Apple's catalogue is titled in English: "Sinfonie für Streichorchester Nr. 8" -> "String Symphony No. 8").

// A programme line the repertoire doesn't know: searched on Apple Music by composer + title as listed.
// Its id is the work page's ('x-…', repo.js work index), so a version chosen here is the work page's too.
function standInWork(it) {
  const comp = it.composer?.short || it.composerName || '';
  const surname = it.composer ? comp : comp.trim().split(/\s+/).pop() || '';
  const title = it.title;
  const key = normalize(`${surname} ${title}`).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60);
  const cats = catalogKeys(`${title} ${it.catalog || ''}`);
  // an overture listed with the opera's number: only the overture's track ("…, K. 620: Overture")
  const overture = /ouvert[uü]re|overture/i.test(title) ? cats.flatMap((k) => [`${k} Overture`, `${k} Ouverture`]) : [];
  // a work known by its name: «Turn», “Veränderungen”
  const quoted = [...title.matchAll(/[«“„"]([^»”“"]{3,40})[»”“"]/g)].map((m) => m[1].trim());
  // Apple's English track titles: "Klavierkonzert Nr. 3" is "Piano Concerto No. 3"
  const english = englishNumbered(title);
  const listed = it.workKey && it.workKey.startsWith('x-') ? repo.dynamicWork(it.workKey) : null;
  return {
    id: it.workKey && it.workKey.startsWith('x-') ? it.workKey : `x-${key}`,
    composerId: it.composer?.id || null,
    composerName: comp || null,
    title,
    catalog: it.catalog || null,
    keys: [...overture, ...cats, ...quoted, ...(english ? [english] : [])], // tell the work's tracks apart on an album
    q: [surname, searchTitle(title), it.catalog && !title.includes(it.catalog) ? it.catalog : null].filter(Boolean).join(' '),
    qEnglish: [surname, englishTitle(title)].filter(Boolean).join(' '),
    // the last resort, as on the work page: composer + catalogue number ("Prokofjew Op. 125")
    qCatalog: surname && listed?.catalog ? `${surname} ${listed.catalog}` : null,
    qBroad: surname ? repo.broadTerm(surname, englishTitle(title)) : null, // when nothing at all was found
    num: workNumber(englishTitle(title)),
    arranger: arrangerOf(title), // Pletnev's two-piano Unfinished is only on albums that name Pletnev
  };
}

// One entry per distinct programme work.
function listenEntries(items) {
  const seen = new Set();
  const out = [];
  for (const it of items) {
    let work = it.work;
    if (!work) {
      if (!it.title) continue;
      work = standInWork(it);
    }
    if (seen.has(work.id)) continue;
    seen.add(work.id);
    const name = it.composer?.short || it.composerName || '';
    // albums of a work outside the repertoire must name the composer ("Prokofiev: …"): surname key
    const surname = nameKey(it.composer ? name : name.trim().split(/\s+/).pop() || '');
    out.push({
      it,
      work,
      real: !!it.work,
      composer: it.composer?.short || it.composerShort || it.composerName || null, // stored with pieces: as listed
      shown: compLabel(it) || null,
      // the title as the listing publishes it ("Symphonie n°7 … D. 759"), not the repertoire's English one
      title: it.rawTitle || work.title,
      label: [compLabel(it), it.rawTitle || work.title].filter(Boolean).join(colon()),
      surname: surname.trim() ? surname : null,
      albums: null,
      albumsPromise: null,
      chosen: null,
      error: null,
      loading: false,
      tracks: null, // the work's tracks on the chosen album ([] = none matched)
      pvQueue: null, // those tracks as preview entries (the album's first tracks when none matched)
      tracksPromise: null,
      tracksToken: 0,
      visible: false,
      current: false, // the piece last sent to Apple Music (Now listening)
      linkKey: null,
    });
  }
  return out;
}

// Same piece of the programme? (ids change once a track id is known, so compare album + work)
function samePiece(a, b) {
  if (!a || !b || a.kind === 'album' || b.kind === 'album' || !sameId(a.collectionId, b.collectionId)) return false;
  return a.workId && b.workId ? a.workId === b.workId : a.title === b.title;
}

function swapEl(old, next) {
  const focused = document.activeElement === old;
  old.replaceWith(next);
  if (focused) next.focus({ preventScroll: true });
  return next;
}

function listenBlock(c, entries, ctx) {
  if (!entries.length) return null;

  // Your version when you chose one; else the first recording found — for a work outside the
  // repertoire, the first whose album title names the composer (otherwise only a search link).
  const pickChosen = (e) => {
    const id = store.listenChoice(e.work.id);
    const mine = e.albums.find((a) => sameId(a.id, id));
    if (mine) return mine;
    if (e.real) return e.albums[0] || null;
    // an album that also names the work ("… Op. 68", "Symphony No. 1") before one that merely names the composer
    return e.albums.find((a) => albumRank(e, a) === 2) || e.albums.find((a) => albumRank(e, a) === 1) || null;
  };
  // For a work outside the repertoire: 2 = the album names the composer and the work's number,
  // 1 = it names the composer (and no other number of the same kind), 0 = not this work.
  function albumRank(e, a) {
    if (e.work.arranger && !nameKey(`${a.title} ${a.artist}`).includes(nameKey(e.work.arranger))) return 0;
    if (!e.surname || !nameKey(a.title).includes(e.surname)) return 0;
    const title = tok(a.title);
    if ((e.work.keys || []).some((k) => title.includes(tok(k)))) return 2;
    const num = e.work.num;
    if (!num) return 1;
    const found = [...title.matchAll(new RegExp(` ${num.kind}s? (?:no|nr|nos) (\\d+)`, 'g'))].map((m) => m[1]);
    if (!found.length) return 1;
    return found.includes(num.n) ? 2 : 0; // "Symphony No. 5" is not Symphony No. 1
  }

  // The piece the Apple Music link opens: the chosen recording of the work, from its first movement
  // once the album's tracks are in (until then the album; with no recording, an Apple Music search).
  function entryPiece(e) {
    const work = { id: e.real ? e.work.id : null, title: e.work.title };
    return workPiece(work, e.composer, e.chosen, e.tracks?.[0] || null);
  }

  let linkedApp = playAppName(); // links follow the "Play in" choice made in Me
  // "Open in Apple Music Classical" for the whole programme (built by paintPlayAll once the cards exist)
  let openAllEl = h('a', { class: 'pv-btn pv-open cp-openall' });
  let openAllKey = '';
  const openAllNote = h('p', { class: 'cp-playall-note cp-openall-note' });

  // ----- tracks of the chosen version (prefetched for visible cards, so a tap plays the work itself) -----
  let wantAll = false; // Play all is near: line up every work
  function ensureTracks(e) {
    if (!e.chosen || e.tracks) return Promise.resolve();
    if (e.tracksPromise) return e.tracksPromise;
    const token = ++e.tracksToken;
    const album = e.chosen;
    e.tracksPromise = albumTracks(album.id)
      .then(({ tracks }) => {
        if (token !== e.tracksToken) return;
        e.tracks = onlyThePart(e, matchWorkTracks(e.work, tracks)?.tracks || []);
        // a listed work whose tracks can't be found previews the recording from its start only when
        // the album holds that one work (never another concerto of the same album)
        const fromStart = e.real || oneWorkAlbum(tracks) ? tracks.slice(0, ALBUM_PREVIEW_MAX) : [];
        e.pvQueue = previewQueue(e.tracks.length ? e.tracks : fromStart,
          { work: e.real ? e.work : null, composer: e.composer, album });
      })
      .catch(() => {}) // the album link still works; tried again when the card comes back into view
      .finally(() => {
        if (token !== e.tracksToken) return;
        e.tracksPromise = null;
        if (ctx.alive()) paintLinks(e);
      });
    return e.tracksPromise;
  }
  const wanted = (e) => e.visible || wantAll;
  // A listed overture or prelude ("Ouvertüre zu «La forza del destino»") matches every track of the
  // opera's album by name: keep only its own track, so Play all doesn't preview the whole opera.
  const PART = /\b(ouvert[uü]re|overture|vorspiel|pr[eé]lude|preludio|sinfonia)\b/i;
  function onlyThePart(e, tracks) {
    if (e.real || !PART.test(e.work.title || '') || tracks.length < 2) return tracks;
    const own = tracks.filter((tr) => PART.test(tr.title || ''));
    return own.length ? own.slice(0, 1) : tracks;
  }

  function applyChosen(e) {
    if (!e.albums) return;
    const next = pickChosen(e);
    if (sameId(next?.id, e.chosen?.id)) return;
    e.chosen = next;
    e.tracks = null;
    e.pvQueue = null;
    e.tracksPromise = null;
    e.tracksToken += 1;
    paintCard(e);
    if (wanted(e)) ensureTracks(e);
  }

  function loadAlbums(e) {
    e.loading = true;
    e.error = null;
    paintCard(e);
    e.albumsPromise = searchAlbums(searchTerm(e.work), SEARCH_LIMIT)
      .then((list) => { e.albums = list; }, (err) => { e.albums = null; e.error = err || new Error('failed'); })
      .then(async () => {
        // a listing's own (German, French…) title found no album naming the work: try the English form,
        // then composer + catalogue number, and with nothing found at all the English form without its number
        for (const q of [e.work.qEnglish, e.work.qCatalog, e.work.qBroad]) {
          if (e.real || !e.albums || !q || q === e.work.q || e.albums.some((x) => albumRank(e, x) === 2)) continue;
          if (q === e.work.qBroad && e.albums.some((x) => albumRank(e, x))) continue;
          try {
            const more = await searchAlbums(q, SEARCH_LIMIT);
            const before = e.albums;
            e.albums = [...more, ...before.filter((a) => !more.some((m) => sameId(m.id, a.id)))];
            if (e.albums.some((x) => albumRank(e, x) === 2) || (!before.some((x) => albumRank(e, x)) && pickChosen(e))) {
              e.work.q = q; // Versions and the search links use what worked
            } else e.albums = before;
          } catch { /* keep the results so far */ }
        }
      })
      .then(() => {
        e.loading = false;
        e.albumsPromise = null;
        if (!ctx.alive()) return;
        if (e.albums) e.chosen = pickChosen(e);
        paintCard(e);
        reportStatus();
        if (wanted(e)) ensureTracks(e);
      });
    return e.albumsPromise;
  }
  const albumsReady = (e) => (e.albums || e.error ? Promise.resolve() : e.albumsPromise || loadAlbums(e));

  // The chosen recording's preview queue, looked up when needed (the tap has already unlocked audio).
  async function lineUp(e) {
    await albumsReady(e);
    for (let i = 0; i < 3 && e.chosen && !e.pvQueue; i += 1) await ensureTracks(e);
    return e.pvQueue || [];
  }

  function reportStatus() {
    ctx.setListenReady(entries.some((e) => e.albums && e.albums.length));
  }

  // ----- card -----
  function cardPreview(e) {
    if (e.pvQueue?.length) return { track: e.pvQueue[0], queue: e.pvQueue };
    return lineUp(e).then((q) => (q.length ? { track: q[0], queue: q } : null));
  }

  function buildCard(e) {
    e.coverEl = h('div', { class: 'cp-lc-cover' });
    e.metaEl = h('div', { class: 'cp-lc-meta' });
    // Sheng's red Listen ring: Apple's 30-second preview, played here (▶ / ❚❚ with the time left)
    e.pvBtn = previewButton({
      resolve: () => cardPreview(e),
      cls: 'cp-lc-btn cp-lc-listen cp-lc-pv',
      label: t('Play a 30-second preview of {title}', { title: e.label }),
    });
    const versionsBtn = h('button', {
      type: 'button',
      class: 'cp-lc-btn',
      'aria-label': t('Versions: all recordings of {title}', { title: e.label }),
      onclick: () => ctx.keepSheet(openVersionsSheet(e.work, (a) => {
        if (!e.albums) e.albums = [a];
        else if (!e.albums.some((x) => sameId(x.id, a.id))) e.albums = [a, ...e.albums];
        applyChosen(e);
        reportStatus();
      }, { current: e.chosen?.id ?? null, firstAsDefault: e.real })),
    }, h('span', { class: 'ring' }, sym('versions', 21, 2.1)), h('span', { class: 'lbl' }, t('Versions')));
    e.saveRing = h('span', { class: 'ring' });
    e.saveLbl = h('span', { class: 'lbl' });
    e.saveBtn = h('button', {
      type: 'button',
      class: 'cp-lc-btn cp-lc-save',
      onclick: () => ctx.keepSheet(openSaveSheet(entryPiece(e))),
    }, e.saveRing, e.saveLbl);
    // the full recording in Apple Music Classical / Apple Music (rebuilt by paintLinks)
    e.openEl = h('a', { class: 'pv-btn pv-open cp-lc-open' });
    e.el = h('article', { class: 'cp-lc', role: 'listitem', 'aria-label': e.label },
      h('div', { class: 'cp-lc-comp' }, e.shown || ' '),
      h('div', { class: 'cp-lc-work' }, [e.title, e.real && !e.it.rawTitle ? e.work.catalog : null].filter(Boolean).join(', ')),
      e.coverEl,
      e.metaEl,
      h('div', { class: 'cp-lc-actions' }, e.pvBtn, versionsBtn, e.saveBtn),
      h('div', { class: 'cp-lc-openrow' }, e.openEl));
    paintCard(e);
    return e.el;
  }

  function placeholderArt() {
    return h('div', { class: 'cp-lc-art ph' }, icon('music', 34));
  }

  function paintCard(e) {
    clear(e.coverEl);
    clear(e.metaEl);
    const app = playAppName();
    if (e.loading || (!e.albums && !e.error)) {
      e.coverEl.append(h('div', { class: 'cp-lc-art skeleton', 'aria-hidden': 'true' }));
      e.metaEl.append(h('div', { class: 'skeleton cp-lc-skel' }), h('div', { class: 'skeleton cp-lc-skel short' }),
        h('span', { class: 'sr-only' }, t('Loading recordings…')));
    } else if (e.error && !e.albums) {
      e.coverEl.append(placeholderArt());
      e.metaEl.append(h('div', { class: 'cp-lc-artist' }, t('Couldn’t load recordings')),
        h('button', { type: 'button', class: 'cp-lc-retry', onclick: () => loadAlbums(e) }, t('Try again')));
    } else if (!e.chosen) {
      e.coverEl.append(placeholderArt());
      e.metaEl.append(h('div', { class: 'cp-lc-artist' }, t('No recording found on Apple Music')),
        h('a', { class: 'cp-lc-album', href: searchURL(searchTerm(e.work)), ...extAttrs }, t('Search {app}', { app })));
    } else {
      const a = e.chosen;
      // tapping the cover plays the preview, like the ring
      e.coverEl.append(h('button', {
        type: 'button',
        class: 'cp-lc-art-btn',
        'aria-label': t('Play a 30-second preview of {title} ({artist})', { title: e.label, artist: a.artist }),
        onclick: () => e.pvBtn.click(),
      }, a.artwork ? h('img', { class: 'cp-lc-art', src: artwork(a.artwork, 600), alt: '', loading: 'lazy' }) : placeholderArt()));
      // the album name opens the whole album
      e.metaEl.append(h('div', { class: 'cp-lc-artist' }, a.artist),
        listenLink(albumPiece(a), a.title || '', { cls: 'cp-lc-album', label: t('Play the whole album “{title}” in {app}', { title: a.title, app }) }));
    }
    // no preview without a recording (a search link stands in)
    e.pvBtn.disabled = !e.loading && !!(e.albums || e.error) && !e.chosen;
    e.linkKey = null;
    paintLinks(e);
    paintSave(e);
  }

  // The card's Apple Music link: rebuilt when the piece it opens changes (version chosen, tracks
  // loaded, or the app changed in Me).
  function paintLinks(e) {
    const piece = entryPiece(e);
    const key = `${pieceURL(piece)} ${playAppName()}`;
    if (key !== e.linkKey) {
      e.linkKey = key;
      e.openEl = swapEl(e.openEl, classicalButton(piece, { cls: ['cp-lc-open', e.current && 'current'].filter(Boolean).join(' ') }));
    }
    paintPlayAll();
  }

  function isSaved(e) {
    const p = entryPiece(e);
    if (p.collectionId && store.hasAlbum(p.collectionId)) return true;
    return store.userPlaylists().some((pl) => (pl.items || []).some((it) => samePiece(it, p)));
  }

  function paintSave(e) {
    const ready = !e.loading && !!(e.albums || e.error);
    const saved = ready && isSaved(e);
    e.saveBtn.disabled = !ready;
    e.saveBtn.classList.toggle('on', saved);
    e.saveRing.replaceChildren(icon(saved ? 'check' : 'plus', 20));
    e.saveLbl.textContent = t(saved ? 'In Library' : 'Add'); // not "Save": that word saves the concert itself
    e.saveBtn.setAttribute('aria-label', saved
      ? t('Saved in your Library: {title}. Change where it is saved', { title: e.label })
      : t('Save {title} to your Library', { title: e.label }));
  }

  function paintCurrent(cur) {
    for (const e of entries) {
      e.current = samePiece(cur, entryPiece(e));
      e.openEl.classList.toggle('current', e.current);
    }
  }

  // ----- carousel -----
  const carousel = h('div', { class: 'cp-carousel', role: 'list', 'aria-label': t('Recordings of the programme') },
    entries.map(buildCard));

  if (typeof IntersectionObserver === 'function') {
    const byEl = new Map(entries.map((e) => [e.el, e]));
    const io = new IntersectionObserver((list) => {
      for (const en of list) {
        const e = byEl.get(en.target);
        if (!e) continue;
        e.visible = en.isIntersecting;
        if (e.visible) ensureTracks(e);
      }
    }, { root: carousel, threshold: 0.35 });
    entries.forEach((e) => io.observe(e.el));
    ctx.observe(io);
  } else {
    entries.forEach((e) => { e.visible = true; });
  }

  // ----- ▶ Play all: previews of the whole programme, in order, inside Klang -----
  let allQueue = null;
  let allLoading = false;
  const playAllBtn = h('button', { type: 'button', class: 'cp-playall', 'aria-label': t('Preview the whole programme: 30 seconds of each movement, in order') });
  const playAllNote = h('p', { class: 'cp-playall-note', 'aria-live': 'polite' });

  // each work's movements; a recording whose work can't be told apart adds only its first track
  const programmeQueue = () => entries.flatMap((e) => (!e.pvQueue?.length ? [] : e.tracks?.length ? e.pvQueue : e.pvQueue.slice(0, 1)));
  const finished = (st) => !st.playing && !st.hasNext && st.duration > 0 && st.elapsed >= st.duration - 0.5;

  function paintPlayAllState(st = previewState()) {
    const mine = !!allQueue && allQueue.includes(st.track) && !finished(st);
    const playing = mine && st.playing;
    playAllBtn.classList.toggle('on', playing);
    playAllBtn.classList.toggle('loading', allLoading);
    playAllBtn.setAttribute('aria-pressed', playing ? 'true' : 'false');
    playAllBtn.replaceChildren(icon(allLoading ? 'music' : playing ? 'pause' : 'play', 14),
      h('span', {}, t(allLoading ? 'Loading…' : playing ? 'Pause' : mine ? 'Resume' : 'Play all')));
    playAllNote.replaceChildren(mine
      ? t('Previewing {i} of {n}: {title}', { i: allQueue.indexOf(st.track) + 1, n: allQueue.length, title: st.track.title || '' })
      : t('30-second previews of the whole programme, in order'));
  }

  playAllBtn.addEventListener('click', () => {
    const st = previewState();
    if (allQueue && allQueue.includes(st.track) && !finished(st)) {
      preview.toggle();
      return;
    }
    const go = () => {
      const q = programmeQueue();
      if (!q.length) {
        toast(t('No previews for this programme'));
        return;
      }
      allQueue = q;
      preview.play(q[0], q);
    };
    const ready = entries.every((e) => (e.albums || e.error) && (!e.chosen || e.pvQueue));
    if (ready) {
      go();
      return;
    }
    preview.unlock(); // iOS: audio may only start from the tap itself
    allLoading = true;
    paintPlayAllState();
    wantAll = true;
    const all = Promise.all(entries.map(lineUp));
    // start with the works lined up so far once the first one is ready (or after a few seconds)
    Promise.race([all, lineUp(entries[0]).then(() => new Promise((r) => ctx.later(r, 2500))), new Promise((r) => ctx.later(r, PLAY_ALL_WAIT))])
      .then(() => {
        allLoading = false;
        if (ctx.alive()) go();
        paintPlayAllState();
      });
  });
  ctx.onCleanup(preview.subscribe((st) => paintPlayAllState(st)));

  // ----- the full programme in Apple Music Classical / Apple Music (⏭ in the player bar for the next) -----
  function paintPlayAll(force = false) {
    const pieces = entries.map(entryPiece);
    const app = playAppName();
    const key = `${pieces.map((p) => pieceURL(p)).join(' ')} ${app}`;
    if (key === openAllKey && !force) return;
    openAllKey = key;
    const label = tn(pieces.length, 'Open the {n} work of the programme in {app}', 'Open the {n} works of the programme in {app}', { app });
    openAllEl = swapEl(openAllEl, listenLink(pieces[0], [icon('external', 12), h('span', { class: 'pv-t' }, t('Open in {app}', { app }))],
      { cls: 'pv-btn pv-open cp-openall', queue: pieces, index: 0, label }));
    openAllNote.replaceChildren(t('Plays in full in {app}', { app }),
      ...(pieces.length > 1 ? [' · ', t('⏭\uFE0E in the player bar for the next piece')] : []));
  }

  // ----- Add playlist to my Library (each work as a piece the Library can open) -----
  const playlistId = `concert-${c.id}`;
  const playlistRecord = () => ({
    id: playlistId,
    name: c.title,
    kind: 'concert',
    concertId: c.id,
    items: entries.map((e) => toPlain(entryPiece(e))),
  });
  const plInput = h('input', { type: 'checkbox' });
  plInput.checked = store.hasPlaylist(playlistId);
  plInput.addEventListener('change', () => {
    const on = store.togglePlaylist(playlistRecord());
    plInput.checked = on;
    toast(t(on ? 'Playlist added to your Library' : 'Playlist removed from your Library'));
  });
  const plRow = h('label', { class: 'cp-playlist' }, plInput, h('span', {}, t('Add playlist to my Library')),
    h('span', { class: 'n' }, tn(entries.length, '{n} work', '{n} works')));

  const term0 = searchTerm(entries[0].work);
  const foot = h('div', { class: 'cp-listen-foot' },
    playAllBtn,
    playAllNote,
    openAllEl,
    openAllNote,
    plRow,
    // Apple's terms: previews are streamed only, credited, and shown with a link to Apple Music
    h('p', { class: 'cp-credit' }, t(ITUNES_CREDIT), isZh() ? '' : ' ',
      h('a', { href: searchURL(term0, 'classical'), ...extAttrs }, t('Apple Music Classical')), ' · ',
      h('a', { href: searchURL(term0, 'music'), ...extAttrs }, 'Apple Music')));
  paintPlayAll(true);
  paintPlayAllState();
  const el = h('section', { class: 'cp-listen', 'aria-label': t('Listen') }, carousel, foot);

  // Once Play all is near, line up the first movement of every work (a few cached lookups).
  if (typeof IntersectionObserver === 'function') {
    const io = new IntersectionObserver((list) => {
      if (!list.some((en) => en.isIntersecting)) return;
      io.disconnect();
      wantAll = true;
      entries.forEach(ensureTracks);
    }, { rootMargin: '200px 0px' });
    io.observe(foot);
    ctx.observe(io);
  } else {
    wantAll = true;
  }

  entries.forEach(loadAlbums);

  return {
    el,
    onListenChoice() {
      entries.forEach(applyChosen);
    },
    onListening(L) {
      paintCurrent(L.current);
    },
    onLibrary() {
      plInput.checked = store.hasPlaylist(playlistId);
      entries.forEach(paintSave);
    },
    onPrefs() {
      if (playAppName() === linkedApp) return; // another preference
      linkedApp = playAppName();
      entries.forEach(paintCard);
      paintPlayAll(true);
    },
  };
}

// ---------- 5. program ----------
function rolesTable(credits) {
  const groups = new Map();
  for (const cr of credits) {
    if (!groups.has(cr.role)) groups.set(cr.role, []);
    groups.get(cr.role).push(cr);
  }
  const dl = h('dl', { class: 'cp-roles' });
  for (const [role, list] of groups) {
    dl.append(
      h('dt', {}, `${roleText(role)}${isZh() ? '：' : ':'}`),
      h('dd', {}, list.map((cr) => h('div', {},
        cr.artistId && repo.artist(cr.artistId) ? h('a', { href: href.artist(cr.artistId) }, cr.name) : cr.name))));
  }
  return dl;
}

// A programme line, with the title as the listing publishes it. › opens the work's page — Klang's
// own for a repertoire work, else the page that gathers every listing of that work ('x-…', repo.js),
// where its other halls and dates are. A line naming only the composer opens the composer's page.
function workRow(it) {
  const comp = compLabel(it);
  const title = it.rawTitle || [it.title || t('Work to be announced'), it.catalog].filter(Boolean).join(', ');
  const name = `${comp ? `${comp}${colon()}` : ''}${title}`;
  const target = it.workKey ? { href: href.work(it.workKey), label: t('{name} — work page', { name }) }
    : !it.rawTitle && it.composer ? { href: href.composer(it.composer.id), label: t('{name} — composer page', { name }) }
      : null;
  const inner = [
    h('div', { class: 'main' },
      comp ? h('div', { class: 'comp' }, comp) : null,
      h('div', { class: 'work' }, title)),
    target ? icon('chevron', 16, 'chev') : null,
  ];
  return target
    ? h('a', { class: 'cp-work', href: target.href, 'aria-label': target.label }, inner)
    : h('div', { class: 'cp-work' }, inner);
}

function programSection(c, items) {
  const credits = c.credits || [];
  const sec = h('section', { class: 'cp-section cp-program' }, h('h2', { class: 'pill-label' }, t('Program')));
  if (!credits.length && !items.length) {
    sec.append(h('p', { class: 'cp-tba' }, t('Performers and programme to be announced.')));
    return sec;
  }
  if (credits.length) sec.append(rolesTable(credits));
  sec.append(items.length ? h('div', { class: 'cp-works' }, items.map(workRow)) : h('p', { class: 'cp-tba' }, t('Programme to be announced.')));
  return sec;
}

// ---------- 6. program book ----------
function guideFor(workId) {
  const g = GUIDES ? GUIDES[workId] : null;
  if (typeof g === 'string') return g;
  if (g && typeof g.text === 'string') return g.text;
  return null;
}

function hookFor(workId) {
  const own = HOOKS && HOOKS[workId];
  if (typeof own === 'string' && own) return own.replace(/^\s*listen for\s+/i, '');
  for (const list of Object.values(WIDELY_LOVED || {})) {
    if (!Array.isArray(list)) continue;
    const hit = list.find((x) => x && x.workId === workId);
    const text = hit && (hit.hook || hit.listenFor || hit.why);
    // guides.js hooks are full sentences starting "Listen for…"; the chapter adds its own bold label.
    if (typeof text === 'string' && text) return text.replace(/^\s*listen for\s+/i, '');
  }
  return null;
}

// One chapter per programme work that Klang has written notes for (repertoire works only; the notes
// stay in English). Works outside the repertoire get no chapter: nothing is made up for them.
function bookChapters(c, items) {
  const chapters = [];
  const seen = new Set();
  for (const it of items) {
    const w = it.work;
    if (!w || seen.has(w.id)) continue;
    seen.add(w.id);
    const comp = it.composer || repo.composer(w.composerId) || null;
    const guide = guideFor(w.id);
    const text = guide ? paragraphs(guide) : paragraphs(w.blurb);
    if (!text.length) continue;
    chapters.push({
      kicker: comp ? composerShort(comp) : compLabel(it),
      title: [w.title, w.catalog].filter(Boolean).join(', '),
      pill: w.title,
      composer: comp,
      paragraphs: text,
      hook: hookFor(w.id),
      workId: w.id,
    });
  }
  // A listing the user imported may carry the organiser's own programme notes.
  if (c.imported && c.notes) {
    chapters.push({ kicker: t('From the organiser'), title: t('Programme notes'), pill: t('Programme notes'), composer: null, paragraphs: paragraphs(c.notes), hook: null, workId: null });
  }
  return chapters.filter((ch) => ch.paragraphs.length);
}

function chapterEl(ch, i, full) {
  return h('section', { class: ['cp-ch', full && 'full'], dataset: { i: String(i) } },
    full && ch.composer ? avatar(ch.composer.name, false, ch.composer.id) : null,
    ch.kicker ? h('div', { class: 'cp-ch-kicker' }, ch.kicker) : null,
    h(full ? 'h2' : 'h3', { class: 'cp-ch-title' }, ch.title),
    h('div', { class: 'cp-ch-body', lang: 'en' },
      ch.paragraphs.map((p) => h('p', {}, inline(p))),
      ch.hook ? h('p', { class: 'cp-ch-hook' }, h('b', { lang: isZh() ? 'zh-Hans' : 'en' }, t('Listen for ')), ch.hook) : null));
}

function programBook(c, items, ctx) {
  const chapters = bookChapters(c, items);
  if (!chapters.length) return null;

  const chapterEls = chapters.map((ch, i) => chapterEl(ch, i, false));
  const scroller = h('div', { class: 'cp-book-scroll', tabindex: '0', role: 'region', 'aria-label': t('Program book · double-tap for full screen') }, chapterEls);
  const dots = chapters.map((ch, i) => h('button', {
    type: 'button',
    class: 'cp-rail-dot',
    'aria-label': t('Chapter {n}: {title}', { n: i + 1, title: ch.pill }),
    onclick: () => goTo(i),
  }, String(i + 1)));
  const rail = h('nav', { class: 'cp-rail', 'aria-label': t('Chapters') }, dots);
  const hint = h('div', { class: 'cp-book-hint', 'aria-hidden': 'true' }, t('Double-tap for full screen'));
  const fullBtn = h('button', { type: 'button', class: 'cp-book-full', 'aria-label': t('Read the program book full screen'), onclick: () => openReader(active) }, expandIcon());
  const card = h('div', { class: 'cp-book-card' }, scroller, hint, fullBtn);

  let active = -1;
  function setActive(i) {
    if (i === active) return;
    active = i;
    dots.forEach((d, j) => {
      d.classList.toggle('on', j === i);
      if (j === i) d.setAttribute('aria-current', 'true');
      else d.removeAttribute('aria-current');
    });
  }
  setActive(0);

  function measure() {
    const top = scroller.scrollTop;
    if (top > 0 && top + scroller.clientHeight >= scroller.scrollHeight - 4) {
      setActive(chapterEls.length - 1);
      return;
    }
    let idx = 0;
    chapterEls.forEach((el, i) => {
      if (el.offsetTop - 48 <= top) idx = i;
    });
    setActive(idx);
  }
  let raf = 0;
  scroller.addEventListener('scroll', () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      measure();
    });
  }, { passive: true });

  function goTo(i, behavior = scrollBehavior()) {
    const el = chapterEls[i];
    if (!el) return;
    scroller.scrollTo({ top: Math.max(0, el.offsetTop - 2), behavior });
    setActive(i);
  }

  // ----- hint + double-tap -----
  let hintTimer = 0;
  let lastOpen = 0;
  function showHint() {
    hint.classList.add('show');
    clearTimeout(hintTimer);
    hintTimer = ctx.later(() => hint.classList.remove('show'), 1600);
  }
  let touch = null;
  let lastTap = 0;
  scroller.addEventListener('touchstart', (ev) => {
    const tc = ev.touches[0];
    touch = ev.touches.length === 1 ? { x: tc.clientX, y: tc.clientY, at: Date.now() } : null;
  }, { passive: true });
  scroller.addEventListener('touchend', (ev) => {
    const tc = ev.changedTouches[0];
    if (!touch || !tc || Math.hypot(tc.clientX - touch.x, tc.clientY - touch.y) > 12 || Date.now() - touch.at > 350) {
      lastTap = 0;
      return;
    }
    const now = Date.now();
    if (now - lastTap < 320) {
      ev.preventDefault();
      lastTap = 0;
      openReader(active);
    } else {
      lastTap = now;
    }
  }, { passive: false });
  scroller.addEventListener('dblclick', (ev) => {
    if (ev.target.closest('a, button')) return;
    ev.preventDefault();
    openReader(active);
  });
  scroller.addEventListener('click', (ev) => {
    if (ev.target.closest('a, button')) return;
    ctx.later(() => {
      if (Date.now() - lastOpen > 700 && !readerOpen) showHint();
    }, 340);
  });
  if (typeof IntersectionObserver === 'function') {
    const io = new IntersectionObserver((list) => {
      if (list.some((en) => en.isIntersecting)) {
        io.disconnect();
        showHint();
      }
    }, { threshold: 0.6 });
    io.observe(card);
    ctx.observe(io);
  }

  // ----- full-screen reader -----
  let readerOpen = false;
  function openReader(start) {
    if (readerOpen) return;
    readerOpen = true;
    lastOpen = Date.now();
    hint.classList.remove('show');
    let idx = Math.max(0, start);
    const pills = h('div', { class: 'cp-rd-pills', role: 'tablist', 'aria-label': t('Chapters') });
    const onKey = (e) => {
      if (e.key === 'ArrowRight' && idx < chapters.length - 1) show(idx + 1);
      else if (e.key === 'ArrowLeft' && idx > 0) show(idx - 1);
    };
    const sheet = ctx.keepSheet(openSheet({
      title: t('Program book'),
      subtitle: c.title,
      body: h('div'),
      footer: chapters.length > 1 ? pills : null,
      onClose: () => {
        readerOpen = false;
        document.removeEventListener('keydown', onKey);
      },
    }));
    sheet.el.classList.add('cp-reader');
    const bodyEl = sheet.el.querySelector('.sheet-body');
    function show(i) {
      idx = i;
      sheet.setBody(chapterEl(chapters[i], i, true));
      if (bodyEl) bodyEl.scrollTop = 0;
      clear(pills).append(...chapters.map((ch, j) => h('button', {
        type: 'button',
        role: 'tab',
        class: ['cp-rd-pill', j === i && 'on'],
        'aria-selected': j === i ? 'true' : 'false',
        onclick: () => show(j),
      }, ch.pill)));
      requestAnimationFrame(() => {
        const on = pills.querySelector('.on');
        if (on) pills.scrollLeft = Math.max(0, on.offsetLeft - (pills.clientWidth - on.offsetWidth) / 2);
      });
      goTo(i, 'auto');
    }
    document.addEventListener('keydown', onKey);
    if (bodyEl) {
      let sx = null;
      bodyEl.addEventListener('touchstart', (ev) => {
        const tc = ev.touches[0];
        sx = ev.touches.length === 1 ? { x: tc.clientX, y: tc.clientY } : null;
      }, { passive: true });
      bodyEl.addEventListener('touchend', (ev) => {
        const tc = ev.changedTouches[0];
        if (!sx || !tc) return;
        const dx = tc.clientX - sx.x;
        const dy = tc.clientY - sx.y;
        sx = null;
        if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
        if (dx < 0 && idx < chapters.length - 1) show(idx + 1);
        else if (dx > 0 && idx > 0) show(idx - 1);
      }, { passive: true });
    }
    show(idx);
  }

  const el = h('section', { class: 'cp-section cp-bookwrap' },
    h('h2', { class: 'pill-label' }, t('Program book')),
    h('div', { class: 'cp-book' }, chapters.length > 1 ? rail : null, card));
  return { el };
}

// ---------- 7. podcasts ----------
// "Ralph Vaughan Williams" -> "williams" (episodes must name the composer)
function composerKey(name) {
  return normalize(name || '').replace(/[^a-z0-9-]+/g, ' ').trim().split(/\s+/).pop() || '';
}

// Short search title: the quoted name if there is one ("Wachet auf…"), else the title without
// the key for numbered works ("Symphony No. 9 in D minor" -> "Symphony No. 9").
function podcastTitle(title) {
  const q = /[“"«]([^”"»]+)[”"»]/.exec(title || '');
  if (q) return q[1];
  let base = String(title || '').split(/[(,:;]/)[0].trim();
  if (/No\.\s*\d/.test(base)) base = base.replace(/\s+in\s+[A-G]\b.*$/i, '').trim();
  return base || title;
}

function podcastsSection(entries, ctx) {
  const list = h('div', { class: 'cp-pods' });
  const el = h('section', { class: 'cp-section cp-podcasts', hidden: true },
    h('h2', { class: 'caps-label' }, t('Podcasts')), list);
  // works Klang knows first: their titles are the ones podcasts use
  const picks = [...entries.filter((e) => e.real), ...entries.filter((e) => !e.real)].slice(0, PODCAST_WORKS);
  (async () => {
    const seen = new Set();
    const found = [];
    for (const e of picks) {
      const comp = e.composer || '';
      const key = composerKey(comp);
      let res = [];
      try {
        res = await searchPodcasts(`${comp} ${podcastTitle(e.work.title)}`.trim(), 10);
      } catch {
        continue;
      }
      if (!ctx.alive()) return;
      let n = 0;
      for (const ep of res) {
        if (n >= PODCAST_PER_WORK || found.length >= PODCAST_MAX) break;
        if (!ep.url || !ep.title || seen.has(ep.id)) continue;
        if (key && !normalize(`${ep.title} ${ep.show} ${ep.description}`).includes(key)) continue;
        seen.add(ep.id);
        found.push(ep);
        n += 1;
      }
    }
    if (!ctx.alive() || !found.length) return;
    list.append(...found.map((ep) => h('a', { class: 'cp-pod', href: ep.url, ...extAttrs, 'aria-label': t('{title} — {show} (Apple Podcasts)', { title: ep.title, show: ep.show || '' }) },
      ep.artwork ? h('img', { src: ep.artwork, alt: '', loading: 'lazy' }) : h('span', { class: 'ph' }, icon('podcast', 20)),
      h('span', { class: 'main' }, h('span', { class: 't' }, ep.title), h('span', { class: 's' }, ep.show || 'Apple Podcasts')),
      icon('chevron', 16))));
    el.hidden = false;
    ctx.setPodcastsReady(el);
  })();
  return el;
}

// ---------- 8. featured artists ----------
// The composers Klang knows, then everyone the listing credits (each has an artist page).
function artistsSection(c, items) {
  const composers = [...new Map(items.filter((it) => it.composer).map((it) => [it.composer.id, it.composer])).values()];
  const seen = new Set();
  const performers = (c.credits || []).filter((cr) => {
    const key = cr.artistId || cr.name;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (!composers.length && !performers.length) return null;
  const chip = (cr) => {
    if (!cr.artistId || !repo.artist(cr.artistId)) return h('span', { class: 'cp-person plain' }, cr.name);
    const fav = followButton('artist', cr.artistId, { labelOn: '', labelOff: '', iconName: 'heart' });
    fav.setAttribute('aria-label', t('Favourite {name}', { name: cr.name }));
    return h('span', { class: 'cp-person' }, h('a', { href: href.artist(cr.artistId) }, cr.name), fav);
  };
  return h('section', { class: 'cp-section cp-artists' },
    h('h2', { class: 'caps-label' }, t('Featured artists')),
    composers.length ? h('div', { class: 'cp-composers' }, composers.map((comp) =>
      h('a', { class: 'cp-composer', href: href.composer(comp.id) }, avatar(comp.name, false, comp.id),
        h('span', {}, isZh() ? composerShort(comp) : comp.name)))) : null,
    performers.length ? h('div', { class: 'chip-wrap cp-performers' }, performers.map(chip)) : null);
}

// ---------- 9. where the listing comes from, report ----------
// The collector's credit line: ui/components.js sourceCredit (as published in English, rebuilt in Chinese).
const attributionText = (c) => sourceCredit(c.attribution, c.sourceName);

function sourceNote(c) {
  const url = c.sourceUrl || c.url || c.ticketUrl || null;
  if (c.imported) {
    return h('div', { class: 'cp-source' },
      h('p', { class: 'cp-source-main' }, h('span', {}, t('Imported by you')),
        url ? [h('span', { class: 'sep', 'aria-hidden': 'true' }, ' · '), h('a', { href: url, ...extAttrs }, t('Open the original'), ' ›')] : null),
      h('p', { class: 'cp-source-sub' }, t('Check times and programme with the organiser.')));
  }
  if (!c.sourceName && !url) return null;
  const attribution = attributionText(c);
  return h('div', { class: 'cp-source' },
    h('p', { class: 'cp-source-main' },
      c.sourceName ? h('span', {}, t('Listing from {name}', { name: c.sourceName })) : null,
      url ? [c.sourceName ? h('span', { class: 'sep', 'aria-hidden': 'true' }, ' · ') : null,
        h('a', { href: url, ...extAttrs, 'aria-label': t('Details & tickets on the organiser’s site') }, t('Details & tickets'), ' ›')] : null),
    attribution ? h('p', { class: 'cp-source-sub' }, attribution) : null);
}

function listingText(c, items) {
  const lines = [
    c.title,
    c.series || null,
    t('{when} (Swiss time)', { when: fmtWhen(c.start, TZ) }),
    whereLine(c),
    items.length ? t('Programme: {list}', { list: items.map(programLine).join('; ') }) : null,
    (c.credits || []).length ? t('Performers: {list}', { list: c.credits.map((cr) => `${roleText(cr.role)}${colon()}${cr.name}`).join('; ') }) : null,
    c.sourceUrl || null,
    shareURL(c),
  ];
  return lines.filter(Boolean).join('\n');
}

function openReport(c, items, keepSheet) {
  const url = c.sourceUrl || c.url;
  let sheet = null;
  const action = (iconName, label, fn) => h('button', {
    type: 'button',
    class: 'row-item cp-menu-row',
    onclick: () => {
      sheet?.close();
      fn();
    },
  }, h('span', { class: 'lead-icon' }, icon(iconName, 18)), h('div', { class: 'main' }, h('div', { class: 't' }, label)));
  const intro = c.imported
    ? t('You imported this listing on this device from a calendar file or feed, so any mistake is in that source.')
    : t('This listing comes from {name}’s own website, which Klang reads every day. Klang has no server of its own, so it can’t forward a report.',
      { name: c.sourceName || t('the organiser') });
  const steps = c.imported
    ? [
      'Check the date, time and programme with the organiser — copy the details below to send them.',
      'Correct the source calendar or feed, then import it again in Me › Data.',
      'Or hide this concert so it no longer shows up in your lists.',
    ]
    : [
      'Check the date, time and programme on the organiser’s page — copy the details below to send them.',
      'When the organiser corrects its page, Klang shows the change after the next daily update.',
      'Or hide this concert so it no longer shows up in your lists.',
    ];
  const body = h('div', { class: 'cp-sheet-text' },
    h('p', {}, intro),
    h('ul', {}, steps.map((s) => h('li', {}, t(s)))),
    h('div', { class: 'group' },
      action('notes', t('Copy listing details'), () => copyText(listingText(c, items), 'Listing details copied')),
      url ? action('external', t('Open the original listing'), () => window.open(url, '_blank', 'noopener')) : null,
      action('eyeoff', t(store.isHidden(c.id) ? 'Show this concert again' : 'Hide this concert'), () => toggleHide(c)),
      c.imported ? action('gear', t('Manage data'), () => { location.hash = '#/me/data'; }) : null));
  sheet = keepSheet(openSheet({
    title: t('Report a problem'),
    subtitle: c.title,
    body,
    footer: h('div', { class: 'hint' }, t('Nothing is sent from this page.')),
  }));
}

function openMenu(c, items, keepSheet) {
  let sheet = null;
  const row = (iconName, label, fn) => h('button', {
    type: 'button',
    class: 'row-item cp-menu-row',
    onclick: () => {
      sheet?.close();
      fn();
    },
  }, h('span', { class: 'lead-icon' }, icon(iconName, 18)), h('div', { class: 'main' }, h('div', { class: 't' }, label)));
  // Sheng's top bar has only Back and Share; Klang's extra actions sit in the share sheet.
  const body = h('div', { class: 'group' },
    navigator.share ? row('share', t('Share…'), () => shareConcert(c)) : null,
    row('notes', t('Copy link'), () => copyText(shareURL(c))),
    row('calendar', t('Add to calendar'), () => addToCalendar(c, items)),
    row('eyeoff', t(store.isHidden(c.id) ? 'Show this concert again' : 'Hide this concert'), () => toggleHide(c)));
  sheet = keepSheet(openSheet({ title: t('Share'), subtitle: `${c.title} · ${relDayLabel(c.day)}`, body }));
}

// ---------- page ----------
export function render({ id } = {}) {
  const c = id ? repo.concert(id) : null;
  if (!c) {
    return {
      title: t('Concert'),
      back: true,
      body: emptyState('calendar', t('Concert not found'),
        t('It may have been removed from the organiser’s listings, or it took place more than 120 days ago.'),
        h('a', { class: 'btn small', href: '#/concerts' }, t('Browse concerts'))),
    };
  }

  let alive = true;
  const sheets = new Set();
  const observers = [];
  const timers = new Set();
  const cleanups = [];
  const keepSheet = (s) => {
    if (s) sheets.add(s);
    return s;
  };

  const items = repo.programItems(c);
  const started = isPast(c.start);
  const entries = listenEntries(items);
  const bar = actionBar(c);

  const ctx = {
    alive: () => alive,
    keepSheet,
    observe: (io) => observers.push(io),
    onCleanup: (fn) => cleanups.push(fn),
    later(fn, ms) {
      const tm = setTimeout(() => {
        timers.delete(tm);
        if (alive) fn();
      }, ms);
      timers.add(tm);
      return tm;
    },
    setListenReady: (on) => bar.set('listen', on),
    setPodcastsReady: (el) => bar.set('podcasts', true, el),
  };

  const head = headBand(c, items, bar);

  // personal marks + review (live)
  const marksEl = h('div', { class: 'concert-marks cp-marks' });
  const paintMarks = () => {
    const m = store.markOf(c.id);
    const focused = marksEl.contains(document.activeElement) ? document.activeElement.dataset?.mark : null;
    clear(marksEl).append(...[
      markButtons(c, m, started),
      m.attended ? reviewCard(c, items, m, keepSheet) : reviewHint(c, started)].filter(Boolean));
    if (focused) marksEl.querySelector(`[data-mark="${focused}"]`)?.focus();
  };
  paintMarks();

  const listen = listenBlock(c, entries, ctx);
  const programEl = programSection(c, items);
  const book = programBook(c, items, ctx);
  const podcastsEl = podcastsSection(entries, ctx);

  if (listen) bar.set('listen', false, listen.el);
  bar.set('program', true, programEl);
  if (book) bar.set('notes', true, book.el);

  const topbar = h('div', { class: 'cp-topbar' },
    h('button', { class: 'cp-fab', type: 'button', 'aria-label': t('Back'), onclick: () => goBack() }, icon('back', 20)),
    h('div', { class: 'cp-topbar-r' },
      h('button', { class: 'cp-fab', type: 'button', 'aria-label': t('Share concert'), 'aria-haspopup': 'dialog', onclick: () => openMenu(c, items, keepSheet) }, icon('share', 18))));

  const body = h('div', { class: 'concert-page cp-page' },
    topbar,
    head.el,
    marksEl,
    listen?.el,
    programEl,
    book?.el,
    podcastsEl,
    artistsSection(c, items),
    sourceNote(c),
    h('div', { class: 'cp-report-wrap' },
      h('button', { type: 'button', class: 'cp-report', onclick: () => openReport(c, items, keepSheet) }, sym('report', 16, 2.2), t('Report a problem'))));

  const unsubStore = store.subscribe((topic) => {
    if (!alive) return;
    if (topic === 'marks') paintMarks();
    else if (topic === 'hidden') head.paintHidden();
    else if (topic === 'listen') listen?.onListenChoice();
    else if (topic === 'library') listen?.onLibrary();
    else if (topic === 'prefs') listen?.onPrefs();
  });
  const unsubListening = listen ? onListening((L) => alive && listen.onListening(L)) : () => {};

  return {
    title: c.title,
    header: false, // like Sheng: floating back / share buttons over the header band
    body,
    cleanup() {
      alive = false;
      unsubStore();
      unsubListening();
      cleanups.forEach((fn) => fn());
      observers.forEach((io) => io.disconnect());
      timers.forEach((tm) => clearTimeout(tm));
      timers.clear();
      [...sheets].forEach((s) => s.close());
      sheets.clear();
    },
  };
}
