// Entity pages (#/composer, #/work, #/artist, #/venue, #/city), modelled on Sheng's
// knowledge pages — Switzerland only, personal only (no other users, no public reviews).
//
//   Work:     floating back · ♡ · share; composer portrait + name, serif title, caps
//             "1892 · ~23 MIN", Listening guide sheet, Recordings carousel (tap = preview),
//             More recordings (Versions sheet), Report a problem, Concerts N (date blocks,
//             city only). Section bars take the work's genre colour, as on Sheng.
//   Composer: back · share; portrait, serif name, Read Bio / Explore Works / Editorials N,
//             centred ♡, caps life line; Latest releases, Popular among listeners,
//             "Explore <name>" (By period · By genre · Related), then Swiss Concerts N.
//   Artist:   portrait + serif name + gold ON TOUR, caps role line, Artist bio + ♡;
//             Upcoming Events (route of cities, Swiss local time, first dates,
//             "Full Itinerary ›" = #/artist/<id>/itinerary page with every date + past ones),
//             Related artists (shared concerts), demo note for invented performers.
//   The iTunes credit sits at the foot of each page (Sheng has no fine print under rails).
//   Venue / City: same visual language (serif names, caps facts, date blocks).
//
// The app header stays (main.js back button) but turns into Sheng's floating buttons on
// these pages (see the "entity pages (entity.js)" block in css/shell.css).
// Editorial content (BIOS, GUIDES, ARTICLES) is loaded defensively: pages work when the
// content files are empty or fail to load.

import { h, icon, toast, plural, normalize, TYPE_LABELS } from '../util.js';
import * as repo from '../repo.js';
import * as store from '../store.js';
import { openSheet } from '../ui/sheet.js';
import { href, emptyState, rowItem, venueLabel, cityLabel, withFace } from '../ui/components.js';
import { todayKey, addDays, monthKeyOf, monthLong, monthShort, dayNum, yearOf, timeOf, relDayLabel } from '../time.js';
import {
  searchAlbums, albumTracks, composerAlbums, player, playerState,
  classicalAlbumURL, classicalSearchURL, appleMusicSearchURL, ITUNES_CREDIT,
} from '../music.js';
import { openVersionsSheet, searchTerm, matchWorkTracks } from '../ui/listen.js';
import '../ui/player.js'; // side effect: lets the full player record each queue for "Up next"

// ---------- reference tables ----------
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
const PLAYERS = {
  piano: 'Pianist', violin: 'Violinist', cello: 'Cellist', viola: 'Violist', clarinet: 'Clarinettist',
  flute: 'Flautist', oboe: 'Oboist', horn: 'Horn player', harpsichord: 'Harpsichordist',
};
const ENSEMBLE_TYPES = { orchestra: 'Orchestra', quartet: 'String quartet', trio: 'Trio', choir: 'Choir', baroque: 'Baroque ensemble' };
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

function longDate(year, mmdd) {
  if (!mmdd) return `in ${year}`;
  const [m, d] = mmdd.split('-').map(Number);
  return `on ${d} ${MONTHS_LONG[m - 1]} ${year}`;
}

function ageAt(born, bornDate, year, mmdd) {
  let a = year - born;
  if (bornDate && mmdd && mmdd < bornDate) a -= 1;
  return a;
}

function fmtMinutes(m) {
  if (m < 60) return `${m} minutes`;
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return mm ? `${hh} h ${mm} min` : `${hh} hours`;
}

// "today" / "tomorrow" / "on Sat, Nov 1"
function whenPhrase(dayKey) {
  const rel = relDayLabel(dayKey);
  if (rel === 'Today' || rel === 'Tomorrow') return rel.toLowerCase();
  return `on ${rel}`;
}

function venueKind(v) {
  if (v.imported) return 'Imported venue';
  if (v.kind === 'hall' && v.small) return 'Small hall';
  return VENUE_KINDS[v.kind] || 'Venue';
}

function artistRole(a) {
  if (a.kind === 'ensemble') return ENSEMBLE_TYPES[a.ensembleType] || a.role || 'Ensemble';
  if (a.instrument) return PLAYERS[a.instrument] || a.role || 'Performer';
  return a.role || 'Performer';
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
    toast(url ? 'Link copied' : 'Copied to the clipboard');
    return true;
  } catch {
    toast('Couldn’t share — copy the address from the address bar');
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
  return h('button', { class: 'ep-tb', type: 'button', 'aria-label': 'Share', onclick: () => shareText(title, text, pageURL(path)) }, icon('share', 18));
}

// ♡ favourite (= follow) toggle that stays in sync with other hearts on the page.
function favButton(kind, id, label, bag, cls = 'ep-tb') {
  const btn = h('button', { class: cls, type: 'button' }, icon('heart', cls === 'ep-tb' ? 19 : 22));
  const paint = () => {
    const on = store.isFollowing(kind, id);
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.setAttribute('aria-label', on ? `Remove ${label} from favourites` : `Add ${label} to favourites`);
  };
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const on = store.toggleFollow(kind, id);
    toast(on ? `${label} added to your favourites` : `${label} removed from your favourites`);
  });
  bag.push(store.subscribe((topic) => topic === 'follows' && paint()));
  paint();
  return btn;
}

function epHead(title, { count = null, bar = false, serif = false, more = null, info = null } = {}) {
  return h('div', { class: ['ep-h', bar && 'bar', serif && 'serif'] },
    h('h2', {}, title,
      count != null ? h('span', { class: 'n' }, count.toLocaleString('en-US')) : null,
      info ? h('button', { class: 'ep-info', type: 'button', 'aria-label': `About ${title}`, onclick: info }, icon('info', 15)) : null),
    more);
}

function softEmpty(iconName, title, text, action = null) {
  const el = emptyState(iconName, title, text, action);
  el.classList.add('ep-empty');
  return el;
}

