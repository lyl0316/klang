// Entity pages (#/composer, #/work, #/artist, #/venue, #/city), modelled on Sheng's
// knowledge pages — Switzerland only, personal only (no other users, no public reviews).
// Every concert listed here is a REAL listing (repo.js: the venues' and orchestras' own websites,
// plus the user's own imports); performers, venues and towns come from those listings.
//
//   Work:     floating back · ♡ · share; composer portrait + name, serif title, caps
//             "1892 · ~23 MIN", Listening guide sheet, Recordings carousel, More recordings
//             (every version), Report a problem, Concerts N (date blocks, HALL · CITY). Section bars
//             take the work's genre colour, as on Sheng.
//             A work outside the repertoire (#/work/x-…, repo.js work index: the same piece in every
//             listing, whatever the language) gets the same page from the listings alone: composer
//             (linked when Klang knows them), the title as most commonly published (+ the other
//             published forms), Recordings found on Apple Music by surname + title, Concerts N across
//             every hall. Nothing is written about it that the listings don't say.
//   Composer: back · share; portrait, serif name, Read Bio / Explore Works / Editorials N,
//             centred ♡, caps life line; Latest releases, Popular among listeners,
//             "Explore <name>" (By period · By genre · Related), then Swiss Concerts N.
//   Artist:   a performer or ensemble from the listings: portrait + serif name + gold ON TOUR, caps
//             line of their roles in the listings, Artist bio (only when Klang has one) + ♡;
//             Upcoming Events (route of cities, Swiss local time, first dates, "Full Itinerary ›" =
//             #/artist/<id>/itinerary with every date + past ones), Related artists (shared concerts),
//             their albums on Apple Music.
//   Venue / City: same visual language (serif names, caps facts, date blocks); venues and towns that
//             only the listings name get the same page, with Directions and their sources.
//
// Listening: a cover plays Apple's 30-second preview inside Klang (ui/preview.js — the work's own
// tracks on that recording, queued in order); "Apple Music Classical ↗" under it is a real link that
// plays the recording in full there; "+" saves it (ui/save.js). The iTunes credit sits at the foot of
// each page (Sheng has no fine print under its rails).
//
// Language: interface text goes through i18n.t(); composer and city names follow the interface
// language. Long-form text (bios, listening guides) stays English for now, with a short note in Chinese.
//
// The app header stays (main.js back button) but turns into Sheng's floating buttons on
// these pages (see the "entity pages (entity.js)" block in css/shell.css).
// Editorial content (BIOS, GUIDES, ARTICLES) is loaded defensively: pages work when the
// content files are empty or fail to load.

import { h, icon, toast, normalize, TYPE_LABELS } from '../util.js';
import * as repo from '../repo.js';
import { country as countryOf } from '../data/countries.js';
import * as store from '../store.js';
import { openSheet } from '../ui/sheet.js';
import { href, emptyState, rowItem, withFace, roleText as sharedRoleText } from '../ui/components.js';
import { todayKey, addDays, daysBetween, monthKeyOf, monthShort, dayNum, yearOf, timeOf, relDayLabel } from '../time.js';
import {
  t, tn, fmtN, isZh, cityName, countryName, cantonName, composerName, composerShort, typeLabel,
  monthYear,
} from '../i18n.js';
import {
  searchAlbums, albumTracks, composerAlbums, ITUNES_CREDIT,
  classicalAlbumURL, classicalSearchURL, appleMusicSearchURL,
} from '../music.js';
import { workPiece, albumPiece, pieceURL, albumURL, listening, onListening, playApp, playAppName } from '../applemusic.js';
import { previewButton, classicalButton } from '../ui/preview.js';
import { openSaveSheet } from '../ui/save.js';
import { searchTerm, matchWorkTracks, catalogKeys, oneWorkAlbum } from '../ui/listen.js';
import { englishNumbered } from '../ics.js';

// ---------- reference tables (English keys; shown through t()) ----------
const GENRES = [
  { id: 'symphony', label: 'Symphonies', intro: 'Large-scale works for full orchestra, usually in four movements.' },
  { id: 'concerto', label: 'Concertos', intro: 'A soloist, or a small group of soloists, set against the orchestra.' },
  { id: 'orchestral', label: 'Orchestral', intro: 'Overtures, tone poems, suites and other music for orchestra.' },
  { id: 'chamber', label: 'Chamber Music', intro: 'Music for a handful of players, one to a part.' },
  { id: 'piano', label: 'Piano', intro: 'Music for solo piano, from sonatas to sets of short pieces.' },
  { id: 'solo', label: 'Solo', intro: 'Works for a single unaccompanied instrument.' },
  { id: 'song', label: 'Songs', intro: 'Songs and song cycles, for voice with piano or orchestra.' },
  { id: 'opera', label: 'Opera', intro: 'Works for the stage, sung throughout or with spoken dialogue.' },
  { id: 'sacred', label: 'Sacred Works', intro: 'Masses, Passions, oratorios, cantatas and requiems.' },
];
const GENRE = Object.fromEntries(GENRES.map((g) => [g.id, g]));
const OTHER_GENRE = { id: 'other', label: 'Other Works', intro: 'Works outside the usual categories.' };
const genreOf = (w) => GENRE[w.genre] || OTHER_GENRE;

// Life periods for composers whose careers divide clearly; everyone else gets
// Early / Middle / Late years derived from their dates (see periodsOf).
const PERIODS = {
  bach: [
    { label: 'Weimar', from: 1708, to: 1717, intro: 'Court organist and later concertmaster to the Duke of Saxe-Weimar: the great organ works and the first cantatas.' },
    { label: 'Köthen', from: 1717, to: 1723, intro: 'Kapellmeister to Prince Leopold of Anhalt-Köthen, a Calvinist court with little use for church music — the years of the suites, sonatas and concertos.' },
    { label: 'Leipzig', from: 1723, to: 1750, intro: 'Thomaskantor from 1723: cycles of cantatas for the church year, the Passions, and late summations such as the Goldberg Variations and the Mass in B minor.' },
  ],
  haydn: [
    { label: 'Esterházy years', from: 1761, to: 1790, intro: 'Almost thirty years as Kapellmeister to the Esterházy princes, with an orchestra of his own to experiment with, far from Vienna.' },
    { label: 'London and the late works', from: 1791, to: 1809, intro: 'Two visits to London (1791–92 and 1794–95) produced the twelve London symphonies; back in Vienna came The Creation and the late quartets.' },
  ],
  mozart: [
    { label: 'Salzburg', from: 1761, to: 1780, intro: 'The prodigy years: tours across Europe with his father, then service at the court of the Prince-Archbishop of Salzburg.' },
    { label: 'Vienna', from: 1781, to: 1786, intro: 'Freelance in Vienna from 1781, writing piano concertos for his own subscription concerts and, in 1786, The Marriage of Figaro.' },
    { label: 'The last years', from: 1787, to: 1791, intro: 'Don Giovanni for Prague, the last three symphonies in the summer of 1788, and in 1791 The Magic Flute, the Clarinet Concerto and the unfinished Requiem.' },
  ],
  beethoven: [
    { label: 'Early period', from: 1782, to: 1802, intro: 'From Bonn to Vienna in 1792 — a pupil of Haydn and soon the most talked-about pianist in the city.' },
    { label: 'Middle period', from: 1803, to: 1814, intro: 'After the Heiligenstadt Testament of 1802, the “heroic” decade: the Eroica, the Fifth and Seventh Symphonies, the Emperor Concerto and Fidelio.' },
    { label: 'Late period', from: 1815, to: 1827, intro: 'Almost completely deaf, Beethoven turned inward: the Ninth Symphony, the Missa solemnis, the last piano sonatas and string quartets.' },
  ],
  stravinsky: [
    { label: 'Russian period', from: 1902, to: 1919, intro: 'Rimsky-Korsakov’s pupil, then the Ballets Russes in Paris — The Firebird, Petrushka, The Rite of Spring — and the war years in Switzerland.' },
    { label: 'Neoclassical period', from: 1920, to: 1951, intro: 'In France and, from 1939, the United States, Stravinsky reworked older styles, from Pulcinella to The Rake’s Progress.' },
    { label: 'Serial period', from: 1952, to: 1971, intro: 'In his seventies he took up twelve-tone writing, in works such as Agon and Threni.' },
  ],
  part: [
    { label: 'Early works', from: 1958, to: 1968, intro: 'Neoclassical and serial pieces written in Soviet Estonia, ending with the collage Credo of 1968.' },
    { label: 'Years of silence', from: 1969, to: 1975, intro: 'Years of near silence, spent studying Gregorian chant and early polyphony.' },
    { label: 'Tintinnabuli', from: 1976, to: null, intro: 'From Für Alina (1976) on, the bell-like style of triads ringing around a slow melody.' },
  ],
};

const VENUE_KINDS = { hall: 'Concert hall', opera: 'Opera house', church: 'Church', theatre: 'Theatre' };
const MARK_LABELS = { saved: 'Saved', going: 'Going', attended: 'Attended' };
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const REPORT_REASONS = ['Wrong date or venue', 'Wrong programme or performers', 'Recording doesn’t match', 'Wrong facts or text', 'Something else'];
const SEARCH_LIMIT = 25; // same as ui/listen.js, so the Versions sheet reuses the cached search

let exploreTab = 'period'; // remembered while the app is open

// ---------- editorial content (loaded defensively) ----------
let contentPromise = null;
function loadContent() {
  if (!contentPromise) {
    contentPromise = Promise.allSettled([
      import('../content/editorials.js'),
      import('../content/bios.js'),
      import('../content/guides.js'),
    ]).then(([ed, bios, guides]) => {
      const obj = (x) => (x && typeof x === 'object' ? x : {});
      return {
        articles: Array.isArray(ed.value?.ARTICLES) ? ed.value.ARTICLES : [],
        bios: obj(bios.value?.BIOS),
        guides: obj(guides.value?.GUIDES),
      };
    });
  }
  return contentPromise;
}

const textOf = (x) => (typeof x === 'string' ? x : x && typeof x.text === 'string' ? x.text : '');

function mentionsComposer(a, id) {
  if (!a) return false;
  const ofComposer = (wid) => !!wid && repo.work(wid)?.composerId === id;
  return (Array.isArray(a.composerIds) && a.composerIds.includes(id)) ||
    (Array.isArray(a.people) && a.people.some((p) => p?.composerId === id)) ||
    (Array.isArray(a.workIds) && a.workIds.some(ofComposer)) ||
    (Array.isArray(a.blocks) && a.blocks.some((b) => b && (b.composerId === id || ofComposer(b.workId))));
}

// ---------- small helpers ----------
const live = (list) => list.filter((c) => c.status !== 'cancelled');
const cityCount = (list) => new Set(list.map((c) => c.cityId).filter(Boolean)).size;
const same = (a, b) => a != null && b != null && String(a) === String(b);
const byYear = (a, b) => (a.year || 9999) - (b.year || 9999) || a.title.localeCompare(b.title);

