// Read-only data access: builds Klang's concerts from the REAL listings (feed.js — the venues' and
// orchestras' own websites, refreshed daily) plus the user's own imports, builds indexes and answers
// queries for every view. There are no demo or invented concerts at run time (js/data/generate.js is
// used by the unit tests only).
//
// A concert from the feed:
//   { id: 'feed-<feed id>', feedId, title, series, start, day, durationMin|null, cityId, venueId, room,
//     type, featured, status, credits: [{ role, name, artistId }], program: [{ composer, title,
//     composerId?, workId? }], source, sourceName, sourceSite, sourceUrl (the event page), attribution,
//     ticketUrl, url }
// `featured` (what Sheng's default "Featured only" filter keeps): a real listing that names at least
// one performer or one piece — bare "event" entries without either are left to "All".
//
// Cities: the 47 Sheng cities (js/data/cities.js), the extra Swiss towns that have concerts, and a
// city of its own (no coordinates, `dynamic: true`) for any other town a listing names.
// Concerts abroad (the feed's `country`: Austria, Germany, France, Italy) carry `country` and the
// location filter's own city id 'country:<country id>|<City>' (views/concerts.js), e.g.
// 'country:austria|Vienna'; their cities are `{ abroad: true, country }`. A query without a place,
// venue, work, composer, performer or ids (the Concerts list for "Switzerland", the day views) keeps to
// Switzerland; ['country:austria'] means all of Austria.
// Venues: the known venues (js/data/venues.js), else one made from the listing ({ dynamic: true }).
// Works: the repertoire (js/data/repertoire.js), plus a work index over every programme line of every
// listing (ics.js workIdentity): each line that names a work carries `wkey` — the repertoire id when
// matched, else a language-independent 'x-…' id — so one work page lists every hall that plays it
// (dynamicWork(id), query({ workId })).

import { CITIES, CANTONS, EXTRA_CITIES } from './data/cities.js';
import { VENUES } from './data/venues.js';
import { country as countryOf, countryCities } from './data/countries.js';
import { COMPOSERS, WORKS } from './data/repertoire.js';
import * as store from './store.js';
import * as feed from './feed.js';
import { dayKeyOf, todayKey, monthKeyOf, addDays } from './time.js';
import { normalize } from './util.js';
import {
  slug, matchCity, matchVenue, matchProgram, matchComposer, workFromTitle, guessType, workIdentity, isBoilerplate, isGenericWord,
  searchTitle, englishTitle, workNumber, arrangerOf,
} from './ics.js';

const baseCities = [...CITIES, ...EXTRA_CITIES];
const composerMap = new Map(COMPOSERS.map((c) => [c.id, c]));
const workMap = new Map(WORKS.map((w) => [w.id, w]));
let cityMap = new Map(baseCities.map((c) => [c.id, c]));
let venueMap = new Map();
let artistMap = new Map();
let concerts = [];
let concertMap = new Map();
let shownCities = CITIES;

// ----- normalising listings -----
function dynamicCity(name) {
  const clean = String(name || '').trim();
  if (!clean) return null;
  const id = `town-${slug(clean)}`;
  if (!cityMap.has(id)) cityMap.set(id, { id, name: clean, canton: null, lat: null, lon: null, dynamic: true });
  return id;
}

// Local names of cities abroad, for listings that do not use Klang's English name.
const ABROAD_ALIASES = {
  wien: 'Vienna', munchen: 'Munich', koln: 'Cologne', nurnberg: 'Nuremberg', 'frankfurt am main': 'Frankfurt',
  milano: 'Milan', roma: 'Rome', napoli: 'Naples', torino: 'Turin', genova: 'Genoa', venezia: 'Venice',
  firenze: 'Florence', padova: 'Padua', mantova: 'Mantua', hanover: 'Hannover', weiden: 'Weiden in der Oberpfalz',
};
const abroadNames = new Map();   // country id -> Map(normalized name -> Klang's name)
function abroadCityName(x, text) {
  const t = normalize(text);
  if (!t) return null;
  if (!abroadNames.has(x.id)) abroadNames.set(x.id, new Map(countryCities(x).map((n) => [normalize(n), n])));
  const names = abroadNames.get(x.id);
  return names.get(t) || ABROAD_ALIASES[t] || null;
}
function abroadCity(countryId, cityText, venueText) {
  const x = countryOf(countryId);
  if (!x || x.swiss) return null;
  const clean = String(cityText || '').trim();
  const name = abroadCityName(x, clean) || (!clean && abroadCityName(x, venueText)) || clean || x.name;
  const id = `country:${x.id}|${name}`;
  if (!cityMap.has(id)) cityMap.set(id, { id, name, country: x.id, canton: null, lat: null, lon: null, abroad: true });
  return id;
}