function notFound(kind, text, action = h('a', { class: 'btn small', href: '#/search' }, icon('search', 15), 'Search')) {
  return { title: kind, back: true, body: emptyState('search', `${kind} not found`, text, action) };
}

// Bottom sheet with a centred title and a red "Close" text button (Sheng's Bio / guide sheets).
function textSheet(title, nodes, footer = null) {
  const sheet = openSheet({ title, body: h('div', { class: 'ep-sheet-text' }, nodes), footer, closeLabel: 'Close' });
  sheet.el.classList.add('ep-sheet');
  return sheet;
}

function demoNote(text) {
  return h('p', { class: 'ep-demo' }, icon('sparkle', 14),
    h('span', {}, text, ' ', h('a', { href: '#/me/data' }, 'Import real listings'), '.'));
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
  city: (c) => [cityLabel(c), venueLabel(c)].filter(Boolean).join(' · '),
  cityOnly: (c) => cityLabel(c) || venueLabel(c),
  // Sheng's artist cards: flag · city (brighter) · venue
  flagCity: (c) => [flagCH(), cityLabel(c) ? h('span', { class: 'cty' }, cityLabel(c)) : null,
    cityLabel(c) ? h('span', { class: 'sep' }, '·') : null, venueLabel(c)],
  venue: (c) => venueLabel(c),
  program: (c) => [TYPE_LABELS[c.type], c.series].filter(Boolean).join(' · '),
};

function liveMarks(bag) {
  let slots = [];
  const paint = (slot, id) => {
    const m = store.markOf(id);
    slot.replaceChildren(...store.MARK_KINDS.filter((k) => m[k]).map((k) =>
      h('i', { class: `mark-dot ${k}`, title: MARK_LABELS[k] }, h('span', { class: 'sr-only' }, MARK_LABELS[k]))));
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
    h('span', { class: 's' }, cancelled ? h('span', { class: 'ep-cx' }, 'Cancelled · ') : null, sub(c))),
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
      btn.replaceChildren(`Show all ${list.length.toLocaleString('en-US')}`, icon('down', 14));
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
          h('span', {}, `${monthLong(m)} ${yearOf(m)}`),
          h('span', { class: 'n' }, plural(perMonth.get(m) || 0, 'concert'))), box);
      }
      box.append(renderItem(c, i));
    });
    if (n < list.length) {
      btn.replaceChildren(`Show all ${list.length.toLocaleString('en-US')}`, icon('down', 14));
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
      h('span', { class: 'dot', 'aria-hidden': 'true' }, '!'), 'Report a problem'));
}

// Also used by the article end matter (editorial.js).
export function openReport({ kind, name, path }) {
  let reason = REPORT_REASONS[0];
  const chips = h('div', { class: 'chip-wrap ep-report-reasons', role: 'radiogroup', 'aria-label': 'What’s wrong?' });
  const paintChips = () => chips.replaceChildren(...REPORT_REASONS.map((r) => h('button', {
    class: ['chip', r === reason && 'active'], type: 'button', role: 'radio', 'aria-checked': r === reason ? 'true' : 'false',
    onclick: () => { reason = r; paintChips(); },
  }, r)));
  paintChips();
  const note = h('textarea', { class: 'ep-report-note', rows: '4', placeholder: 'What should it say? (optional)', 'aria-label': 'Details' });
  const body = h('div', { class: 'ep-report-body' },
    h('p', { class: 'lead' }, `What’s wrong on the page for ${name}?`),
    chips, note,
    h('p', { class: 'hint' }, 'Klang has no server, so nothing is sent automatically. Share the report with the venue or whoever publishes the listing.'));
  const report = () => [
    'Klang — problem report',
    `${kind[0].toUpperCase()}${kind.slice(1)}: ${name}`,
    `Issue: ${reason}`,
    note.value.trim() ? `Details: ${note.value.trim()}` : null,
    pageURL(path),
  ].filter(Boolean).join('\n');
  const sheet = textSheet('Report a problem', [body],
    h('button', { class: 'btn primary block', type: 'button', onclick: async () => { if (await shareText('Problem report', report())) sheet.close(); } },
      icon('share', 16), 'Share report'));
}