// Names in the interface language (cities, composers); venue names stay as published.
const cityText = (c) => cityName(repo.city(c.cityId));
const venueText = (c) => repo.venue(c.venueId)?.name || c.venueName || t('Venue to be announced');
const cantonText = (code) => (code ? cantonName(code, repo.cantonName(code)) : '');
const countryText = (s) => String(s || '').split(/\s*\/\s*/).filter(Boolean)
  .map((x) => (countryName(x) !== x ? countryName(x) : t(x))).join(isZh() ? '／' : ' / ');

// t() for a template whose {placeholders} are nodes (a link, <b>): an array of parts.
function tNodes(text, vars) {
  return t(text).split(/\{(\w+)\}/).map((p, i) => (i % 2 ? vars[p] ?? '' : p)).filter((p) => p !== '');
}

// t() with values that must keep their own spacing ("11月1日 周六"): t() tidies the spaces between
// Chinese characters of the whole sentence, so these go in after it.
function tRaw(text, vars, raw) {
  const marks = Object.fromEntries(Object.keys(raw).map((k) => [k, `\u2063${k}\u2063`]));
  let out = t(text, { ...vars, ...marks });
  for (const k of Object.keys(raw)) out = out.replace(marks[k], raw[k]);
  return out;
}

// A performer's role in the interface language (shared translator, ui/components.js); "Performer" when unknown.
const roleText = (role) => (role ? sharedRoleText(role) : t('Performer'));

// "A, B and C" / "A、B 和 C" (i18n's joinList writes "B和C", which runs Latin titles into the 和;
// t() closes the spaces again when the names are Chinese)
function joinNames(items) {
  const list = (items || []).filter(Boolean).map(String);
  if (list.length < 2) return list[0] || '';
  const head = list.slice(0, -1).join(isZh() ? '、' : ', ');
  return isZh() ? `${head} 和 ${list[list.length - 1]}` : `${head} and ${list[list.length - 1]}`;
}

// In Chinese, long-form English text (bios, guides) gets one short note.
const englishOnly = () => (isZh() ? h('p', { class: 'ep-en-note' }, t('This text is available in English only for now.')) : null);

function countBy(list, keyFn) {
  const m = new Map();
  for (const x of list) {
    const k = keyFn(x);
    if (k != null) m.set(k, (m.get(k) || 0) + 1);
  }
  return m;
}

// workId -> number of concerts (each concert counted once per work)
function workCounts(list) {
  const m = new Map();
  for (const c of list) {
    for (const wid of new Set((c.program || []).map((p) => p.workId).filter(Boolean))) m.set(wid, (m.get(wid) || 0) + 1);
  }
  return m;
}

// "on 7 May 1833" / "in 1833"; Chinese "1833年5月7日" / "1833年"
function longDate(year, mmdd) {
  if (!mmdd) return isZh() ? `${year}年` : `in ${year}`;
  const [m, d] = mmdd.split('-').map(Number);
  return isZh() ? `${year}年${m}月${d}日` : `on ${d} ${MONTHS_LONG[m - 1]} ${year}`;
}

function ageAt(born, bornDate, year, mmdd) {
  let a = year - born;
  if (bornDate && mmdd && mmdd < bornDate) a -= 1;
  return a;
}

function fmtMinutes(m) {
  if (m < 60) return t('{n} minutes', { n: m });
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return mm ? t('{h} h {m} min', { h: hh, m: mm }) : t('{h} hours', { h: hh });
}

// "today" / "tomorrow" / "on Sat, Nov 1"; Chinese "今天" / "明天" / "11月1日 周六"
function whenPhrase(dayKey) {
  const rel = relDayLabel(dayKey);
  if (isZh()) return rel;
  const diff = daysBetween(todayKey(), dayKey);
  return diff === 0 || diff === 1 ? rel.toLowerCase() : `on ${rel}`;
}

function venueKind(v) {
  if (v.imported) return t('Imported venue');
  // a venue made from a listing is a "hall" only by default (its name said church, opera or theatre otherwise)
  if (v.dynamic && v.kind === 'hall') return t('Venue');
  if (v.kind === 'hall' && v.small) return t('Small hall');
  return t(VENUE_KINDS[v.kind] || 'Venue');
}

// The roles an artist has in the listings, most frequent first ("Conductor", "Piano").
function rolesOf(id, list) {
  const m = countBy(list.flatMap((c) => (c.credits || []).filter((cr) => cr.artistId === id)), (cr) => cr.role || null);
  return [...m].sort((a, b) => b[1] - a[1]).map(([r]) => r);
}

// _italic_ → <em>; plain text otherwise (never innerHTML).
function richText(text) {
  return String(text).split(/_([^_\n]+)_/).map((p, i) => (i % 2 ? h('em', {}, p) : p));
}

function paragraphs(text) {
  return String(text).split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean).map((p) => h('p', {}, richText(p)));
}

const pageURL = (path) => `${location.href.split('#')[0]}${path}`;

async function shareText(title, text, url = null) {
  if (navigator.share) {
    try {
      await navigator.share(url ? { title, text, url } : { title, text });
      return true;
    } catch (err) {
      if (err?.name === 'AbortError') return false;
    }
  }
  try {
    await navigator.clipboard.writeText(url ? `${text}\n${url}` : text);
    toast(url ? t('Link copied') : t('Copied to the clipboard'));
    return true;
  } catch {
    toast(t('Couldn’t share — copy the address from the address bar'));
    return false;
  }
}

// ---------- building blocks ----------
function portrait(name, size = 'lg', composerId = null) {
  return withFace(h('div', { class: ['avatar', 'ep-av', size], 'aria-hidden': 'true' }), name, composerId);
}

function iconPortrait(name) {
  return h('div', { class: 'avatar ep-av lg icon', 'aria-hidden': 'true' }, icon(name, 34));
}

// Right side of the floating top bar: one glass pill holding ♡ and/or share.
function topActions(...buttons) {
  const list = buttons.filter(Boolean);
  return list.length ? [h('div', { class: 'ep-tb-group' }, list)] : [];
}

function shareButton(title, text, path) {
  return h('button', { class: 'ep-tb', type: 'button', 'aria-label': t('Share'), onclick: () => shareText(title, text, pageURL(path)) }, icon('share', 18));
}

// ♡ favourite (= follow) toggle that stays in sync with other hearts on the page.
function favButton(kind, id, label, bag, cls = 'ep-tb') {
  const btn = h('button', { class: cls, type: 'button' }, icon('heart', cls === 'ep-tb' ? 19 : 22));
  const paint = () => {
    const on = store.isFollowing(kind, id);
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.setAttribute('aria-label', on ? t('Remove {name} from favourites', { name: label }) : t('Add {name} to favourites', { name: label }));
  };
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const on = store.toggleFollow(kind, id);
    toast(on ? t('{name} added to your favourites', { name: label }) : t('{name} removed from your favourites', { name: label }));
  });
  bag.push(store.subscribe((topic) => topic === 'follows' && paint()));
  paint();
  return btn;
}

function epHead(title, { count = null, bar = false, serif = false, more = null, info = null } = {}) {
  return h('div', { class: ['ep-h', bar && 'bar', serif && 'serif'] },
    h('h2', {}, title,
      count != null ? h('span', { class: 'n' }, fmtN(count)) : null,
      info ? h('button', { class: 'ep-info', type: 'button', 'aria-label': t('About {title}', { title }), onclick: info }, icon('info', 15)) : null),
    more);
}

function softEmpty(iconName, title, text, action = null) {
  const el = emptyState(iconName, title, text, action);
  el.classList.add('ep-empty');
  return el;
}

function notFound(kind, text, action = h('a', { class: 'btn small', href: '#/search' }, icon('search', 15), t('Search'))) {
  return { title: t(kind), back: true, body: emptyState('search', t('{kind} not found', { kind: t(kind) }), text, action) };
}

// Bottom sheet with a centred title and a red "Close" text button (Sheng's Bio / guide sheets).
function textSheet(title, nodes, footer = null) {
  const sheet = openSheet({ title, body: h('div', { class: 'ep-sheet-text' }, nodes), footer, closeLabel: t('Close') });
  sheet.el.classList.add('ep-sheet');
  return sheet;
}

// "Listings from Tonhalle Zürich and Opernhaus Zürich" — where a page's concerts come from.
function sourcesLine(list) {
  const seen = new Map();
  for (const c of list) if (c.sourceName && !seen.has(c.sourceName)) seen.set(c.sourceName, c.sourceSite || null);
  if (!seen.size) return null;
  const names = [...seen].slice(0, 6);
  const parts = [];
  names.forEach(([name, site], i) => {
    if (i) parts.push(i === names.length - 1 ? (isZh() ? ' 和 ' : ' and ') : (isZh() ? '、' : ', '));
    parts.push(site ? h('a', { href: site, target: '_blank', rel: 'noopener' }, name) : name);
  });
  return h('p', { class: 'ep-sources' }, tNodes('Listings from {name}', { name: parts }));
}

