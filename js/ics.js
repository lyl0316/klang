// iCalendar export (add concerts to your calendar, with reminders), import of listings from .ics
// calendars or JSON feeds, and the matching that turns a real listing into Klang's model:
//   matchCity(text)                 → city id ('zurich' for "Zürich", "Zurigo" …) or null
//   matchVenue(text, cityId?)       → known venue (js/data/venues.js) or null
//   matchComposer(name, title?)     → composer id ('tchaikovsky' for "Pjotr Iljitsch Tschaikowsky") or null
//   matchWork(composerId, title)    → work id ('beethoven-symphony-5' for "Sinfonie Nr. 5 c-Moll op. 67") or null
//   matchProgramItem({composer, title}) → { composer, title, composerId?, workId? }
//   matchProgram(lines, title)      → the listing's programme matched; a line naming only the composer
//                                     takes the work the listing's title names ("Händel, Messiah")
//   workFromTitle(title)            → work whose title a whole listing carries ("Die Zauberflöte"), or null
//   workIdentity(line)              → one id per work across languages and listings ('x-beethoven-op60'),
//                                     for repo.js's work index; isBoilerplate / isWorkLine / arrangerOf
//   guessType(text)                 → 'orchestral' | 'chamber' | 'recital' | 'vocal-opera' | 'mixed'
// Transcriptions and arrangements ("transkribiert für zwei Klaviere", "arr.", "Klavierfassung") never
// match the original work; on concert pages the programme keeps the title as published.

import { CITIES, EXTRA_CITIES, CITY_ALIASES } from './data/cities.js';
import { VENUES } from './data/venues.js';
import { COMPOSERS, WORKS } from './data/repertoire.js';
import { normalize } from './util.js';
import { dayKeyOf, timeOf, zurichOffset } from './time.js';

export const slug = (s) =>
  String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

// lower case, no accents, punctuation → spaces: "L’Après-midi d’un faune" → "l'apres midi d'un faune"
const plain = (s) => normalize(String(s || '')).replace(/[’‘´`]/g, "'").replace(/[^a-z0-9']+/g, ' ').replace(/\s+/g, ' ').trim();
const has = (text, phrase) => ` ${text} `.includes(` ${phrase} `);

// ---------- export ----------
const esc = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

function fold(line) {
  const out = [];
  let rest = line;
  while (rest.length > 74) {
    out.push(rest.slice(0, 74));
    rest = ` ${rest.slice(74)}`;
  }
  out.push(rest);
  return out.join('\r\n');
}

const utcStamp = (date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

// concerts: array of { concert, venueName, cityName, programLines[], creditLines[] }
export function buildICS(entries, { reminderDays = [] } = {}) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Klang//Swiss classical concerts//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  const now = utcStamp(new Date());
  for (const e of entries) {
    const c = e.concert;
    const start = new Date(c.start);
    const end = new Date(start.getTime() + (c.durationMin || 120) * 60000);
    const desc = [
      c.series,
      e.programLines?.length ? `Programme:\n${e.programLines.join('\n')}` : '',
      e.creditLines?.length ? `With:\n${e.creditLines.join('\n')}` : '',
      c.sourceName ? `Listing: ${c.sourceName}${c.sourceUrl ? ` — ${c.sourceUrl}` : ''}` : '',
    ].filter(Boolean).join('\n\n');
    lines.push(
      'BEGIN:VEVENT',
      `UID:${c.id}@klang.app`,
      `DTSTAMP:${now}`,
      `DTSTART:${utcStamp(start)}`,
      `DTEND:${utcStamp(end)}`,
      fold(`SUMMARY:${esc(c.title)}`),
      fold(`LOCATION:${esc([e.venueName, e.cityName].filter(Boolean).join(', '))}`),
      fold(`DESCRIPTION:${esc(desc)}`),
    );
    if (c.ticketUrl || c.url) lines.push(fold(`URL:${c.ticketUrl || c.url}`));
    if (c.status === 'cancelled') lines.push('STATUS:CANCELLED');
    for (const d of reminderDays) {
      lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(`${c.title} — in ${d} day${d === 1 ? '' : 's'}`)}`, `TRIGGER:-P${d}D`, 'END:VALARM');
    }
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

// ---------- cities ----------
const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
let cityCandidates = null;

// All known names (own name + aliases) of the 47 cities and the extra towns, longest first so
// "Mézières (FR)" wins over "Mézières" and "Saint-Maurice" over shorter matches.
function candidates() {
  if (cityCandidates) return cityCandidates;
  const list = [];
  for (const c of [...CITIES, ...EXTRA_CITIES]) {
    const names = new Set([normalize(c.name), ...(CITY_ALIASES[c.id] || []).map(normalize)]);
    for (const alias of names) list.push({ id: c.id, alias, re: new RegExp(`(^|[^a-z])${reEsc(alias)}([^a-z]|$)`) });
  }
  list.sort((a, b) => b.alias.length - a.alias.length);
  cityCandidates = list;
  return list;
}

export function matchCity(text) {
  const t = normalize(text);
  if (!t) return null;
  const hit = candidates().find(({ re }) => re.test(t));
  return hit ? hit.id : null;
}