// ---------- recordings carousel (iTunes previews) ----------
// load(): Promise<albums>; tracksOf(album): Promise<tracks with previews>.
// Tapping a cover plays its first preview (queueing the rest); tapping the playing one pauses.
function recordingsRail({
  load, title, sub, tracksOf, term, bag, ariaLabel,
  chosenId = null, autoSelect = false, onSelect = null, align = 'center', extra = null, credit = true, max = 10,
}) {
  const rail = h('div', { class: ['h-scroll', 'ep-rail', align === 'left' && 'left'], 'aria-label': ariaLabel });
  // credit: true = under the rail; 'detached' = returned as `credit` for the page to place
  // (Sheng has no fine print under its carousels, so pages put it at the very bottom).
  const creditEl = credit ? h('p', { class: 'listen-credit ep-credit' }) : null;
  const root = h('div', { class: 'ep-recs' }, rail, extra, credit === true ? creditEl : null);
  let albums = [];
  let selectedId = chosenId;
  let queuedAlbumId = null;
  let queuedIds = new Set();
  let loadingId = null;
  let lastSig = '';

  function currentAlbumId(st) {
    if (!st.track) return null;
    if (queuedIds.has(String(st.track.id))) return queuedAlbumId;
    return albums.find((a) => a.title && a.title === st.track.album)?.id ?? null;
  }

  function paintCredit() {
    if (!creditEl) return;
    const sel = albums.find((a) => same(a.id, selectedId));
    creditEl.replaceChildren(ITUNES_CREDIT, ' ',
      h('a', { href: sel ? classicalAlbumURL(sel.id) : classicalSearchURL(term), target: '_blank', rel: 'noopener' }, 'Apple Music Classical'),
      ' · ',
      h('a', { href: sel?.url || appleMusicSearchURL(term), target: '_blank', rel: 'noopener' }, 'Apple Music'), '.');
  }

  function paintState(st) {
    const cur = currentAlbumId(st);
    for (const el of rail.querySelectorAll('.ep-album[data-id]')) {
      const id = el.dataset.id;
      const isCur = same(id, cur);
      el.classList.toggle('chosen', same(id, selectedId));
      el.classList.toggle('current', isCur);
      el.classList.toggle('loading', same(id, loadingId));
      el.querySelector('.ep-play')?.replaceChildren(icon(isCur && st.playing ? 'pause' : 'play', 13));
    }
  }

  function repaintState() {
    paintCredit();
    const st = playerState();
    lastSig = `${st.track?.id ?? ''}|${st.playing}|${loadingId}|${selectedId}`;
    paintState(st);
  }

  bag.push(player.subscribe((st) => {
    const sig = `${st.track?.id ?? ''}|${st.playing}|${loadingId}|${selectedId}`;
    if (sig === lastSig) return;
    lastSig = sig;
    paintState(st);
  }));

  function card(a) {
    const s = sub(a);
    return h('button', {
      class: 'ep-album', type: 'button', dataset: { id: String(a.id) },
      'aria-label': `Play preview: ${a.artist} — ${a.title}${a.year ? `, ${a.year}` : ''}`,
      onclick: () => playAlbum(a),
    },
    h('span', { class: 'ep-cover' },
      a.artwork ? h('img', { src: a.artwork, alt: '', loading: 'lazy' }) : h('span', { class: 'ph' }, icon('music', 26)),
      h('span', { class: 'ep-play' }, icon('play', 13))),
    h('span', { class: 't' }, title(a)),
    s ? h('span', { class: 's' }, s) : null);
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
    repaintState();
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
        retry ? h('button', { class: 'btn small', type: 'button', onclick: start }, 'Try again') : null,
        h('a', { class: 'btn small', href: classicalSearchURL(term), target: '_blank', rel: 'noopener' }, icon('external', 14), 'Search Apple Music Classical'))));
    paintCredit();
  }

  async function playAlbum(a) {
    const st = playerState();
    if (st.track && same(currentAlbumId(st), a.id)) {
      player.toggle();
      return;
    }
    selectedId = a.id;
    onSelect?.(a);
    loadingId = a.id;
    repaintState();
    try {
      const tracks = await tracksOf(a);
      if (!same(loadingId, a.id)) return; // another cover was tapped meanwhile
      loadingId = null;
      if (!tracks.length) toast('No previews on this recording');
      else {
        queuedAlbumId = a.id;
        queuedIds = new Set(tracks.map((t) => String(t.id)));
        player.play(tracks[0], tracks);
      }
    } catch {
      if (same(loadingId, a.id)) loadingId = null;
      toast('Couldn’t load this recording');
    }
    repaintState();
  }

  async function start() {
    skeleton();
    try {
      albums = (await load()) || [];
    } catch (err) {
      message(`Couldn’t load recordings${err?.message ? ` — ${err.message}` : ''}.`, true);
      return;
    }
    if (!albums.length) {
      message('No recordings found on Apple Music.');
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

const albumPreviews = (a) => albumTracks(a.id).then((r) => r.tracks.filter((t) => t.preview));

async function workPreviews(work, a) {
  const { tracks } = await albumTracks(a.id);
  const m = matchWorkTracks(work, tracks);
  return (m ? m.tracks : tracks).filter((t) => t.preview);
}

// ---------- work cards (accent bar coloured per genre) ----------
// Sheng's cards carry only the bar, the serif title and "BWV 244 · 1727 · 97 MIN"; the number of
// upcoming Swiss performances goes into the accessible name instead of a visible line.
function workCard(w, n = 0) {
  const g = genreOf(w);
  const meta = [w.catalog, w.year, w.minutes ? `${w.minutes} min` : null].filter(Boolean).join(' · ');
  return h('a', {
    class: ['ep-work', `g-${g.id}`], href: href.work(w.id),
    'aria-label': [w.title, meta, n > 0 ? `${n} upcoming` : null].filter(Boolean).join(', '),
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
  if (!defs) {
    if (!c.born) return [{ label: 'Works', range: '', intro: null, works: sorted }];
    const years = sorted.map((w) => w.year).filter(Boolean);
    const start = Math.min(c.born + 18, ...years);
    const end = Math.max(c.died || yearOf(todayKey()), start + 2);
    const span = end - start + 1;
    const b1 = start + Math.round(span / 3);
    const b2 = start + Math.round((2 * span) / 3);
    defs = [
      { label: 'Early years', from: start, to: b1 - 1 },
      { label: 'Middle years', from: b1, to: b2 - 1 },
      { label: c.died ? 'Late years' : 'Recent years', from: b2, to: end },
    ].map((d) => ({ ...d, intro: `From ${d.from} to ${d.to}, when ${c.short} was ${d.from - c.born} to ${d.to - c.born}.` }));
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
  const life = c.died ? `${c.born} — ${c.died}` : `Born ${c.born}`;
  return [c.born ? life : null, c.country].filter(Boolean).join(' · ');
}

function composerFacts(c, works, up) {
  const today = todayKey();
  const ps = [];
  if (c.born) {
    const who = c.country ? `${c.name} (${c.country})` : c.name;
    if (c.died) {
      ps.push(`${who} was born ${longDate(c.born, c.bornDate)} and died ${longDate(c.died, c.diedDate)}, aged ${ageAt(c.born, c.bornDate, c.died, c.diedDate)}.`);
    } else {
      ps.push(`${who} was born ${longDate(c.born, c.bornDate)} and is ${ageAt(c.born, c.bornDate, yearOf(today), today.slice(5))}.`);
    }
  }
  const sorted = [...works].sort(byYear);
  if (sorted.length === 1) {
    const w = sorted[0];
    ps.push(`Klang’s repertoire includes one work by ${c.short}: ${w.title}${w.year ? ` (${w.year})` : ''}.`);
  } else if (sorted.length > 1) {
    const years = sorted.map((w) => w.year).filter(Boolean);
    const span = years.length ? (years[0] === years[years.length - 1] ? `, all from ${years[0]}` : `, written between ${years[0]} and ${years[years.length - 1]}`) : '';
    const titles = sorted.map((w) => w.title);
    ps.push(`Klang’s repertoire includes ${sorted.length} works by ${c.short}${span}: ${titles.slice(0, -1).join(', ')} and ${titles[titles.length - 1]}.`);
  }
  const act = live(up);
  if (act.length) {
    const next = act[0];
    const top = [...workCounts(act)].sort((a, b) => b[1] - a[1])[0];
    const topWork = top ? repo.work(top[0]) : null;
    ps.push(`On stage in Switzerland: ${plural(act.length, 'upcoming performance')} of music by ${c.short} in ${plural(cityCount(act), 'city', 'cities')}; the next is ${whenPhrase(next.day)} in ${cityLabel(next) || venueLabel(next)}.` +
      (topWork && top[1] > 1 ? ` Most programmed: ${topWork.title} (${plural(top[1], 'concert')}).` : ''));
  } else {
    ps.push(`No performances of music by ${c.short} are announced in Switzerland right now.`);
  }
  return ps;
}

function openBio(c, bios, works, up) {
  const text = textOf(bios[c.id]);
  const nodes = [h('p', { class: 'who' }, c.name)];
  if (text) nodes.push(...paragraphs(text));
  else {
    nodes.push(...composerFacts(c, works, up).map((t) => h('p', {}, t)),
      h('p', { class: 'fine' }, `A full biography of ${c.short} hasn’t been written for Klang yet.`));
  }
  textSheet('Bio', nodes);
}

// ---------- Composer ----------
export async function renderComposer({ id }) {
  const c = repo.composer(id);
  if (!c) return notFound('Composer', 'This composer isn’t in Klang’s repertoire.');
  const content = await loadContent();
  const bag = [];
  const mark = liveMarks(bag);
  const up = repo.upcoming({ composerId: id });
  const works = repo.worksOf(id);
  const perWork = workCounts(live(up));
  const nEditorials = content.articles.filter((a) => mentionsComposer(a, id)).length;

  const explore = exploreSection(c, works, perWork);
  const scrollToExplore = () => explore.scrollIntoView({ behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });

  const head = h('header', { class: 'ep-head' },
    portrait(c.name, 'lg', c.id),
    h('h1', { class: 'ep-name' }, c.name),
    h('div', { class: 'ep-chips' },
      h('button', { class: 'ep-chip light', type: 'button', onclick: () => openBio(c, content.bios, works, up) }, glyph('book'), 'Read Bio'),
      h('button', { class: 'ep-chip', type: 'button', onclick: scrollToExplore }, glyph('books'), 'Explore Works'),
      nEditorials > 0
        ? h('a', { class: 'ep-chip ed', href: `#/editorials/${encodeURIComponent(id)}` }, icon('notes', 15), 'Editorials', h('span', { class: 'n' }, nEditorials))
        : null),
    favButton('composer', id, c.short, bag, 'ep-heart'),
    h('div', { class: 'ep-caps' }, lifeLine(c)));

  const latest = recordingsRail({
    load: () => composerAlbums(c.name, { newest: true }).then((l) => l.slice(0, 10)),
    title: (a) => a.title, sub: (a) => a.artist, tracksOf: albumPreviews, term: c.name, bag,
    ariaLabel: `Latest releases of music by ${c.name}`, align: 'left', credit: false,
  });
  const popular = recordingsRail({
    load: () => composerAlbums(c.name).then((l) => l.slice(0, 10)),
    title: (a) => a.title, sub: (a) => a.artist, tracksOf: albumPreviews, term: c.name, bag,
    ariaLabel: `Popular recordings of music by ${c.name}`, align: 'left', credit: 'detached',
  });

  // Sheng: head · Latest releases · Popular among listeners · Explore <name>. Klang adds the
  // Swiss concerts after Explore (styled like the work page's "Concerts N" list).
  const body = h('div', { class: 'ep-page ep-composer' },
    head,
    h('section', { class: 'ep-sec' }, epHead('Latest releases', { serif: true }), latest.el),
    h('section', { class: 'ep-sec' }, epHead('Popular among listeners', { serif: true }), popular.el),
    explore,
    h('section', { class: 'ep-sec ep-comp-concerts' },
      epHead('Concerts', { bar: true, count: up.length }),
      up.length
        ? eventList(up, (x) => eventItem(x, mark, { sub: SUB.cityOnly }), { initial: 10 }).el
        : softEmpty('calendar', `No ${c.short} on Swiss stages right now`,
          `Nothing by ${c.short} is announced in Switzerland at the moment. Add ${c.short} to your favourites and new dates show up under Following in Concerts.`),
      up.some((x) => x.demo) ? demoNote('Demo listings: real venues and works, invented performers.') : null),
    reportPill({ kind: 'composer', name: c.name, path: href.composer(id) }),
    popular.credit);

  return {
    title: c.name,
    back: true,
    actions: topActions(shareButton(c.name, `${c.name} — on stage in Switzerland`, href.composer(id))),
    body,
    cleanup: () => bag.forEach((fn) => fn()),
  };
}

function exploreSection(c, works, perWork) {
  const tabs = h('div', { class: 'ep-tabs', role: 'tablist', 'aria-label': `Explore ${c.short}` });
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
        return [softEmpty('person', 'No shared programmes yet',
          `No other composer shares an announced Swiss programme with ${c.short} this season.`)];
      }
      return [h('div', { class: 'ep-rel-grid' }, rel.map(({ comp, n }) => h('a', { class: 'ep-rel', href: href.composer(comp.id) },
        h('span', { class: 'ep-rel-av', 'aria-hidden': 'true' }, icon('person', 18)),
        h('p', {}, 'Shares ', plural(n, 'programme'), ' with ', h('b', {}, comp.name), ' in Switzerland this season'))))];
    }
    if (!works.length) {
      return [softEmpty('music', 'No works in Klang yet', `Klang’s repertoire doesn’t list works by ${c.short} yet.`)];
    }
    const groups = tab === 'genre'
      ? genresOf(works).map((g) => ({ label: g.label, range: plural(g.works.length, 'work'), intro: g.intro, works: g.works }))
      : periodsOf(c, works);
    return groups.map(groupBlock);
  }

  function show(tab) {
    exploreTab = tab;
    tabs.replaceChildren(...TABS.map(([k, label]) => h('button', {
      class: k === tab ? 'active' : '', type: 'button', role: 'tab', 'aria-selected': k === tab ? 'true' : 'false',
      onclick: () => { if (k !== exploreTab) show(k); },
    }, label)));
    panel.replaceChildren(...build(tab));
  }
  show(TABS.some(([k]) => k === exploreTab) ? exploreTab : 'period');

  return h('section', { class: 'ep-explore', id: `explore-${c.id}` },
    h('h2', { class: 'ep-explore-title' }, `Explore ${c.short}`),
    h('div', { class: 'ep-ornament', 'aria-hidden': 'true' }, h('i'), h('b'), h('i')),
    tabs,
    panel);
}

// ---------- Work ----------
function workFacts(w, comp, up) {
  const ps = [];
  if (w.blurb) ps.push(w.blurb);
  const bits = [];
  const what = `${w.title}${w.catalog ? ` (${w.catalog})` : ''}`;
  if (w.year) bits.push(`${what} dates from ${w.year}${comp?.born ? `, when ${comp.short} was about ${w.year - comp.born}` : ''}.`);
  if (w.minutes) bits.push(`A performance lasts about ${fmtMinutes(w.minutes)}.`);
  if (bits.length) ps.push(bits.join(' '));
  const act = live(up);
  if (act.length) {
    const next = act[0];
    ps.push(`On stage in Switzerland: ${plural(act.length, 'upcoming performance')} in ${plural(cityCount(act), 'city', 'cities')}; the next is ${whenPhrase(next.day)} in ${cityLabel(next) || venueLabel(next)}.`);
  } else {
    ps.push('No Swiss performances are announced right now. Add the work to your favourites to spot new dates under Following in Concerts.');
  }
  return ps;
}

function openGuide(w, comp, guides, up) {
  const text = textOf(guides[w.id]);
  // Sheng's guide starts straight with the prose (only the Bio sheet opens with the italic name).
  const nodes = [];
  if (text) nodes.push(...paragraphs(text));
  else {
    nodes.push(h('p', { class: 'who' }, [comp?.name, w.title].filter(Boolean).join(' · ')));
    nodes.push(...workFacts(w, comp, up).map((t) => h('p', {}, t)),
      h('p', { class: 'fine' }, 'A full listening guide for this work hasn’t been written yet.'));
  }
  textSheet('Listening guide', nodes);
}

export async function renderWork({ id }) {
  const w = repo.work(id);
  if (!w) return notFound('Work', 'This work isn’t in Klang’s repertoire.');
  const content = await loadContent();
  const bag = [];
  const mark = liveMarks(bag);
  const comp = repo.composer(w.composerId);
  const up = repo.upcoming({ workId: id });
  const label = [comp?.short, w.title].filter(Boolean).join(': ');
  const caps = [w.catalog, w.year, w.minutes ? `~${w.minutes} min` : null].filter(Boolean).join(' · ');
  const term = searchTerm(w);

  const rail = recordingsRail({
    load: () => searchAlbums(term, SEARCH_LIMIT),
    title: (a) => a.artist,
    sub: (a) => a.title,
    tracksOf: (a) => workPreviews(w, a),
    term, bag, ariaLabel: `Recordings of ${label}`,
    chosenId: store.listenChoice(id), autoSelect: true,
    onSelect: (a) => store.setListenChoice(id, a.id),
    extra: h('button', { class: 'ep-link', type: 'button', onclick: () => openVersionsSheet(w, (a) => rail.select(a)) },
      'More recordings', icon('chevron', 14)),
    credit: 'detached',
  });

  // Sheng's work page ends with the Concerts list (no "more by" rail); the section bars and
  // the "More recordings" link take the work's genre colour (blue for an opera like Thaïs).
  const body = h('div', { class: ['ep-page', 'ep-workpage', `ga-${genreOf(w).id}`] },
    h('header', { class: 'ep-head' },
      comp
        ? h('a', { class: 'ep-comp-link', href: href.composer(comp.id) }, portrait(comp.name, 'md', comp.id), h('span', {}, comp.name))
        : null,
      h('h1', { class: 'ep-name work' }, w.title),
      caps ? h('div', { class: 'ep-caps' }, caps) : null,
      h('button', { class: 'ep-guide-btn', type: 'button', onclick: () => openGuide(w, comp, content.guides, up) }, glyph('book'), 'Listening guide')),
    h('section', { class: 'ep-sec' }, epHead('Recordings', { bar: true }), rail.el),
    reportPill({ kind: 'work', name: label, path: href.work(id) }),
    h('section', { class: 'ep-sec' },
      epHead('Concerts', { bar: true, count: up.length }),
      up.length
        ? eventList(up, (x) => eventItem(x, mark, { sub: SUB.cityOnly }), { initial: 40 }).el
        : softEmpty('calendar', 'No upcoming performances',
          'This work isn’t on any announced Swiss programme right now. Add it to your favourites to catch new dates.'),
      up.some((x) => x.demo) ? demoNote('Demo listings: real venues and works, invented performers.') : null),
    rail.credit);

  return {
    title: w.title,
    back: true,
    actions: topActions(
      favButton('work', id, w.title, bag),
      shareButton(label, `${label} — recordings and concerts in Switzerland`, href.work(id))),
    body,
    cleanup: () => bag.forEach((fn) => fn()),
  };
}

// ---------- Artist (performer or ensemble) ----------
function artistFacts(a, all, up) {
  const ps = [];
  const act = live(up);
  if (a.demo) ps.push('An invented performer, used in Klang’s demo listings: the venues and works are real, the people are not.');
  const role = artistRole(a);
  if (all.length) {
    const first = all[0].day;
    const last = all[all.length - 1].day;
    ps.push(`${a.name} appears in Klang’s listings as ${/^[AEIOU]/.test(role) ? 'an' : 'a'} ${role.toLowerCase()}, in ${plural(all.length, 'concert')} between ${monthShort(first)} ${dayNum(first)}, ${yearOf(first)} and ${monthShort(last)} ${dayNum(last)}, ${yearOf(last)}.`);
  }
  if (act.length) ps.push(`Coming up: ${plural(act.length, 'date')} in ${plural(cityCount(act), 'city', 'cities')}, the next ${whenPhrase(act[0].day)} in ${cityLabel(act[0]) || venueLabel(act[0])}.`);
  const venues = [...countBy(live(all), (c) => c.venueId)].sort((x, y) => y[1] - x[1]);
  if (venues.length && venues[0][1] > 1) ps.push(`Most frequent venue: ${repo.venue(venues[0][0])?.name || 'a venue to be announced'} (${plural(venues[0][1], 'concert')}).`);
  const rep = [...workCounts(live(all))].sort((x, y) => y[1] - x[1]).map(([wid]) => repo.work(wid)).filter(Boolean).slice(0, 5);
  if (rep.length) ps.push(`Repertoire: ${rep.map((w) => `${repo.composer(w.composerId)?.short || ''} ${w.title}`.trim()).join('; ')}.`);
  return ps;
}

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
      const l = { key, name: repo.city(c.cityId)?.name || 'Venue TBA', n: 1, idx: i };
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
      'aria-label': `${leg.name}, ${plural(leg.n, 'date')} — show the first one`,
      onclick: () => onStop(leg),
    }, leg.name, h('b', {}, leg.n)));
  });
  return route;
}