// Sheng's chip glyphs (SF Symbols book.closed.fill / books.vertical), drawn inline.
const GLYPHS = {
  book: '<path d="M7 3h11.5v14.5H7A2.5 2.5 0 0 0 4.5 20V5.5A2.5 2.5 0 0 1 7 3z" fill="currentColor" stroke="none"/><path d="M4.6 20.2A2.4 2.4 0 0 1 7 18.4h11.5V21H7a2.4 2.4 0 0 1-2.4-.8z" fill="currentColor" stroke="none" opacity=".5"/>',
  books: '<rect x="3" y="4" width="4.2" height="16" rx="1"/><rect x="9" y="4" width="4.2" height="16" rx="1"/><path d="M15.4 5.3l3.8-.9 3.3 15-3.8.9z"/><path d="M3 8h4.2M9 8h4.2"/>',
};
const glyph = (name, size = 15) => h('span', {
  class: 'icon', 'aria-hidden': 'true',
  html: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${GLYPHS[name]}</svg>`,
});

// Round country flag before a city (Sheng shows the venue's country flag; Klang is Swiss-only).
const FLAG_CH = '<svg viewBox="0 0 20 20" width="14" height="14"><circle cx="10" cy="10" r="10" fill="#d52b1e"/><path d="M8.4 4.6h3.2v3.8h3.8v3.2h-3.8v3.8H8.4v-3.8H4.6V8.4h3.8z" fill="#fff"/></svg>';
const flagCH = () => h('span', { class: 'ep-flag', 'aria-hidden': 'true', html: FLAG_CH });

// ---------- concerts: date-block rows with live personal marks ----------
const SUB = {
  city: (c) => [cityText(c), venueText(c)].filter(Boolean).join(' · '),
  cityOnly: (c) => cityText(c) || venueText(c),
  // Sheng's artist cards: flag · city (brighter) · venue
  flagCity: (c) => [flagCH(), cityText(c) ? h('span', { class: 'cty' }, cityText(c)) : null,
    cityText(c) ? h('span', { class: 'sep' }, '·') : null, venueText(c)],
  venue: (c) => [venueText(c), c.room].filter(Boolean).join(' · '),
  // work pages: where each performance is — "Tonhalle Zürich · Zurich"
  venueCity: (c) => [venueText(c), cityText(c)].filter(Boolean).join(' · '),
  program: (c) => [typeLabel(c.type, TYPE_LABELS[c.type]), c.series, c.room].filter(Boolean).join(' · '),
};

function liveMarks(bag) {
  let slots = [];
  const paint = (slot, id) => {
    const m = store.markOf(id);
    slot.replaceChildren(...store.MARK_KINDS.filter((k) => m[k]).map((k) =>
      h('i', { class: `mark-dot ${k}`, title: t(MARK_LABELS[k]) }, h('span', { class: 'sr-only' }, t(MARK_LABELS[k])))));
  };
  bag.push(store.subscribe((topic) => {
    if (topic !== 'marks') return;
    slots = slots.filter(([s]) => s.isConnected);
    for (const [s, id] of slots) paint(s, id);
  }));
  return (id) => {
    const s = h('span', { class: 'ep-mk' });
    paint(s, id);
    slots.push([s, id]);
    return s;
  };
}

function eventItem(c, mark, { time = false, sub = SUB.city, idx = null, chev = true } = {}) {
  const day = c.day;
  const today = todayKey();
  const cancelled = c.status === 'cancelled';
  return h('a', {
    class: ['ep-ev', cancelled && 'is-cancelled', day === today && 'today'],
    href: href.concert(c.id),
    dataset: idx != null ? { idx: String(idx) } : null,
  },
  h('span', { class: 'ep-date' },
    h('b', {}, dayNum(day)),
    h('span', { class: 'm' }, monthShort(day)),
    yearOf(day) !== yearOf(today) ? h('span', { class: 'y' }, String(yearOf(day))) : null,
    time ? h('span', { class: 'tm' }, timeOf(c.start)) : null),
  h('span', { class: 'ep-ev-main' },
    h('span', { class: 't' }, c.title),
    h('span', { class: 's' }, cancelled ? h('span', { class: 'ep-cx' }, `${t('Cancelled')} · `) : null, sub(c))),
  mark(c.id),
  chev ? icon('chevron', 15, 'ep-chev') : null);
}

// First `initial` rows, then "Show all N".
function eventList(list, renderItem, { initial = 10, cards = false } = {}) {
  const box = h('div', { class: ['ep-events', cards && 'cards'] });
  const wrap = h('div', {}, box);
  const btn = h('button', { class: 'ep-more', type: 'button' });
  let shown = 0;
  function showUpTo(n) {
    const end = Math.min(n, list.length);
    for (; shown < end; shown++) box.append(renderItem(list[shown], shown));
    if (shown >= list.length) btn.remove();
    else {
      btn.replaceChildren(t('Show all {n}', { n: fmtN(list.length) }), icon('down', 14));
      if (btn.parentNode !== wrap) wrap.append(btn);
    }
  }
  btn.addEventListener('click', () => showUpTo(list.length));
  showUpTo(initial);
  return { el: wrap, box, showUpTo };
}

// Rows grouped under caps month labels, first `initial` rows then "Show all N".
function monthGrouped(list, renderItem, initial = 20) {
  const perMonth = countBy(list, (c) => monthKeyOf(c.day));
  const wrap = h('div', { class: 'ep-months' });
  const btn = h('button', { class: 'ep-more', type: 'button', onclick: () => paint(list.length) });
  function paint(n) {
    const nodes = [];
    let cur = null;
    let box = null;
    list.slice(0, n).forEach((c, i) => {
      const m = monthKeyOf(c.day);
      if (m !== cur) {
        cur = m;
        box = h('div', { class: 'ep-events' });
        nodes.push(h('div', { class: 'ep-month' },
          h('span', {}, monthYear(m)),
          h('span', { class: 'n' }, tn(perMonth.get(m) || 0, '{n} concert', '{n} concerts'))), box);
      }
      box.append(renderItem(c, i));
    });
    if (n < list.length) {
      btn.replaceChildren(t('Show all {n}', { n: fmtN(list.length) }), icon('down', 14));
      nodes.push(btn);
    }
    wrap.replaceChildren(...nodes);
  }
  paint(initial);
  return wrap;
}

function flash(el) {
  if (!el) return;
  el.scrollIntoView({ behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
  el.classList.remove('flash');
  void el.offsetWidth; // restart the highlight animation
  el.classList.add('flash');
}

// ---------- Report a problem (nothing leaves the device unless you share it) ----------
function reportPill(subject) {
  return h('div', { class: 'ep-report-wrap' },
    h('button', { class: 'ep-report', type: 'button', onclick: () => openReport(subject) },
      h('span', { class: 'dot', 'aria-hidden': 'true' }, '!'), t('Report a problem')));
}

// Also used by the article end matter (editorial.js). The shared report itself stays in English:
// it goes to the venue or whoever publishes the listing. `label`: the name as the interface shows it.
export function openReport({ kind, name, path, label = name }) {
  let reason = REPORT_REASONS[0];
  const chips = h('div', { class: 'chip-wrap ep-report-reasons', role: 'radiogroup', 'aria-label': t('What’s wrong?') });
  const paintChips = () => chips.replaceChildren(...REPORT_REASONS.map((r) => h('button', {
    class: ['chip', r === reason && 'active'], type: 'button', role: 'radio', 'aria-checked': r === reason ? 'true' : 'false',
    onclick: () => { reason = r; paintChips(); },
  }, t(r))));
  paintChips();
  const note = h('textarea', { class: 'ep-report-note', rows: '4', placeholder: t('What should it say? (optional)'), 'aria-label': t('Details') });
  const body = h('div', { class: 'ep-report-body' },
    h('p', { class: 'lead' }, t('What’s wrong on the page for {name}?', { name: label })),
    chips, note,
    h('p', { class: 'hint' }, t('Klang has no server, so nothing is sent automatically. Share the report with the venue or whoever publishes the listing.')));
  const report = () => [
    'Klang — problem report',
    `${kind[0].toUpperCase()}${kind.slice(1)}: ${name}`,
    `Issue: ${reason}`,
    note.value.trim() ? `Details: ${note.value.trim()}` : null,
    pageURL(path),
  ].filter(Boolean).join('\n');
  const sheet = textSheet(t('Report a problem'), [body],
    h('button', { class: 'btn primary block', type: 'button', onclick: async () => { if (await shareText('Problem report', report())) sheet.close(); } },
      icon('share', 16), t('Share report')));
}

// ---------- listening ----------
// A cover plays Apple's 30-second preview inside Klang (previewButton); "Apple Music Classical ↗"
// under it (classicalButton) is a real link, so on an iPhone the tap itself hands the recording to
// Apple Music Classical (or Apple Music, chosen in Me), which plays it in full; "+" on the cover
// opens Save to Library (ui/save.js).

// First track of a work on an album, so that a link starts at the work instead of the top of the
// album. Looked up once the cover is on screen, one lookup at a time (iTunes allows ~20 requests a
// minute and prefetching must not crowd out the page's own requests). Until then links open the album.
const firstTracks = new Map(); // `${workId}|${albumId}` -> track | null
const firstTrackLoads = new Map(); // same key -> Promise<track | null>
let lookupChain = Promise.resolve();

// live(): false once the page or sheet that asked is gone (its queued lookups are then skipped).
function firstTrackOf(work, album, live = () => true) {
  const key = `${work.id}|${album.id}`;
  if (firstTracks.has(key)) return Promise.resolve(firstTracks.get(key));
  if (!firstTrackLoads.has(key)) {
    const p = lookupChain
      .then(() => (live() ? albumTracks(album.id) : null))
      .then((res) => {
        if (!res) return null;
        const tr = workTracks(work, res.tracks)?.[0] || null;
        firstTracks.set(key, tr);
        return tr;
      })
      .catch(() => null) // offline: keep the album link, try again next time
      .finally(() => firstTrackLoads.delete(key));
    lookupChain = p;
    firstTrackLoads.set(key, p);
  }
  return firstTrackLoads.get(key);
}

// A work's tracks on an album (null when none): ui/listen.js matchWorkTracks first; then, as Apple's
// titles vary ("The Firebird – Suite (1919)" / "Firebird Suite (1919 Version): I. …", "Op. 8 Nos. 1–4" /
// "Op. 8, No. 1"), the catalogue number's first part, or every distinctive word and number of the
// title. Never the album's first track on a guess. Also used by Discover and the editorials.
const tokens = (s) => ` ${normalize(s || '').replace(/[^a-z0-9]+/g, ' ').trim()} `;
const STOP = new Set(['the', 'and', 'for', 'with', 'from', 'major', 'minor', 'flat', 'sharp', 'des', 'les', 'der', 'die', 'das', 'und', 'del', 'version']);
export function workTracks(work, tracks) {
  const m = matchWorkTracks(work, tracks);
  if (m) return m.tracks;
  // "Op. 8" of "Op. 8 Nos. 1–4" — but not "Op. 18" of "Op. 18 No. 4", which names one of six
  const catalog = String(work.catalog || '').trim();
  const cat = /\bno\.?\s*\d/i.test(catalog) ? null : /^([a-z]+\.?\s*[ivx]*[:.]?\s*\d+[a-z]?)/i.exec(catalog);
  if (cat) {
    const key = tokens(cat[1]);
    const hit = tracks.filter((x) => tokens(x.title).includes(key));
    if (hit.length) return hit;
  }
  const words = tokens(String(work.title || '').replace(/[“”"«»]/g, ' ')).trim().split(' ')
    .filter((w) => (/^\d+$/.test(w) || w.length > 2) && !STOP.has(w));
  if (words.length < 2) return null;
  const hit = tracks.filter((x) => { const tt = tokens(x.title); return words.every((w) => tt.includes(` ${w} `)); });
  return hit.length ? hit : null;
}

// What a recording is as a piece: the work on that recording (work page), or the whole album.
function recordingPiece(work, a, track = work ? firstTracks.get(`${work.id}|${a.id}`) : null) {
  return work ? workPiece(work, repo.composer(work.composerId)?.name || work.composerName || null, a, track || null) : albumPiece(a);
}

// The preview of a recording: the work's own tracks on that album (all of them for an album), first
// one playing and the rest queued. Tracks carry the piece fields so the player can name the work.
// A work outside the repertoire whose tracks can't be told apart (Apple titles them in English, the
// listing in German or French) previews the recording from its start, as the concert page does — but
// only when the album holds that one work: Richter's "Prokofieff and Rachmaninoff" album starts with
// another concerto.
function previewOf(album, work = null) {
  return albumTracks(album.id).then(({ tracks }) => {
    const m = work ? workTracks(work, tracks) : null;
    if (work && !m && !(work.dynamic && oneWorkAlbum(tracks))) return null; // the tracks don't name the work: no guessing
    const list = (m || tracks.slice(0, 40)).filter((x) => x.preview);
    if (!list.length) return null;
    const composer = work ? repo.composer(work.composerId)?.name || work.composerName || null : null;
    for (const x of list) {
      Object.assign(x, { trackId: x.id, collectionId: album.id, workId: work?.id || null, workTitle: work?.title || null, composer });
    }
    if (work && m && !firstTracks.get(`${work.id}|${album.id}`)) firstTracks.set(`${work.id}|${album.id}`, m[0]);
    return { track: list[0], queue: list };
  });
}

// Calls fn once each watched element is on screen (cards in sideways rails included).
// watch.live() turns false when the page or sheet is closed.
function onScreen(bag) {
  let open = true;
  bag.push(() => {
    open = false;
  });
  if (typeof IntersectionObserver !== 'function') return Object.assign((el, fn) => fn(), { live: () => open });
  const fns = new Map();
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      io.unobserve(e.target);
      const fn = fns.get(e.target);
      fns.delete(e.target);
      fn?.();
    }
  });
  bag.push(() => {
    io.disconnect();
    fns.clear();
  });
  return Object.assign((el, fn) => {
    fns.set(el, fn);
    io.observe(el);
  }, { live: () => open });
}

// A recording: cover (tap = 30-second preview, round ▶ disc in its corner, "+" to save) and the
// "Apple Music Classical ↗" link. onPick(a): the recording was previewed or opened.
function recordingParts(a, work, { watch, onPick, saveCls = '', coverCls = 'ep-cover' }) {
  const piece = recordingPiece(work, a);
  const what = [work ? work.title : a.title, a.artist].filter(Boolean).join(' — ');
  const open = classicalButton(piece, { cls: 'ep-open' });
  open.dataset.label = shortAppName(); // a 124px card has no room for "Apple Music Classical"

  const key = work ? `${work.id}|${a.id}` : null;
  // once the work's first track is known, the link (and the piece its tap records) starts there
  const upgrade = () => {
    const tr = key ? firstTracks.get(key) : null;
    if (!tr || piece.trackId) return;
    Object.assign(piece, recordingPiece(work, a, tr));
    open.href = pieceURL(piece);
  };
  const pv = previewButton({
    cls: 'ep-pv',
    label: t('Play a 30-second preview of {title}', { title: what }),
    resolve: () => {
      onPick?.(a);
      return previewOf(a, work).then((r) => { upgrade(); return r; });
    },
  });
  open.addEventListener('click', () => onPick?.(a));
  const cover = h('span', { class: coverCls, onclick: () => pv.click() },
    a.artwork ? h('img', { src: a.artwork, alt: '', loading: 'lazy' }) : h('span', { class: 'ph' }, icon('music', 26)),
    pv, saveDisc(piece, saveCls));
  if (work && !piece.trackId && !firstTracks.has(key)) watch(cover, () => firstTrackOf(work, a, watch.live).then(upgrade));
  return { cover, open, piece };
}

// "+" on a cover: Save to Library (the album, and/or the piece into one of your playlists).
// Shows ✓ once the album is in your Library or the piece is in one of your playlists.
const savePieces = new WeakMap(); // button -> piece

function isSaved(p) {
  return (p.collectionId != null && store.hasAlbum(p.collectionId)) ||
    store.userPlaylists().some((pl) => (pl.items || []).some((it) => it.id === p.id));
}

function paintSave(btn) {
  const p = savePieces.get(btn);
  if (!p) return;
  const on = isSaved(p);
  const name = [p.artist, p.album || p.title].filter(Boolean).join(' — ');
  btn.classList.toggle('on', on);
  btn.replaceChildren(icon(on ? 'check' : 'plus', 15));
  btn.setAttribute('aria-label', on ? t('In your Library: {name}. Change where it’s saved', { name }) : t('Save {name} to your Library', { name }));
}

function saveDisc(piece, cls = '') {
  const btn = h('button', {
    type: 'button',
    class: ['ep-save', cls],
    onclick: (e) => {
      e.preventDefault();
      e.stopPropagation();
      openSaveSheet(piece);
    },
  });
  savePieces.set(btn, piece);
  paintSave(btn);
  return btn;
}

// Repaints the save discs under `root` whenever the Library changes.
const watchSaves = (root) => store.subscribe((topic) => {
  if (topic === 'library') root.querySelectorAll('.ep-save').forEach(paintSave);
});

// "Classical ↗" under a cover (the full name is in the link's accessible label).
const shortAppName = () => (playApp() === 'music' ? 'Apple Music' : t('Classical'));

// The iTunes credit with links to Apple Music (Apple's terms), for the foot of a page or sheet.
function creditNodes(classicalHref, musicHref) {
  return [t(ITUNES_CREDIT), isZh() ? '' : ' ',
    h('a', { href: classicalHref, target: '_blank', rel: 'noopener' }, t('Apple Music Classical')),
    ' · ',
    h('a', { href: musicHref, target: '_blank', rel: 'noopener' }, 'Apple Music'), isZh() ? '' : '.'];
}

// ---------- recordings carousel ----------
// load(): Promise<albums>. With `work` (work page) a cover previews that work on the recording and
// makes it your version; otherwise it previews the album.
function recordingsRail({
  load, title, sub, work = null, term, bag, ariaLabel,
  chosenId = null, autoSelect = false, onSelect = null, align = 'center', extra = null, credit = true, max = 10,
}) {
  const rail = h('div', { class: ['h-scroll', 'ep-rail', align === 'left' && 'left'], 'aria-label': ariaLabel });
  // credit: true = under the rail; 'detached' = returned as `credit` for the page to place
  // (Sheng has no fine print under its carousels, so pages put it at the very bottom).
  const creditEl = credit ? h('p', { class: 'listen-credit ep-credit' }) : null;
  const root = h('div', { class: 'ep-recs' }, rail, extra, credit === true ? creditEl : null);
  const watch = onScreen(bag);
  let albums = [];
  let selectedId = chosenId;

  function paintCredit() {
    if (!creditEl) return;
    const sel = albums.find((a) => same(a.id, selectedId));
    creditEl.replaceChildren(...creditNodes(sel ? classicalAlbumURL(sel.id) : classicalSearchURL(term),
      sel ? albumURL(sel.id, null, 'music') : appleMusicSearchURL(term)));
  }

  // chosen = your version (work page); current = the recording you last opened in Apple Music
  function paintState() {
    const cur = listening().current;
    for (const el of rail.querySelectorAll('.ep-album[data-id]')) {
      el.classList.toggle('chosen', same(el.dataset.id, selectedId));
      el.classList.toggle('current', !!cur && same(cur.collectionId, el.dataset.id));
    }
    paintCredit();
  }
  bag.push(onListening(paintState), watchSaves(rail));

  function choose(a) {
    if (!same(a.id, selectedId)) {
      selectedId = a.id;
      onSelect?.(a);
    }
    paintState();
  }

  function card(a) {
    const s = sub(a);
    const { cover, open } = recordingParts(a, work, { watch, onPick: choose });
    return h('div', { class: 'ep-album', dataset: { id: String(a.id) } },
      cover,
      h('span', { class: 't' }, title(a)),
      s ? h('span', { class: 's' }, s) : null,
      open);
  }

  function visible() {
    let l = albums.slice(0, max);
    const sel = albums.find((a) => same(a.id, selectedId));
    if (sel && !l.includes(sel)) l = [sel, ...l.slice(0, max - 1)];
    return l;
  }

  function paint() {
    rail.removeAttribute('aria-busy');
    rail.replaceChildren(...visible().map(card));
    paintState();
  }

  function skeleton() {
    rail.setAttribute('aria-busy', 'true');
    rail.replaceChildren(...[0, 1, 2].map(() => h('div', { class: 'ep-album' },
      h('span', { class: 'ep-cover skeleton' }), h('span', { class: 'skeleton ep-skel-line' }))));
  }

  function message(text, retry = false) {
    rail.removeAttribute('aria-busy');
    rail.replaceChildren(h('div', { class: 'ep-rail-msg' },
      h('p', {}, text),
      h('div', { class: 'ep-rail-actions' },
        retry ? h('button', { class: 'btn small', type: 'button', onclick: start }, t('Try again')) : null,
        h('a', { class: 'btn small', href: classicalSearchURL(term), target: '_blank', rel: 'noopener' }, icon('external', 14), t('Search Apple Music Classical')))));
    paintCredit();
  }

  async function start() {
    skeleton();
    try {
      albums = (await load()) || [];
    } catch {
      message(t('Couldn’t load recordings. Check your connection and try again.'), true);
      return;
    }
    if (!albums.length) {
      message(t('No recordings found on Apple Music.'));
      return;
    }
    if (autoSelect && !albums.some((a) => same(a.id, selectedId))) selectedId = albums[0].id;
    paint();
  }

  start();
  return {
    el: root,
    credit: credit === 'detached' ? creditEl : null,
    select(a) {
      if (!a) return;
      if (!albums.some((x) => same(x.id, a.id))) albums = [a, ...albums];
      selectedId = a.id;
      paint();
    },
  };
}

// ---------- More recordings (every version of a work) ----------
// Sheng's Versions sheet: tap a cover to hear its preview (it becomes your version); "Open" plays it
// in full in Apple Music Classical; "+" saves it.
// load(): the albums to show (a listed work passes its own, filtered search).
function openRecordingsSheet(w, title, term, onChoose, load = () => searchAlbums(term, SEARCH_LIMIT)) {
  const bag = [];
  const body = h('div', { class: 'versions' },
    h('div', { class: 'versions-grid', 'aria-busy': 'true' }, Array.from({ length: 9 }, () => h('div', { class: 'skeleton version-skel' }))));
  const sheet = openSheet({
    title,
    subtitle: t('Versions · All recordings'),
    body,
    footer: h('p', { class: 'listen-credit' }, creditNodes(classicalSearchURL(term), appleMusicSearchURL(term))),
    onClose: () => bag.forEach((fn) => fn()),
  });
  sheet.el.classList.add('versions-sheet', 'ep-versions');
  const watch = onScreen(bag);
  bag.push(watchSaves(body));

  function paint(albums) {
    let chosenId = albums.find((a) => same(a.id, store.listenChoice(w.id)))?.id ?? albums[0].id;
    const cards = [];
    const mark = () => cards.forEach(([el, a]) => el.classList.toggle('chosen', same(a.id, chosenId)));
    const pick = (a) => {
      if (same(a.id, chosenId)) return;
      chosenId = a.id;
      store.setListenChoice(w.id, a.id);
      onChoose?.(a);
      mark();
    };
    body.replaceChildren(
      h('p', { class: 'versions-count' }, tn(albums.length, '{n} recording · tap the cover for a 30-second preview', '{n} recordings · tap a cover for a 30-second preview')),
      h('div', { class: 'versions-grid' }, albums.map((a) => {
        const { cover, open } = recordingParts(a, w, { watch, onPick: pick, saveCls: 'sm', coverCls: 'ep-vcover' });
        open.addEventListener('click', () => setTimeout(() => sheet.close(), 0));
        const el = h('div', { class: 'version-card' },
          cover,
          h('div', { class: 't' }, a.artist),
          h('div', { class: 's' }, [a.year, a.title].filter(Boolean).join(' · ')),
          open);
        cards.push([el, a]);
        return el;
      })));
    mark();
  }

  function message(text) {
    body.replaceChildren(h('div', { class: 'listen-msg' },
      h('p', {}, text),
      h('div', { class: 'ep-rail-actions' },
        h('a', { class: 'btn small', href: classicalSearchURL(term), target: '_blank', rel: 'noopener' }, icon('external', 14), t('Search Apple Music Classical')),
        h('a', { class: 'btn small', href: appleMusicSearchURL(term), target: '_blank', rel: 'noopener' }, icon('music', 14), 'Apple Music'))));
  }

  Promise.resolve().then(load)
    .then((albums) => (albums.length ? paint(albums) : message(t('No recordings of this work found on Apple Music.'))))
    .catch(() => message(t('Couldn’t load recordings. Check your connection and try again.')));
  return sheet;
}

// ---------- work cards (accent bar coloured per genre) ----------
// Sheng's cards carry only the bar, the serif title and "BWV 244 · 1727 · 97 MIN"; the number of
// upcoming Swiss performances goes into the accessible name instead of a visible line.
function workCard(w, n = 0) {
  const g = genreOf(w);
  const meta = [w.catalog, w.year, w.minutes ? t('{n} min', { n: w.minutes }) : null].filter(Boolean).join(' · ');
  return h('a', {
    class: ['ep-work', `g-${g.id}`], href: href.work(w.id),
    'aria-label': [w.title, meta, n > 0 ? t('{n} upcoming', { n: fmtN(n) }) : null].filter(Boolean).join(', '),
  },
  h('span', { class: 'bar', 'aria-hidden': 'true' }),
  h('span', { class: 't' }, w.title),
  meta ? h('span', { class: 'meta' }, meta) : null);
}

// Sideways-scrolling grid, two rows when there are more than two works.
function workGrid(list, perWork) {
  return h('div', { class: ['ep-grid', list.length <= 2 && 'one'] }, list.map((w) => workCard(w, perWork.get(w.id) || 0)));
}

// ---------- composer helpers ----------
function periodsOf(c, works) {
  const sorted = [...works].sort(byYear);
  let defs = PERIODS[c.id];
  if (defs) defs = defs.map((d) => ({ ...d, label: t(d.label), intro: t(d.intro) }));
  else {
    if (!c.born) return [{ label: t('Works'), range: '', intro: null, works: sorted }];
    const years = sorted.map((w) => w.year).filter(Boolean);
    const start = Math.min(c.born + 18, ...years);
    const end = Math.max(c.died || yearOf(todayKey()), start + 2);
    const span = end - start + 1;
    const b1 = start + Math.round(span / 3);
    const b2 = start + Math.round((2 * span) / 3);
    defs = [
      { label: t('Early years'), from: start, to: b1 - 1 },
      { label: t('Middle years'), from: b1, to: b2 - 1 },
      { label: t(c.died ? 'Late years' : 'Recent years'), from: b2, to: end },
    ].map((d) => ({ ...d, intro: t('From {from} to {to}, when {name} was {a} to {b}.', { from: d.from, to: d.to, name: composerShort(c), a: d.from - c.born, b: d.to - c.born }) }));
  }
  const groups = defs.map((d) => ({
    ...d,
    range: d.to ? `${d.from}–${d.to}` : `${d.from}–`,
    works: [],
  }));
  for (const w of sorted) {
    let gi = 0;
    if (w.year) groups.forEach((g, i) => { if (w.year >= g.from) gi = i; });
    groups[gi].works.push(w);
  }
  return groups.filter((g) => g.works.length);
}

function genresOf(works) {
  const out = [];
  for (const g of [...GENRES, OTHER_GENRE]) {
    const list = works.filter((w) => genreOf(w) === g).sort(byYear);
    if (list.length) out.push({ ...g, works: list });
  }
  return out;
}

// Composers most often on the same Swiss programme as `id` (upcoming, not cancelled).
function relatedComposers(id) {
  const counts = new Map();
  for (const c of live(repo.upcoming({ composerId: id }))) {
    const others = new Set();
    for (const p of c.program || []) {
      const cid = p.composerId || repo.work(p.workId)?.composerId;
      if (cid && cid !== id) others.add(cid);
    }
    for (const o of others) counts.set(o, (counts.get(o) || 0) + 1);
  }
  return [...counts]
    .map(([cid, n]) => ({ comp: repo.composer(cid), n }))
    .filter((r) => r.comp)
    .sort((a, b) => b.n - a.n || a.comp.name.localeCompare(b.comp.name))
    .slice(0, 8);
}

function lifeLine(c) {
  const life = c.died ? `${c.born} — ${c.died}` : t('Born {year}', { year: c.born });
  return [c.born ? life : null, c.country ? countryText(c.country) : null].filter(Boolean).join(' · ');
}

// Facts from Klang's own data, for a composer without a written biography.
function composerFacts(c, works, up) {
  const today = todayKey();
  const name = composerShort(c);
  const ps = [];
  if (c.born) {
    const who = c.country ? (isZh() ? `${composerName(c)}（${countryText(c.country)}）` : `${c.name} (${c.country})`) : composerName(c);
    if (c.died) {
      ps.push(tRaw('{who} was born {born} and died {died}, aged {age}.', { who, age: ageAt(c.born, c.bornDate, c.died, c.diedDate) },
        { born: longDate(c.born, c.bornDate), died: longDate(c.died, c.diedDate) }));
    } else {
      ps.push(tRaw('{who} was born {born} and is {age}.', { who, age: ageAt(c.born, c.bornDate, yearOf(today), today.slice(5)) },
        { born: longDate(c.born, c.bornDate) }));
    }
  }
  const sorted = [...works].sort(byYear);
  if (sorted.length === 1) {
    const w = sorted[0];
    ps.push(t('Klang’s repertoire includes one work by {name}: {title}{year}.', { name, title: w.title, year: w.year ? (isZh() ? `（${w.year}）` : ` (${w.year})`) : '' }));
  } else if (sorted.length > 1) {
    const years = sorted.map((w) => w.year).filter(Boolean);
    const span = !years.length ? ''
      : years[0] === years[years.length - 1] ? t(', all from {year}', { year: years[0] })
        : t(', written between {a} and {b}', { a: years[0], b: years[years.length - 1] });
    ps.push(t('Klang’s repertoire includes {n} works by {name}{span}: {titles}.', { n: sorted.length, name, span, titles: joinNames(sorted.map((w) => w.title)) }));
  }
  const act = live(up);
  if (act.length) {
    const next = act[0];
    const top = [...workCounts(act)].sort((a, b) => b[1] - a[1])[0];
    const topWork = top ? repo.work(top[0]) : null;
    ps.push(tRaw('On stage in Switzerland: {n} upcoming performances of music by {name} in {cities}; the next is {when} in {city}.', {
      n: fmtN(act.length), name, cities: tn(cityCount(act), '{n} city', '{n} cities'), city: cityText(next) || venueText(next),
    }, { when: whenPhrase(next.day) }) + (topWork && top[1] > 1 ? ` ${t('Most programmed: {title} ({n} concerts).', { title: topWork.title, n: fmtN(top[1]) })}` : ''));
  } else {
    ps.push(t('No performances of music by {name} are announced in Switzerland right now.', { name }));
  }
  return ps;
}

function openBio(c, bios, works, up) {
  const text = textOf(bios[c.id]);
  const nodes = [h('p', { class: 'who' }, composerName(c))];
  if (text) nodes.push(englishOnly(), ...paragraphs(text));
  else {
    nodes.push(...composerFacts(c, works, up).map((x) => h('p', {}, x)),
      h('p', { class: 'fine' }, t('A full biography of {name} hasn’t been written for Klang yet.', { name: composerShort(c) })));
  }
  textSheet(t('Bio'), nodes);
}

// ---------- Composer ----------
export async function renderComposer({ id }) {
  const c = repo.composer(id);
  if (!c) return notFound('Composer', t('This composer isn’t in Klang’s repertoire.'));
  const content = await loadContent();
  const bag = [];
  const mark = liveMarks(bag);
  const up = repo.upcoming({ composerId: id });
  const works = repo.worksOf(id);
  const perWork = workCounts(live(up));
  const nEditorials = content.articles.filter((a) => mentionsComposer(a, id)).length;
  const name = composerName(c);
  const short = composerShort(c);

  const explore = exploreSection(c, works, perWork);
  const scrollToExplore = () => explore.scrollIntoView({ behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });

  const head = h('header', { class: 'ep-head' },
    portrait(c.name, 'lg', c.id),
    h('h1', { class: 'ep-name' }, name),
    name !== c.name ? h('div', { class: 'ep-orig' }, c.name) : null,
    h('div', { class: 'ep-chips' },
      h('button', { class: 'ep-chip light', type: 'button', onclick: () => openBio(c, content.bios, works, up) }, glyph('book'), t('Read Bio')),
      h('button', { class: 'ep-chip', type: 'button', onclick: scrollToExplore }, glyph('books'), t('Explore Works')),
      nEditorials > 0
        ? h('a', { class: 'ep-chip ed', href: `#/editorials/${encodeURIComponent(id)}` }, icon('notes', 15), t('Editorials'), h('span', { class: 'n' }, fmtN(nEditorials)))
        : null),
    favButton('composer', id, short, bag, 'ep-heart'),
    h('div', { class: 'ep-caps' }, lifeLine(c)));

  const latest = recordingsRail({
    load: () => composerAlbums(c.name, { newest: true }).then((l) => l.slice(0, 10)),
    title: (a) => a.title, sub: (a) => a.artist, term: c.name, bag,
    ariaLabel: t('Latest releases of music by {name}', { name }), align: 'left', credit: false,
  });
  const popular = recordingsRail({
    load: () => composerAlbums(c.name).then((l) => l.slice(0, 10)),
    title: (a) => a.title, sub: (a) => a.artist, term: c.name, bag,
    ariaLabel: t('Popular recordings of music by {name}', { name }), align: 'left', credit: 'detached',
  });

  // Sheng: head · Latest releases · Popular among listeners · Explore <name>. Klang adds the
  // Swiss concerts after Explore (styled like the work page's "Concerts N" list).
  const body = h('div', { class: 'ep-page ep-composer' },
    head,
    h('section', { class: 'ep-sec' }, epHead(t('Latest releases'), { serif: true }), latest.el),
    h('section', { class: 'ep-sec' }, epHead(t('Popular among listeners'), { serif: true }), popular.el),
    explore,
    h('section', { class: 'ep-sec ep-comp-concerts' },
      epHead(t('Concerts'), { bar: true, count: up.length }),
      up.length
        ? eventList(up, (x) => eventItem(x, mark, { sub: SUB.cityOnly }), { initial: 10 }).el
        : softEmpty('calendar', t('No {name} on Swiss stages right now', { name: short }),
          t('Nothing by {name} is announced in Switzerland at the moment. Add {name} to your favourites and new dates show up under Following in Concerts.', { name: short })),
      up.length ? sourcesLine(up) : null),
    reportPill({ kind: 'composer', name: c.name, label: name, path: href.composer(id) }),
    popular.credit);

  return {
    title: name,
    back: true,
    actions: topActions(shareButton(name, t('{name} — on stage in Switzerland', { name }), href.composer(id))),
    body,
    cleanup: () => bag.forEach((fn) => fn()),
  };
}

