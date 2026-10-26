// Deterministic DEMO concert generator.
// For every city it creates exactly `snapshot` upcoming concerts between DEMO_ANCHOR and
// DEMO_END (so the city filter shows the same counts as Sheng's Switzerland screenshot on
// 2026-10-25), plus a smaller set of past concerts for "Look back" and "Attended".
// Venues and works are real; performers and ensembles are invented (see names.js).

import { CITIES } from './cities.js';
import { VENUES } from './venues.js';
import { COMPOSERS, WORKS } from './repertoire.js';
import { FIRST_NAMES, LAST_NAMES, ENSEMBLES, INSTRUMENTS, VOICES } from './names.js';
import { zurichISO, addDays, daysBetween, weekdayOf, dayKeyOf, timeOf } from '../time.js';

export const DEMO_ANCHOR = '2026-10-25';
export const DEMO_END = '2027-06-30';
export const DEMO_PAST_START = '2026-09-01';

const WORK = Object.fromEntries(WORKS.map((w) => [w.id, w]));
const COMPOSER = Object.fromEntries(COMPOSERS.map((c) => [c.id, c]));

// ---------- randomness ----------
function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
function weighted(rng, items, weightOf) {
  const total = items.reduce((s, it) => s + weightOf(it), 0);
  let r = rng() * total;
  for (const it of items) {
    r -= weightOf(it);
    if (r <= 0) return it;
  }
  return items[items.length - 1];
}
function pickDistinct(rng, arr, n) {
  const pool = [...arr];
  const out = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  return out;
}
export const slug = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

// ---------- language regions ----------
const FR_CANTONS = new Set(['GE', 'VD', 'NE', 'JU', 'VS']);
function langOf(city) {
  if (city.canton === 'TI') return 'it';
  if (city.id === 'fribourg' || FR_CANTONS.has(city.canton)) return 'fr';
  return 'de';
}
const ENSEMBLE_LANG = {
  'Léman Chamber Orchestra': 'fr', 'Jura Philharmonic': 'fr', 'Ticino Sinfonietta': 'it',
  'Salève Quartet': 'fr', 'Quartetto Ceresio': 'it', 'Quatuor Lavaux': 'fr',
  'Trio Chasseral': 'fr', 'Trio Monte Brè': 'it', 'Chœur Lémanique': 'fr', 'Coro Ceresio': 'it', 'Léman Baroque': 'fr',
};

const SERIES = {
  de: { orchestral: 'Sinfoniekonzert', chamber: 'Kammermusik', recital: 'Rezital', opera: 'Oper', choral: 'Chorkonzert', mixed: 'Sonntagsmatinee', lunch: 'Lunchkonzert', newyear: 'Neujahrskonzert', cantata: 'Bachkantate', song: 'Liederabend' },
  fr: { orchestral: 'Concert symphonique', chamber: 'Musique de chambre', recital: 'Récital', opera: 'Opéra', choral: 'Concert choral', mixed: 'Matinée du dimanche', lunch: 'Concert de midi', newyear: 'Concert du Nouvel An', cantata: 'Cantate de Bach', song: 'Récital de lieder' },
  it: { orchestral: 'Concerto sinfonico', chamber: 'Musica da camera', recital: 'Recital', opera: 'Opera', choral: 'Concerto corale', mixed: 'Matinée domenicale', lunch: 'Concerto di mezzogiorno', newyear: 'Concerto di Capodanno', cantata: 'Cantata di Bach', song: 'Liederabend' },
};

// ---------- performer pools ----------
function buildPeople() {
  const rng = mulberry32(hash('people-v1'));
  const used = new Set();
  const artists = [];
  const person = (role, extra = {}) => {
    let name;
    do name = `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)}`; while (used.has(name));
    used.add(name);
    const a = { id: `artist-${slug(name)}`, name, kind: 'person', role, demo: true, ...extra };
    artists.push(a);
    return a;
  };
  const pools = { conductor: [], instrument: {}, voice: {}, ensemble: {} };
  for (let i = 0; i < 16; i++) pools.conductor.push(person('Conductor'));
  const instCounts = { piano: 9, violin: 8, cello: 6, viola: 2, clarinet: 3, flute: 2, oboe: 2, horn: 2, harpsichord: 3 };
  for (const inst of INSTRUMENTS) {
    pools.instrument[inst] = [];
    for (let i = 0; i < (instCounts[inst] || 2); i++) pools.instrument[inst].push(person(cap(inst), { instrument: inst }));
  }
  const voiceCounts = { soprano: 7, 'mezzo-soprano': 4, alto: 3, tenor: 6, baritone: 5, bass: 4 };
  for (const v of VOICES) {
    pools.voice[v] = [];
    for (let i = 0; i < voiceCounts[v]; i++) pools.voice[v].push(person(cap(v), { voice: v }));
  }
  for (const [kind, names] of Object.entries(ENSEMBLES)) {
    pools.ensemble[kind] = names.map((name) => {
      const a = { id: `artist-${slug(name)}`, name, kind: 'ensemble', role: ensembleRole(kind), ensembleType: kind, lang: ENSEMBLE_LANG[name] || 'de', demo: true };
      artists.push(a);
      return a;
    });
  }
  return { artists, pools };
}
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const ensembleRole = (k) => ({ orchestra: 'Orchestra', quartet: 'Ensemble', trio: 'Ensemble', choir: 'Choir', baroque: 'Ensemble' }[k]);