const ITIN_NOTE = 'All times shown in Swiss local time.';
const artistCard = (mark) => (c, i) => eventItem(c, mark, { time: true, idx: i, sub: SUB.flagCity, chev: false });
const itineraryHref = (id, idx = null) => `${href.artist(id)}/itinerary${idx != null ? `/${idx}` : ''}`;

export async function renderArtist({ id }) {
  // Sub-route: #/artist/<id>/itinerary[/<index to highlight>] — Sheng's "Full Itinerary" page.
  const sub = /^(.+)\/itinerary(?:\/(\d+))?$/.exec(id || '');
  if (sub) return renderItinerary(sub[1], sub[2] != null ? Number(sub[2]) : null);

  const a = repo.artist(id);
  if (!a) {
    return store.pref('showDemo')
      ? notFound('Performer', 'This performer isn’t in the current listings.')
      : notFound('Performer', 'Demo performers are hidden while demo data is off.', h('a', { class: 'btn small', href: '#/me/data' }, icon('gear', 15), 'Settings'));
  }
  const content = await loadContent();
  const bag = [];
  const mark = liveMarks(bag);
  const today = todayKey();
  const all = repo.query({ artistId: id });
  const up = all.filter((c) => c.day >= today);
  const active = live(up);
  const nCities = cityCount(active);
  const role = artistRole(a);

  const openArtistBio = () => {
    const text = textOf(content.bios[id]);
    const nodes = [h('p', { class: 'who' }, a.name)];
    if (text) nodes.push(...paragraphs(text));
    else nodes.push(...artistFacts(a, all, up).map((t) => h('p', {}, t)));
    textSheet('Artist bio', nodes);
  };

  const head = h('header', { class: 'ep-head left' },
    h('div', { class: 'ep-artist-top' },
      portrait(a.name, 'lg'),
      h('div', { class: 'ep-artist-id' },
        h('h1', { class: 'ep-name' }, a.name),
        active.length >= 2 ? h('span', { class: 'ep-tour' }, h('i'), 'On tour') : null)),
    h('div', { class: 'ep-caps' }, [role, all.length ? `${plural(all.length, 'concert')} this season` : null].filter(Boolean).join(' · ')),
    h('div', { class: 'ep-row' },
      h('button', { class: 'ep-chip light', type: 'button', onclick: openArtistBio }, glyph('book'), 'Artist bio'),
      favButton('artist', id, a.name, bag, 'ep-heart ring'),
      a.imported ? h('span', { class: 'tag import' }, 'Imported') : null));

  // Upcoming events: caps counts, route of cities, Swiss-time note, first dates, Full Itinerary ›
  let events;
  if (up.length) {
    const INITIAL = 5;
    const box = h('div', { class: 'ep-events cards' }, up.slice(0, INITIAL).map(artistCard(mark)));
    const legs = routeLegs(up);
    events = [
      active.length ? h('div', { class: 'ep-caps left' }, [plural(nCities, 'city', 'cities'), plural(active.length, 'date'),
        up.length > active.length ? `${up.length - active.length} cancelled` : null].filter(Boolean).join(' · ')) : null,
      legs.length ? routeEl(legs, (leg) => {
        if (leg.idx < INITIAL) flash(box.querySelector(`[data-idx="${leg.idx}"]`));
        else location.hash = itineraryHref(id, leg.idx);
      }) : null,
      h('p', { class: 'ep-note' }, ITIN_NOTE),
      box,
      h('a', { class: 'ep-itin', href: itineraryHref(id) },
        h('span', { class: 'l' }, 'Full Itinerary'),
        h('span', { class: 'r' }, `All ${up.length.toLocaleString('en-US')} ${up.length === 1 ? 'date' : 'dates'}`, icon('chevron', 14))),
    ];
  } else {
    events = softEmpty('calendar', 'No upcoming dates',
      `${a.name} has no announced concerts in Switzerland right now. Add ${a.kind === 'ensemble' ? 'the ensemble' : 'this performer'} to your favourites to catch new dates under Following in Concerts.`);
  }

  const related = relatedArtists(id, all);
  const relatedSection = related.length
    ? h('section', { class: 'ep-sec' },
      epHead('Related artists', { serif: true }),
      h('div', { class: ['ep-people', related.length <= 2 && 'one'] }, related.map((r) => h('a', { class: 'ep-person', href: href.artist(r.id) },
        portrait(r.name, 'sm'),
        h('p', {}, h('b', {}, r.name), ` — ${plural(r.n, 'concert')} together`,
          r.example ? [', e.g. ', h('i', {}, r.example.title)] : null)))))
    : null;

  // Real (imported) performers: their albums on Apple Music.
  let albums = null;
  let credit = null;
  if (!a.demo) {
    const last = normalize(a.name.split(/\s+/).pop() || a.name);
    const rail = recordingsRail({
      load: () => searchAlbums(a.name, SEARCH_LIMIT).then((l) => l.filter((x) => normalize(x.artist).includes(last)).slice(0, 10)),
      title: (x) => x.title, sub: (x) => x.artist, tracksOf: albumPreviews, term: a.name, bag,
      ariaLabel: `Albums by ${a.name}`, align: 'left', credit: 'detached',
    });
    albums = h('section', { class: 'ep-sec' }, epHead('Featured albums', { serif: true }), rail.el);
    credit = rail.credit;
  }

  const body = h('div', { class: 'ep-page ep-artist' },
    head,
    h('section', { class: 'ep-sec' },
      epHead('Upcoming Events', {
        serif: true,
        info: () => textSheet('Upcoming events', [
          h('p', {}, 'Dates in Switzerland from Klang’s listings, in date order. The route shows each city once, in the order the tour reaches it, with its number of dates; tap a city to jump to its first date.'),
          h('p', {}, 'All times are Swiss local time (Europe/Zurich). Cancelled dates stay in the list but are left out of the route and the counts.'),
          a.demo ? h('p', { class: 'fine' }, 'This performer and these dates are demo data: the venues and works are real, the people are invented.') : null,
        ]),
      }),
      events),
    relatedSection,
    albums,
    a.demo ? demoNote(`${a.name} is an invented performer: the name exists only in Klang’s demo listings (real venues and works).`) : null,
    reportPill({ kind: 'performer', name: a.name, path: href.artist(id) }),
    credit);

  return {
    title: a.name,
    back: true,
    actions: topActions(shareButton(a.name, `${a.name} — upcoming dates in Switzerland`, href.artist(id))),
    body,
    cleanup: () => bag.forEach((fn) => fn()),
  };
}