function exploreSection(c, works, perWork) {
  const short = composerShort(c);
  const tabs = h('div', { class: 'ep-tabs', role: 'tablist', 'aria-label': t('Explore {name}', { name: short }) });
  const panel = h('div', { class: 'ep-explore-panel', role: 'tabpanel' });
  const TABS = [['period', 'By period'], ['genre', 'By genre'], ['related', 'Related']];

  // Sheng shows just the period / genre name over its italic intro (no year range or count).
  const groupBlock = (g) => h('div', { class: 'ep-group' },
    h('h3', { class: 'ep-group-title', title: g.range || null }, g.label),
    g.intro ? h('p', { class: 'ep-intro' }, g.intro) : null,
    workGrid(g.works, perWork));

  function build(tab) {
    if (tab === 'related') {
      const rel = relatedComposers(c.id);
      if (!rel.length) {
        return [softEmpty('person', t('No shared programmes yet'),
          t('No other composer shares an announced Swiss programme with {name} this season.', { name: short }))];
      }
      return [h('div', { class: 'ep-rel-grid' }, rel.map(({ comp, n }) => h('a', { class: 'ep-rel', href: href.composer(comp.id) },
        h('span', { class: 'ep-rel-av', 'aria-hidden': 'true' }, icon('person', 18)),
        h('p', {}, tNodes(n === 1 ? 'Shares {n} programme with {name} in Switzerland this season' : 'Shares {n} programmes with {name} in Switzerland this season',
          { n: fmtN(n), name: h('b', {}, composerName(comp)) })))))];
    }
    if (!works.length) {
      return [softEmpty('music', t('No works in Klang yet'), t('Klang’s repertoire doesn’t list works by {name} yet.', { name: short }))];
    }
    const groups = tab === 'genre'
      ? genresOf(works).map((g) => ({ label: t(g.label), range: tn(g.works.length, '{n} work', '{n} works'), intro: t(g.intro), works: g.works }))
      : periodsOf(c, works);
    return groups.map(groupBlock);
  }

  function show(tab) {
    exploreTab = tab;
    tabs.replaceChildren(...TABS.map(([k, label]) => h('button', {
      class: k === tab ? 'active' : '', type: 'button', role: 'tab', 'aria-selected': k === tab ? 'true' : 'false',
      onclick: () => { if (k !== exploreTab) show(k); },
    }, t(label))));
    panel.replaceChildren(...build(tab));
  }
  show(TABS.some(([k]) => k === exploreTab) ? exploreTab : 'period');

  return h('section', { class: 'ep-explore', id: `explore-${c.id}` },
    h('h2', { class: 'ep-explore-title' }, t('Explore {name}', { name: short })),
    h('div', { class: 'ep-ornament', 'aria-hidden': 'true' }, h('i'), h('b'), h('i')),
    tabs,
    panel);
}

