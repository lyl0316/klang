// iCalendar export (add concerts to your calendar, with reminders), import of listings from .ics
// calendars or JSON feeds, and the matching that turns a real listing into Klang's model:
//   matchCity(text)                 → city id ('zurich' for "Zürich", "Zurigo" …) or null
//   matchVenue(text, cityId?)       → known venue (js/data/venues.js) or null
//   matchComposer(name, title?)     → composer id ('tchaikovsky' for "Pjotr Iljitsch Tschaikowsky") or null
//   matchWork(composerId, title)    → work id ('beethoven-symphony-5' for "Sinfonie Nr. 5 c-Moll op. 67") or null
//   matchProgramItem({composer, title}) → { composer, title, composerId?, workId? }
//   workFromTitle(title)            → work whose title a whole listing carries ("Die Zauberflöte"), or null
//   guessType(text)                 → 'orchestral' | 'chamber' | 'recital' | 'vocal-opera' | 'mixed'

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

export function matchWork(composerId, title) {
  if (!composerId || !title) return null;
  const feed = describe(title, composerId);
  if (EXCERPT.test(withoutAliases(feed.plain, composerId))) return null;
  let best = null;
  let bestScore = 0;
  let tie = false;
  for (const info of infos().values()) {
    if (info.w.composerId !== composerId) continue;
    const s = scoreWork(info, feed);
    if (s > bestScore) { best = info.w; bestScore = s; tie = false; } else if (s && s === bestScore) tie = true;
  }
  return best && !tie ? best.id : null;
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