// "Full Itinerary": the same route header, every upcoming date, then the past ones.
function renderItinerary(id, focusIdx) {
  const a = repo.artist(id);
  if (!a) return notFound('Performer', 'This performer isn’t in the current listings.');
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
    active.length ? h('div', { class: 'ep-caps left' }, `${plural(cityCount(active), 'city', 'cities')} · ${plural(active.length, 'date')}`) : null,
    legs.length ? routeEl(legs, (leg) => flash(box.querySelector(`[data-idx="${leg.idx}"]`))) : null,
    h('p', { class: 'ep-note' }, ITIN_NOTE),
    up.length ? box : softEmpty('calendar', 'No upcoming dates', `${a.name} has no announced concerts in Switzerland right now.`),
    past.length
      ? h('section', { class: 'ep-sec' }, epHead('Past performances', { serif: true, count: past.length }),
        eventList(past, (c, i) => eventItem(c, mark, { time: true, idx: i, sub: SUB.flagCity, chev: false }), { initial: 5, cards: true }).el)
      : null);

  if (focusIdx != null) {
    // after main.js has mounted the page and reset the scroll
    const t = setTimeout(() => flash(box.querySelector(`[data-idx="${focusIdx}"]`)), 80);
    bag.push(() => clearTimeout(t));
  }

  return {
    title: 'Full Itinerary',
    back: true,
    body,
    cleanup: () => bag.forEach((fn) => fn()),
  };
}