// ---------- Work ----------
// Facts from Klang's own data, for a work without a written listening guide.
function workFacts(w, comp, up) {
  const ps = [];
  if (w.blurb && !isZh()) ps.push(w.blurb);
  const bits = [];
  const what = `${w.title}${w.catalog ? (isZh() ? `（${w.catalog}）` : ` (${w.catalog})`) : ''}`;
  if (w.year) {
    bits.push(comp?.born
      ? t('{what} dates from {year}, when {name} was about {age}.', { what, year: w.year, name: composerShort(comp), age: w.year - comp.born })
      : t('{what} dates from {year}.', { what, year: w.year }));
  }
  if (w.minutes) bits.push(t('A performance lasts about {time}.', { time: fmtMinutes(w.minutes) }));
  if (bits.length) ps.push(bits.join(isZh() ? '' : ' '));
  const act = live(up);
  if (act.length) {
    const next = act[0];
    ps.push(tRaw('On stage in Switzerland: {n} upcoming performances in {cities}; the next is {when} in {city}.', {
      n: fmtN(act.length), cities: tn(cityCount(act), '{n} city', '{n} cities'), city: cityText(next) || venueText(next),
    }, { when: whenPhrase(next.day) }));
  } else {
    ps.push(t('No Swiss performances are announced right now. Add the work to your favourites to spot new dates under Following in Concerts.'));
  }
  return ps;
}