// ---------- venues ----------
const STOP = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'l', 'd', 'di', 'del', 'della', 'im', 'am', 'an', 'der', 'die', 'das', 'the', 'of', 'et', 'und', 'and']);
const EXPAND = { evang: 'evangelische', ev: 'evangelische', ref: 'reformierte', kath: 'katholische', st: 'st', ste: 'ste' };
const venueKey = (s) => plain(s).replace(/'/g, ' ').split(' ').filter((w) => w && !STOP.has(w)).map((w) => EXPAND[w] || w).join(' ');
const VENUE_KEYS = VENUES.map((v) => ({ v, key: venueKey(v.name) }));

// Known venue for a listing's venue text. With a city, only that city's venues are considered and
// looser matches are allowed: "Stadtkirche" in Liestal → Stadtkirche Liestal, "Cathédrale" in
// Lausanne → Cathédrale de Lausanne, "St. Johann" in Schaffhausen → Kirche St. Johann.
export function matchVenue(text, cityId = null) {
  const t = venueKey(text);
  if (!t) return null;
  const pool = cityId ? VENUE_KEYS.filter((x) => x.v.cityId === cityId) : VENUE_KEYS;
  const longest = (list) => list.sort((a, b) => b.key.length - a.key.length)[0]?.v || null;
  const direct = longest(pool.filter((x) => has(t, x.key)));
  if (direct || !cityId) return direct;
  const city = [...CITIES, ...EXTRA_CITIES].find((c) => c.id === cityId);
  const withCity = city ? `${t} ${venueKey(city.name)}` : t;
  const near = longest(pool.filter((x) => has(withCity, x.key)));
  if (near) return near;
  return t.split(' ').length >= 2 ? longest(pool.filter((x) => has(x.key, t))) : null;
}

// ---------- concert type ----------
export function guessType(text) {
  const t = normalize(text);
  if (/\b(oper|opera|operette|operetta|singspiel)\b/.test(t)) return 'vocal-opera';
  if (/(requiem|oratori|passion|messe\b|mass\b|kantate|cantate|cantata|chor\b|choir|choeur|lieder|liederabend)/.test(t)) return 'vocal-opera';
  if (/(rezital|recital|klavierabend|liederabend|\bsolo\b)/.test(t)) return 'recital';
  if (/(quartett|quartet|quatuor|kammermusik|chamber|musique de chambre|trio|quintet|sextet|septet|octet|oktett|duo\b)/.test(t)) return 'chamber';
  if (/(sinfoni|symphon|orchest|philharm|kammerorchester|sinfonietta)/.test(t)) return 'orchestral';
  return 'mixed';
}

// ---------- composers ----------
// [id, surname spellings (as plain text), allowed first names before the surname (null = any)]
// The first-name check keeps "Carl Philipp Emanuel Bach", "Alma Mahler", "Clara Schumann",
// "Fanny Hensel-Mendelssohn" or "Leopold Mozart" from being taken for the composer we know.
const COMPOSER_KEYS = [
  ['bach', ['bach'], /^(j ?s|j s|johann sebastian|jean sebastien|giovanni sebastiano)?$/],
  ['handel', ['handel', 'haendel', 'hendel'], null],
  ['vivaldi', ['vivaldi'], null],
  ['haydn', ['haydn'], /^(j|joseph|josef|franz joseph|franz josef|f j)?$/],
  ['mozart', ['mozart'], /^(w a|w|wolfgang amadeus|wolfgang amade|wolfgang|wolfgang amadeus mozart)?$/],
  ['beethoven', ['beethoven'], null],
  ['schubert', ['schubert'], /^(f|franz|franz peter)?$/],
  ['rossini', ['rossini'], null],
  ['mendelssohn', ['mendelssohn bartholdy', 'mendelssohn'], /^(f|felix|jakob ludwig felix)?$/],
  ['schumann', ['schumann'], /^(r|robert)?$/],
  ['chopin', ['chopin'], null],
  ['liszt', ['liszt'], null],
  ['verdi', ['verdi'], /^(g|giuseppe)?$/],
  ['wagner', ['wagner'], /^(r|richard)?$/],
  ['brahms', ['brahms'], null],
  ['saint-saens', ['saint saens'], null],
  ['bizet', ['bizet'], null],
  ['tchaikovsky', ['tchaikovsky', 'tchaikovski', 'tschaikowsky', 'tschaikowski', 'tchaikowsky', 'tschaikovsky', 'chaikovsky', 'cajkovskij', 'ciaikovskij', 'ciaikovsky', 'tsjaikovski'], null],
  ['dvorak', ['dvorak'], null],
  ['grieg', ['grieg'], null],
  ['puccini', ['puccini'], /^(g|giacomo)?$/],
  ['mahler', ['mahler'], /^(g|gustav)?$/],
  ['debussy', ['debussy'], null],
  ['sibelius', ['sibelius'], null],
  ['rachmaninoff', ['rachmaninoff', 'rachmaninov', 'rachmaninow', 'rachmaninof', 'rakhmaninov', 'rachmaninoff'], null],
  ['ravel', ['ravel'], null],
  ['bloch', ['bloch'], /^(e|ernest)$/],
  ['bartok', ['bartok'], null],
  ['stravinsky', ['stravinsky', 'stravinski', 'stravinskij', 'strawinsky', 'strawinski', 'stravinskii'], null],
  ['martin', ['martin'], /^(f|frank)$/],
  ['honegger', ['honegger'], null],
  ['shostakovich', ['shostakovich', 'shostakovitch', 'schostakowitsch', 'chostakovitch', 'sostakovic', 'sciostakovic', 'sjostakovitsj'], null],
  ['messiaen', ['messiaen'], null],
  ['part', ['part'], /^(a|arvo)?$/],
];
const COMPOSER_IDS = new Set(COMPOSERS.map((c) => c.id));

// Richard Strauss's and Johann Strauss II's works, for a bare "Strauss".
const RSTRAUSS = /(zarathustra|rosenkavalier|letzte lieder|derniers lieder|last songs|salome|elektra|don juan|eulenspiegel|heldenleben|alpensinfonie|alpine symphony|symphonie alpestre|metamorphosen|tod und verklarung|mort et transfiguration|ariadne|arabella|capriccio|frau ohne schatten|don quixote|don quichotte|burleske|morgen|zueignung|cacilie|four last|intermezzo)/;
const JSTRAUSS = /(walzer|waltz|valse|polka|donau|danube|fledermaus|chauve souris|zigeunerbaron|baron tzigane|wiener blut|kaiserwalzer|fruhlingsstimmen|wienerwald|nacht in venedig|marsch|march|czardas|tritsch|pizzicato|perpetuum mobile|champagner)/;

// One composer string ("W. A. Mozart / F. X. Süssmayr", "Strauss, Richard", "Johann Strauss (Sohn)").
function matchOneComposer(raw, title) {
  let s = normalize(raw);
  const son = /\b(ii|sohn|son|fils|figlio|jr|junior)\b/.test(s);
  const father = /\b(vater|father|pere|padre|senior|sr)\b|\bi\s*\)?\s*$/.test(s) && !/\bii\b/.test(s);
  s = s.replace(/\(.*?\)/g, ' ').replace(/\*?\b\d{3,4}\b\s*[-–]?\s*(\d{3,4})?/g, ' ');
  // "Strauss, Richard" → "richard strauss"
  const comma = s.split(',').map((x) => x.trim()).filter(Boolean);
  if (comma.length === 2 && !/\s/.test(comma[0]) && comma[1].split(/\s+/).length <= 3) s = `${comma[1]} ${comma[0]}`;
  s = plain(s).replace(/'/g, ' ').replace(/\b(ii|i|sohn|vater|jr|sr|junior|senior|fils|pere)\s*$/, '').replace(/\b(van|von|de|di|da)\b/g, ' ').replace(/\s+/g, ' ').trim();
  if (!s) return null;
  if (/(^| )strauss$/.test(s)) {
    const first = s.slice(0, -'strauss'.length).trim();
    if (/^(r|richard|richart)$/.test(first)) return 'richard-strauss';
    if (/^(j|johann)$/.test(first) && !father) return 'johann-strauss';
    if (first) return null; // Josef, Eduard, Johann I …
    const t = plain(title);
    if (RSTRAUSS.test(t)) return 'richard-strauss';
    if (JSTRAUSS.test(t) || son) return 'johann-strauss';
    return null;
  }
  for (const [id, surnames, firstOk] of COMPOSER_KEYS) {
    if (!COMPOSER_IDS.has(id)) continue;
    for (const sur of surnames) {
      if (s !== sur && !s.endsWith(` ${sur}`)) continue;
      const first = s.slice(0, s.length - sur.length).trim();
      if (firstOk && !firstOk.test(first)) continue;
      // a hyphenated double name ("hensel mendelssohn", "mahler werfel") is someone else
      if (/hensel|fanny|alma|clara|leopold|michael|siegfried|carl philipp|wilhelm friedemann|johann christian|johann christoph/.test(first)) continue;
      return id;
    }
  }
  return null;
}

export function matchComposer(name, title = '') {
  if (!name) return null;
  const parts = String(name).split(/\s*(?:\/|&|;|\+|\bund\b|\bet\b|\band\b|\bwith\b|\bmit\b|\barr\.?|\bbearb\.?)\s*/i).filter(Boolean);
  for (const p of parts) {
    const id = matchOneComposer(p, title);
    if (id) return id;
  }
  return null;
}

// ---------- works ----------
// Names a work is known by in German / French / Italian / English programmes (plain text).
// A leading "~" marks a generic word that only counts when the composer is already known
// (it is never used to recognise a whole listing by its title alone).
const WORK_ALIASES = {
  'bach-mass-b-minor': ['h moll messe', 'messe in h moll', 'messe h moll', 'hohe messe', 'mass in b minor', 'b minor mass', 'messe en si mineur', 'messa in si minore'],
  'bach-st-matthew': ['matthaus passion', 'matthauspassion', 'matthaeus passion', 'passion selon saint matthieu', 'st matthew passion', 'saint matthew passion', 'passione secondo matteo'],
  'bach-christmas-oratorio': ['weihnachtsoratorium', 'weihnachts oratorium', 'oratorio de noel', 'christmas oratorio', 'oratorio di natale'],
  'bach-cantata-140': ['wachet auf ruft uns die stimme', '~wachet auf'],
  'bach-cantata-147': ['herz und mund und tat und leben'],
  'bach-goldberg': ['goldberg variationen', 'goldberg variations', 'variations goldberg', 'variazioni goldberg', '~goldberg'],
  'bach-brandenburg-5': [],
  'handel-messiah': ['messiah', 'der messias', 'messias', 'le messie', 'il messia'],
  'vivaldi-four-seasons': ['die vier jahreszeiten', 'vier jahreszeiten', 'le quattro stagioni', 'quattro stagioni', 'les quatre saisons', 'quatre saisons', 'the four seasons', 'four seasons'],
  'haydn-creation': ['die schopfung', 'schopfung', 'la creation', 'the creation', 'la creazione'],
  'haydn-quartet-emperor': ['kaiserquartett', 'kaiser quartett', 'emperor quartet', "quatuor l'empereur", '~kaiser', "~l'empereur", '~emperor'],
  'haydn-symphony-104': ['~london', '~londres', '~londoner'],
  'mozart-symphony-41': ['jupiter sinfonie', 'jupiter symphonie', 'jupiter symphony', '~jupiter'],
  'mozart-clarinet-quintet': ['klarinettenquintett', 'clarinet quintet', 'quintette avec clarinette', 'quintette pour clarinette', 'quintetto con clarinetto'],
  'mozart-requiem': ['~requiem'],
  'mozart-don-giovanni': ['don giovanni'],
  'mozart-magic-flute': ['die zauberflote', 'zauberflote', 'la flute enchantee', 'flute enchantee', 'the magic flute', 'magic flute', 'il flauto magico', 'flauto magico'],
  'beethoven-symphony-9': ['~an die freude', '~ode to joy', '~hymne a la joie'],
  'beethoven-piano-concerto-5': ['~emperor', "~l'empereur", '~empereur'],
  'beethoven-appassionata': ['appassionata'],
  'beethoven-archduke': ['erzherzog trio', 'erzherzogtrio', 'archduke trio', "trio a l'archiduc", '~erzherzog', '~archiduc', '~archduke', "~l'arciduca"],
  'beethoven-fidelio': ['fidelio'],
  'schubert-winterreise': ['winterreise', "voyage d'hiver", 'winter journey', "viaggio d'inverno"],
  'schubert-unfinished': ['unvollendete', 'die unvollendete', 'inachevee', 'unfinished symphony', 'incompiuta', '~unfinished'],
  'schubert-trout': ['forellenquintett', 'forellen quintett', 'trout quintet', 'quintette la truite', '~la truite', '~forelle', '~trout'],
  'schubert-string-quintet': [],
  'rossini-barber': ['il barbiere di siviglia', 'barbiere di siviglia', 'der barbier von sevilla', 'barbier von sevilla', 'le barbier de seville', 'barbier de seville', 'the barber of seville', 'barber of seville'],
  'mendelssohn-italian': ['italienische sinfonie', 'italienische symphonie', 'symphonie italienne', 'italian symphony', 'sinfonia italiana', '~italienische', '~italienne', '~italian', '~italiana'],
  'mendelssohn-octet': ['~oktett', '~octuor', '~octet', '~ottetto'],
  'schumann-dichterliebe': ['dichterliebe'],
  'schumann-piano-quintet': ['~klavierquintett', '~piano quintet', '~quintette avec piano', '~quintette pour piano'],
  'chopin-ballades': ['vier balladen', 'quatre ballades', 'four ballades', '4 balladen', '4 ballades', 'les ballades', 'die balladen', '~balladen', '~ballades'],
  'chopin-preludes': ['24 praludien', '24 preludes', 'vingt quatre preludes', '24 preludi'],
  'liszt-sonata': ['sonate h moll', 'klaviersonate h moll', 'sonata in b minor', 'sonate en si mineur', 'sonata in si minore'],
  'verdi-traviata': ['la traviata', 'traviata'],
  'verdi-requiem': ['messa da requiem', '~requiem'],
  'wagner-dutchman': ['der fliegende hollander', 'fliegende hollander', 'le vaisseau fantome', 'vaisseau fantome', 'the flying dutchman', 'flying dutchman', "l'olandese volante", 'olandese volante'],
  'wagner-tristan-prelude': ['vorspiel und liebestod', 'vorspiel und isoldes liebestod', 'einleitung und liebestod', "prelude et mort d'isolde", 'prelude and liebestod', 'prelude and love death', 'preludio e morte di isotta', 'preludio e liebestod'],
  'jstrauss-blue-danube': ['an der schonen blauen donau', 'schonen blauen donau', 'blaue donau', 'blauen donau', 'le beau danube bleu', 'beau danube bleu', 'the blue danube', 'blue danube', 'sul bel danubio blu'],
  'jstrauss-fledermaus': ['die fledermaus', 'fledermaus', 'la chauve souris', 'chauve souris', 'il pipistrello'],
  'brahms-requiem': ['ein deutsches requiem', 'deutsches requiem', 'un requiem allemand', 'requiem allemand', 'a german requiem', 'german requiem', 'un requiem tedesco'],
  'brahms-clarinet-quintet': ['klarinettenquintett', 'clarinet quintet', 'quintette avec clarinette', 'quintette pour clarinette'],
  'saint-saens-organ-symphony': ['orgelsinfonie', 'orgel sinfonie', 'symphonie avec orgue', 'organ symphony', '~avec orgue', '~orgel', '~organ'],
  'saint-saens-carnival': ['le carnaval des animaux', 'carnaval des animaux', 'der karneval der tiere', 'karneval der tiere', 'the carnival of the animals', 'carnival of the animals', 'il carnevale degli animali'],
  'bizet-carmen': ['carmen'],
  'tchaikovsky-pathetique': ['pathetique', 'pathetische', 'patetica', '~pathetique'],
  'tchaikovsky-onegin': ['eugen onegin', 'eugene onegin', 'eugene oneguine', 'evgenij onegin', 'evgeny onegin', 'jewgeni onegin', 'eugenio onegin'],
  'tchaikovsky-souvenir': ['souvenir de florence'],
  'dvorak-new-world': ['aus der neuen welt', 'neuen welt', 'du nouveau monde', 'nouveau monde', 'from the new world', 'new world symphony', 'dal nuovo mondo', '~new world'],
  'dvorak-american-quartet': ['amerikanisches quartett', 'american quartet', 'quatuor americain', '~amerikanisches', '~americain', '~american', '~americano'],
  'puccini-boheme': ['la boheme', 'boheme'],
  'puccini-tosca': ['tosca'],
  'mahler-symphony-2': ['auferstehungssinfonie', 'auferstehungs sinfonie', 'resurrection symphony', '~auferstehung', '~resurrection', '~resurrezione'],
  'mahler-lied-von-der-erde': ['das lied von der erde', 'lied von der erde', 'le chant de la terre', 'chant de la terre', 'the song of the earth', 'song of the earth', 'il canto della terra'],
  'debussy-la-mer': ['~la mer'],
  'debussy-faune': ["prelude a l'apres midi d'un faune", "l'apres midi d'un faune", "apres midi d'un faune", 'nachmittag eines fauns', 'afternoon of a faun', 'pomeriggio di un fauno'],
  'debussy-preludes-1': [],
  'rstrauss-four-last-songs': ['vier letzte lieder', 'quatre derniers lieder', 'four last songs', 'ultimi quattro lieder', 'quattro ultimi lieder'],
  'rstrauss-zarathustra': ['also sprach zarathustra', 'ainsi parlait zarathoustra', 'zarathustra', 'zarathoustra'],
  'rstrauss-rosenkavalier': ['der rosenkavalier', 'rosenkavalier', 'le chevalier a la rose', 'chevalier a la rose', 'il cavaliere della rosa'],
  'rachmaninoff-symphonic-dances': ['symphonische tanze', 'sinfonische tanze', 'danses symphoniques', 'symphonic dances', 'danze sinfoniche'],
  'ravel-bolero': ['bolero'],
  'ravel-gaspard': ['gaspard de la nuit'],
  'bloch-schelomo': ['schelomo'],
  'bartok-concerto-for-orchestra': ['konzert fur orchester', 'concerto pour orchestre', 'concerto for orchestra', 'concerto per orchestra'],
  'stravinsky-rite': ['le sacre du printemps', 'sacre du printemps', 'fruhlingsopfer', 'the rite of spring', 'rite of spring', 'la sagra della primavera'],
  'stravinsky-firebird': ['der feuervogel', 'feuervogel', "l'oiseau de feu", 'oiseau de feu', 'the firebird', 'firebird', "l'uccello di fuoco"],
  'martin-petite-symphonie': ['petite symphonie concertante'],
  'martin-in-terra-pax': ['in terra pax'],
  'honegger-pacific-231': ['pacific 231'],
  'honegger-symphony-3': ['symphonie liturgique', '~liturgique'],
  'messiaen-quartet': ['quatuor pour la fin du temps', 'quartett auf das ende der zeit', 'quartet for the end of time', 'quartetto per la fine del tempo'],
  'part-fratres': ['fratres'],
  'part-spiegel': ['spiegel im spiegel'],
};

// Extra conditions for some works: `need` must also appear, `not` must not appear.
const WORK_RULES = {
  'bach-brandenburg-5': { need: /brandenburg|brandebourg/, num: 5 },
  'debussy-preludes-1': { need: /(preludes|praludien|preludi)/, also: /(livre 1|livre i|premier livre|1er livre|book 1|book i|band 1|band i|heft 1|heft i|libro 1|libro i|1 livre)/ },
  'schubert-string-quintet': { need: /(streichquintett|quintette a cordes|string quintet|quintetto per archi)/, key: 'c-major' },
  'bizet-carmen': { not: /(suite|fantasie|fantaisie|fantasia|habanera|seguedille|toreador|prelude|entr'acte|variation)/ },
  'rstrauss-rosenkavalier': { not: /(suite|walzer|waltz|valse)/ },
  'mahler-symphony-2': { need: /(sinfonie|symphonie|symphony|sinfonia|auferstehungs)/ },
  'tchaikovsky-pathetique': { need: /(sinfonie|symphonie|symphony|sinfonia|pathetique|pathetische|patetica)/, not: /sonate|sonata/ },
  'mendelssohn-italian': { need: /(sinfonie|symphonie|symphony|sinfonia)/ },
  'saint-saens-organ-symphony': { need: /(sinfonie|symphonie|symphony|sinfonia)/ },
  'haydn-symphony-104': { need: /(sinfonie|symphonie|symphony|sinfonia)/ },
  'honegger-symphony-3': { need: /(sinfonie|symphonie|symphony|sinfonia)/ },
  'mozart-symphony-41': { need: /(sinfonie|symphonie|symphony|sinfonia)/ },
  'dvorak-american-quartet': { need: /(quartett|quartet|quatuor|quartetto)/ },
  'haydn-quartet-emperor': { need: /(quartett|quartet|quatuor|quartetto)/ },
  'beethoven-piano-concerto-5': { need: /(konzert|concerto)/ },
  'beethoven-archduke': { need: /trio/ },
  'schubert-trout': { need: /(quintett|quintet|quintette|quintetto|forellenquintett)/ },
  'vivaldi-four-seasons': { seasons: true },
};

// A movement, aria, overture or other part of a larger work: the composer is linked, the work is not.
const EXCERPT = /\b(aus|auszug|auszuge|ausschnitt|ausschnitte|satz|satze|extrait|extraits|excerpt|excerpts|estratto|estratti|mov|mvt|mouvement|movement|movimento|ouverture|overture|vorspiel zu|arie|aria|air|airs|duett|duetto|duo de|chor der|choeur des|coro|cavatina|cavatine|intermezzo|ballabili|ballet de l'acte|acte|akt|atto|act|teil|nr \d+ aus|selection|auswahl|highlights|querschnitt|potpourri|paraphrase|reminiscences|fantasie uber|fantaisie sur|variationen uber|variations sur|suite aus|suite de|suite from)\b/;
const SEASONS = /\b(primavera|estate|estade|autunno|inverno|fruhling|sommer|herbst|winter|printemps|ete|automne|hiver|spring|summer|autumn)\b/g;

// ----- catalogue numbers -----
// Returns { op: Set, k: Set, bwv: Set, … } with the numbers a text names (lower case, no accents).
function catalogues(text, composerId) {
  const t = normalize(text);
  const out = {};
  const add = (scheme, v) => (out[scheme] || (out[scheme] = new Set())).add(String(v).toLowerCase());
  for (const m of t.matchAll(/\bopp?(?:us)?\.?\s*(\d+[a-z]?)(?:\s*(?:\/|,?\s*(?:nr|no|n[°º]?)\.?\s*)(\d{1,2})\b)?/g)) {
    add('op', m[1]);
    if (m[2]) add('opno', `${m[1]}/${m[2]}`);
  }
  if (/\bopp\.?\s*\d+\s*,\s*\d+/.test(t)) out.opMany = true;
  const schemes = [
    ['bwv', /\bbwv\s*(\d+[a-z]?)/g], ['hwv', /\bhwv\s*(\d+[a-z]?)/g], ['sz', /\bsz\.?\s*(\d+)/g], ['wwv', /\bwwv\s*(\d+)/g],
    ['hob', /\bhob\.?\s*([ivx]+[a-z]?)\s*[:.]\s*(\d+)/g], ['woo', /\bwoo\.?\s*(\d+)/g], ['rv', /\brv\.?\s*(\d+)/g],
    ['mwv', /\bmwv\s*([a-z]?\s*\d+)/g], ['wq', /\bwq\.?\s*(\d+)/g], ['l', /\bl\.\s*(\d+)/g],
  ];
  if (composerId === 'mozart') schemes.push(['k', /\b(?:kv|k)\.?\s*,?\s*(\d+[a-z]?)/g]);
  if (composerId === 'schubert') schemes.push(['d', /\bd\.?\s*(\d{1,3})\b/g]);
  if (composerId === 'liszt') schemes.push(['s', /\b(?:s|lw)\.?\s*(\d{2,3})\b/g]);
  for (const [scheme, re] of schemes) for (const m of t.matchAll(re)) add(scheme, m[2] ? `${m[1]}:${m[2]}` : m[1]);
  if (/\b(bwv|hwv|kv|d)\s*\d+\s*[-–]\s*\d+/.test(t)) out.range = true;
  return out;
}

// ----- keys: "c-Moll", "en ut mineur", "in do minore", "in C minor" → "c-minor" -----
const SOLFEGE = { ut: 'c', do: 'c', re: 'd', mi: 'e', fa: 'f', sol: 'g', la: 'a', si: 'b' };
function keyOf(text) {
  const t = normalize(text);
  let m = t.match(/\b([a-h])(is|es|s)?-(dur|moll)\b/);
  if (m) {
    let n = m[1] === 'h' ? 'b' : m[1];
    let acc = m[2] === 'is' ? '#' : m[2] ? 'b' : '';
    if (m[1] === 'b' && !m[2]) acc = 'b'; // German B = B flat
    return `${n}${acc}-${m[3] === 'dur' ? 'major' : 'minor'}`;
  }
  m = t.match(/\b(ut|do|re|mi|fa|sol|la|si)\s*(diese|bemol|diesis|bemolle)?\s+(majeur|mineur|maggiore|minore)\b/);
  if (m) return `${SOLFEGE[m[1]]}${m[2] ? (m[2].startsWith('d') ? '#' : 'b') : ''}-${/^ma/.test(m[3]) ? 'major' : 'minor'}`;
  m = t.match(/\bin\s+([a-g])(?:\s*-?\s*(flat|sharp))?\s+(major|minor)\b/);
  if (m) return `${m[1]}${m[2] ? (m[2] === 'sharp' ? '#' : 'b') : ''}-${m[3]}`;
  return null;
}

// ----- genre, number and solo instruments -----
const INSTRUMENTS = [
  ['piano', /(klavier|piano|pianoforte|fortepiano)/],
  ['violin', /(\bviolin(e|en|o|i)?\b|violinkonzert|violinsonate|\bviolon\b|\bgeige)/],
  ['cello', /(violoncell|cello)/],
  ['clarinet', /(klarinett|clarinet)/],
  ['viola', /(\bviola\b|bratsche)/],
  ['horn', /(\bhorn|\bcor\b|hornkonzert)/],
  ['flute', /(flote|flute|flauto)/],
  ['organ', /(orgel|orgue|\borgan\b|organo)/],
  ['trumpet', /(trompete|trumpet|trompette|tromba)/],
];
function genreOf(t) {
  if (/\b(konzert|concerto|concert|konzerte|concerti)\b|(klavier|violin|cello|klarinetten|floten|oboen|horn|trompeten|orgel|bratschen|fagott|doppel|tripel)konzert/.test(t)) return 'concerto';
  if (/\b(sinfonie|symphonie|symphony|sinfonia)\b/.test(t) && !/(concertante|concertant|de chambre|kammer|fur streich|pour cordes|for strings|per archi)/.test(t)) return 'symphony';
  if (/(quintett|quintette|quintet|quintetto)\b/.test(t)) return 'quintet';
  if (/(quartett|quatuor|quartet|quartetto)\b/.test(t)) return 'quartet';
  if (/(oktett|octuor|octet|ottetto)\b/.test(t)) return 'octet';
  if (/trio\b/.test(t)) return 'trio';
  if (/(sonate|sonata)\b/.test(t)) return 'sonata';
  if (/\bsuites?\b/.test(t)) return 'suite';
  if (/\bpartita\b/.test(t)) return 'partita';
  return null;
}
function numberOf(t) {
  const m = t.match(/\b(?:nr|no|n|num|nummer)\s*(\d{1,3})\b/) ||
    t.match(/\b(\d{1,3})(?:e|eme|er|re|th|st|nd|rd)?\s+(?:sinfonie|symphonie|symphony|klavierkonzert|violinkonzert|cellokonzert|streichquartett|quatuor|concerto|konzert|quartett|sonate)\b/);
  return m ? Number(m[1]) : null;
}
// "Symphonie n° 5 en ut mineur, op. 67" → { genre, num, key, inst, sub }
function describe(text, composerId) {
  const low = normalize(text);
  // drop catalogue numbers (and their "No." parts) before looking for the work number
  const noCat = low.replace(/\b(opp?(?:us)?\.?\s*\d+[a-z]?(?:\s*(?:\/|,?\s*(?:nr|no|n[°º]?)\.?\s*)\d{1,2}\b)?|bwv\s*\d+|hwv\s*\d+|kv?\.?\s*,?\s*\d+|d\.?\s*\d{2,3}\b|hob\.?\s*[ivx]+[a-z]?\s*[:.]\s*\d+|sz\.?\s*\d+|wwv\s*\d+)/g, ' ');
  const t = plain(noCat);
  // the form is named before the instrumentation: "Introduction et Allegro für Harfe, Streichquartett …"
  const head = t.split(/ (?:fur|pour|for|per|avec|mit|with|para) /)[0];
  const genre = genreOf(head);
  const inst = new Set(INSTRUMENTS.filter(([, re]) => re.test(t)).map(([n]) => n));
  let sub = null;
  if (genre === 'quartet' || genre === 'quintet' || genre === 'trio') {
    if (/(streich|cordes|string|archi)/.test(t)) sub = 'string';
    else if (inst.has('clarinet')) sub = 'clarinet';
    else if (inst.has('piano') || /forellen/.test(t)) sub = 'piano';
    else sub = genre === 'quartet' ? 'string' : null;
  }
  return { genre, num: numberOf(t), key: keyOf(low), inst, sub, cat: catalogues(text, composerId), plain: plain(low) };
}

// What a repertoire work is, derived once from its English title and catalogue.
const GENERIC_TITLE = /^(Symphony|Piano Concerto|Violin Concerto|Cello Concerto|Clarinet Concerto|String Quartet|Piano Trio|Piano Quintet|Clarinet Quintet|String Quintet|Octet|Piano Sonata|Cello Suite|Partita)\b/;
let workInfo = null;
function infos() {
  if (workInfo) return workInfo;
  workInfo = new Map();
  for (const w of WORKS) {
    const d = describe(`${w.title} ${w.catalog || ''}`, w.composerId);
    const generic = GENERIC_TITLE.test(w.title);
    const first = w.title.match(GENERIC_TITLE)?.[1] || '';
    const inst = new Set();
    if (/^Piano (Concerto|Sonata)/.test(first)) inst.add('piano');
    if (/^Violin/.test(first) || /solo violin/.test(w.title)) inst.add('violin');
    if (/^Cello/.test(first)) inst.add('cello');
    if (/^Clarinet Concerto/.test(first)) inst.add('clarinet');
    const sub = /^String/.test(first) ? 'string' : /^Piano (Trio|Quintet)/.test(first) ? 'piano' : /^Clarinet Quintet/.test(first) ? 'clarinet' : null;
    const aliases = (WORK_ALIASES[w.id] || []).map((a) => ({ generic: a.startsWith('~'), phrase: plain(a.replace(/^~/, '')) }));
    workInfo.set(w.id, { w, ...d, generic, inst, sub, multiCat: /opp\./i.test(w.catalog || ''), aliases, rule: WORK_RULES[w.id] || null });
  }
  return workInfo;
}

const sameSet = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));

// 'match' (a catalogue number agrees), 'conflict' (the same catalogue, another number) or null.
const SCHEMES = ['op', 'k', 'bwv', 'hwv', 'hob', 'd', 's', 'sz', 'wwv', 'woo', 'rv', 'mwv', 'wq'];
function catalogueVerdict(feed, info) {
  if (info.multiCat) return null;
  // both name a catalogue number, but in different catalogues ("WoO 37" for a work known as "Op. 97")
  const feedSchemes = SCHEMES.filter((x) => feed.cat[x]);
  const workSchemes = SCHEMES.filter((x) => info.cat[x]);
  if (feedSchemes.length && workSchemes.length && !feedSchemes.some((x) => workSchemes.includes(x))) return 'conflict';
  let verdict = null;
  for (const scheme of SCHEMES) {
    const a = feed.cat[scheme];
    const b = info.cat[scheme];
    if (!a || !b) continue;
    if (a.size > 1 || feed.cat.range) return 'conflict'; // several works named in one line
    if (![...a].some((x) => b.has(x))) return 'conflict';
    if (scheme === 'op' && feed.cat.opno && info.cat.opno && ![...feed.cat.opno].some((x) => info.cat.opno.has(x))) return 'conflict';
    verdict = 'match';
  }
  return verdict;
}

function ruleOk(rule, t, feed) {
  if (!rule) return true;
  if (rule.need && !rule.need.test(t)) return false;
  if (rule.also && !rule.also.test(t)) return false;
  if (rule.not && rule.not.test(t)) return false;
  if (rule.num && feed.num !== rule.num) return false;
  if (rule.key && feed.key && feed.key !== rule.key) return false;
  if (rule.seasons) {
    const n = new Set([...t.matchAll(SEASONS)].map((m) => m[1])).size;
    if (n > 0 && n < 4) return false; // one or two of the four concertos only
  }
  return true;
}

// Score one repertoire work against a programme line (0 = no).
function scoreWork(info, feed) {
  const t = feed.plain;
  const cat = catalogueVerdict(feed, info);
  if (cat === 'conflict') return 0;
  if (feed.key && info.key && feed.key !== info.key) return 0;
  if (cat === 'match') return 100;
  const alias = info.aliases.find((a) => has(t, a.phrase));
  if (alias) return ruleOk(info.rule, t, feed) ? (alias.generic ? 70 : 80) : 0;
  if (info.rule && (info.rule.need || info.rule.num) && !info.aliases.length) return ruleOk(info.rule, t, feed) ? 75 : 0;
  if (!info.generic || !feed.genre || feed.genre !== info.genre) return 0;
  if (info.num != null) {
    if (feed.num !== info.num && !(feed.num == null && feed.key && feed.key === info.key)) return 0;
  } else if (feed.num != null) return 0;
  if (['concerto', 'sonata', 'suite', 'partita'].includes(info.genre) && info.inst.size && !sameSet(feed.inst, info.inst)) return 0;
  if (info.sub && feed.sub && info.sub !== feed.sub) return 0;
  if (info.sub && !feed.sub && info.genre !== 'quartet') return 0;
  if (/(linke hand|main gauche|left hand|mano sinistra)/.test(t)) return 0;
  return 60;
}

// The text without the names of this composer's works, so that a nickname such as
// "Aus der Neuen Welt" is not mistaken for "aus" (= an excerpt from).
function withoutAliases(t, composerId) {
  let out = ` ${t} `;
  for (const info of infos().values()) {
    if (composerId && info.w.composerId !== composerId) continue;
    for (const a of info.aliases) out = out.split(` ${a.phrase} `).join(' ');
  }
  return out.trim();
}

// A transcription or arrangement is another version, not the work as we know it: Pletnev's two-piano
// Unfinished, "Klavierfassung", "arr. …", "Fassung für Streichorchester", "orch. von …".
const ARRANGED = /\b(arr|arrangiert|arrangement|arrangements|arrangee|arrange|arrangiato|arrangiata|bearb|bearbeitet|bearbeitung|transkribiert|transkription|transcription|transcrit|transcrite|transcribed|trascrizione|trascritto|instrumentiert|instrumentierung|orchestriert|orchestrated|orchestree|klavierfassung|klavierauszug|orchesterfassung|streicherfassung|reduction)\b|\b(fassung|version|versione|ausgabe)\s+(fur|pour|for|per)\b|\b(fassung|ausgabe|bearbeitung)\s+von\b|\bversion by\b|\borch\s+(von|by|de|par)\b/;
// Scorings that reduce an orchestral or vocal work to keyboards ("für zwei Klaviere"): for the
// symphonies, operas and sacred works of the repertoire only (Saint-Saëns's Carnival has two pianos).
const REDUCED = /\b(fur zwei klaviere|fur 2 klaviere|pour deux pianos|pour 2 pianos|for two pianos|for 2 pianos|per due pianoforti|klavier zu vier handen|piano a quatre mains|piano four hands|fur klavier solo|pour piano seul|for solo piano|fur orgel|pour orgue|for organ)\b/;
const ORCHESTRAL_GENRES = new Set(['symphony', 'orchestral', 'opera', 'sacred']);
export const isArrangement = (title) => ARRANGED.test(plain(title));

// Who arranged it, as listed: "… transkribiert für zwei Klaviere von Mikhail Pletnev" → 'Pletnev',
// "(arr. Virgile Barthe)" → 'Barthe'; null when the listing doesn't name them. A recording of the
// arrangement names its arranger; one that doesn't is the original (concert and work pages).
const ARR_WORD = /\b(arr\.?|arrang\w*|bearb\w*|transkri\w*|transcri\w*|trascri\w*|orchestr\w*|orch\.|instrumentiert\w*|fassung|version|ausgabe|reduzierte)/i;
export function arrangerOf(title) {
  const s = String(title || '');
  if (!isArrangement(s)) return null;
  const at = s.search(ARR_WORD);
  if (at < 0) return null;
  const names = [...s.slice(at).matchAll(/(?:\b(?:von|by|par|de|di|da)\s+|\barr\.\s*|\barr\s+)((?:\p{Lu}[\p{L}’'.-]*\s+){0,3}\p{Lu}[\p{L}’'-]+)/gu)];
  const name = names.length ? names[names.length - 1][1].trim() : null;
  return name ? name.split(/\s+/).pop() : null;
}

export function matchWork(composerId, title) {
  if (!composerId || !title) return null;
  const feed = describe(title, composerId);
  if (EXCERPT.test(withoutAliases(feed.plain, composerId))) return null;
  if (ARRANGED.test(feed.plain)) return null;
  let best = null;
  let bestScore = 0;
  let tie = false;
  for (const info of infos().values()) {
    if (info.w.composerId !== composerId) continue;
    const s = scoreWork(info, feed);
    if (s > bestScore) { best = info.w; bestScore = s; tie = false; } else if (s && s === bestScore) tie = true;
  }
  if (!best || tie) return null;
  // "für zwei Klaviere" alone is a reduction; "pour deux pianos et orchestre" is the scoring
  if (REDUCED.test(feed.plain) && !/(orchest|ensemble|streich|cordes|strings|archi)/.test(feed.plain) && ORCHESTRAL_GENRES.has(best.genre)) return null;
  return best.id;
}

// Feed / import programme line → { composer, title, composerId?, workId? } (raw text always kept).
const itemCache = new Map(); // repeat performances share their programme lines
export function matchProgramItem(p) {
  if (!p) return null;
  if (p.workId || p.composerId) return { ...p };
  const out = { composer: p.composer || '', title: p.title || '' };
  const key = `${out.composer}\u0001${out.title}`;
  let hit = itemCache.get(key);
  if (!hit) {
    const composerId = matchComposer(out.composer, out.title);
    hit = { composerId, workId: composerId ? matchWork(composerId, out.title) : null };
    itemCache.set(key, hit);
  }
  if (hit.composerId) out.composerId = hit.composerId;
  if (hit.workId) out.workId = hit.workId;
  return out;
}

// A listing's whole programme. A line that names only the composer ({ "Händel", "" }) takes the work
// the listing's title names, when that is one work of the same composer: "Händel, Messiah",
// "Paavo Järvi mit Mozarts Requiem", "Bach: Matthäuspassion", "VIVALDI - Die vier Jahreszeiten".
// A generic name ("Requiem") counts only next to the composer's name ("Mozarts Requiem").
export function matchProgram(list, concertTitle = '') {
  const items = (list || []).map(matchProgramItem).filter(Boolean);
  for (const p of items) {
    if (p.workId || p.composerId == null || String(p.title || '').trim()) continue;
    const w = workInTitle(p.composerId, concertTitle);
    if (w) p.workId = w;
  }
  return items;
}

const titleWorkCache = new Map();
function workInTitle(composerId, concertTitle) {
  const cacheKey = `${composerId}\u0001${concertTitle}`;
  if (titleWorkCache.has(cacheKey)) return titleWorkCache.get(cacheKey);
  const full = plain(concertTitle);
  let found = null;
  if (full && !EXCERPT.test(withoutAliases(full, composerId))) {
    const names = COMPOSER_KEYS.find(([id]) => id === composerId)?.[1] || [];
    const hits = new Set();
    for (const info of infos().values()) {
      if (info.w.composerId !== composerId) continue;
      for (const a of info.aliases) {
        if (!has(full, a.phrase)) continue;
        if (a.generic && !names.some((n) => has(full, `${n} ${a.phrase}`) || has(full, `${n}s ${a.phrase}`) || has(full, `${a.phrase} ${n}`))) continue;
        if (!ruleOk(info.rule, full, describe(concertTitle, composerId))) continue;
        hits.add(info.w.id);
      }
    }
    found = hits.size === 1 ? [...hits][0] : null;
  }
  titleWorkCache.set(cacheKey, found);
  return found;
}

// ---------- one work across every listing (work index, js/repo.js) ----------
// Every programme line that names a work gets a language-independent identity, so that the
// same piece listed by Tonhalle in German and by the OSR in French opens one work page:
//   repertoire works keep their id; any other line gets 'x-<composer>-<work>' where <composer> is
//   the matched composer id or the listed surname, and <work> is
//     · the catalogue number when the line names exactly one (op. 60, BWV 1004, KV 626, D 759,
//       Hob. I:104, RV 269, HWV 56, WAB 104, S 125, Sz 116, BB 123, TrV 184, MWV N 10, WoO 36 …),
//       with "-overture" / "-suite" for an overture or suite carrying the parent's number;
//     · else, for a numbered or keyed form, form + scoring + number + key in English
//       ("Sinfonie Nr. 4 B-Dur" = "Symphonie n° 4 en si bémol majeur" → symphony-no4-bb-major);
//     · else the title's words, translated where they are genre or instrument words, sorted.
// Movements, numbers from a ballet, arrangements and lines naming several works keep their full
// title in the key (so only identical lines group). "Excerpts from … Op. 66" goes with the parent
// work only when it names one catalogue number and no single number, act or movement.
// workIdentity(line) → { key, comp, by: 'catalogue' | 'form' | 'title', form, cat, catLabel,
//   part, excerpt, arranged, words (the title's words without catalogue numbers, for a catalogue or
//   title key) } or null (no title, or not a work: "Werke von …", "Uraufführung", "für Streichorchester").

// Page boilerplate read as a programme line (dropped by repo.js) …
const BOILERPLATE = /^(?:programm\w*|program\w*)\s+(?:vorbehalten|subject to change|sous reserve)$|^(?:changements? de programme|sous reserve de modifications?)$|^(?:konzert\s+)?(?:mit|ohne)\s+pause$|^(?:pause|entracte|intermission|intervallo)$|^ca\.?\s*\d+\s*(?:std|stunden?|minuten|min)\b|^(?:apero|aperitif)\b|^(?:dauer|duree)\b|^(?:ca\.?\s*)?\d{1,2}[.:]\d{2}\s*(?:uhr|h)\b|^(?:anschliessend|im anschluss)\b|^(?:solo|duo|trio)[\s-]*programm$|^(?:arrangements?|visuals|live act|dj)$/;
export function isBoilerplate(title) {
  const s = normalize(String(title || '')).replace(/[.!\s]+$/, '').replace(/\s+/g, ' ').trim();
  return !!s && BOILERPLATE.test(s);
}
// … and lines that are information, not a work (shown as text, without a work page).
const NOT_WORK_COMPOSER = /^(?:werke|works|oeuvres|œuvres|opere|musik|music|weitere|und|and|et|sowie)\b/;
const NOT_WORK_TITLE = /^(?:weitere|und andere|and other|other works|autres|d'autres|sowie|etc)\b|\b(?:u a|usw|etc)$|^(?:urauffuhrung|creation|world premiere|premiere|ua)$/;
// The scoring continued from the line before ("für Streichorchester", "pour piano et orchestre") is not
// a work; "Für Elise", «Per questa bella mano» and "Pour le piano" are.
const CONTINUATION = /^(?:fur|pour|for|per) (?:(?:\d+|zwei|drei|vier|funf|sechs|deux|trois|quatre|cinq|two|three|four|five|due|tre|quattro|ein|eine|einen|un|une|grosses|grosse|kleines|kleine|grand|petit|solo|gemischten|gemischter|hohe|tiefe) )?(?:streich|orchest|klavier|piano|violin|violon|viola|alto\b|bratsch|cello|violoncel|kontrabass|contrebasse|flot|flute|flaut|oboe|hautbois|klarinet|clarinet|fagott|basson|horn|cor\b|trompet|tromba|trumpet|posaun|trombone|tuba|harfe|harpe|arpa\b|harp|orgel|orgue|organ|cembalo|clavecin|harpsichord|gitarr|guitar|chitarra|akkordeon|accordeon|sopran|mezzo|alt\b|tenor|bariton|baryton|bass|stimme|singstimme|voix|voice|voce|chor|choeur|coro\b|choir|ensemble|kammer|blas|vents|wind|schlag|percuss|marimba|saxophon|cordes|strings|archi|soli\b|instrument)/;
export function isWorkLine(p) {
  const title = plain(p?.title);
  if (!title) return false;
  return !NOT_WORK_COMPOSER.test(normalize(String(p.composer || '').trim())) && !NOT_WORK_TITLE.test(title) && !CONTINUATION.test(title);
}

const KNOWN_SURNAMES = new Set(COMPOSER_KEYS.flatMap(([, s]) => s).concat(['strauss']));
// German / French / English transliterations brought together: Prokofjew / Prokofiev, Moussorgski /
// Mussorgsky, Rimski-Korsakow / Rimsky-Korsakov.
const translit = (s) => s.replace(/tsch/g, 'ch').replace(/sch/g, 'sh').replace(/tch/g, 'ch').replace(/ae/g, 'a').replace(/oe/g, 'o')
  .replace(/ue/g, 'u').replace(/ou/g, 'u').replace(/w/g, 'v').replace(/[jy]/g, 'i').replace(/ff(?=-|$)/g, 'v').replace(/kh/g, 'k');

// The composer part of a work's identity: the matched composer's id, else the listed surname
// ("Dieter Ammann" and "Ammann" → ammann). A namesake of a composer we know keeps the initials
// of the first names (Carl Philipp Emanuel Bach → cpe-bach, Leopold Mozart → l-mozart).
export function composerKey(name, composerId = null) {
  if (composerId) return composerId;
  let s = normalize(String(name || '')).split(/\s*(?:\/|&|;|\+|\bund\b|\bet\b|\band\b|\bmit\b|\bwith\b|\barr\b\.?|\bbearb\b\.?)\s*/)[0] || '';
  const father = /\b(vater|father|pere|senior|sr)\b/.test(s);
  s = s.replace(/\(.*?\)/g, ' ').replace(/\*?\b\d{3,4}\b\s*[-–]?\s*(\d{3,4})?/g, ' ');
  const comma = s.split(',').map((x) => x.trim()).filter(Boolean);
  s = comma.length === 2 && !/\s/.test(comma[0]) ? `${comma[1]} ${comma[0]}` : comma[0] || '';
  const words = s.replace(/[’'`´]/g, '').replace(/[–—]/g, '-').split(/[^a-z0-9-]+/).map((w) => w.replace(/^-+|-+$/g, '')).filter(Boolean);
  while (words.length > 1 && /^(ii|i|jr|sr|sohn|vater|fils|pere|junior|senior)$/.test(words[words.length - 1])) words.pop();
  if (!words.length) return '';
  const last = words[words.length - 1];
  const sur = translit(last);
  const firsts = words.slice(0, -1).filter((w) => !/^(van|von|de|di|da|del|della|du|le|la|des|der|den|ten|ter|y|mc)$/.test(w));
  if (KNOWN_SURNAMES.has(last.replace(/-/g, ' ')) && firsts.length) return `${firsts.map((w) => w[0]).join('')}${father ? '1' : ''}-${sur}`;
  return sur;
}

// ----- catalogue numbers, as tokens ('op60', 'op59-1', 'bwv1004', 'kv626', 'd759', 'hob-i-104' …) -----
const CAT_SCHEMES = [
  { s: 'bwv', re: /\bbwv\.?\s*(anh\.?\s*)?(\d+[a-z]?)/g, tok: (m) => `bwv${m[1] ? 'anh' : ''}${m[2]}`, label: (m) => `BWV ${m[1] ? 'Anh. ' : ''}${m[2]}` },
  { s: 'kv', re: /\b(?:kv|k\.)\s*(\d+[a-z]?)\b/g, tok: (m) => `kv${m[1]}`, label: (m) => `K. ${m[1]}` },
  { s: 'kv', only: ['mozart'], re: /\bk\s+(\d+[a-z]?)\b/g, tok: (m) => `kv${m[1]}`, label: (m) => `K. ${m[1]}` },
  { s: 'd', only: ['schubert'], re: /\bd\.?\s*(\d{1,3})\b(?!\s*-)/g, tok: (m) => `d${m[1]}`, label: (m) => `D ${m[1]}` },
  { s: 'hob', re: /\bhob\.?\s*([ivx]+[a-z]?)\s*[:./]?\s*(\d+[a-z]?)/g, tok: (m) => `hob-${m[1]}-${m[2]}`, label: (m) => `Hob. ${m[1].toUpperCase()}:${m[2]}` },
  { s: 'rv', re: /\brv\.?\s*(\d+[a-z]?)/g, tok: (m) => `rv${m[1]}`, label: (m) => `RV ${m[1]}` },
  { s: 'hwv', re: /\bhwv\.?\s*(\d+[a-z]?)/g, tok: (m) => `hwv${m[1]}`, label: (m) => `HWV ${m[1]}` },
  { s: 'wab', re: /\bwab\.?\s*(\d+)/g, tok: (m) => `wab${m[1]}`, label: (m) => `WAB ${m[1]}` },
  { s: 's', only: ['liszt'], re: /\b(?:s|lw)\.?\s*([a-z]?\d{1,3})\b/g, tok: (m) => `s${m[1]}`, label: (m) => `S. ${m[1].toUpperCase()}` },
  { s: 'sz', re: /\bsz\.?\s*(\d+)/g, tok: (m) => `sz${m[1]}`, label: (m) => `Sz. ${m[1]}` },
  { s: 'bb', re: /\bbb\.?\s*(\d+)/g, tok: (m) => `bb${m[1]}`, label: (m) => `BB ${m[1]}` },
  { s: 'trv', re: /\btrv\.?\s*(\d+[a-z]?)/g, tok: (m) => `trv${m[1]}`, label: (m) => `TrV ${m[1]}` },
  { s: 'mwv', re: /\bmwv\.?\s*([a-z]{1,2})\s*(\d+)/g, tok: (m) => `mwv-${m[1]}${m[2]}`, label: (m) => `MWV ${m[1].toUpperCase()} ${m[2]}` },
  { s: 'woo', re: /\bwoo\.?\s*(\d+[a-z]?)(?:\s*\/\s*(\d+))?/g, tok: (m) => `woo${m[1]}${m[2] ? `-${m[2]}` : ''}`, label: (m) => `WoO ${m[1]}${m[2] ? `/${m[2]}` : ''}` },
  { s: 'wq', re: /\bwq\.?\s*(\d+)(?:\s*\/\s*(\d+))?/g, tok: (m) => `wq${m[1]}${m[2] ? `-${m[2]}` : ''}`, label: (m) => `Wq. ${m[1]}${m[2] ? `/${m[2]}` : ''}` },
  { s: 'fp', re: /\bfp\.?\s*(\d+)/g, tok: (m) => `fp${m[1]}`, label: (m) => `FP ${m[1]}` },
  { s: 'buxwv', re: /\bbuxwv\.?\s*(\d+)/g, tok: (m) => `buxwv${m[1]}`, label: (m) => `BuxWV ${m[1]}` },
  { s: 'wwv', re: /\bwwv\.?\s*(\d+)/g, tok: (m) => `wwv${m[1]}`, label: (m) => `WWV ${m[1]}` },
  { s: 'l', only: ['debussy'], re: /\bl\.?\s*(\d{1,3})\b/g, tok: (m) => `l${m[1]}`, label: (m) => `L. ${m[1]}` },
];
const OPUS = /\bop(?:us|\.)?\s*(\d+[a-z]?)(?:\s*(?:\/|,?\s*(?:nr|no|n[°º]?)\.?\s*)(\d{1,2})\b)?/g;
const CAT_RANGE = /\b(?:bwv|kv|hwv|rv|d|hob[^,;]*?|op\.?)\s*\d+[a-z]?\s*(?:\/\s*\d+\s*)?[-–]\s*\d+/;

// → { token, label } | 'multi' (several works in one line) | null
function catalogueOf(low, composerId, comp) {
  const who = composerId || comp;
  const thematic = new Map();
  for (const sc of CAT_SCHEMES) {
    if (sc.only && !sc.only.includes(who)) continue;
    for (const m of low.matchAll(sc.re)) thematic.set(sc.tok(m), sc.label(m));
  }
  const ops = new Map();
  for (const m of low.matchAll(OPUS)) ops.set(`op${m[1]}${m[2] ? `-${m[2]}` : ''}`, `Op. ${m[1]}${m[2] ? ` No. ${m[2]}` : ''}`);
  // "op. 46-72", "opp. 46 & 72", "extraits des op. 46 et 72": several works
  if (CAT_RANGE.test(low) || /\bopp\.?\s*\d/.test(low) || /\bop\.?\s*\d+[a-z]?\s+(?:et|und|and|e|y|&)\s+(?:op\.?\s*)?\d+\b/.test(low)) return 'multi';
  if (thematic.size > 1) return 'multi';
  if (thematic.size === 1) { const [token, label] = [...thematic][0]; return { token, label }; }
  if (ops.size > 1) return 'multi';
  if (ops.size === 1) { const [token, label] = [...ops][0]; return { token, label }; }
  return null;
}

// ----- parts, overtures, suites -----
const PART = /\b(aus|auszug|auszuge|ausschnitt|ausschnitte|satz|satze|extrait|extraits|excerpt|excerpts|estratto|estratti|mov|mvt|mouvement|movement|movimento|arie|aria|air|airs|duett|duetto|duo de|chor der|choeur des|coro|cavatina|cavatine|intermezzo|intermezzi|ballabili|acte|akt|atto|act|teil|selection|selections|auswahl|highlights|querschnitt|suite aus|suite de|suite from)\b/;
// words inside a quoted title don't count: «G’schichten aus dem Wienerwald» is a whole waltz
const unquoted = (low) => low.replace(/[«“„"][^»”“"]*[»”“"]/g, ' ');
// a numbered piece or movement after the catalogue number: "Schwanensee op. 20, Introduktion",
// "12 Etüden …, op. 39 X Allegretto alla barbaresca"; a choice of numbers: "op. 119, Intermezzi nos 1, 3 et 4"
const PART_AFTER_CAT = /\b(?:op\.?|bwv|kv|k\.|d\.?|hwv|rv)\s*\d+[a-z]?(?:\s*[,:–-]\s*(?:\d+\.?\s*)?(?:introduktion|introduction|einleitung|finale|szene|scene|walzer|valse|waltz|mazurka|polonaise|marsch|march|pas de deux|tanz|danse|dance|adagio|andante|allegro|presto|largo|scherzo|menuett|minuet|rondo|[ivx]+\.)|\s+[ivx]+\.?\s+[a-z]{3,})|\b(?:nos?|nrn?|n[°º]s?)\.?\s*\d+\s*(?:,\s*\d+\s*)*(?:et|und|and|e|&)\s*\d+/;
// "Excerpts from the ballet Sleeping Beauty, Op. 66": the whole work's number, no single part named
const EXCERPTS_OF = /\b(auszuge|ausschnitte|extraits|excerpts|estratti|highlights|selections|szenen aus|scenes from)\b/;
const NAMES_A_PART = /\b(nr|no|n|akt|acte|act|atto|satz|mouvement|movement|movimento|teil|arie|aria|air|duett|duetto|chor|coro|choeur|introduktion|finale)\b/;
// (a concert overture too: "«Othello» Konzertouvertüre, op. 93" is "Ouverture « Othello », op. 93")
const OVERTURE = /\b(ouverture|overture|ouvertura|vorspiel|konzertouverture)\b/;
// a suite drawn from a stage work that shares its number ("Nussknacker-Suite", "Suite aus …"), not a
// work that is itself a suite ("Symphonische Suite «Scheherazade» op. 35")
const SUITE_OF = /(ballett|ballet|oper|opera|film|buhnen)[\s-]*suite\b|\bsuite (?:aus|from|de|du|tiree|nach|dal|dalla)\b|[a-z]-suite\b/;

// ----- numbered and keyed forms -----
const FORMS = [
  ['symphony', /\b(sinfonie|symphonie|symphony|sinfonia|streichersinfonie|streichsinfonie)\b/, /(concertante|concertant|de chambre|kammer|in stile)/],
  ['concerto', /\b(konzert|concerto|concert|concerti|konzerte)\b|(klavier|violin|cello|klarinetten|floten|oboen|horn|trompeten|orgel|bratschen|fagott|doppel|tripel|gitarren|harfen|cembalo)konzert\b/],
  ['mass', /\b(messe|mass|messa|missa)\b/],
  ['requiem', /\brequiem\b/],
  ['sextet', /(sextett|sextuor|sextet|sestetto)\b/],
  ['septet', /(septett|septuor|septet|settimino)\b/],
  ['octet', /(oktett|octuor|octet|ottetto)\b/],
  ['quintet', /(quintett|quintette|quintet|quintetto)\b/],
  ['quartet', /(quartett|quatuor|quartet|quartetto)\b/],
  ['trio', /trio\b/],
  ['sonata', /(sonate|sonata)\b/],
  ['serenade', /\b(serenade|serenata)\b/],
  ['suite', /\bsuite\b/],
  ['partita', /\bpartita\b/],
];
const SOLO = [
  ['piano', /(klavier|\bpiano|pianoforte|fortepiano)/], ['violin', /(\bviolin(e|en|o|i)?\b|violinkonzert|violinsonate|\bviolon\b|\bgeige)/],
  ['cello', /(violoncell|cello)/], ['viola', /(\bviola\b|bratsche)/], ['clarinet', /(klarinett|clarinet)/], ['oboe', /(\boboe|hautbois|oboen)/],
  ['flute', /(flote|\bflute|flauto)/], ['bassoon', /(fagott|basson)/], ['horn', /(\bhorn|\bcor\b|\bcorno\b)/], ['trumpet', /(trompete|trumpet|trompette|tromba)/],
  ['trombone', /(posaune|trombone)/], ['organ', /(orgel|orgue|\borgan\b|organo)/], ['harp', /(harfe|harpe|\barpa\b|\bharp\b)/],
  ['guitar', /(gitarre|guitare|chitarra|guitar)/], ['harpsichord', /(cembalo|clavecin|harpsichord)/], ['accordion', /(akkordeon|accordeon|accordion|fisarmonica)/],
  ['saxophone', /(saxophon|sassofono)/], ['mandolin', /(mandolin)/], ['lute', /(\blaute\b|\bluth\b|\bliuto\b|\blute\b)/],
];
const KEYBOARDS = new Set(['piano', 'harpsichord', 'organ']);

// "Konzert für Violine, Klavier und Streicher d-Moll" → { genre: 'concerto', inst: ['piano', 'violin'], num: null, key: 'd-minor', … }
function formOf(low, pl) {
  const head = pl.split(/ (?:fur|pour|for|per|avec|mit|with|para) /)[0];
  const f = FORMS.find(([, re, not]) => re.test(head) && !(not && not.test(head)));
  if (!f) return null;
  const genre = f[0];
  const noCat = plain(low.replace(OPUS, ' ').replace(/\b(bwv|hwv|kv|k\.|d\.?|rv|wab|sz|bb|trv|mwv|woo|wq|hob\.?\s*[ivx]+[a-z]?\s*[:./]?)\s*\d+[a-z]?/g, ' '));
  let inst = SOLO.filter(([, re]) => re.test(noCat)).map(([n]) => n);
  let sub = null;
  if (['quartet', 'quintet', 'trio', 'sextet', 'septet', 'octet'].includes(genre)) {
    if (/(streich|cordes|string|archi)/.test(noCat)) sub = 'string';
    else if (/(blaser|vents|wind|fiati)/.test(noCat)) sub = 'wind';
    else if (inst.includes('clarinet')) sub = 'clarinet';
    else if (inst.includes('piano')) sub = 'piano';
    inst = [];
  } else if (genre === 'symphony') {
    if (/(streichersinfonie|streichsinfonie|fur streich|pour cordes|for strings|per archi)/.test(noCat)) sub = 'string';
    inst = [];
  } else if (genre === 'sonata' || genre === 'suite' || genre === 'partita') {
    // a cello sonata is "for cello and piano" or just "Cellosonate": the keyboard only counts alone
    const solo = inst.filter((i) => !KEYBOARDS.has(i));
    inst = solo.length ? solo.slice(0, 1) : inst.slice(0, 1);
    if (/triosonate|trio sonata|sonate en trio/.test(noCat)) sub = 'trio';
  } else if (genre !== 'concerto') inst = [];
  const key = keyOf(low);
  return { genre, sub, inst: inst.sort(), num: numberOf(noCat), key };
}
const formText = (f) => [f.genre, f.sub, ...f.inst, f.num != null ? `no${f.num}` : null, f.key ? f.key.replace('#', 'sharp') : null].filter(Boolean).join('-');

// ----- the title's own words (sorted, so that word order and languages matter less) -----
const WORDS = {
  sinfonie: 'symphony', symphonie: 'symphony', sinfonia: 'symphony', symphony: 'symphony', konzert: 'concerto', concerto: 'concerto', concert: 'concerto',
  klavierkonzert: 'piano concerto', violinkonzert: 'violin concerto', cellokonzert: 'cello concerto', violoncellokonzert: 'cello concerto',
  messe: 'mass', messa: 'mass', missa: 'mass', mass: 'mass', streichquartett: 'string quartet', quartett: 'quartet', quatuor: 'quartet', quartetto: 'quartet',
  streichquintett: 'string quintet', quintett: 'quintet', quintette: 'quintet', quintetto: 'quintet', klaviertrio: 'piano trio', streichtrio: 'string trio',
  sonate: 'sonata', klaviersonate: 'piano sonata', violinsonate: 'violin sonata', cellosonate: 'cello sonata', ouverture: 'overture', ouvertura: 'overture',
  serenata: 'serenade', variationen: 'variations', variazioni: 'variations', fantasie: 'fantasia', fantaisie: 'fantasia', fantasy: 'fantasia',
  rhapsodie: 'rhapsody', rapsodia: 'rhapsody', praludium: 'prelude', preludio: 'prelude', fuge: 'fugue', fuga: 'fugue', klavier: 'piano', pianoforte: 'piano',
  violine: 'violin', violon: 'violin', violino: 'violin', geige: 'violin', violoncelle: 'cello', violoncello: 'cello', bratsche: 'viola', flote: 'flute',
  flauto: 'flute', hautbois: 'oboe', klarinette: 'clarinet', clarinette: 'clarinet', clarinetto: 'clarinet', fagott: 'bassoon', basson: 'bassoon',
  trompete: 'trumpet', trompette: 'trumpet', tromba: 'trumpet', posaune: 'trombone', harfe: 'harp', harpe: 'harp', arpa: 'harp', orgel: 'organ',
  orgue: 'organ', organo: 'organ', gitarre: 'guitar', guitare: 'guitar', chitarra: 'guitar', cembalo: 'harpsichord', clavecin: 'harpsichord',
  streicher: 'strings', cordes: 'strings', archi: 'strings', streichorchester: 'strings', chor: 'choir', choeur: 'choir', coro: 'choir',
  konzertouverture: 'overture', vorspiel: 'prelude', tanze: 'dances', tanz: 'dance', danses: 'dances', danse: 'dance', danze: 'dances',
  norwegische: 'norwegian', norvegiennes: 'norwegian', norvegesi: 'norwegian', slawische: 'slavonic', slaves: 'slavonic', slave: 'slavonic',
  ungarische: 'hungarian', hongroises: 'hungarian', ungheresi: 'hungarian', sinfonische: 'symphonic', symphonique: 'symphonic',
  sinfonico: 'symphonic', dichtung: 'poem', poeme: 'poem', poema: 'poem',
};
// Words that name no work by themselves (forms, scorings, numbers, keys): a title needs another word
// before a listing without catalogue number may join a numbered one (repo.js work index).
const GENERIC_WORDS = new Set(['symphony', 'concerto', 'mass', 'string', 'quartet', 'quintet', 'trio', 'sextet', 'septet', 'octet', 'sonata',
  'sonatina', 'piano', 'violin', 'cello', 'viola', 'overture', 'prelude', 'serenade', 'variations', 'fantasia', 'rhapsody', 'fugue', 'flute',
  'oboe', 'clarinet', 'bassoon', 'trumpet', 'trombone', 'horn', 'harp', 'organ', 'guitar', 'harpsichord', 'strings', 'choir', 'suite',
  'partita', 'dance', 'dances', 'symphonic', 'poem', 'oper', 'opera', 'ballett', 'ballet', 'konzert', 'werk', 'werke', 'stuck', 'stucke',
  'piece', 'pieces', 'nocturne', 'nocturnes', 'etude', 'etudes', 'impromptu', 'scherzo', 'ballade', 'romanze', 'romance', 'lied', 'lieder',
  'aria', 'arie', 'mazurka', 'mazurkas', 'walzer', 'waltz', 'valse', 'polonaise', 'intermezzo', 'marsch', 'march', 'marche', 'menuett',
  'minuet', 'capriccio', 'toccata', 'chaconne', 'passacaglia', 'canzona', 'sinfonia', 'motette', 'motet', 'kantate', 'cantata', 'cantate']);
// (and one or two letters: roman numerals, initials, "I Mazurka in a-Moll")
export const isGenericWord = (w) => GENERIC_WORDS.has(w) || w.length <= 2 || /^no\d+$|^\d+[a-z]?$|-(?:major|minor)$|^[ivxlc]+$/.test(w);
const DROP = new Set(['der', 'die', 'das', 'des', 'dem', 'den', 'ein', 'eine', 'einer', 'eines', 'zu', 'zur', 'zum', 'von', 'vom', 'aus', 'und', 'fur',
  'mit', 'im', 'in', 'am', 'an', 'auf', 'uber', 'le', 'la', 'les', 'l', 'du', 'de', 'd', 'un', 'une', 'et', 'pour', 'avec', 'sur', 'en', 'au', 'aux',
  'il', 'lo', 'gli', 'i', 'di', 'del', 'della', 'e', 'per', 'con', 'da', 'the', 'of', 'a', 'an', 'and', 'for', 'with', 'from', 'to', 'on',
  'orchester', 'orchestre', 'orchestra', 'nr', 'no', 'n', 'num', 'nummer', 'ua']);
const KEY_PHRASE = /\b[a-h](?:is|es|s)?-(?:dur|moll)\b|\b(?:en |in )?(?:ut|do|re|mi|fa|sol|la|si)(?: (?:diese|bemol|diesis|bemolle))? (?:majeur|mineur|maggiore|minore)\b|\bin [a-g](?:[- ](?:flat|sharp))? (?:major|minor)\b/g;
function titleWordList(low) {
  const key = keyOf(low);
  const s = low.replace(/\b1[5-9]\d\d\b(\s*[/–-]\s*\d{2,4})?|\b20[0-4]\d\b/g, ' ').replace(KEY_PHRASE, ' ').replace(/[~*′'’]/g, ' ');
  const words = plain(s).replace(/\b(?:nr|no|n|num|nummer) (\d+)\b/g, 'no$1').split(' ')
    .flatMap((w) => (WORDS[w] || w).split(' ')).filter((w) => w && !DROP.has(w));
  if (key) words.push(key.replace('#', 'sharp'));
  return [...new Set(words)].sort();
}
const titleWords = (low) => titleWordList(low).join('-');

// The title without its catalogue numbers ("«Norwegische Tänze» op. 35" → "«norwegische tänze»")
function withoutCatalogue(low, who) {
  let s = low;
  for (const sc of CAT_SCHEMES) if (!sc.only || sc.only.includes(who)) s = s.replace(sc.re, ' ');
  return s.replace(OPUS, ' ');
}

// short, stable hash (djb2, base 36) that keeps long keys distinct after shortening
const hash36 = (str) => {
  let x = 5381;
  for (let i = 0; i < str.length; i++) x = ((x * 33) ^ str.charCodeAt(i)) >>> 0;
  return x.toString(36);
};

const identityCache = new Map();
export function workIdentity(p) {
  if (!p) return null;
  const title = String(p.title || '').trim();
  if (!title || !isWorkLine(p)) return null;
  const composerId = p.composerId || null;
  const cacheKey = `${composerId || ''}\u0001${p.composer || ''}\u0001${title}`;
  if (identityCache.has(cacheKey)) return identityCache.get(cacheKey);
  const comp = composerKey(p.composer, composerId);
  const low = normalize(title);
  const pl = plain(title);
  const arranged = ARRANGED.test(pl);
  const cat = catalogueOf(low, composerId, comp);
  const one = cat && cat !== 'multi' ? cat : null;
  const without = one ? pl.replace(/\b(?:op|opus|bwv|kv|k|d|hob|rv|hwv|wab|s|lw|sz|bb|trv|mwv|woo|wq|fp|buxwv|wwv|l)\b(?: [a-z]{1,2})?(?: [ivx]+)? \d+[a-z]?\b(?: (?:nr|no|n) \d+\b)?/g, ' ') : pl;
  const excerpt = EXCERPTS_OF.test(pl);
  const ofWhole = excerpt && !!one && !arranged && !NAMES_A_PART.test(without.replace(EXCERPTS_OF, ' '));
  const part = !ofWhole && (PART.test(plain(unquoted(low))) || PART_AFTER_CAT.test(low));
  const form = !part && !arranged && cat !== 'multi' ? formOf(low, pl) : null;
  let by;
  let work;
  if (one && !arranged && (!part || ofWhole)) {
    by = 'catalogue';
    work = one.token + (!ofWhole && OVERTURE.test(pl) ? '-overture' : '') + (!ofWhole && SUITE_OF.test(low) ? '-suite' : '');
  } else if (form && !one && cat !== 'multi' && (form.num != null || form.key)) {
    by = 'form';
    work = formText(form);
  } else {
    by = 'title';
    work = titleWords(low) || slug(title);
  }
  const full = slug([comp, work].filter(Boolean).join('-'));
  const key = `x-${full.length <= 80 ? full : `${full.slice(0, 72).replace(/-+$/, '')}-${hash36(full)}`}`;
  // the title's words without catalogue numbers, in English where they are genre, scoring or dance
  // words: a listing without the number joins a numbered one by them (repo.js work index)
  const words = by === 'catalogue' ? titleWordList(withoutCatalogue(low, composerId || comp)) : by === 'title' ? titleWordList(low) : [];
  const out = { key, comp, by, form, cat: one ? one.token : null, catLabel: one ? one.label : null, part, excerpt: excerpt || part, arranged, words };
  identityCache.set(cacheKey, out);
  return out;
}

// ---------- search text for a programme line (Apple Music) ----------
// "Sinfonie Nr. 6 F-Dur, Pastorale, op. 68 (Fassung …)" → search text without notes in brackets
export const searchTitle = (s) => String(s || '').replace(/\([^)]*\)|\[[^\]]*\]/g, ' ').replace(/,\s*\d+\.\s*Fassung\b.*$/i, ' ').replace(/[«»“”„"]/g, ' ')
  .replace(/\s+/g, ' ').replace(/[\s,;:–-]+$/, '').trim();

// Apple's catalogue is titled in English: when the listing's German title finds nothing, a second
// search uses the usual English form ("Sinfonie für Streichorchester Nr. 8" → "String Symphony No. 8").
// Only a search term — pages always show the title as listed.
const INSTRUMENT_EN = {
  klavier: 'Piano', violine: 'Violin', violoncello: 'Cello', cello: 'Cello', viola: 'Viola', horn: 'Horn', flöte: 'Flute',
  oboe: 'Oboe', klarinette: 'Clarinet', fagott: 'Bassoon', trompete: 'Trumpet', orgel: 'Organ', harfe: 'Harp',
};
const DE_EN = [
  [/\b(?:Streichersinfonie|Sinfonie für Streich(?:orchester|er))/gi, 'String Symphony'],
  [/\bKonzert für (Klavier|Violine|Violoncello|Cello|Viola|Horn|Flöte|Oboe|Klarinette|Fagott|Trompete|Orgel|Harfe)(?: und Orchester)?/gi, (m, i) => `${INSTRUMENT_EN[i.toLowerCase()]} Concerto`],
  [/\bKlavierkonzert/gi, 'Piano Concerto'], [/\bViolinkonzert/gi, 'Violin Concerto'], [/\b(?:Violon)?[Cc]ellokonzert/g, 'Cello Concerto'],
  [/\bHornkonzert/gi, 'Horn Concerto'], [/\bKlarinettenkonzert/gi, 'Clarinet Concerto'], [/\bFlötenkonzert/gi, 'Flute Concerto'],
  [/\bTrompetenkonzert/gi, 'Trumpet Concerto'], [/\bOboenkonzert/gi, 'Oboe Concerto'], [/\bDoppelkonzert/gi, 'Double Concerto'],
  [/\bStreichquartett/gi, 'String Quartet'], [/\bStreichquintett/gi, 'String Quintet'], [/\bStreichsextett/gi, 'String Sextet'],
  [/\bKlaviertrio/gi, 'Piano Trio'], [/\bKlavierquartett/gi, 'Piano Quartet'], [/\bKlavierquintett/gi, 'Piano Quintet'],
  [/\bKlaviersonate/gi, 'Piano Sonata'], [/\bViolinsonate/gi, 'Violin Sonata'], [/\bCellosonate/gi, 'Cello Sonata'],
  [/\bConcerto pour (piano|violon|violoncelle|alto|cor|flûte|hautbois|clarinette|basson|trompette|orgue|harpe)(?: et orchestre)?/gi,
    (m, i) => `${({ piano: 'Piano', violon: 'Violin', violoncelle: 'Cello', alto: 'Viola', cor: 'Horn', flûte: 'Flute', hautbois: 'Oboe', clarinette: 'Clarinet', basson: 'Bassoon', trompette: 'Trumpet', orgue: 'Organ', harpe: 'Harp' })[i.toLowerCase()]} Concerto`],
  [/\bQuatuor à cordes/gi, 'String Quartet'], [/\bQuintette à cordes/gi, 'String Quintet'],
  [/\b(?:Sinfonie|Symphonie)/gi, 'Symphony'], [/\bOuvertüre/gi, 'Overture'], [/\bMesse\b/gi, 'Mass'], [/\bKonzert\b/gi, 'Concerto'],
  [/\bNr\.\s*/gi, 'No. '], [/\bn[°º]\s*/gi, 'No. '],
];
export function englishTitle(title) {
  let s = searchTitle(title);
  for (const [re, to] of DE_EN) s = s.replace(re, to);
  return s.replace(/\b[A-Ha-h](?:is|es|s)?-(?:Dur|Moll)\b/g, ' ') // keys: albums rarely carry them
    .replace(/\ben\s+(?:ut|do|ré|re|mi|fa|sol|la|si)(?:\s+(?:dièse|diese|bémol|bemol))?\s+(?:majeur|mineur)\b/gi, ' ')
    .split(',')[0] // "…, MWV N8", "…, Pastorale, op. 68": the work's name is enough
    .replace(/\s+(?:für|pour|per)\s.*$/i, '').replace(/\s+/g, ' ').replace(/[\s;:–-]+$/, '').trim();
}

// "Klavierkonzert Nr. 3 C-Dur op. 26" → "Piano Concerto No. 3": how Apple titles the work's tracks
// ("Piano Concerto No. 3 in C Major, Op. 26: I. …"), so a listed work finds them; null without a number.
export function englishNumbered(title) {
  const m = /^(.*?\b[A-Za-z]{3,}\s+No\.\s*\d+)\b/.exec(englishTitle(title));
  return m && m[1].trim().split(/\s+/).length >= 3 ? m[1].trim() : null;
}

// "String Symphony No. 8" → { kind: 'symphony', n: '8' } (compared with album titles)
export function workNumber(english) {
  const m = /([A-Za-z]+)\s+No\.\s*(\d+)/.exec(english || '');
  return m ? { kind: m[1].toLowerCase(), n: m[2] } : null;
}

// A listing whose title is the name of a work ("Die Zauberflöte", "Carmen", "La traviata"):
// used for opera and ballet listings that come without a programme.
// Words that may surround a work's name in a listing title without changing what is performed.
const FILLER = new Set(['oper', 'opera', 'operette', 'premiere', 'wiederaufnahme', 'neuinszenierung', 'neuproduktion', 'reprise',
  'konzertant', 'konzertante', 'version', 'concert', 'en', 'de', 'in', 'von', 'by', 'di', 'semi', 'staged', 'ballett', 'ballet',
  'derniere', 'letzte', 'vorstellung', 'auffuhrung', 'familienvorstellung', 'nouvelle', 'production', 'new', 'production']);
const SURNAMES = new Set(COMPOSER_KEYS.flatMap(([, s]) => s).concat(['strauss']));

const titleCache = new Map();
export function workFromTitle(title) {
  const key = String(title || '');
  if (!titleCache.has(key)) titleCache.set(key, findWorkFromTitle(key));
  return titleCache.get(key);
}

function findWorkFromTitle(title) {
  const full = plain(title);
  if (!full || EXCERPT.test(withoutAliases(full))) return null;
  let best = null;
  for (const info of infos().values()) {
    for (const a of info.aliases) {
      if (a.generic || !has(full, a.phrase)) continue;
      // the work's name must be most of the title ("Tosca", "Puccini: Tosca – Wiederaufnahme")
      const rest = ` ${full} `.replace(` ${a.phrase} `, ' ').trim().split(' ').filter((w) => w && !FILLER.has(w) && !SURNAMES.has(w)).join(' ');
      if (a.phrase.length < 0.6 * (a.phrase.length + rest.length)) continue;
      if (!ruleOk(info.rule, full, describe(title, info.w.composerId))) continue;
      if (!best || a.phrase.length > best.len) best = { w: info.w, len: a.phrase.length };
    }
  }
  return best ? best.w : null;
}

// ---------- import helpers ----------
function composersIn(text) {
  const t = normalize(text);
  return COMPOSERS.filter((c) => {
    const last = normalize(c.short.replace(/^[A-Z]\. /, '').replace(/ II$/, ''));
    return new RegExp(`\\b${reEsc(last)}\\b`).test(t);
  }).map((c) => ({ composerId: c.id }));
}

function toZurichISO(date) {
  const day = dayKeyOf(date);
  return `${day}T${timeOf(date.toISOString())}:00${zurichOffset(day)}`;
}

function finish(raw, fallbackId) {
  const text = [raw.title, raw.location, raw.description].filter(Boolean).join(' ');
  const cityId = raw.cityId || matchCity(raw.city || '') || null;
  const venue = raw.venueId ? VENUES.find((v) => v.id === raw.venueId) : matchVenue(raw.location || '', cityId);
  const finalCity = cityId || venue?.cityId || matchCity(raw.location || text);
  return {
    id: raw.id || fallbackId,
    title: raw.title || 'Untitled concert',
    series: raw.series || null,
    start: raw.start,
    durationMin: raw.durationMin || 120,
    cityId: finalCity || null,
    cityName: finalCity ? null : (raw.city || null),
    venueId: venue?.id || null,
    venueName: venue ? null : (raw.venueName || (raw.location || '').split(',')[0].trim() || null),
    type: raw.type || guessType(text),
    featured: !!raw.featured,
    status: raw.status || 'scheduled',
    source: raw.source || 'import',
    credits: raw.credits || [],
    program: raw.program?.length ? raw.program.map(matchProgramItem) : composersIn(text),
    notes: raw.notes || raw.description || null,
    ticketUrl: raw.ticketUrl || raw.url || null,
    url: raw.url || null,
  };
}

// ---------- .ics parsing ----------
function unfold(text) {
  return text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '').split('\n');
}

const unesc = (s) => s.replace(/\\n/gi, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\');

function parseDate(value, params) {
  const m = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
  if (!m) return null;
  const [, y, mo, d, hh = '19', mm = '30', , z] = m;
  const day = `${y}-${mo}-${d}`;
  if (z) return toZurichISO(new Date(Date.UTC(+y, +mo - 1, +d, +hh, +mm)));
  // TZID=… or floating time: treat as Swiss local time
  if (params.VALUE === 'DATE') return `${day}T19:30:00${zurichOffset(day)}`;
  return `${day}T${hh}:${mm}:00${zurichOffset(day)}`;
}

export function parseICS(text) {
  const out = [];
  let ev = null;
  for (const line of unfold(text)) {
    if (line === 'BEGIN:VEVENT') ev = {};
    else if (line === 'END:VEVENT') {
      if (ev?.start) out.push(finish(ev, `ics-${slug(ev.uid || `${ev.title}-${ev.start}`)}`));
      ev = null;
    } else if (ev) {
      const idx = line.indexOf(':');
      if (idx < 0) continue;
      const [name, ...paramParts] = line.slice(0, idx).split(';');
      const params = Object.fromEntries(paramParts.map((p) => p.split('=')));
      const value = line.slice(idx + 1);
      switch (name.toUpperCase()) {
        case 'UID': ev.uid = value; break;
        case 'SUMMARY': ev.title = unesc(value); break;
        case 'LOCATION': ev.location = unesc(value); break;
        case 'DESCRIPTION': ev.description = unesc(value); break;
        case 'URL': ev.url = value; break;
        case 'DTSTART': ev.start = parseDate(value, params); break;
        case 'DTEND': ev.end = parseDate(value, params); break;
        case 'STATUS': if (value.toUpperCase() === 'CANCELLED') ev.status = 'cancelled'; break;
        default: break;
      }
      if (ev.start && ev.end && !ev.durationMin) {
        const mins = Math.round((new Date(ev.end) - new Date(ev.start)) / 60000);
        if (mins > 0 && mins < 600) ev.durationMin = mins;
      }
    }
  }
  return out;
}

// ---------- JSON feed parsing (user imports) ----------
// Accepts an array, or { concerts: [...] }. Each item needs at least `title` and `start`
// (ISO 8601). Optional: city (name) or cityId, venueName or venueId, type, series,
// durationMin, credits [{role,name}], program [{composer,title}] or [{workId}], notes, ticketUrl.
export function parseFeed(json) {
  const data = typeof json === 'string' ? JSON.parse(json) : json;
  const list = Array.isArray(data) ? data : data.concerts;
  if (!Array.isArray(list)) throw new Error('Expected an array of concerts or { "concerts": [...] }');
  return list
    .filter((c) => c && c.title && c.start && !Number.isNaN(new Date(c.start).getTime()))
    .map((c, i) => finish({ ...c, location: c.location || [c.venueName, c.city].filter(Boolean).join(', '), start: toZurichISO(new Date(c.start)) }, `feed-${slug(`${c.title}-${c.start}-${i}`)}`));
}