function pickEnsemble(rng, pools, kind, lang) {
  const all = pools.ensemble[kind];
  const local = all.filter((e) => e.lang === lang);
  return local.length && rng() < 0.8 ? pick(rng, local) : pick(rng, all);
}

// ---------- programme builders ----------
const byFit = (type) => WORKS.filter((w) => w.fits.includes(type));
const orchestralConcertos = WORKS.filter((w) => w.genre === 'concerto' && w.fits.includes('orchestral'));
const orchestralMains = WORKS.filter((w) => ['symphony', 'orchestral'].includes(w.genre) && w.fits.includes('orchestral') && w.minutes >= 24);
const orchestralOpeners = WORKS.filter((w) => w.fits.includes('orchestral') && w.minutes <= 22 && w.genre !== 'concerto' && w.genre !== 'song');
const chamberWorks = WORKS.filter((w) => w.genre === 'chamber' && w.fits.includes('chamber'));
const baroqueChamber = ['bach-brandenburg-5', 'vivaldi-four-seasons'].map((id) => WORK[id]);
const pianoWorks = WORKS.filter((w) => w.genre === 'piano');
const songWorks = WORKS.filter((w) => w.genre === 'song' && w.fits.includes('recital'));
const operas = WORKS.filter((w) => w.opera);
const sacredLong = WORKS.filter((w) => w.genre === 'sacred' && w.minutes >= 45 && !w.season);
const mixedWorks = byFit('mixed');

function soloistFor(work) {
  const t = work.title;
  if (/Piano/.test(t)) return 'piano';
  if (/Violin|Four Seasons/.test(t)) return 'violin';
  if (/Cello|Schelomo/.test(t)) return 'cello';
  if (/Clarinet/.test(t)) return 'clarinet';
  if (/Brandenburg/.test(t)) return 'harpsichord';
  return null;
}

function buildOrchestral(rng, pools, lang, ctx) {
  const credits = [{ role: 'Conductor', a: pick(rng, pools.conductor) }];
  let program;
  let titleKind = 'orchestral';
  if (ctx.newYear) {
    program = [WORK['jstrauss-blue-danube'], pick(rng, [WORK['ravel-bolero'], WORK['honegger-pacific-231'], WORK['debussy-faune']]), WORK['beethoven-symphony-9']];
    titleKind = 'newyear';
  } else {
    program = [];
    if (rng() < 0.55) program.push(pick(rng, orchestralOpeners));
    if (rng() < 0.85) program.push(pick(rng, orchestralConcertos));
    let main;
    do main = pick(rng, orchestralMains); while (program.includes(main));
    program.push(main);
    if (rng() < 0.12) program.splice(1, 0, WORK['rstrauss-four-last-songs']);
  }
  for (const w of program) {
    const inst = soloistFor(w);
    if (inst && w.genre === 'concerto') credits.push({ role: cap(inst), a: pick(rng, pools.instrument[inst]) });
    if (w.id === 'rstrauss-four-last-songs') credits.push({ role: 'Soprano', a: pick(rng, pools.voice.soprano) });
    if (w.id === 'beethoven-symphony-9') {
      for (const v of ['soprano', 'alto', 'tenor', 'bass']) credits.push({ role: cap(v), a: pick(rng, pools.voice[v]) });
      credits.push({ role: 'Choir', a: pickEnsemble(rng, pools, 'choir', lang) });
    }
  }
  const orch = pickEnsemble(rng, pools, 'orchestra', lang);
  credits.push({ role: 'Orchestra', a: orch });
  const main = program[program.length - 1];
  const title = titleKind === 'newyear'
    ? SERIES[lang].newyear
    : rng() < 0.5
      ? `${orch.name} plays ${[...new Set(program.map((w) => COMPOSER[w.composerId].short))].slice(-2).join(' & ')}`
      : `${COMPOSER[main.composerId].short}: ${main.title}`;
  return { type: 'orchestral', program, credits, title, series: SERIES[lang][titleKind] };
}