function openGuide(w, comp, guides, up) {
  const text = textOf(guides[w.id]);
  // Sheng's guide starts straight with the prose (only the Bio sheet opens with the italic name).
  const nodes = [];
  if (text) nodes.push(englishOnly(), ...paragraphs(text));
  else {
    nodes.push(h('p', { class: 'who' }, [comp ? composerName(comp) : null, w.title].filter(Boolean).join(' · ')));
    nodes.push(...workFacts(w, comp, up).map((x) => h('p', {}, x)),
      h('p', { class: 'fine' }, t('A full listening guide for this work hasn’t been written yet.')));
  }
  textSheet(t('Listening guide'), nodes);
}

export async function renderWork({ id }) {
  if (String(id).startsWith('x-')) return renderListedWork(id);
  const w = repo.work(id);
  if (!w) return notFound('Work', t('This work isn’t in Klang’s repertoire.'));
  const content = await loadContent();
  const bag = [];
  const mark = liveMarks(bag);
  const comp = repo.composer(w.composerId);
  const up = repo.upcoming({ workId: id });
  const label = [comp ? composerShort(comp) : null, w.title].filter(Boolean).join(isZh() ? '：' : ': ');
  const caps = [w.catalog, w.year, w.minutes ? t('~{n} min', { n: w.minutes }) : null].filter(Boolean).join(' · ');
  const term = searchTerm(w);

  const rail = recordingsRail({
    load: () => searchAlbums(term, SEARCH_LIMIT),
    title: (a) => a.artist,
    sub: (a) => a.title,
    work: w,
    term, bag, ariaLabel: t('Recordings of {title}', { title: label }),
    chosenId: store.listenChoice(id), autoSelect: true,
    onSelect: (a) => store.setListenChoice(id, a.id),
    extra: h('button', { class: 'ep-link', type: 'button', onclick: () => openRecordingsSheet(w, [comp ? composerShort(comp) : null, w.title].filter(Boolean).join(' · '), term, (a) => rail.select(a)) },
      t('More recordings'), icon('chevron', 14)),
    credit: 'detached',
  });

  // Sheng's work page ends with the Concerts list (no "more by" rail); the section bars and
  // the "More recordings" link take the work's genre colour (blue for an opera like Thaïs).
  const body = h('div', { class: ['ep-page', 'ep-workpage', `ga-${genreOf(w).id}`] },
    h('header', { class: 'ep-head' },
      comp
        ? h('a', { class: 'ep-comp-link', href: href.composer(comp.id) }, portrait(comp.name, 'md', comp.id), h('span', {}, composerName(comp)))
        : null,
      h('h1', { class: 'ep-name work' }, w.title),
      caps ? h('div', { class: 'ep-caps' }, caps) : null,
      h('button', { class: 'ep-guide-btn', type: 'button', onclick: () => openGuide(w, comp, content.guides, up) }, glyph('book'), t('Listening guide'))),
    h('section', { class: 'ep-sec' }, epHead(t('Recordings'), { bar: true }),
      h('p', { class: 'ep-listen-note' }, t('Tap a cover for a 30-second preview; ↗ plays the recording in full in {app}.', { app: t(playAppName()) })),
      rail.el),
    reportPill({ kind: 'work', name: [comp?.short, w.title].filter(Boolean).join(': '), label, path: href.work(id) }),
    h('section', { class: 'ep-sec' },
      epHead(t('Concerts'), { bar: true, count: up.length }),
      up.length
        ? eventList(up, workEvent(up, mark), { initial: 40 }).el
        : softEmpty('calendar', t('No upcoming performances'),
          t('This work isn’t on any announced Swiss programme right now. Add it to your favourites to catch new dates.')),
      up.length ? sourcesLine(up) : null),
    rail.credit);

  return {
    title: w.title,
    back: true,
    actions: topActions(
      favButton('work', id, w.title, bag),
      shareButton(label, t('{title} — recordings and concerts in Switzerland', { title: label }), href.work(id))),
    body,
    cleanup: () => bag.forEach((fn) => fn()),
  };
}

// A work page's performance: date, title, "Hall · City" — and the time when the day has another
// performance of the work (a lunch concert and the evening one).
function workEvent(list, mark) {
  const n = new Map();
  for (const c of list) n.set(c.day, (n.get(c.day) || 0) + 1);
  return (c) => eventItem(c, mark, { sub: SUB.venueCity, time: n.get(c.day) > 1 });
}

// ---------- a work outside the repertoire (#/work/x-…) ----------
// Album titles name the composer as Apple spells it ("Prokofiev", "Shostakovich"); listings write
// "Prokofjew", "Schostakowitsch": compare the two through the same transliteration.
const nameKey = (s) => tokens(s).replace(/ae/g, 'a').replace(/oe/g, 'o').replace(/ue/g, 'u')
  .replace(/tsch/g, 'ch').replace(/sch/g, 'sh').replace(/tch/g, 'ch').replace(/ff /g, 'v ').replace(/w/g, 'v').replace(/j/g, 'i').replace(/y /g, 'i ');