// ---------- Venue ----------
export function renderVenue({ id }) {
  const v = repo.venue(id);
  if (!v) return notFound('Venue', 'This venue isn’t in the current listings.');
  const city = v.cityId ? repo.city(v.cityId) : null;
  const bag = [];
  const mark = liveMarks(bag);
  const today = todayKey();
  const up = repo.upcoming({ venueId: id });
  const active = live(up);
  const soon = active.filter((c) => c.day <= addDays(today, 30)).length;
  const featured = active.filter((c) => c.featured).length;
  const mapsQ = [v.name, city?.name].filter(Boolean).join(', ');

  let neighbours = [];
  if (city) {
    const perVenue = countBy(live(repo.upcoming({ cityIds: [city.id] })), (c) => c.venueId);
    neighbours = repo.venuesOfCity(city.id)
      .filter((x) => x.id !== id)
      .map((x) => ({ v: x, n: perVenue.get(x.id) || 0 }))
      .sort((p, q) => q.n - p.n || p.v.name.localeCompare(q.v.name));
  }

  const body = h('div', { class: 'ep-page ep-venue' },
    h('header', { class: 'ep-head' },
      iconPortrait('pin'),
      h('h1', { class: 'ep-name' }, v.name),
      h('div', { class: 'ep-caps' }, venueKind(v),
        city ? [' · ', h('a', { href: href.city(city.id) }, city.name),
          repo.cantonName(city.canton) !== city.name ? ` · ${repo.cantonName(city.canton)}` : null] : null),
      h('div', { class: 'ep-caps sub' }, [
        `${active.length.toLocaleString('en-US')} upcoming`,
        up.length > active.length ? `${up.length - active.length} cancelled` : null,
        `${soon} in the next 30 days`,
        featured ? `${featured} featured` : null,
      ].filter(Boolean).join(' · ')),
      h('div', { class: 'ep-row center' },
        h('a', { class: 'ep-chip light', href: `https://maps.apple.com/?q=${encodeURIComponent(mapsQ)}`, target: '_blank', rel: 'noopener' }, icon('pin', 15), 'Directions'),
        v.imported ? h('span', { class: 'tag import' }, 'Imported') : null)),
    h('section', { class: 'ep-sec' },
      epHead('Upcoming at this venue', { bar: true, count: up.length }),
      up.length
        ? monthGrouped(up, (c) => eventItem(c, mark, { time: true, sub: SUB.program }), 20)
        : softEmpty('calendar', 'Nothing announced here yet',
          'Add this venue to your favourites and its new concerts show up under Following in Concerts.'),
      up.some((x) => x.demo) ? demoNote('Demo listings: real venues and works, invented performers.') : null),
    neighbours.length
      ? h('section', { class: 'ep-sec' },
        epHead(`More venues in ${city.name}`, { bar: true }),
        h('div', { class: 'chip-wrap ep-venue-chips' }, neighbours.map(({ v: x, n }) => h('a', { class: ['chip', n === 0 && 'zero'], href: href.venue(x.id) },
          h('span', { class: 'lbl' }, x.name), n > 0 ? h('span', { class: 'count' }, n.toLocaleString('en-US')) : null))))
      : null,
    reportPill({ kind: 'venue', name: v.name, path: href.venue(id) }));

  return {
    title: v.name,
    back: true,
    actions: topActions(favButton('venue', id, v.name, bag), shareButton(v.name, `${v.name} — upcoming concerts`, href.venue(id))),
    body,
    cleanup: () => bag.forEach((fn) => fn()),
  };
}