function buildChamber(rng, pools, lang) {
  let program;
  let ensemble;
  const credits = [];
  if (rng() < 0.18) {
    program = [pick(rng, baroqueChamber)];
    if (rng() < 0.5) program.push(WORK['part-fratres']);
    ensemble = pickEnsemble(rng, pools, 'baroque', lang);
    credits.push({ role: program[0].id === 'vivaldi-four-seasons' ? 'Violin' : 'Harpsichord', a: pick(rng, pools.instrument[program[0].id === 'vivaldi-four-seasons' ? 'violin' : 'harpsichord']) });
  } else {
    const n = rng() < 0.6 ? 2 : 3;
    program = pickDistinct(rng, chamberWorks.filter((w) => w.minutes <= 50), n);
    const hasTrio = program.some((w) => /Trio/.test(w.title));
    ensemble = pickEnsemble(rng, pools, hasTrio ? 'trio' : 'quartet', lang);
    for (const w of program) {
      if (/Clarinet|Quatuor pour la fin/.test(w.title)) credits.push({ role: 'Clarinet', a: pick(rng, pools.instrument.clarinet) });
      if (/Piano Quintet/.test(w.title) && !hasTrio) credits.push({ role: 'Piano', a: pick(rng, pools.instrument.piano) });
      if (/String Quintet/.test(w.title)) credits.push({ role: 'Cello', a: pick(rng, pools.instrument.cello) });
    }
  }
  credits.unshift({ role: 'Ensemble', a: ensemble });
  const composers = [...new Set(program.map((w) => COMPOSER[w.composerId].short))];
  return { type: 'chamber', program, credits: dedupeCredits(credits), title: `${ensemble.name}: ${composers.join(' · ')}`, series: SERIES[lang].chamber };
}

function buildRecital(rng, pools, lang) {
  const mode = rng();
  if (mode < 0.5) {
    const program = pickDistinct(rng, pianoWorks, rng() < 0.5 ? 2 : 3).sort((a, b) => a.year - b.year);
    const p = pick(rng, pools.instrument.piano);
    return { type: 'recital', program, credits: [{ role: 'Piano', a: p }], title: `${p.name} · Piano recital`, series: SERIES[lang].recital };
  }
  if (mode < 0.75) {
    const w = pick(rng, songWorks);
    const voice = w.id === 'schubert-winterreise' ? pick(rng, ['baritone', 'tenor']) : pick(rng, ['soprano', 'mezzo-soprano', 'baritone', 'tenor']);
    const singer = pick(rng, pools.voice[voice]);
    const program = [w];
    if (w.minutes < 40) program.push(pick(rng, songWorks.filter((s) => s !== w)));
    return {
      type: 'recital', program,
      credits: [{ role: cap(voice), a: singer }, { role: 'Piano', a: pick(rng, pools.instrument.piano) }],
      title: `${SERIES[lang].song}: ${singer.name}`, series: SERIES[lang].song,
    };
  }
  const violin = rng() < 0.6;
  const solo = pick(rng, pools.instrument[violin ? 'violin' : 'cello']);
  const program = [WORK[violin ? 'bach-partita-2' : 'bach-cello-suite-1'], WORK['part-spiegel']];
  return {
    type: 'recital', program,
    credits: [{ role: violin ? 'Violin' : 'Cello', a: solo }, { role: 'Piano', a: pick(rng, pools.instrument.piano) }],
    title: `${solo.name} · Bach & Pärt`, series: SERIES[lang].recital,
  };
}