// The listing's town, preferring a known town named in the venue ("Verrucano Mels" listed under St. Gallen).
function cityFor(cityText, venueText) {
  const fromCity = cityText ? matchCity(cityText) : null;
  const fromVenue = venueText ? matchCity(venueText) : null;
  if (fromVenue && fromVenue !== fromCity && !(cityText && normalize(venueText).includes(normalize(cityText)))) return fromVenue;
  return fromCity || fromVenue || dynamicCity(cityText);
}

const CHURCH = /(kirche|church|eglise|temple|munster|cathedr|kathedr|basilique|basilica|kloster|abbatiale|abbaye|chapelle|kapelle|chiesa|collegiale|stiftskirche|\bdom\b|baselgia|predigern|fraumunster|grossmunster|klosterhof|cattedrale)/;
function venueKind(name) {
  const t = normalize(name);
  if (CHURCH.test(t)) return 'church';
  if (/\b(oper|opera|opernhaus)\b/.test(t)) return 'opera';
  if (/(theater|theatre|teatro)/.test(t)) return 'theatre';
  return 'hall';
}

const SEP = /^\s*(?:[,–—-]|\|)\s*/;
const reEsc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function venueFor(venueText, cityId) {
  const text = String(venueText || '').trim();
  if (!text) return { venueId: null, room: null };
  const known = matchVenue(text, cityId) || (!cityId ? matchVenue(text) : null);
  if (known) {
    // "Tonhalle Zürich – Kleiner Saal" → Tonhalle Zürich, room "Kleiner Saal" (but not ", Zürich")
    const n = normalize(text);
    const k = normalize(known.name);
    let room = n.startsWith(k) && n.length > k.length && SEP.test(text.slice(known.name.length)) ? text.slice(known.name.length).replace(SEP, '').trim() : null;
    if (room && matchCity(room)) room = null;
    return { venueId: known.id, room: room || null };
  }
  // "Evangelische Kirche, Arosa" in Arosa → "Evangelische Kirche"; "Kirche St. Jakob Cham" and
  // "Kirche St. Jakob" in Cham are one venue.
  const city = cityMap.get(cityId);
  let name = text;
  let key = text;
  if (city) {
    name = name.replace(new RegExp(`\\s*,\\s*${reEsc(city.name)}\\s*$`, 'i'), '') || text;
    const bare = normalize(name).replace(/[^a-z0-9]+/g, ' ').trim();
    const cityKey = normalize(city.name).replace(/[^a-z0-9]+/g, ' ').trim();
    key = bare.endsWith(` ${cityKey}`) ? bare.slice(0, -cityKey.length).trim() : bare;
  }
  const id = `venue-${slug(`${city?.name || ''} ${key}`)}`;
  if (!venueMap.has(id)) venueMap.set(id, { id, name, cityId: cityId || null, kind: venueKind(name), dynamic: true });
  return { venueId: id, room: null };
}

const ENSEMBLE_ROLE = /(orchestra|orchester|ensemble|choir|chor\b|choeur|chorus|quartet|quartett|quatuor|trio|consort|ballet|ballett|tanzerinnen|dancers|band|sinfonietta|kammerphilharmonie)/i;
function creditsFor(list) {
  const out = [];
  for (const cr of list || []) {
    if (!cr || !cr.name) continue;
    if (cr.artistId) { out.push(cr); continue; }
    const id = `artist-${slug(cr.name)}`;
    const role = cr.role || 'Performer';
    if (!artistMap.has(id)) {
      const ensemble = ENSEMBLE_ROLE.test(normalize(role)) && role !== 'Chorus master';
      artistMap.set(id, { id, name: cr.name, kind: ensemble ? 'ensemble' : 'person', role });
    }
    out.push({ role, name: cr.name, artistId: id });
  }
  return out;
}