// The listed work as the recordings rail and the Versions sheet take it (ui/listen.js stand-in):
// { id, title, composerId, composerName, catalog, keys (catalogue numbers, quoted names), q, … }
function listedWork(d) {
  const quoted = [...d.title.matchAll(/[«“„"]([^»”“"]{3,40})[»”“"]/g)].map((m) => m[1].trim());
  const cats = catalogKeys(`${d.title} ${d.catalog || ''}`);
  const overture = /ouvert[uü]re|overture/i.test(d.title) ? cats.flatMap((k) => [`${k} Overture`, `${k} Ouverture`]) : [];
  // Apple's English track titles: "Klavierkonzert Nr. 3" is "Piano Concerto No. 3"
  const english = englishNumbered(d.title);
  return { ...d, keys: [...overture, ...cats, ...quoted, ...(english ? [english] : [])] };
}


// Recordings of a listed work: albums that name the composer, those that also name the work first
// (catalogue number, "Symphony No. 4", a quoted name); the English form of the title when the
// listing's own finds nothing better. An arrangement: only recordings that name its arranger.
function listedRecordings(w) {
  const sur = w.surname ? nameKey(w.surname) : null;
  const arr = w.arranger ? nameKey(w.arranger) : null;
  const rank = (a) => {
    if (arr && !nameKey(`${a.title} ${a.artist}`).includes(arr)) return 0; // an arrangement: the arranger's version only
    if (!sur || !nameKey(a.title).includes(sur)) return sur ? 0 : 1;
    const title = tokens(a.title);
    if ((w.keys || []).some((k) => title.includes(tokens(k)))) return 2;
    if (!w.num) return 1;
    const found = [...title.matchAll(new RegExp(` ${w.num.kind}s? (?:no|nr|nos) (\\d+)`, 'g'))].map((m) => m[1]);
    return !found.length ? 1 : found.includes(w.num.n) ? 2 : 0;
  };
  const pick = (albums) => albums.map((a) => [a, rank(a)]).filter(([, r]) => r > 0).sort((x, y) => y[1] - x[1]).map(([a]) => a);
  return async () => {
    let albums = pick(await searchAlbums(w.q, SEARCH_LIMIT));
    // then the English form, then composer + catalogue number ("Prokofjew Op. 125"), while no album names the work
    // and, when nothing at all was found, the English form without its number ("Canales String Quartet")
    for (const q of [w.qEnglish, w.qCatalog, w.qBroad]) {
      if (!q || q === w.q || albums.some((a) => rank(a) === 2) || (q === w.qBroad && albums.length)) continue;
      try {
        const more = pick(await searchAlbums(q, SEARCH_LIMIT));
        if (more.length) albums = [...more, ...albums.filter((a) => !more.some((b) => same(a.id, b.id)))].sort((x, y) => rank(y) - rank(x));
      } catch { /* keep what was found */ }
    }
    return albums;
  };
}

// What a work page lists (the unit tests read it too): the work — Klang's own, or one gathered from
// the listings ('x-…') — and its performances from `from` on in every hall, each "Hall · City".
export function workPageData(id, from = todayKey()) {
  const work = String(id).startsWith('x-') ? repo.dynamicWork(id) : repo.work(id) || null;
  if (!work) return null;
  const concerts = repo.query({ workId: id, from });
  return { work, concerts, rows: concerts.map((c) => ({ id: c.id, day: c.day, title: c.title, where: SUB.venueCity(c) })) };
}

function renderListedWork(id) {
  const d = repo.dynamicWork(id);
  if (!d) {
    return notFound('Work', t('No current listing names this work. Programmes change — search for it instead.'));
  }
  const w = listedWork(d);
  const bag = [];
  const mark = liveMarks(bag);
  const comp = d.composerId ? repo.composer(d.composerId) : null;
  const compShown = comp ? composerShort(comp) : d.composerName;
  const label = [compShown, d.title].filter(Boolean).join(isZh() ? '：' : ': ');
  const up = repo.upcoming({ workId: id });
  const term = d.q;
  const loadRecordings = listedRecordings(w);
  const rail = recordingsRail({
    load: loadRecordings,
    title: (a) => a.artist,
    sub: (a) => a.title,
    work: w,
    term, bag, ariaLabel: t('Recordings of {title}', { title: label }),
    chosenId: store.listenChoice(id), autoSelect: true,
    onSelect: (a) => store.setListenChoice(id, a.id),
    extra: h('button', { class: 'ep-link', type: 'button', onclick: () => openRecordingsSheet(w, [compShown, d.title].filter(Boolean).join(' · '), term, (a) => rail.select(a), loadRecordings) },
      t('More recordings'), icon('chevron', 14)),
    credit: 'detached',
  });
  const halls = new Set(up.map((c) => c.venueId || c.venueName).filter(Boolean)).size;
  const body = h('div', { class: ['ep-page', 'ep-workpage', 'ep-listed', `ga-${d.genre || 'other'}`] },
    h('header', { class: 'ep-head' },
      comp
        ? h('a', { class: 'ep-comp-link', href: href.composer(comp.id) }, portrait(comp.name, 'md', comp.id), h('span', {}, composerName(comp)))
        : d.composerName ? h('div', { class: 'ep-comp-link' }, portrait(d.composerName, 'md'), h('span', {}, d.composerName)) : null,
      h('h1', { class: 'ep-name work' }, d.title),
      d.catalogNote ? h('div', { class: 'ep-caps' }, d.catalogNote) : null,
      d.titles.length
        ? h('p', { class: 'ep-also' }, h('span', { class: 'k' }, t('Also listed as:')), isZh() ? '' : ' ', d.titles.map((x) => h('span', { class: 'v', lang: 'und' }, x)))
        : null,
      h('p', { class: 'ep-listed-note' }, t('As the venues list it — this work isn’t in Klang’s repertoire yet, so there is no listening guide.'))),
    h('section', { class: 'ep-sec' }, epHead(t('Recordings'), { bar: true }),
      h('p', { class: 'ep-listen-note' }, t('Found on Apple Music by composer and title — tap a cover for a 30-second preview; ↗ plays the recording in full in {app}.', { app: t(playAppName()) })),
      rail.el),
    reportPill({ kind: 'work', name: [d.composerName, d.title].filter(Boolean).join(': '), label, path: href.work(id) }),
    h('section', { class: 'ep-sec' },
      epHead(t('Concerts'), { bar: true, count: up.length }),
      up.length > 1 && halls > 1 ? h('p', { class: 'ep-listen-note' }, tn(halls, 'At {n} hall', 'At {n} halls')) : null,
      up.length
        ? eventList(up, workEvent(up, mark), { initial: 40 }).el
        : softEmpty('calendar', t('No upcoming performances'), t('No announced Swiss programme has this work right now.')),
      up.length ? sourcesLine(up) : null),
    rail.credit);

  return {
    title: d.title,
    back: true,
    actions: topActions(shareButton(label, t('{title} — recordings and concerts in Switzerland', { title: label }), href.work(id))),
    body,
    cleanup: () => bag.forEach((fn) => fn()),
  };
}

// ---------- Artist (performer or ensemble from the listings) ----------
function relatedArtists(id, all) {
  const today = todayKey();
  const m = new Map();
  for (const c of all) {
    const seen = new Set();
    for (const cr of c.credits || []) {
      if (!cr.artistId || cr.artistId === id || seen.has(cr.artistId)) continue;
      seen.add(cr.artistId);
      const r = m.get(cr.artistId) || { id: cr.artistId, name: cr.name, n: 0, example: null };
      r.n += 1;
      if (!r.example || (r.example.day < today && c.day >= today)) r.example = c;
      m.set(cr.artistId, r);
    }
  }
  return [...m.values()]
    .filter((r) => repo.artist(r.id))
    .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name))
    .slice(0, 10);
}

// Tour route (Sheng: one flag chip per country with its number of dates, in tour order).
// Klang is Swiss-only, so the stops are cities, in order of their first date, with totals.
function routeLegs(up) {
  const legs = [];
  const byKey = new Map();
  up.forEach((c, i) => {
    if (c.status === 'cancelled') return;
    const key = c.cityId || '?';
    const leg = byKey.get(key);
    if (leg) leg.n += 1;
    else {
      const l = { key, name: cityText(c) || t('Venue TBA'), n: 1, idx: i };
      byKey.set(key, l);
      legs.push(l);
    }
  });
  return legs;
}

// onStop(leg): tap on a chip (jump to that city's first date in the run).
function routeEl(legs, onStop) {
  const route = h('div', { class: 'ep-route' });
  legs.forEach((leg, k) => {
    if (k) route.append(h('span', { class: 'arr', 'aria-hidden': 'true' }, '→'));
    route.append(h('button', {
      class: 'ep-stop', type: 'button',
      'aria-label': t('{city}, {dates} — show the first one', { city: leg.name, dates: tn(leg.n, '{n} date', '{n} dates') }),
      onclick: () => onStop(leg),
    }, leg.name, h('b', {}, fmtN(leg.n))));
  });
  return route;
}

const itinNote = () => t('All times shown in Swiss local time.');
const artistCard = (mark) => (c, i) => eventItem(c, mark, { time: true, idx: i, sub: SUB.flagCity, chev: false });
const itineraryHref = (id, idx = null) => `${href.artist(id)}/itinerary${idx != null ? `/${idx}` : ''}`;
const countsLine = (active, up) => [tn(cityCount(active), '{n} city', '{n} cities'), tn(active.length, '{n} date', '{n} dates'),
  up.length > active.length ? t('{n} cancelled', { n: fmtN(up.length - active.length) }) : null].filter(Boolean).join(' · ');

export async function renderArtist({ id }) {
  // Sub-route: #/artist/<id>/itinerary[/<index to highlight>] — Sheng's "Full Itinerary" page.
  const sub = /^(.+)\/itinerary(?:\/(\d+))?$/.exec(id || '');
  if (sub) return renderItinerary(sub[1], sub[2] != null ? Number(sub[2]) : null);

  const a = repo.artist(id);
  if (!a) return notFound('Performer', t('This performer isn’t in the current listings.'));
  const content = await loadContent();
  const bag = [];
  const mark = liveMarks(bag);
  const today = todayKey();
  const all = repo.query({ artistId: id });
  const up = all.filter((c) => c.day >= today);
  const active = live(up);
  const roles = rolesOf(id, all);
  // two roles at most, each once ("Violin & Conductor" and "Violin & direction" are both 小提琴兼指挥)
  const roleLine = [...new Set((roles.length ? roles : [a.role]).map(roleText))].slice(0, 2).join(' · ');
  // Klang writes no biographies of living performers: the button shows only when one exists.
  const bio = textOf(content.bios[id]);

  const head = h('header', { class: 'ep-head left' },
    h('div', { class: 'ep-artist-top' },
      portrait(a.name, 'lg'),
      h('div', { class: 'ep-artist-id' },
        h('h1', { class: 'ep-name' }, a.name),
        // Sheng's gold ON TOUR: dates in more than one city (a resident orchestra at home is not touring)
        cityCount(active) >= 2 ? h('span', { class: 'ep-tour' }, h('i'), t('On tour')) : null)),
    h('div', { class: 'ep-caps' }, [roleLine, all.length ? tn(all.length, '{n} concert', '{n} concerts') : null].filter(Boolean).join(' · ')),
    h('div', { class: 'ep-row' },
      bio ? h('button', {
        class: 'ep-chip light', type: 'button',
        onclick: () => textSheet(t('Artist bio'), [h('p', { class: 'who' }, a.name), englishOnly(), ...paragraphs(bio)]),
      }, glyph('book'), t('Artist bio')) : null,
      favButton('artist', id, a.name, bag, 'ep-heart ring')));

  // Upcoming events: caps counts, route of cities, Swiss-time note, first dates, Full Itinerary ›
  let events;
  if (up.length) {
    const INITIAL = 5;
    const box = h('div', { class: 'ep-events cards' }, up.slice(0, INITIAL).map(artistCard(mark)));
    const legs = routeLegs(up);
    events = [
      active.length ? h('div', { class: 'ep-caps left' }, countsLine(active, up)) : null,
      legs.length ? routeEl(legs, (leg) => {
        if (leg.idx < INITIAL) flash(box.querySelector(`[data-idx="${leg.idx}"]`));
        else location.hash = itineraryHref(id, leg.idx);
      }) : null,
      h('p', { class: 'ep-note' }, itinNote()),
      box,
      h('a', { class: 'ep-itin', href: itineraryHref(id) },
        h('span', { class: 'l' }, t('Full Itinerary')),
        h('span', { class: 'r' }, tn(up.length, 'All {n} date', 'All {n} dates'), icon('chevron', 14))),
    ];
  } else {
    events = softEmpty('calendar', t('No upcoming dates'),
      t(a.kind === 'ensemble'
        ? '{name} has no announced concerts in Switzerland right now. Add the ensemble to your favourites to catch new dates under Following in Concerts.'
        : '{name} has no announced concerts in Switzerland right now. Add this performer to your favourites to catch new dates under Following in Concerts.', { name: a.name }));
  }

  const related = relatedArtists(id, all);
  const relatedSection = related.length
    ? h('section', { class: 'ep-sec' },
      epHead(t('Related artists'), { serif: true }),
      h('div', { class: ['ep-people', related.length <= 2 && 'one'] }, related.map((r) => h('a', { class: 'ep-person', href: href.artist(r.id) },
        portrait(r.name, 'sm'),
        h('p', {}, h('b', {}, r.name), ' ', tn(r.n, '— {n} concert together', '— {n} concerts together'),
          r.example ? tNodes(', e.g. {title}', { title: h('i', {}, r.example.title) }) : null)))))
    : null;

  // Their albums on Apple Music (names match on the last word, so namesakes rarely slip in).
  const last = normalize(a.name.split(/\s+/).pop() || a.name);
  const rail = recordingsRail({
    load: () => searchAlbums(a.name, SEARCH_LIMIT).then((l) => l.filter((x) => normalize(x.artist).includes(last)).slice(0, 10)),
    title: (x) => x.title, sub: (x) => x.artist, term: a.name, bag,
    ariaLabel: t('Albums by {name}', { name: a.name }), align: 'left', credit: 'detached',
  });

  const body = h('div', { class: 'ep-page ep-artist' },
    head,
    h('section', { class: 'ep-sec' },
      epHead(t('Upcoming Events'), {
        serif: true,
        info: () => textSheet(t('Upcoming events'), [
          h('p', {}, t('Dates in Switzerland from Klang’s listings, in date order. The route shows each city once, in the order the tour reaches it, with its number of dates; tap a city to jump to its first date.')),
          h('p', {}, t('All times are Swiss local time (Europe/Zurich). Cancelled dates stay in the list but are left out of the route and the counts.')),
          h('p', { class: 'fine' }, t('Real listings from the venues’ and orchestras’ own websites, updated daily.')),
        ]),
      }),
      events,
      up.length ? sourcesLine(up) : null),
    relatedSection,
    h('section', { class: 'ep-sec' }, epHead(t('Featured albums'), { serif: true }), rail.el),
    reportPill({ kind: 'performer', name: a.name, path: href.artist(id) }),
    rail.credit);

  return {
    title: a.name,
    back: true,
    actions: topActions(shareButton(a.name, t('{name} — upcoming dates in Switzerland', { name: a.name }), href.artist(id))),
    body,
    cleanup: () => bag.forEach((fn) => fn()),
  };
}