function buildVocal(rng, pools, lang, ctx) {
  const credits = [{ role: 'Conductor', a: pick(rng, pools.conductor) }];
  let program;
  let title;
  let series;
  if (ctx.venue.kind === 'opera') {
    const w = ctx.newYearWeek && rng() < 0.5 ? WORK['jstrauss-fledermaus'] : pick(rng, operas);
    program = [w];
    for (const v of ['soprano', 'mezzo-soprano', 'tenor', 'baritone']) credits.push({ role: cap(v), a: pick(rng, pools.voice[v]) });
    credits.push({ role: 'Choir', a: pickEnsemble(rng, pools, 'choir', lang) });
    credits.push({ role: 'Orchestra', a: pickEnsemble(rng, pools, 'orchestra', lang) });
    title = w.title;
    series = SERIES[lang].opera;
  } else {
    if (ctx.venue.bach || (ctx.church && rng() < 0.2)) {
      program = pickDistinct(rng, [WORK['bach-cantata-140'], WORK['bach-cantata-147']], rng() < 0.5 ? 1 : 2);
      if (rng() < 0.4) program.push(WORK['bach-brandenburg-5']);
      series = SERIES[lang].cantata;
      title = `${SERIES[lang].cantata}: ${program[0].title.replace(/^Cantata /, '')}`;
    } else if (ctx.advent && rng() < 0.6) {
      program = [pick(rng, [WORK['bach-christmas-oratorio'], WORK['handel-messiah']])];
    } else {
      program = [pick(rng, sacredLong)];
    }
    if (!title) {
      const w = program[0];
      title = `${COMPOSER[w.composerId].short}: ${w.title}`;
      series = SERIES[lang].choral;
    }
    for (const v of ['soprano', 'alto', 'tenor', 'bass']) credits.push({ role: cap(v), a: pick(rng, pools.voice[v]) });
    credits.push({ role: 'Choir', a: pickEnsemble(rng, pools, 'choir', lang) });
    credits.push({ role: program.some((w) => w.composerId === 'bach' || w.composerId === 'handel') ? 'Ensemble' : 'Orchestra', a: pickEnsemble(rng, pools, program.some((w) => w.composerId === 'bach' || w.composerId === 'handel') ? 'baroque' : 'orchestra', lang) });
  }
  return { type: 'vocal-opera', program, credits, title, series };
}

function buildMixed(rng, pools, lang) {
  const program = pickDistinct(rng, mixedWorks, 3);
  const ens = pickEnsemble(rng, pools, rng() < 0.5 ? 'orchestra' : 'baroque', lang);
  const credits = [{ role: 'Conductor', a: pick(rng, pools.conductor) }, { role: 'Violin', a: pick(rng, pools.instrument.violin) }, { role: ens.role, a: ens }];
  const composers = [...new Set(program.map((w) => COMPOSER[w.composerId].short))];
  return { type: 'mixed', program, credits, title: `${SERIES[lang].mixed}: ${composers.join(', ')}`, series: SERIES[lang].mixed };
}

function dedupeCredits(credits) {
  const seen = new Set();
  return credits.filter((c) => (seen.has(c.a.id) ? false : seen.add(c.a.id)));
}

const TYPE_WEIGHTS = {
  hall: { orchestral: 0.45, chamber: 0.25, recital: 0.2, mixed: 0.1 },
  hallSmall: { chamber: 0.45, recital: 0.4, mixed: 0.15 },
  opera: { 'vocal-opera': 0.8, orchestral: 0.2 },
  church: { 'vocal-opera': 0.45, chamber: 0.25, recital: 0.2, mixed: 0.1 },
  theatre: { mixed: 0.3, chamber: 0.3, recital: 0.2, orchestral: 0.2 },
};

const DAY_WEIGHT = [1.2, 0.6, 0.8, 1, 1.1, 1.3, 1.4]; // Sun..Sat

function pickDay(rng, from, to) {
  const span = daysBetween(from, to);
  for (;;) {
    const k = addDays(from, Math.floor(rng() * (span + 1)));
    if (k.endsWith('-12-24') || k.endsWith('-12-25')) continue;
    if (rng() * 1.4 <= DAY_WEIGHT[weekdayOf(k)]) return k;
  }
}

function startTime(rng, dayKey, minutes, type) {
  const wd = weekdayOf(dayKey);
  if (type === 'vocal-opera' && minutes > 150) return { time: rng() < 0.5 ? '18:30' : '19:00' };
  if (wd === 0) return { time: rng() < 0.5 ? '11:00' : '17:00' };
  if (wd === 6) return { time: rng() < 0.3 ? '17:00' : '19:30' };
  if (minutes <= 45 && rng() < 0.3) return { time: '12:15', lunch: true };
  return { time: '19:30' };
}