// Programme lines without page boilerplate ("Programmänderungen vorbehalten", "Konzert mit Pause"); a
// note in brackets only ("(Das definitive Programm wird … bekannt gegeben.)") keeps the composer.
// A line naming only the composer takes the work the listing's title names ("Händel, Messiah").
// Some sites publish decomposed accents ("Ouverture" + U+0308): text is kept composed (NFC), so
// it reads, matches and searches the same as everywhere else.
const nfc = (s) => (typeof s === 'string' ? s.normalize('NFC') : s);
// A title that is only punctuation ("_", "–") or a note in brackets names no work: the line keeps its composer, or goes
// when another line of the programme already names that composer.
const NO_TITLE = /^[\s\p{P}\p{S}]*$/u;
// Names compared with the letters NFD leaves alone folded: "Fazıl Say" (listed) is "Fazil Say" (credited).
const foldName = (s) => normalize(String(s || '')).replace(/ı/g, 'i').replace(/ł/g, 'l').replace(/ø/g, 'o').replace(/ß/g, 'ss')
  .replace(/æ/g, 'ae').replace(/œ/g, 'oe').replace(/[^a-z0-9]+/g, ' ').trim();
const PARTICLE = /^(?:van|von|de|di|da|du|del|della|le|la|der)$/i;
// A line whose title is only a name — a performer of the evening, the line's own composer, or the full name
// of a composer Klang knows ("Gustav Mahler", "Frédéric Chopin / Hayato Sumino") — is a heading the site put
// above the pieces that follow, read as a work by the line above's composer. Never a title with a number,
// quotes or other words ("Im Schatten von Beethoven"), nor a bare surname.
function isNameHeading(p, people) {
  const title = String(p.title || '').trim();
  if (!title || /[\d«»“”„"(]/.test(title) || title.split(/\s+/).length > 6) return false;
  const own = foldName(p.composer);
  return title.split(/\s*\/\s*/).every((part) => {
    const f = foldName(part);
    if (!f) return false;
    if (f === own || people.has(f)) return true;
    const comp = composerMap.get(matchComposer(part));
    const words = part.trim().split(/\s+/);
    if (!comp || words.length < 2) return false;
    const name = new Set(foldName(comp.name).split(' '));
    return words.every((w) => name.has(foldName(w)) || PARTICLE.test(w) || /^(?:\p{Lu}\.)+$/u.test(w));
  });
}
// "Mazurkas op. 41:" + "Nr. 1 cis-Moll, Nr. 2 e-Moll, …" (one work over two lines) → one line
const CONTINUES = /^\s*(?:(?:nr|nos?|n[°º])\.?\s*)?\d/i;
function cleanLines(list, credits = []) {
  const people = new Set((credits || []).map((cr) => foldName(cr?.name)).filter(Boolean));
  const lines = [];
  let heading = null; // the lines after a name heading that carry the line above's composer are by that name
  for (const raw of (list || []).filter(Boolean)) {
    const title = nfc(raw.title || '');
    const blank = !!title && (NO_TITLE.test(title) || /^\s*\(.*\)\s*$/s.test(title));
    const p = { ...raw, composer: nfc(raw.composer), title: blank ? '' : title, blank };
    if (isBoilerplate(p.title)) continue;
    if (isNameHeading(p, people)) { heading = { name: p.title.trim(), from: p.composer || '' }; continue; }
    if (heading && (p.composer || '') === heading.from) p.composer = heading.name;
    else heading = null;
    lines.push(p);
  }
  for (let i = lines.length - 2; i >= 0; i--) {
    const a = lines[i];
    const b = lines[i + 1];
    if (/:\s*$/.test(a.title) && b.title && (a.composer || '') === (b.composer || '') && CONTINUES.test(b.title)) {
      lines.splice(i, 2, { ...a, title: `${a.title.trim()} ${b.title.trim()}` });
    }
  }
  const named = new Set(lines.filter((p) => p.title && p.composer).map((p) => normalize(p.composer)));
  return lines.filter((p) => !(p.blank && p.composer && named.has(normalize(p.composer)))).map(({ blank, ...p }) => p);
}
function programFor(list, title, credits) {
  const lines = cleanLines(list, credits);
  const program = matchProgram(lines, title).filter((p) => p && (p.title || p.composer || p.workId || p.composerId));
  if (program.length) return program;
  // an opera / ballet listing without a programme, titled with the work ("Die Zauberflöte")
  const w = workFromTitle(title);
  return w ? [{ composerId: w.composerId, workId: w.id }] : [];
}

function normalizeFeedConcert(feedRaw) {
  const raw = {
    ...feedRaw,
    title: nfc(feedRaw.title), series: nfc(feedRaw.series), venueName: nfc(feedRaw.venueName), city: nfc(feedRaw.city),
    credits: (feedRaw.credits || []).filter(Boolean).map((cr) => ({ ...cr, role: nfc(cr.role), name: nfc(cr.name) })),
  };
  const abroad = raw.country && raw.country !== 'switzerland' ? raw.country : null;
  const cityId = (abroad && abroadCity(abroad, raw.city, raw.venueName)) || cityFor(raw.city, raw.venueName);
  const { venueId, room } = venueFor(raw.venueName, cityId);
  const credits = creditsFor(raw.credits);
  const program = programFor(raw.program, raw.title, raw.credits);
  const src = feed.sourceInfo(raw.source);
  const text = [raw.title, raw.series, raw.venueName, ...program.map((p) => `${p.composer || ''} ${p.title || ''}`)].join(' ');
  return {
    id: `feed-${raw.id}`,
    feedId: raw.id,
    title: raw.title,
    series: raw.series || null,
    start: raw.start,
    durationMin: Number(raw.durationMin) > 0 ? Number(raw.durationMin) : null,
    cityId,
    country: abroad,
    venueId,
    room,
    type: raw.type || guessType(text),
    featured: credits.length > 0 || program.length > 0,
    status: raw.status || 'scheduled',
    credits,
    program,
    notes: null,
    source: raw.source || null,
    sourceName: src?.name || null,
    sourceSite: src?.site || null,
    attribution: src?.attribution || null,
    sourceUrl: raw.url || null,
    url: raw.url || null,
    ticketUrl: raw.ticketUrl || raw.url || null,
  };
}

// Concerts the user imported (.ics / JSON, Me › Data & imports).
function normalizeImported(c) {
  const out = { ...c, source: c.source || 'import', imported: true };
  delete out.demo;
  if (!out.cityId) out.cityId = cityFor(out.cityName || out.city || null, out.venueName || null);
  if (!out.venueId && out.venueName) Object.assign(out, venueFor(out.venueName, out.cityId));
  if (!out.cityId && out.venueId) out.cityId = venueMap.get(out.venueId)?.cityId || null;
  out.program = matchProgram(cleanLines(out.program, out.credits), out.title || '');
  out.credits = creditsFor(out.credits);
  out.type = out.type || 'mixed';
  out.status = out.status || 'scheduled';
  out.featured = !!out.featured || out.credits.length > 0 || out.program.length > 0;
  out.sourceName = out.sourceName || null;
  out.sourceUrl = out.sourceUrl || out.url || null;
  return out;
}

// ----- work index: one page per work, across every hall -----
let workIndex = new Map(); // work id → { id, entries: [{ c, p, ident }], info }

// Same numbered form? ("Sinfonie Nr. 4 B-Dur" and "Symphonie n° 4 en si bémol majeur, op. 60")
function sameForm(a, b, comp) {
  if (!a || !b || a.genre !== b.genre || a.sub !== b.sub || a.inst.join() !== b.inst.join()) return false;
  if (a.num == null || a.num !== b.num) return false;
  if (a.key && b.key) return a.key === b.key;
  // the number alone: not for Schubert's and Dvořák's symphonies, which were renumbered
  return !(a.genre === 'symphony' && (comp === 'schubert' || comp === 'dvorak'));
}

function buildWorkIndex() {
  const byKey = new Map();
  for (const c of concerts) {
    for (const p of c.program) {
      delete p.wkey;
      if (p.workId) { p.wkey = p.workId; continue; } // a repertoire work: its own page
      const ident = workIdentity(p);
      if (!ident) continue;
      if (!byKey.has(ident.key)) byKey.set(ident.key, []);
      byKey.get(ident.key).push({ c, p, ident });
    }
  }
  // A line without its catalogue number joins the one work of that composer the listings number
  // the same way ("Sinfonie Nr. 4 B-Dur" → op. 60); "op. 5" joins "op. 5 No. 2" when the form agrees.
  // how the listings of a group number the work (D 944 is "n° 8" in one, "n. 9" in another)
  const formsOf = (list) => list.map((e) => e.ident.form).filter((f) => f && f.num != null);
  const catGroups = [...byKey].filter(([k, list]) => list[0].ident.by === 'catalogue' && !/-(overture|suite)$/.test(k));
  const alias = new Map();
  for (const [key, list] of byKey) {
    const id = list[0].ident;
    const bareOpus = id.by === 'catalogue' && /^op\d+[a-z]?$/.test(id.cat) && !/-(overture|suite)$/.test(key);
    if (id.by !== 'form' && !bareOpus) continue;
    const mine = formsOf(list);
    if (!mine.length) continue;
    const targets = new Set();
    for (const [k2, l2] of catGroups) {
      const t = l2[0].ident;
      if (k2 === key || t.comp !== id.comp) continue;
      if (bareOpus && !t.cat.startsWith(`${id.cat}-`)) continue;
      const theirs = formsOf(l2);
      if (mine.some((f) => theirs.some((g) => sameForm(f, g, id.comp)))) targets.add(k2);
    }
    if (targets.size === 1) alias.set(key, [...targets][0]);
  }
  // A line that names only the form, scoring and key ("Messe en ut majeur", "Konzert für Violine, Klavier und
  // Streicher d-Moll") joins the one numbered work of that composer listed with the same form, scoring and
  // key — only for concertos for two or more soloists, masses and requiems, which a composer rarely wrote
  // twice in one key (and never Mozart's or Haydn's masses: many of them share a key).
  const keyOnly = (f, comp) => !!f && f.num == null && !!f.key && ((f.genre === 'concerto' && f.inst.length >= 2)
    || ((f.genre === 'mass' || f.genre === 'requiem') && comp !== 'mozart' && comp !== 'haydn'));
  const sameKeyed = (a, b) => a.genre === b.genre && a.sub === b.sub && a.inst.join() === b.inst.join() && a.key === b.key;
  for (const [key, list] of byKey) {
    const id = list[0].ident;
    if (id.by !== 'form' || alias.has(key) || !keyOnly(id.form, id.comp)) continue;
    const targets = new Set();
    for (const [k2, l2] of catGroups) {
      if (l2[0].ident.comp === id.comp && l2.some((e) => e.ident.form && sameKeyed(e.ident.form, id.form))) targets.add(k2);
    }
    if (targets.size === 1) alias.set(key, [...targets][0]);
  }
  // A line without catalogue number whose title says what the listings of one numbered work of the
  // composer say (in English where they are genre, scoring or dance words) joins it: "Danses
  // norvégiennes" → «Norwegische Tänze» op. 35, "Ouvertüre zu «Die Hochzeit des Figaro»" → "Ouvertüre
  // zur Oper «Die Hochzeit des Figaro» KV 492". Never on generic words alone ("Sonate", "Klavierkonzert").
  const FILLER = new Set(['oper', 'opera', 'ballett', 'ballet']);
  const CAT_WORD = /^(?:op|opus|opp|bwv|kv|k|d|hob|rv|hwv|wab|s|lw|sz|bb|trv|mwv|woo|wq|fp|buxwv|wwv|l)$/;
  const said = (words) => words.filter((w) => !FILLER.has(w));
  // the same word, or the same name with another language's ending ("Coriolano" / "Coriolan", "Leonora" /
  // "Leonore"): five letters in common and at most two different at the end; never a form, number or key
  const stemEq = (a, b) => {
    if (a === b) return true;
    if (isGenericWord(a) || isGenericWord(b) || /[\d-]/.test(a + b)) return false;
    let n = 0;
    while (n < a.length && a[n] === b[n]) n++;
    return n >= 5 && a.length - n <= 2 && b.length - n <= 2;
  };
  const sameWords = (a, b) => {
    if (a.length !== b.length) return false;
    const left = [...b];
    return a.every((w) => {
      const i = left.findIndex((v) => stemEq(w, v));
      if (i >= 0) left.splice(i, 1);
      return i >= 0;
    });
  };
  const numbered = [...byKey].filter(([, list]) => list[0].ident.by === 'catalogue');
  for (const [key, list] of byKey) {
    const id = list[0].ident;
    if (id.by !== 'title' || !id.comp || id.part || id.arranged || id.excerpt || alias.has(key)) continue;
    if (id.words.some((w) => CAT_WORD.test(w)) || !id.words.some((w) => !FILLER.has(w) && !isGenericWord(w))) continue;
    const mine = said(id.words);
    const targets = new Set();
    for (const [k2, l2] of numbered) {
      if (l2[0].ident.comp === id.comp && l2.some((e) => sameWords(said(e.ident.words), mine))) targets.add(alias.get(k2) || k2);
    }
    if (targets.size === 1) alias.set(key, [...targets][0]);
  }
  workIndex = new Map();
  for (const [key, list] of byKey) {
    const id = alias.get(key) || key;
    if (!workIndex.has(id)) workIndex.set(id, { id, entries: [], info: null });
    workIndex.get(id).entries.push(...list);
  }
  for (const g of workIndex.values()) {
    g.entries.sort((a, b) => a.c.start.localeCompare(b.c.start));
    for (const e of g.entries) e.p.wkey = g.id;
  }
}

const mostCommon = (values) => {
  const n = new Map();
  for (const v of values) n.set(v, (n.get(v) || 0) + 1);
  let best = null;
  for (const [v, k] of n) if (best == null || k > n.get(best)) best = v; // ties: the earliest listing
  return best;
};
const sameText = (s) => normalize(s).replace(/[^a-z0-9]+/g, ' ').trim();

// A work outside the repertoire, as the listings publish it (null when no listing names it):
// { id, dynamic: true, composerId, composerName (as listed), title (as most commonly published),
//   titles (the other published forms), catalog, catalogNote, arranger, genre, q / qEnglish / qCatalog /
//   qBroad (Apple Music searches, in that order), num, count }
// "String Quartet op. 3/5" → "Canales String Quartet" (null when that is no broader than the title)
export function broadTerm(surname, english) {
  const bare = String(english || '').split(/\s+(?:op\.?|opus|BWV|KV|K\.|D\.?|Hob\.?|RV|HWV|WAB|Sz\.?|BB|TrV|MWV|WoO)\s*\d/i)[0].trim();
  return bare && bare !== String(english || '').trim() ? `${surname} ${bare}` : null;
}

export function dynamicWork(id) {
  const g = workIndex.get(id);
  if (!g || !String(id).startsWith('x-')) return null;
  if (g.info) return g.info;
  const whole = g.entries.filter((e) => !e.ident.excerpt);
  const pool = whole.length ? whole : g.entries;
  // one vote per listing (a programme may repeat a line)
  const votes = [];
  const seen = new Set();
  for (const e of pool) {
    const k = `${e.c.id}\u0001${sameText(e.p.title)}`;
    if (!seen.has(k)) { seen.add(k); votes.push(e.p.title.trim()); }
  }
  const title = mostCommon(votes);
  // the other published forms, not counting notes in brackets ("…, op. 26 (1921)")
  const plainTitle = (t) => sameText(searchTitle(t)) || sameText(t);
  const titles = [];
  for (const e of g.entries) {
    const t = e.p.title.trim();
    if (plainTitle(t) !== plainTitle(title) && !titles.some((x) => plainTitle(x) === plainTitle(t))) titles.push(t);
  }
  const composerId = mostCommon(g.entries.map((e) => e.p.composerId).filter(Boolean)) || null;
  const comp = composerId ? composerMap.get(composerId) : null;
  // a composer Klang doesn't know: the name as most listings spell it ("Sergej Prokofjew"), one vote
  // per listing (it is also the search term: Apple finds "Prokofjew", not "Prokofieff")
  const named = new Map();
  for (const e of g.entries) {
    const n = String(e.p.composer || '').trim();
    if (n && !named.has(e.c.id)) named.set(e.c.id, n);
  }
  const composerName = comp ? comp.name : mostCommon([...named.values()]) || null;
  const surname = comp ? comp.short.replace(/^[A-Z]\.\s*/, '').replace(/\s+II$/, '') : String(composerName || '').split(/\s*[/&;,]\s*/)[0].trim().split(/\s+/).pop() || '';
  const catalog = g.entries.find((e) => e.ident.catLabel)?.ident.catLabel || null;
  // the search names the catalogue number unless the title already does ("op. 60")
  const catNum = catalog ? catalog.match(/(\d+[a-z]?)(?!.*\d)/i)?.[1] : null;
  const shownCat = catNum && !new RegExp(`(^|[^0-9])${catNum}([^0-9a-z]|$)`, 'i').test(title) ? catalog : null;
  const english = englishTitle(title);
  // the repertoire's genre families, for the page's accent colour
  const form = g.entries.find((e) => e.ident.form)?.ident.form;
  const genre = !form ? (/\b(ouverture|overture|ouvertüre)\b/i.test(title) ? 'orchestral' : null)
    : form.genre === 'symphony' ? 'symphony' : form.genre === 'concerto' ? 'concerto'
      : form.genre === 'mass' || form.genre === 'requiem' ? 'sacred'
        : form.genre === 'sonata' && form.inst[0] === 'piano' ? 'piano' : 'chamber';
  g.info = {
    id,
    dynamic: true,
    composerId,
    composerName,
    surname: surname || null,
    title,
    titles: titles.slice(0, 4),
    catalog,
    catalogNote: shownCat, // the catalogue number when the title doesn't already name it
    arranger: arrangerOf(title), // an arrangement's arranger, as listed (recordings must name them)
    genre,
    q: [surname, searchTitle(title), shownCat].filter(Boolean).join(' '),
    qEnglish: [surname, english].filter(Boolean).join(' '),
    // the last resort: composer and catalogue number, which every language writes alike ("Prokofjew Op. 125")
    qCatalog: surname && catalog ? `${surname} ${catalog}` : null,
    // when nothing at all was found: the English form without its number ("Canales String Quartet")
    qBroad: surname ? broadTerm(surname, english) : null,
    num: workNumber(english),
    count: new Set(g.entries.map((e) => e.c.id)).size,
  };
  return g.info;
}

// The work id a programme line opens: a repertoire id, an 'x-…' id, or null (no work named).
export const workIdOf = (p) => p?.wkey || p?.workId || null;

export function rebuild() {
  cityMap = new Map(baseCities.map((c) => [c.id, c]));
  venueMap = new Map(VENUES.map((v) => [v.id, v]));
  artistMap = new Map();
  const list = [];
  for (const raw of feed.feedConcerts()) {
    try { list.push(normalizeFeedConcert(raw)); } catch (err) { console.warn('feed concert skipped', raw?.id, err); }
  }
  for (const c of store.getImports()) {
    try { if (c && c.start && !Number.isNaN(Date.parse(c.start))) list.push(normalizeImported(c)); } catch { /* bad import */ }
  }
  const byId = new Map();
  for (const c of list) byId.set(c.id, { ...c, day: dayKeyOf(c.start) });
  concerts = [...byId.values()].sort((a, b) => a.start.localeCompare(b.start) || a.id.localeCompare(b.id));
  concertMap = new Map(concerts.map((c) => [c.id, c]));
  buildWorkIndex();
  const used = new Set(concerts.map((c) => c.cityId).filter(Boolean));
  shownCities = [
    ...CITIES,
    ...EXTRA_CITIES.filter((c) => used.has(c.id)),
    ...[...cityMap.values()].filter((c) => c.dynamic && used.has(c.id)).sort((a, b) => a.name.localeCompare(b.name)),
  ];
}

// ----- lookups -----
export const allConcerts = () => concerts;
export const concert = (id) => concertMap.get(id);
export const city = (id) => cityMap.get(id);
// Concerts abroad per country and city: Map(country id -> { total, cities: Map(city name -> count) }),
// for the given date range (upcoming by default), ignoring the other filters.
export function abroadCounts({ from = todayKey(), to = null } = {}) {
  const out = new Map();
  const hidden = new Set(store.hiddenIds());
  for (const c of concerts) {
    if (!c.country || c.day < from || (to && c.day > to) || hidden.has(c.id)) continue;
    const name = cityMap.get(c.cityId)?.name;
    if (!out.has(c.country)) out.set(c.country, { total: 0, cities: new Map() });
    const x = out.get(c.country);
    x.total += 1;
    if (name) x.cities.set(name, (x.cities.get(name) || 0) + 1);
  }
  return out;
}
// Cities abroad that the listings name ({ abroad: true, country }).
export const abroadCities = () => [...cityMap.values()].filter((c) => c.abroad);
// Whether the feed reads any website in this country (else Klang has no listings there at all).
export const hasListingsIn = (countryId) => feed.feedInfo().sources.some((s) => s.country === countryId);

// The 47 Sheng cities, then extra Swiss towns that have concerts, then other towns the listings name.
export const allCities = () => shownCities;
export const cantonName = (code) => CANTONS[code] || code || '';
export const venue = (id) => venueMap.get(id);
export const allVenues = () => [...venueMap.values()];
export const venuesOfCity = (cityId) => allVenues().filter((v) => v.cityId === cityId);
export const composer = (id) => composerMap.get(id);
export const allComposers = () => COMPOSERS;
export const work = (id) => workMap.get(id);
export const allWorks = () => WORKS;
export const worksOf = (composerId) => WORKS.filter((w) => w.composerId === composerId);
export const artist = (id) => artistMap.get(id);
export const allArtists = () => [...artistMap.values()];

// Where the listings come from: { generatedAt, fetchedAt, sources: [{ key, name, site, attribution,
// count, ok, error }], count, loaded, error } (see feed.js).
export const feedInfo = () => feed.feedInfo();
// First day "Look back" can show: past concerts are kept for 120 days.
export const pastStart = (today = todayKey()) => addDays(today, -feed.KEEP_PAST_DAYS);

// Program entries resolved for display: works from our repertoire, or the listing's own text.
export function programItems(c) {
  return (c.program || []).map((p) => {
    const w = p.workId ? workMap.get(p.workId) : null;
    const comp = composerMap.get(p.composerId || w?.composerId);
    return {
      work: w || null,
      composer: comp || null,
      composerName: comp?.name || p.composer || '',
      composerShort: comp?.short || p.composer || '',
      title: w?.title || p.title || '',
      rawTitle: p.title || null,
      catalog: w?.catalog || p.catalog || null,
      workKey: p.wkey || p.workId || null, // the work page this line opens (repertoire or 'x-…'), or null
    };
  });
}

// Whether a programme item names a work (a repertoire work, or a line with a work page): only those get a
// Listen card on the concert page — "Weitere virtuose Werke", "Création" or "Neues Werk" stay plain text.
export const namesWork = (it) => !!(it && it.workKey && (it.work || it.title));

export const isUpcoming = (c, today = todayKey()) => c.day >= today;

// ----- queries -----
// from/to are inclusive day keys. Empty arrays mean "no restriction".
export function query({
  from = null, to = null, cityIds = [], types = [], featuredOnly = false,
  venueId = null, composerId = null, workId = null, artistId = null, ids = null, includeHidden = false,
} = {}) {
  const citySet = cityIds.length ? new Set(cityIds) : null;
  const typeSet = types.length ? new Set(types) : null;
  const idSet = ids ? new Set(ids) : null;
  const hidden = includeHidden ? null : new Set(store.hiddenIds());
  // no place and nothing else that names what to find: Switzerland (see the header)
  const swissOnly = !citySet && !venueId && !composerId && !workId && !artistId && !idSet;
  return concerts.filter((c) =>
    (!hidden || !hidden.has(c.id)) &&
    (!from || c.day >= from) &&
    (!to || c.day <= to) &&
    (citySet ? citySet.has(c.cityId) || (c.country && citySet.has(`country:${c.country}`)) : !(swissOnly && c.country)) &&
    (!typeSet || typeSet.has(c.type)) &&
    (!featuredOnly || c.featured) &&
    (!venueId || c.venueId === venueId) &&
    (!composerId || c.program.some((p) => (p.composerId || workMap.get(p.workId)?.composerId) === composerId)) &&
    (!workId || c.program.some((p) => p.workId === workId || p.wkey === workId)) &&
    (!artistId || c.credits.some((cr) => cr.artistId === artistId)) &&
    (!idSet || idSet.has(c.id)));
}

export function upcoming(opts = {}) {
  return query({ from: todayKey(), ...opts });
}

// cityId -> number of concerts matching the other filters (upcoming unless `from` given), for every
// city of allCities() (0 when none).
export function cityCounts(opts = {}) {
  const counts = new Map(shownCities.map((c) => [c.id, 0]));
  for (const c of query({ from: todayKey(), ...opts, cityIds: [] })) {
    if (c.cityId) counts.set(c.cityId, (counts.get(c.cityId) || 0) + 1);
  }
  return counts;
}

// 'YYYY-MM-DD' -> count, for the given filters (no date restriction)
export function dayCounts(opts = {}) {
  const counts = new Map();
  for (const c of query({ ...opts, from: null, to: null })) counts.set(c.day, (counts.get(c.day) || 0) + 1);
  return counts;
}

// 'YYYY-MM' -> count
export function monthCounts(opts = {}) {
  const counts = new Map();
  for (const c of query(opts)) {
    const m = monthKeyOf(c.day);
    counts.set(m, (counts.get(m) || 0) + 1);
  }
  return counts;
}

// ----- search -----
export function search(text, limit = 30) {
  const q = normalize(text.trim());
  if (q.length < 2) return { concerts: [], composers: [], works: [], artists: [], venues: [], cities: [] };
  const has = (s) => normalize(s).includes(q);
  const today = todayKey();
  const composers = COMPOSERS.filter((c) => has(c.name));
  const works = WORKS.filter((w) => has(w.title) || has(w.catalog || '') || has(`${composerMap.get(w.composerId)?.short} ${w.title}`)).slice(0, limit);
  const artists = allArtists().filter((a) => has(a.name)).slice(0, limit);
  const venues = allVenues().filter((v) => has(v.name)).slice(0, limit);
  const cities = shownCities.filter((c) => has(c.name) || has(CANTONS[c.canton] || ''));
  const matchedConcerts = concerts
    .filter((c) => c.day >= today)
    .filter((c) =>
      has(c.title) || has(c.series || '') ||
      c.credits.some((cr) => has(cr.name)) ||
      programItems(c).some((p) => has(p.title) || has(p.composerName) || has(p.rawTitle || '')) ||
      has(venueMap.get(c.venueId)?.name || '') || has(cityMap.get(c.cityId)?.name || ''))
    .slice(0, limit);
  return { concerts: matchedConcerts, composers, works, artists, venues, cities };
}

rebuild();
store.subscribe((topic) => {
  if (topic === 'data' || topic === 'feed') rebuild();
});