// ---------- City ----------
export function renderCity({ id }) {
  const city = repo.city(id);
  if (!city) return notFound('City', 'This city isn’t in Klang’s list of Swiss cities.');
  const bag = [];
  const mark = liveMarks(bag);
  const today = todayKey();
  const up = repo.upcoming({ cityIds: [id] });
  const active = live(up);
  const week = active.filter((c) => c.day <= addDays(today, 6)).length;
  const perVenue = countBy(active, (c) => c.venueId);
  const venues = repo.venuesOfCity(id)
    .map((v) => ({ v, n: perVenue.get(v.id) || 0 }))
    .sort((p, q) => q.n - p.n || (q.v.weight || 0) - (p.v.weight || 0) || p.v.name.localeCompare(q.v.name));

  const browse = () => {
    store.setFilters({ cityIds: [id], day: null, lookBack: false });
    location.hash = '#/concerts';
  };
  const NEXT = 15;

  const body = h('div', { class: 'ep-page ep-city' },
    h('header', { class: 'ep-head' },
      iconPortrait('map'),
      h('h1', { class: 'ep-name' }, city.name),
      h('div', { class: 'ep-caps' }, `Canton of ${repo.cantonName(city.canton)} · Switzerland`),
      h('div', { class: 'ep-caps sub' }, [
        `${active.length.toLocaleString('en-US')} upcoming`,
        up.length > active.length ? `${up.length - active.length} cancelled` : null,
        `${week} this week`,
        plural(venues.length, 'venue'),
      ].filter(Boolean).join(' · ')),
      h('div', { class: 'ep-row center' },
        h('button', { class: 'ep-chip light', type: 'button', onclick: browse }, icon('calendar', 15), 'Browse in Concerts'))),
    venues.length
      ? h('section', { class: 'ep-sec' },
        epHead('Venues', { bar: true, count: venues.length }),
        h('div', { class: 'group ep-venues' }, venues.map(({ v, n }) => rowItem({
          title: v.name,
          subtitle: venueKind(v),
          to: href.venue(v.id),
          right: h('span', {}, n ? plural(n, 'concert') : 'No dates'),
        }))))
      : null,
    h('section', { class: 'ep-sec' },
      epHead('Next concerts', { bar: true, count: up.length }),
      up.length
        ? [
          h('div', { class: 'ep-events' }, up.slice(0, NEXT).map((c) => eventItem(c, mark, { time: true, sub: SUB.venue }))),
          up.length > NEXT
            ? h('button', { class: 'ep-more', type: 'button', onclick: browse }, `See all ${up.length.toLocaleString('en-US')} in Concerts`, icon('chevron', 14))
            : null,
        ]
        : softEmpty('calendar', `Nothing announced in ${city.name}`,
          'Add the city to your favourites and new listings show up under Following in Concerts.'),
      up.some((x) => x.demo) ? demoNote('Demo listings: real venues and works, invented performers.') : null),
    reportPill({ kind: 'city', name: city.name, path: href.city(id) }));

  return {
    title: city.name,
    back: true,
    actions: topActions(favButton('city', id, city.name, bag), shareButton(city.name, `Classical concerts in ${city.name}`, href.city(id))),
    body,
    cleanup: () => bag.forEach((fn) => fn()),
  };
}