function makeConcert(rng, people, city, idx, dayKey, { past }) {
  const lang = langOf(city);
  const venues = VENUES.filter((v) => v.cityId === city.id);
  const venue = weighted(rng, venues, (v) => v.weight);
  const md = dayKey.slice(5);
  const ctx = {
    venue,
    church: venue.kind === 'church',
    newYear: md === '12-31' || md === '01-01',
    newYearWeek: md >= '12-26' || md <= '01-06',
    advent: md >= '11-29' && md <= '12-23',
  };
  const weights = venue.bach ? { 'vocal-opera': 1 } : TYPE_WEIGHTS[venue.kind === 'hall' && venue.small ? 'hallSmall' : venue.kind];
  let type = weighted(rng, Object.keys(weights), (k) => weights[k]);
  if (ctx.newYear && venue.kind !== 'church') type = venue.kind === 'opera' ? 'vocal-opera' : 'orchestral';
  const built =
    type === 'orchestral' ? buildOrchestral(rng, people.pools, lang, ctx)
    : type === 'chamber' ? buildChamber(rng, people.pools, lang)
    : type === 'recital' ? buildRecital(rng, people.pools, lang)
    : type === 'vocal-opera' ? buildVocal(rng, people.pools, lang, ctx)
    : buildMixed(rng, people.pools, lang);
  const music = built.program.reduce((s, w) => s + w.minutes, 0);
  const durationMin = music + (music > 55 ? 20 : 0);
  const st = startTime(rng, dayKey, music, built.type);
  const bigCity = city.snapshot >= 40;
  // Sheng's Switzerland view showed ~85% of listings as "featured"; mirror that share.
  const featured = rng() < (bigCity && (venue.kind === 'hall' || venue.kind === 'opera') ? 0.9 : 0.75);
  const cancelled = !past && rng() < 0.012;
  return {
    id: `demo-${city.id}-${past ? 'p' : ''}${String(idx).padStart(3, '0')}`,
    title: built.title,
    series: st.lunch ? SERIES[lang].lunch : built.series,
    start: zurichISO(dayKey, st.time),
    durationMin,
    cityId: city.id,
    venueId: venue.id,
    type: built.type,
    featured,
    status: cancelled ? 'cancelled' : 'scheduled',
    demo: true,
    source: 'demo',
    credits: built.credits.map((c) => ({ role: c.role, name: c.a.name, artistId: c.a.id })),
    program: built.program.map((w) => ({ workId: w.id, composerId: w.composerId })),
    notes: featured ? built.program.map((w) => `${COMPOSER[w.composerId].name} — ${w.title}${w.catalog ? `, ${w.catalog}` : ''} (${w.year}). ${w.blurb}`).join('\n\n') : null,
  };
}

// A venue can't host two listings at overlapping times. Keep the first one generated and move
// the other by whole weeks (same weekday, so its start time still fits), inside its own window.
function resolveClashes(concerts) {
  const placed = new Map(); // venueId|day -> concerts already there
  const startMs = (c) => Date.parse(c.start);
  const overlaps = (a, b) => {
    const [x, y] = startMs(a) <= startMs(b) ? [a, b] : [b, a];
    return startMs(y) < startMs(x) + (x.durationMin + 30) * 60000;
  };
  for (const c of concerts) {
    const day = dayKeyOf(c.start);
    const time = timeOf(c.start);
    const [from, to] = day < DEMO_ANCHOR ? [DEMO_PAST_START, addDays(DEMO_ANCHOR, -1)] : [DEMO_ANCHOR, DEMO_END];
    for (let k = 0; k < 80; k++) {
      const shift = k === 0 ? 0 : (k % 2 ? 1 : -1) * 7 * Math.ceil(k / 2);
      const d = addDays(day, shift);
      if (d < from || d > to || d.endsWith('-12-24') || d.endsWith('-12-25')) continue;
      const cand = shift ? { ...c, start: zurichISO(d, time) } : c;
      const list = placed.get(`${c.venueId}|${d}`) || [];
      if (list.some((o) => overlaps(o, cand))) continue;
      if (shift) c.start = cand.start;
      list.push(c);
      placed.set(`${c.venueId}|${d}`, list);
      break;
    }
  }
}

let cache = null;

export function generateDemo() {
  if (cache) return cache;
  const people = buildPeople();
  const concerts = [];
  for (const city of CITIES) {
    const rng = mulberry32(hash(`city-${city.id}-v1`));
    for (let i = 0; i < city.snapshot; i++) concerts.push(makeConcert(rng, people, city, i, pickDay(rng, DEMO_ANCHOR, DEMO_END), { past: false }));
    const pastCount = Math.round(city.snapshot * 0.12) + (city.snapshot === 0 && rng() < 0.4 ? 1 : 0);
    for (let i = 0; i < pastCount; i++) concerts.push(makeConcert(rng, people, city, i, pickDay(rng, DEMO_PAST_START, addDays(DEMO_ANCHOR, -1)), { past: true }));
  }
  resolveClashes(concerts);
  concerts.sort((a, b) => a.start.localeCompare(b.start) || a.id.localeCompare(b.id));
  const usedArtistIds = new Set(concerts.flatMap((c) => c.credits.map((cr) => cr.artistId)));
  const artists = people.artists.filter((a) => usedArtistIds.has(a.id));
  cache = { concerts, artists };
  return cache;
}