// "Full Itinerary": the same route header, every upcoming date, then the past ones.
function renderItinerary(id, focusIdx) {
  const a = repo.artist(id);
  if (!a) return notFound('Performer', t('This performer isn’t in the current listings.'));
  const bag = [];
  const mark = liveMarks(bag);
  const today = todayKey();
  const all = repo.query({ artistId: id });
  const up = all.filter((c) => c.day >= today);
  const past = all.filter((c) => c.day < today).reverse();
  const active = live(up);
  const box = h('div', { class: 'ep-events cards' }, up.map(artistCard(mark)));
  const legs = routeLegs(up);

  const body = h('div', { class: 'ep-itin-page' },
    active.length ? h('div', { class: 'ep-caps left' }, countsLine(active, up)) : null,
    legs.length ? routeEl(legs, (leg) => flash(box.querySelector(`[data-idx="${leg.idx}"]`))) : null,
    h('p', { class: 'ep-note' }, itinNote()),
    up.length ? box : softEmpty('calendar', t('No upcoming dates'), t('{name} has no announced concerts in Switzerland right now.', { name: a.name })),
    past.length
      ? h('section', { class: 'ep-sec' }, epHead(t('Past performances'), { serif: true, count: past.length }),
        eventList(past, (c, i) => eventItem(c, mark, { time: true, idx: i, sub: SUB.flagCity, chev: false }), { initial: 5, cards: true }).el)
      : null,
    sourcesLine(all));

  if (focusIdx != null) {
    // after main.js has mounted the page and reset the scroll
    const tm = setTimeout(() => flash(box.querySelector(`[data-idx="${focusIdx}"]`)), 80);
    bag.push(() => clearTimeout(tm));
  }

  return {
    title: t('Full Itinerary'),
    back: true,
    body,
    cleanup: () => bag.forEach((fn) => fn()),
  };
}

// ---------- Venue ----------
export function renderVenue({ id }) {
  const v = repo.venue(id);
  if (!v) return notFound('Venue', t('This venue isn’t in the current listings.'));
  const city = v.cityId ? repo.city(v.cityId) : null;
  const bag = [];
  const mark = liveMarks(bag);
  const today = todayKey();
  const up = repo.upcoming({ venueId: id });
  const active = live(up);
  const soon = active.filter((c) => c.day <= addDays(today, 30)).length;
  const featured = active.filter((c) => c.featured).length;
  // Apple Maps finds the place by its published name and town
  const mapsQ = [v.name, city?.name].filter(Boolean).join(', ');
  const canton = city?.canton ? cantonText(city.canton) : '';

  let neighbours = [];
  if (city) {
    const perVenue = countBy(live(repo.upcoming({ cityIds: [city.id] })), (c) => c.venueId);
    neighbours = repo.venuesOfCity(city.id)
      .filter((x) => x.id !== id)
      .map((x) => ({ v: x, n: perVenue.get(x.id) || 0 }))
      .filter((x) => x.n > 0 || !x.v.dynamic) // a venue only a past listing named has nothing to show
      .sort((p, q) => q.n - p.n || p.v.name.localeCompare(q.v.name));
  }

  const body = h('div', { class: 'ep-page ep-venue' },
    h('header', { class: 'ep-head' },
      iconPortrait('pin'),
      h('h1', { class: 'ep-name' }, v.name),
      h('div', { class: 'ep-caps' }, venueKind(v),
        city ? [' · ', h('a', { href: href.city(city.id) }, cityName(city)),
          canton && canton !== city.name && canton !== cityName(city) ? ` · ${canton}` : null] : null),
      h('div', { class: 'ep-caps sub' }, [
        t('{n} upcoming', { n: fmtN(active.length) }),
        up.length > active.length ? t('{n} cancelled', { n: fmtN(up.length - active.length) }) : null,
        t('{n} in the next 30 days', { n: fmtN(soon) }),
        featured ? t('{n} featured', { n: fmtN(featured) }) : null,
      ].filter(Boolean).join(' · ')),
      h('div', { class: 'ep-row center' },
        h('a', { class: 'ep-chip light', href: `https://maps.apple.com/?q=${encodeURIComponent(mapsQ)}`, target: '_blank', rel: 'noopener' }, icon('pin', 15), t('Directions')),
        v.imported ? h('span', { class: 'tag import' }, t('Imported')) : null)),
    h('section', { class: 'ep-sec' },
      epHead(t('Upcoming at this venue'), { bar: true, count: up.length }),
      up.length
        ? monthGrouped(up, (c) => eventItem(c, mark, { time: true, sub: SUB.program }), 20)
        : softEmpty('calendar', t('Nothing announced here yet'),
          t('Add this venue to your favourites and its new concerts show up under Following in Concerts.')),
      sourcesLine(up.length ? up : repo.query({ venueId: id }))),
    neighbours.length
      ? h('section', { class: 'ep-sec' },
        epHead(t('More venues in {city}', { city: cityName(city) }), { bar: true }),
        h('div', { class: 'chip-wrap ep-venue-chips' }, neighbours.map(({ v: x, n }) => h('a', { class: ['chip', n === 0 && 'zero'], href: href.venue(x.id) },
          h('span', { class: 'lbl' }, x.name), n > 0 ? h('span', { class: 'count' }, fmtN(n)) : null))))
      : null,
    reportPill({ kind: 'venue', name: v.name, path: href.venue(id) }));

  return {
    title: v.name,
    back: true,
    actions: topActions(favButton('venue', id, v.name, bag), shareButton(v.name, t('{name} — upcoming concerts', { name: v.name }), href.venue(id))),
    body,
    cleanup: () => bag.forEach((fn) => fn()),
  };
}

// ---------- City ----------
export function renderCity({ id }) {
  const city = repo.city(id);
  if (!city) return notFound('City', t('This city isn’t in Klang’s list of Swiss cities.'));
  const bag = [];
  const mark = liveMarks(bag);
  const today = todayKey();
  const up = repo.upcoming({ cityIds: [id] });
  const active = live(up);
  const week = active.filter((c) => c.day <= addDays(today, 6)).length;
  const perVenue = countBy(active, (c) => c.venueId);
  const venues = repo.venuesOfCity(id)
    .map((v) => ({ v, n: perVenue.get(v.id) || 0 }))
    .filter((x) => x.n > 0 || !x.v.dynamic) // a venue only a past listing named has nothing to show
    .sort((p, q) => q.n - p.n || (q.v.weight || 0) - (p.v.weight || 0) || p.v.name.localeCompare(q.v.name));
  const name = cityName(city);

  const browse = () => {
    store.setFilters({ cityIds: [id], day: null, lookBack: false });
    location.hash = '#/concerts';
  };
  const NEXT = 15;

  const body = h('div', { class: 'ep-page ep-city' },
    h('header', { class: 'ep-head' },
      iconPortrait('map'),
      h('h1', { class: 'ep-name' }, name),
      name !== city.name ? h('div', { class: 'ep-orig' }, city.name) : null,
      h('div', { class: 'ep-caps' }, city.canton
        ? t('Canton of {canton} · Switzerland', { canton: cantonText(city.canton) })
        : city.abroad ? countryName(countryOf(city.country)?.name || '') : t('Switzerland')),
      h('div', { class: 'ep-caps sub' }, [
        t('{n} upcoming', { n: fmtN(active.length) }),
        up.length > active.length ? t('{n} cancelled', { n: fmtN(up.length - active.length) }) : null,
        t('{n} this week', { n: fmtN(week) }),
        tn(venues.length, '{n} venue', '{n} venues'),
      ].filter(Boolean).join(' · ')),
      h('div', { class: 'ep-row center' },
        h('button', { class: 'ep-chip light', type: 'button', onclick: browse }, icon('calendar', 15), t('Browse in Concerts')))),
    venues.length
      ? h('section', { class: 'ep-sec' },
        epHead(t('Venues'), { bar: true, count: venues.length }),
        h('div', { class: 'group ep-venues' }, venues.map(({ v, n }) => rowItem({
          title: v.name,
          subtitle: venueKind(v),
          to: href.venue(v.id),
          right: h('span', {}, n ? tn(n, '{n} concert', '{n} concerts') : t('No dates')),
        }))))
      : null,
    h('section', { class: 'ep-sec' },
      epHead(t('Next concerts'), { bar: true, count: up.length }),
      up.length
        ? [
          h('div', { class: 'ep-events' }, up.slice(0, NEXT).map((c) => eventItem(c, mark, { time: true, sub: SUB.venue }))),
          up.length > NEXT
            ? h('button', { class: 'ep-more', type: 'button', onclick: browse }, t('See all {n} in Concerts', { n: fmtN(up.length) }), icon('chevron', 14))
            : null,
        ]
        : softEmpty('calendar', t('Nothing announced in {city}', { city: name }),
          t('Add the city to your favourites and new listings show up under Following in Concerts.')),
      up.length ? sourcesLine(up) : null),
    reportPill({ kind: 'city', name: city.name, label: name, path: href.city(id) }));

  return {
    title: name,
    back: true,
    actions: topActions(favButton('city', id, name, bag), shareButton(name, t('Classical concerts in {city}', { city: name }), href.city(id))),
    body,
    cleanup: () => bag.forEach((fn) => fn()),
  };
}
