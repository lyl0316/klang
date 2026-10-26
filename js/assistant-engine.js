// Klang Assistant engine — a fully local, rule-based stand-in for Sheng's AI assistant.
// Nothing is sent anywhere: the text is parsed with rules and answered from repo.js.
//
//   answer(text, { today, expect }) -> {
//     reply: string,                       // one friendly paragraph
//     items: [{ kind, id?, data? }],       // ≤ 8: 'concert' | 'composer' | 'work' | 'artist' | 'venue' | 'city' | 'recording'
//                                          //   recording: data = { term, label, workId?, composerId?, performer?, tempo? }
//                                          //   (the view runs music.searchAlbums(data.term))
//     followUps: string[],                 // suggestion chips; each is a prompt answer() understands
//     intent: 'concert' | 'work' | 'composer' | 'artist' | 'people' | 'recording' | 'code' | 'mine'
//             | 'feedback' | 'notes' | 'help' | 'thanks' | 'search' | 'unknown',
//     link?: { label, filters: { cityIds, types, day } },  // optional "Open in Concerts" (Concerts-tab filters)
//     feedback?: { kind, text },           // caller stores it with saveFeedback() — no network
//     expect?: 'feedback' }                // the next message should be taken as feedback
//
// Understands: dates (today, tonight, tomorrow, this/next weekend, this/next week, this/next month,
// in <month>, early/mid/late <month>, on <weekday>, on the 14th, 14 November, 14.11., next 10 days,
// Christmas, New Year, Easter, seasons), Swiss cities/cantons/regions (+ German/French/Italian names,
// "near X"), venues, composers (names, misspellings, epithets, "the Swiss composer"), works (titles,
// nicknames, catalogue numbers such as BWV 988 or Op. 77, "Mahler 2", "Beethoven's ninth"), forms,
// concert types, performers and roles, recordings ("Abbado's Mahler 2", "a slower Goldbergs"),
// concert codes (concert ids), feedback / suggestions (kept on this device).
//
// Also exported: saveFeedback(note), feedbackNotes(), parse(text, { today }) and prep(text) (for tests).

import * as repo from './repo.js';
import * as store from './store.js';
import { normalize, plural, storage, TYPE_LABELS } from './util.js';
import { todayKey, addDays, weekdayOf, relDayLabel, timeOf, yearOf } from './time.js';
import { BIOS } from './content/bios.js';

const MAX_ITEMS = 8;
const NOTES_KEY = 'klang.assistant.notes';

// ---------- text helpers ----------
export function prep(s) {
  const t = normalize(String(s || '').toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/ß/g, 'ss').replace(/ø/g, 'o'))
    .replace(/[’'`´]s\b/g, '')
    .replace(/[’'`´]/g, '')
    .replace(/&/g, ' and ')
    .replace(/#\s*(?=\d)/g, ' no ')
    .replace(/\b(bwv|hwv|kv|k|d|op|opp|hob|sz|wwv|no|nr|nos)\.?(?=\d)/g, '$1 ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\bkv\b/g, 'k')
    .replace(/\bnr\b/g, 'no')
    .replace(/\bnumber (?=\d)/g, 'no ')
    .replace(/\s+/g, ' ')
    .trim();
  return t;
}
const pad = (s) => ` ${s} `;
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const cap1 = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const uniq = (arr) => [...new Set(arr)];
const listJoin = (arr, word = 'and') =>
  arr.length <= 1 ? arr[0] || '' : `${arr.slice(0, -1).join(', ')} ${word} ${arr[arr.length - 1]}`;
const maxKey = (a, b) => (a > b ? a : b);
const ymd = (y, m0, d) => `${y}-${String(m0 + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const daysIn = (y, m0) => new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate();
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WD_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function take(ctx, key) {
  const p = pad(key);
  if (!ctx.rest.includes(p)) return false;
  while (ctx.rest.includes(p)) ctx.rest = ctx.rest.replace(p, ' | ');
  return true;
}
function takeRe(ctx, re) {
  const m = ctx.rest.match(re);
  if (!m) return null;
  ctx.rest = `${ctx.rest.slice(0, m.index)} | ${ctx.rest.slice(m.index + m[0].length)}`;
  return m;
}

// Small edit distance (optimal string alignment) with an early exit.
function distance(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const prev2 = new Array(b.length + 1).fill(0);
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    for (let j = 0; j <= b.length; j++) prev2[j] = prev[j];
    prev = cur;
  }
  return prev[b.length];
}

// ---------- vocabulary ----------
// Words that carry no search meaning (never reported as "unknown").
const STOP = new Set(`a an the any some all of in on at to for with by from and or nor me my mine i im id ive you your we us our
is are was were be been being am what whats which who whom whose where when how why show shows showing find finding search
look looking want wanna would like love please pls can could will shall should there theres here this that these those next
coming upcoming soon around near nearby about tell give get list good best great nice famous really something anything
everything lots more much many few one ones it its them they he she his her him do does did doing have has had see hear go
going goes attend attending out up maybe also just only still yet then than so very too not no yes ok okay hi hello hey
music musical concert concerts event events performance performances perform performed performing live stage ticket tickets
cheap cheaper cheapest affordable free price prices cost recording recordings record records recorded album albums version
versions cd cds listen listening play plays playing played piece pieces work works composer composers person people ensemble
ensembles artist artists performer performers musician musicians programme programmes program programs classical
switzerland swiss suisse schweiz svizzera ch venue venues hall halls city cities town towns place places date dates day days
week weeks month months year years time times evening evenings night nights morning afternoon today tonight tomorrow weekend
interpretation interpretations rendition renditions slower slow slowest faster fast fastest tempo tempi historic historical
recommend recommended recommendation recommendations suggest featuring feat including includes include without new old
latest recent full complete whole etc number op opus season seasons festival festivals happening happen on stage anywhere
everywhere somewhere elsewhere else other another again same also kind sort type types style genre genres sound sounds
called named name titled title who someone anyone thing things stuff way ways part parts bit lot lots little big small
which ones whats going on hear see watch catch visit visiting there between over under after before during till until within
via per each every if but because as such into onto upon off away back home online offline app klang sheng assistant let lets`.split(/\s+/).filter(Boolean));

const NUMWORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fourteen: 14, fifteen: 15, twenty: 20, thirty: 30, few: 3, couple: 2, a: 1 };
const ORDINALS = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10 };
const ORD_RE = Object.keys(ORDINALS).join('|');
const NUM_FORMS = ['brandenburg concerto', 'piano concerto', 'violin concerto', 'cello concerto', 'string quartet', 'piano sonata', 'piano trio', 'cello suite', 'symphony', 'symphonie', 'sinfonie', 'concerto', 'quartet', 'sonata', 'partita', 'trio'];
const NUM_FORM_RE = NUM_FORMS.join('|');

const COMPOSER_ALIASES = {
  bach: ['js bach', 'j s bach', 'johann sebastian', 'sebastian bach'],
  handel: ['haendel', 'hendel', 'georg friedrich handel'],
  vivaldi: ['red priest'],
  haydn: ['papa haydn', 'father of the symphony'],
  mozart: ['amadeus', 'wolfgang amadeus', 'mozzart'],
  beethoven: ['van beethoven', 'ludwig van'],
  mendelssohn: ['mendelssohn bartholdy', 'mendelsohn'],
  schumann: ['robert schumann', 'schuman'],
  chopin: ['szopen'],
  'johann-strauss': ['johann strauss', 'strauss ii', 'j strauss', 'waltz king', 'strauss son'],
  'richard-strauss': ['richard strauss', 'r strauss'],
  'saint-saens': ['saint saens', 'st saens', 'saintsaens'],
  tchaikovsky: ['tchaikovski', 'tschaikowsky', 'tschaikowski', 'tchaikowsky', 'chaikovsky', 'tchaikovksy', 'tschaikovsky'],
  dvorak: ['dvorjak', 'dvoraks'],
  rachmaninoff: ['rachmaninov', 'rachmaninow', 'rakhmaninov', 'rach'],
  shostakovich: ['shostakovitch', 'schostakowitsch', 'chostakovitch', 'shosty'],
  stravinsky: ['strawinsky', 'stravinski', 'strawinski'],
  bartok: ['bela bartok'],
  martin: ['frank martin'],
  bloch: ['ernest bloch'],
  honegger: ['arthur honegger'],
  part: ['arvo part', 'arvo', 'paert'],
  messiaen: ['olivier messiaen'],
  liszt: ['franz liszt'],
};
const NOT_A_SURNAME = new Set(['part', 'ii', 'strauss']);

// Nicknames and other names of works in the repertoire.
const WORK_ALIASES = {
  'bach-goldberg': ['goldbergs', 'goldberg', '30 variations', 'thirty variations', 'aria with 30 variations', 'goldberg variation'],
  'bach-st-matthew': ['matthew passion', 'st matthew', 'saint matthew passion', 'matthaus passion', 'matthauspassion', 'matthaeus passion'],
  'bach-christmas-oratorio': ['weihnachtsoratorium', 'oratorio de noel'],
  'bach-mass-b-minor': ['b minor mass', 'h moll messe'],
  'bach-cantata-140': ['wachet auf', 'sleepers wake'],
  'bach-cantata-147': ['jesu joy', 'jesu joy of mans desiring', 'herz und mund'],
  'bach-cello-suite-1': ['first cello suite'],
  'bach-partita-2': ['chaconne', 'ciaccona', 'd minor partita'],
  'bach-brandenburg-5': ['brandenburg', 'fifth brandenburg'],
  'handel-messiah': ['hallelujah chorus', 'hallelujah'],
  'vivaldi-four-seasons': ['four seasons', 'quattro stagioni', 'vier jahreszeiten', 'quatre saisons'],
  'haydn-creation': ['creation', 'schopfung', 'schoepfung'],
  'haydn-quartet-emperor': ['kaiserquartett'],
  'mozart-requiem': ['mozart requiem'],
  'mozart-magic-flute': ['magic flute', 'zauberflote', 'zauberfloete', 'flute enchantee'],
  'mozart-sonata-k331': ['alla turca', 'turkish march', 'rondo alla turca'],
  'mozart-piano-concerto-21': ['elvira madigan'],
  'beethoven-symphony-5': ['fate symphony', 'schicksalssinfonie'],
  'beethoven-symphony-9': ['ode to joy', 'choral symphony', 'an die freude', 'ode an die freude'],
  'beethoven-piano-concerto-5': ['emperor concerto'],
  'schubert-winterreise': ['winter journey', 'winterreise'],
  'schubert-trout': ['trout', 'forellenquintett', 'forelle'],
  'schubert-unfinished': ['unvollendete'],
  'schubert-string-quintet': ['schubert quintet', 'cello quintet'],
  'rossini-barber': ['barber of seville', 'barbiere', 'barbier von sevilla'],
  'mendelssohn-violin-concerto': ['mendelssohn concerto'],
  'chopin-ballades': ['ballades'],
  'chopin-preludes': ['raindrop prelude'],
  'verdi-traviata': ['traviata'],
  'verdi-requiem': ['verdi requiem'],
  'wagner-dutchman': ['flying dutchman', 'hollander'],
  'wagner-tristan-prelude': ['tristan', 'liebestod', 'tristan and isolde'],
  'jstrauss-blue-danube': ['blue danube', 'blaue donau', 'beautiful blue danube'],
  'jstrauss-fledermaus': ['fledermaus'],
  'brahms-requiem': ['german requiem', 'deutsches requiem'],
  'saint-saens-organ-symphony': ['orgelsinfonie'],
  'saint-saens-carnival': ['carnival of the animals', 'carnaval des animaux'],
  'tchaikovsky-pathetique': ['pathetique', 'pathetic symphony'],
  'tchaikovsky-onegin': ['onegin'],
  'tchaikovsky-souvenir': ['souvenir de florence'],
  'dvorak-new-world': ['new world', 'new world symphony', 'aus der neuen welt'],
  'grieg-piano-concerto': ['grieg concerto'],
  'puccini-boheme': ['boheme'],
  'mahler-symphony-2': ['resurrection', 'auferstehung', 'resurrection symphony'],
  'mahler-symphony-5': ['adagietto'],
  'mahler-lied-von-der-erde': ['song of the earth'],
  'debussy-la-mer': ['la mer'],
  'debussy-faune': ['faune', 'faun', 'afternoon of a faun', 'apres midi dun faune', 'prelude to the afternoon of a faun'],
  'rstrauss-four-last-songs': ['four last songs', 'last songs'],
  'rstrauss-zarathustra': ['zarathustra', 'space odyssey'],
  'rstrauss-rosenkavalier': ['knight of the rose'],
  'rachmaninoff-piano-concerto-2': ['rach 2', 'rach two'],
  'ravel-bolero': ['bolero'],
  'ravel-gaspard': ['gaspard', 'scarbo'],
  'stravinsky-rite': ['rite of spring', 'sacre', 'le sacre', 'fruhlingsopfer'],
  'stravinsky-firebird': ['firebird', 'oiseau de feu', 'feuervogel'],
  'martin-petite-symphonie': ['petite symphonie'],
  'honegger-pacific-231': ['pacific'],
  'honegger-symphony-3': ['symphonie liturgique'],
  'messiaen-quartet': ['quartet for the end of time', 'end of time', 'fin du temps'],
  'part-spiegel': ['spiegel'],
  'mendelssohn-octet': ['mendelssohn octet'],
};
const AMBIG_NICK = new Set(['london', 'italian', 'organ', 'emperor', 'american']);

// Well-known works that are not (yet) in Klang's repertoire: answered with the composer + recordings.
const MISSING = [
  { keys: ['eroica'], composerId: 'beethoven', title: 'Symphony No. 3 “Eroica”', term: 'Beethoven Symphony No. 3 Eroica' },
  { keys: ['pastoral symphony', 'pastorale', 'pastoral'], composerId: 'beethoven', title: 'Symphony No. 6 “Pastoral”', term: 'Beethoven Symphony No. 6 Pastoral' },
  { keys: ['moonlight sonata', 'moonlight', 'mondscheinsonate'], composerId: 'beethoven', title: 'Piano Sonata No. 14 “Moonlight”', term: 'Beethoven Moonlight Sonata' },
  { keys: ['kreutzer sonata', 'kreutzer'], composerId: 'beethoven', title: 'Violin Sonata No. 9 “Kreutzer”', term: 'Beethoven Kreutzer Sonata' },
  { keys: ['fur elise'], composerId: 'beethoven', title: 'Für Elise', term: 'Beethoven Für Elise' },
  { keys: ['big hammer', 'hammer blows', 'hammer blow', 'hammer', 'tragic symphony', 'tragische'], composerId: 'mahler', title: 'Symphony No. 6 “Tragic”', term: 'Mahler Symphony No. 6', note: 'the one with the hammer blows' },
  { keys: ['titan'], composerId: 'mahler', title: 'Symphony No. 1 “Titan”', term: 'Mahler Symphony No. 1 Titan' },
  { keys: ['death and the maiden', 'der tod und das madchen'], composerId: 'schubert', title: 'String Quartet No. 14 “Death and the Maiden”', term: 'Schubert Death and the Maiden' },
  { keys: ['great c major'], composerId: 'schubert', title: 'Symphony No. 9 “The Great”', term: 'Schubert Symphony No. 9 Great' },
  { keys: ['nutcracker'], composerId: 'tchaikovsky', title: 'The Nutcracker', term: 'Tchaikovsky Nutcracker' },
  { keys: ['swan lake'], composerId: 'tchaikovsky', title: 'Swan Lake', term: 'Tchaikovsky Swan Lake' },
  { keys: ['well tempered clavier', 'well tempered', 'wohltemperierte klavier'], composerId: 'bach', title: 'The Well-Tempered Clavier', term: 'Bach Well-Tempered Clavier' },
  { keys: ['art of fugue', 'kunst der fuge'], composerId: 'bach', title: 'The Art of Fugue', term: 'Bach Art of Fugue' },
  { keys: ['eine kleine nachtmusik', 'kleine nachtmusik'], composerId: 'mozart', title: 'Eine kleine Nachtmusik', term: 'Mozart Eine kleine Nachtmusik' },
  { keys: ['marriage of figaro', 'nozze di figaro', 'figaro'], composerId: 'mozart', title: 'Le nozze di Figaro', term: 'Mozart Le nozze di Figaro' },
  { keys: ['aida'], composerId: 'verdi', title: 'Aida', term: 'Verdi Aida' },
  { keys: ['rigoletto'], composerId: 'verdi', title: 'Rigoletto', term: 'Verdi Rigoletto' },
  { keys: ['ring cycle', 'ring des nibelungen', 'walkure', 'walkuere', 'valkyrie', 'valkyries'], composerId: 'wagner', title: 'Der Ring des Nibelungen', term: 'Wagner Ring des Nibelungen' },
  { keys: ['madama butterfly'], composerId: 'puccini', title: 'Madama Butterfly', term: 'Puccini Madama Butterfly' },
  { keys: ['turandot', 'nessun dorma'], composerId: 'puccini', title: 'Turandot', term: 'Puccini Turandot' },
  { keys: ['clair de lune'], composerId: 'debussy', title: 'Clair de lune (Suite bergamasque)', term: 'Debussy Clair de lune' },
  { keys: ['hungarian dances', 'hungarian dance'], composerId: 'brahms', title: 'Hungarian Dances', term: 'Brahms Hungarian Dances' },
  { keys: ['peer gynt'], composerId: 'grieg', title: 'Peer Gynt', term: 'Grieg Peer Gynt' },
  { keys: ['finlandia'], composerId: 'sibelius', title: 'Finlandia', term: 'Sibelius Finlandia' },
  { keys: ['leningrad'], composerId: 'shostakovich', title: 'Symphony No. 7 “Leningrad”', term: 'Shostakovich Symphony No. 7 Leningrad' },
  { keys: ['roi david', 'king david'], composerId: 'honegger', title: 'Le Roi David', term: 'Honegger Le Roi David' },
  { keys: ['jeanne darc au bucher', 'joan of arc at the stake'], composerId: 'honegger', title: 'Jeanne d’Arc au bûcher', term: 'Honegger Jeanne d’Arc au bûcher' },
  { keys: ['carmina burana'], composerName: 'Carl Orff', title: 'Carmina Burana', term: 'Orff Carmina Burana' },
  { keys: ['the planets'], composerName: 'Gustav Holst', title: 'The Planets', term: 'Holst The Planets' },
  { keys: ['enigma variations'], composerName: 'Edward Elgar', title: 'Enigma Variations', term: 'Elgar Enigma Variations' },
];

const VENUE_ALIASES = {
  'tonhalle-zurich': ['tonhalle', 'tonhalle zurich', 'tonhalle zuerich', 'grosse tonhalle'],
  'tonhalle-zurich-kleiner-saal': ['tonhalle', 'kleiner saal', 'tonhalle kleiner saal'],
  'opernhaus-zurich': ['opernhaus', 'opernhaus zurich', 'zurich opera', 'zurich opera house', 'opera zurich', 'opera house zurich'],
  'fraumunster-zurich': ['fraumunster', 'fraumuenster'],
  'grossmunster-zurich': ['grossmunster', 'grossmuenster'],
  'st-peter-zurich': ['st peter', 'st peter zurich'],
  'victoria-hall': ['victoria hall'],
  'grand-theatre-geneve': ['grand theatre', 'grand theatre de geneve', 'geneva opera', 'opera de geneve'],
  'bfm-geneve': ['bfm', 'batiment des forces motrices'],
  'conservatoire-geneve': ['conservatoire de geneve', 'geneva conservatory'],
  'cathedrale-saint-pierre-geneve': ['cathedrale saint pierre', 'st pierre cathedral'],
  'stadtcasino-basel': ['stadtcasino', 'stadtcasino basel', 'casino basel'],
  'theater-basel': ['theater basel'],
  'basler-munster': ['basler munster', 'basel minster', 'munster basel'],
  'martinskirche-basel': ['martinskirche'],
  'gare-du-nord-basel': ['gare du nord'],
  'stadthaus-winterthur': ['stadthaus', 'stadthaus winterthur'],
  'casino-bern': ['casino bern'],
  'stadttheater-bern': ['stadttheater bern', 'buhnen bern', 'buehnen bern'],
  'berner-munster': ['berner munster', 'bern minster', 'munster bern'],
  'yehudi-menuhin-forum': ['menuhin forum', 'yehudi menuhin forum'],
  'kkl-luzern': ['kkl', 'kkl luzern', 'kkl lucerne'],
  'luzerner-theater': ['luzerner theater', 'lucerne theatre'],
  'hofkirche-luzern': ['hofkirche'],
  'salle-metropole': ['metropole', 'salle metropole'],
  'opera-de-lausanne': ['opera de lausanne', 'lausanne opera'],
  'salle-paderewski': ['paderewski', 'salle paderewski'],
  'tonhalle-st-gallen': ['tonhalle st gallen'],
  'theater-st-gallen': ['theater st gallen'],
  'lac-lugano': ['lac lugano', 'lugano arte e cultura'],
  'equilibre-fribourg': ['equilibre'],
  'sudpol-kriens': ['sudpol', 'suedpol'],
  'auditorium-stravinski': ['auditorium stravinski', 'stravinski auditorium'],
  'salle-des-combins': ['combins', 'salle des combins'],
  'festival-zelt-gstaad': ['festival zelt'],
};

const CITY_ALIASES = {
  zurich: ['zuerich', 'zurigo'],
  geneva: ['geneve', 'genf', 'ginevra'],
  basel: ['bale', 'basle', 'basilea'],
  bern: ['berne', 'berna'],
  lucerne: ['luzern', 'lucerna'],
  lausanne: ['losanna'],
  'st-gallen': ['sankt gallen', 'saint gall', 'st gall', 'san gallo'],
  fribourg: ['freiburg'],
  sion: ['sitten'],
  neuchatel: ['neuenburg'],
  chur: ['coira', 'coire'],
  schaffhausen: ['schaffhouse', 'sciaffusa'],
  'la-chaux-de-fonds': ['chaux de fonds'],
  'saint-maurice': ['st maurice'],
  porrentruy: ['pruntrut'],
  winterthur: ['winti'],
};
const CANTON_ALIASES = {
  VD: ['waadt'], VS: ['wallis'], TI: ['tessin'], GR: ['graubuenden', 'grisons', 'grigioni'], AG: ['argovie'],
  TG: ['thurgovie'], SO: ['soleure'], AR: ['appenzell'], BL: ['baselland', 'basel land'], JU: [],
};
const REGIONS = [
  { keys: ['romandie', 'romandy', 'suisse romande', 'french speaking switzerland', 'french part of switzerland', 'western switzerland', 'westschweiz'], label: 'Romandie', cantons: ['GE', 'VD', 'NE', 'JU', 'VS', 'FR'] },
  { keys: ['italian speaking switzerland', 'svizzera italiana'], label: 'Italian-speaking Switzerland', cantons: ['TI'] },
  { keys: ['lake geneva', 'lac leman', 'lake geneva region', 'arc lemanique'], label: 'the Lake Geneva region', cantons: ['GE', 'VD'] },
  { keys: ['central switzerland', 'zentralschweiz'], label: 'Central Switzerland', cantons: ['LU', 'ZG', 'OW', 'SZ'] },
  { keys: ['eastern switzerland', 'ostschweiz'], label: 'Eastern Switzerland', cantons: ['SG', 'AR', 'TG', 'GR', 'GL', 'SH'] },
  { keys: ['german speaking switzerland', 'deutschschweiz'], label: 'German-speaking Switzerland', cantons: ['ZH', 'BE', 'BS', 'BL', 'AG', 'LU', 'ZG', 'OW', 'SZ', 'SG', 'AR', 'TG', 'GR', 'GL', 'SH', 'SO'] },
];

// Concert types (TYPE_LABELS keys). Some phrases also imply a role or a form.
const TYPE_PHRASES = [
  { keys: ['chamber music', 'chamber concert', 'chamber concerts', 'chamber', 'kammermusik', 'musique de chambre'], type: 'chamber' },
  { keys: ['piano recital', 'piano recitals'], type: 'recital', role: 'piano' },
  { keys: ['song recital', 'song recitals', 'liederabend', 'lieder recital'], type: 'recital', form: 'songs' },
  { keys: ['solo recital', 'solo recitals', 'recital', 'recitals', 'rezital', 'recitals'], type: 'recital' },
  { keys: ['orchestral', 'orchestra', 'orchestras', 'symphonic', 'symphony concert', 'symphony concerts', 'sinfoniekonzert', 'orchestral music'], type: 'orchestral' },
  { keys: ['vocal', 'choral', 'choral music', 'vocal music', 'vocal opera', 'opera and vocal'], type: 'vocal-opera' },
  { keys: ['mixed programme', 'mixed program', 'mixed'], type: 'mixed' },
];
const TYPE_NOUN = {
  recital: ['recital', 'recitals'],
  chamber: ['chamber concert', 'chamber concerts'],
  orchestral: ['orchestral concert', 'orchestral concerts'],
  'vocal-opera': ['vocal or opera performance', 'vocal and opera performances'],
  mixed: ['mixed programme', 'mixed programmes'],
};
const TYPE_PROMPT = { recital: 'Recitals', chamber: 'Chamber music', orchestral: 'Orchestral concerts', 'vocal-opera': 'Vocal and opera', mixed: 'Mixed programmes' };

// Forms: filters on the works in a programme.
const FORMS = [
  { id: 'violin-concerto', keys: ['violin concertos', 'violin concerto'], label: 'violin concertos', prompt: 'Violin concertos', test: (w) => /Violin Concerto/.test(w.title) },
  { id: 'piano-concerto', keys: ['piano concertos', 'piano concerto'], label: 'piano concertos', prompt: 'Piano concertos', test: (w) => /Piano Concerto/.test(w.title) },
  { id: 'cello-concerto', keys: ['cello concertos', 'cello concerto'], label: 'cello concertos', prompt: 'Cello concertos', test: (w) => /Cello Concerto/.test(w.title) || w.id === 'bloch-schelomo' },
  { id: 'clarinet', keys: ['clarinet concerto', 'clarinet quintet'], label: 'clarinet works', prompt: 'Clarinet works', test: (w) => /Clarinet/.test(w.title) },
  { id: 'concerto', keys: ['concertos', 'concerto', 'concerti'], label: 'concertos', prompt: 'Concertos', test: (w) => w.genre === 'concerto' },
  { id: 'symphony', keys: ['symphonies', 'symphony', 'sinfonie', 'symphonie'], label: 'symphonies', prompt: 'Symphonies', test: (w) => w.genre === 'symphony' },
  { id: 'quartet', keys: ['string quartets', 'string quartet', 'quartets', 'quartet', 'streichquartett'], label: 'string quartets', prompt: 'String quartets', test: (w) => /Quartet|Quatuor/.test(w.title) },
  { id: 'trio', keys: ['piano trios', 'piano trio', 'trios', 'trio'], label: 'piano trios', prompt: 'Piano trios', test: (w) => /Trio/.test(w.title) },
  { id: 'quintet', keys: ['quintets', 'quintet', 'string quintet', 'piano quintet'], label: 'quintets', prompt: 'Quintets', test: (w) => /Quintet/.test(w.title) },
  { id: 'octet', keys: ['octet', 'octets'], label: 'an octet', prompt: 'Octets', test: (w) => /Octet/.test(w.title) },
  { id: 'sonata', keys: ['piano sonatas', 'piano sonata', 'sonatas', 'sonata'], label: 'sonatas', prompt: 'Sonatas', test: (w) => /Sonata/.test(w.title) },
  { id: 'requiem', keys: ['requiems', 'requiem'], label: 'a requiem', prompt: 'Requiems', test: (w) => /Requiem/.test(w.title) },
  { id: 'opera', keys: ['operas', 'opera', 'operetta', 'operettas', 'oper'], label: 'opera', prompt: 'Opera', noun: ['opera performance', 'opera performances'], test: (w) => !!w.opera },
  { id: 'oratorio', keys: ['oratorios', 'oratorio', 'passions', 'passion'], label: 'an oratorio or Passion', prompt: 'Oratorios', test: (w) => /Oratorio|Passion|Messiah|Schöpfung|In terra pax/.test(w.title) },
  { id: 'cantata', keys: ['cantatas', 'cantata', 'kantate', 'kantaten'], label: 'cantatas', prompt: 'Cantatas', test: (w) => /Cantata/.test(w.title) },
  { id: 'mass', keys: ['masses', 'mass', 'messe'], label: 'a Mass', prompt: 'Masses', test: (w) => /Mass in|Messa/.test(w.title) },
  { id: 'songs', keys: ['lieder', 'song cycle', 'song cycles', 'songs', 'art song', 'art songs'], label: 'songs', prompt: 'Song recitals', test: (w) => w.genre === 'song' },
  { id: 'sacred', keys: ['sacred music', 'sacred', 'church music'], label: 'sacred music', prompt: 'Sacred music', test: (w) => w.genre === 'sacred' },
  { id: 'piano', keys: ['solo piano', 'piano music', 'piano works', 'piano pieces'], label: 'solo piano music', prompt: 'Solo piano', test: (w) => w.genre === 'piano' },
  { id: 'solo', keys: ['solo violin', 'solo cello', 'unaccompanied'], label: 'solo string works', prompt: 'Solo Bach', test: (w) => w.genre === 'solo' },
  { id: 'ballet', keys: ['ballet', 'ballets', 'ballet music'], label: 'ballet music', prompt: 'Ballet music', test: (w) => w.id === 'stravinsky-rite' || w.id === 'stravinsky-firebird' },
  { id: 'variations', keys: ['variations'], label: 'variations', prompt: 'Variations', test: (w) => /Variations/.test(w.title) },
  { id: 'preludes', keys: ['preludes', 'prelude'], label: 'preludes', prompt: 'Preludes', test: (w) => /Prelude|Prélude/.test(w.title) },
];

const VOICES = ['Soprano', 'Mezzo-soprano', 'Alto', 'Tenor', 'Baritone', 'Bass'];
const ROLES = [
  { keys: ['pianists', 'pianist'], label: 'a pianist', noun: 'pianist', roles: ['Piano'] },
  { keys: ['violinists', 'violinist', 'fiddler'], label: 'a violinist', noun: 'violinist', roles: ['Violin'] },
  { keys: ['cellists', 'cellist', 'violoncellist'], label: 'a cellist', noun: 'cellist', roles: ['Cello'] },
  { keys: ['violists', 'violist', 'viola player'], label: 'a violist', noun: 'violist', roles: ['Viola'] },
  { keys: ['clarinettists', 'clarinettist', 'clarinetists', 'clarinetist'], label: 'a clarinettist', noun: 'clarinettist', roles: ['Clarinet'] },
  { keys: ['flautists', 'flautist', 'flutists', 'flutist'], label: 'a flautist', noun: 'flautist', roles: ['Flute'] },
  { keys: ['oboists', 'oboist'], label: 'an oboist', noun: 'oboist', roles: ['Oboe'] },
  { keys: ['horn players', 'horn player', 'hornist'], label: 'a horn player', noun: 'horn player', roles: ['Horn'] },
  { keys: ['harpsichordists', 'harpsichordist'], label: 'a harpsichordist', noun: 'harpsichordist', roles: ['Harpsichord'] },
  { keys: ['conductors', 'conductor', 'maestro'], label: 'a conductor', noun: 'conductor', roles: ['Conductor'] },
  { keys: ['mezzo sopranos', 'mezzo soprano', 'mezzos', 'mezzo'], label: 'a mezzo-soprano', noun: 'mezzo-soprano', roles: ['Mezzo-soprano'] },
  { keys: ['sopranos', 'soprano'], label: 'a soprano', noun: 'soprano', roles: ['Soprano'] },
  { keys: ['altos', 'alto', 'contralto'], label: 'an alto', noun: 'alto', roles: ['Alto'] },
  { keys: ['tenors', 'tenor'], label: 'a tenor', noun: 'tenor', roles: ['Tenor'] },
  { keys: ['baritones', 'baritone'], label: 'a baritone', noun: 'baritone', roles: ['Baritone'] },
  { keys: ['bass singer', 'basses'], label: 'a bass', noun: 'bass', roles: ['Bass'] },
  { keys: ['singers', 'singer', 'vocalists', 'vocalist'], label: 'a singer', noun: 'singer', roles: VOICES },
  { keys: ['choirs', 'choir', 'chorus', 'choeur', 'chor'], label: 'a choir', noun: 'choir', roles: ['Choir'] },
  { keys: ['piano'], label: 'piano', noun: 'pianist', roles: ['Piano'], instrument: true },
  { keys: ['violin'], label: 'violin', noun: 'violinist', roles: ['Violin'], instrument: true },
  { keys: ['cello'], label: 'cello', noun: 'cellist', roles: ['Cello'], instrument: true },
  { keys: ['viola'], label: 'viola', noun: 'violist', roles: ['Viola'], instrument: true },
  { keys: ['clarinet'], label: 'clarinet', noun: 'clarinettist', roles: ['Clarinet'], instrument: true },
  { keys: ['flute'], label: 'flute', noun: 'flautist', roles: ['Flute'], instrument: true },
  { keys: ['oboe'], label: 'oboe', noun: 'oboist', roles: ['Oboe'], instrument: true },
  { keys: ['harpsichord'], label: 'harpsichord', noun: 'harpsichordist', roles: ['Harpsichord'], instrument: true },
];

const DAYPARTS = [
  { id: 'lunch', keys: ['lunchtime concerts', 'lunchtime concert', 'lunch concerts', 'lunch concert', 'lunchtime', 'lunch', 'midday', 'noon'], label: 'at lunchtime', test: (t) => t >= '11:30' && t <= '14:00' },
  { id: 'matinee', keys: ['matinees', 'matinee'], label: 'as matinées', test: (t) => t < '17:00' },
  { id: 'evening', keys: ['evenings', 'evening', 'nights', 'night'], label: 'in the evening', test: (t) => t >= '17:00' },
  { id: 'afternoon', keys: ['afternoons', 'afternoon'], label: 'in the afternoon', test: (t) => t >= '12:00' && t < '18:00' },
  { id: 'morning', keys: ['mornings', 'morning'], label: 'in the morning', test: (t) => t < '12:00' },
];
const DAYPART_BY_ID = Object.fromEntries(DAYPARTS.map((d) => [d.id, d]));

const PERIODS = [
  { keys: ['baroque', 'barock'], label: 'Baroque', test: (c) => c.born < 1700 },
  { keys: ['classical era', 'classical period', 'viennese classics', 'viennese classical', 'wiener klassik'], label: 'Classical-era', test: (c) => c.born >= 1730 && c.born <= 1775 },
  { keys: ['romantic', 'romantics', 'romanticism', 'romantik'], label: 'Romantic', test: (c) => c.born >= 1790 && c.born <= 1865 },
  { keys: ['20th century', 'twentieth century', 'modernist', 'modern', 'contemporary', 'new music'], label: '20th-century', test: (c) => c.born >= 1875 },
];
const NATIONS = {
  swiss: ['Switzerland', 'Swiss'], french: ['France', 'French'], german: ['Germany', 'German'], austrian: ['Austria', 'Austrian'],
  italian: ['Italy', 'Italian'], russian: ['Russia', 'Russian'], czech: ['Czech', 'Czech'], norwegian: ['Norway', 'Norwegian'],
  finnish: ['Finland', 'Finnish'], hungarian: ['Hungary', 'Hungarian'], polish: ['Poland', 'Polish'], estonian: ['Estonia', 'Estonian'],
  english: ['England', 'English'], british: ['England', 'British'], american: ['USA', 'American'],
};
const COUNTRY_WORDS = { switzerland: 'swiss', france: 'french', germany: 'german', austria: 'austrian', italy: 'italian', russia: 'russian', norway: 'norwegian', finland: 'finnish', hungary: 'hungarian', poland: 'polish', estonia: 'estonian', england: 'english' };

const ENSEMBLE_GENERIC = new Set(['philharmonic', 'sinfonietta', 'chamber', 'orchestra', 'symphony', 'youth', 'valley', 'quartet',
  'quartetto', 'quatuor', 'trio', 'vokalensemble', 'ensemble', 'choeur', 'chor', 'coro', 'kammerchor', 'cantus', 'collegium',
  'capella', 'baroque', 'monte', 'rhine', 'lemanique']);

const MONTH_WORDS = {
  january: 0, jan: 0, januar: 0, janvier: 0, february: 1, feb: 1, februar: 1, fevrier: 1, march: 2, mar: 2, marz: 2, maerz: 2, mars: 2,
  april: 3, apr: 3, avril: 3, may: 4, mai: 4, june: 5, jun: 5, juni: 5, juin: 5, july: 6, jul: 6, juli: 6, juillet: 6,
  august: 7, aug: 7, aout: 7, september: 8, sep: 8, sept: 8, septembre: 8, october: 9, oct: 9, oktober: 9, octobre: 9,
  november: 10, nov: 10, novembre: 10, december: 11, dec: 11, dezember: 11, decembre: 11,
};
const AMBIG_MONTH = new Set(['may', 'march', 'mar', 'jan', 'mars']);
const MONTH_RE = Object.keys(MONTH_WORDS).sort((a, b) => b.length - a.length).join('|');
const WD_WORDS = { monday: 1, mon: 1, tuesday: 2, tues: 2, tue: 2, wednesday: 3, wed: 3, thursday: 4, thurs: 4, thur: 4, thu: 4, friday: 5, fri: 5, saturday: 6, sat: 6, sunday: 0 };
const WD_RE = Object.keys(WD_WORDS).sort((a, b) => b.length - a.length).join('|');

// ---------- cue words ----------
const RE_RECORDING = / (recordings?|recorded|records?|albums?|cds?|discography|versions?|interpretations?|renditions?|listen to|listen|streaming|stream|apple music|spotify|slower|slowest|faster|fastest|historic|historical|period instruments?|best recording|reference recording) /;
const RE_LIVE = / (live|concerts?|events?|gigs?|tonight|tickets?|on stage|performances?|performed|performing|perform|what on|whats on|happening|going on|programmes?|programs?|festivals?|where can i (?:see|hear)|calendar|agenda|schedule) /;
const RE_RECORDING_STRONG = / (recordings?|recorded|albums?|cds?|discography|apple music|spotify) /;
const RE_TEMPO = / (slower|slowest|slow|faster|fastest|fast|tempo|tempi|brisk|broad) /;
const RE_FEATURED = / (featured|highlights?|must see|must hear|top picks?|editors? picks?|recommended|recommendations?) /;
const RE_NEAR = / (near|around|close to|nearby|surroundings of|area of|region of) /;
const RE_HELP = /^(help|what can you do|how does this work|how do you work|what do you do|who are you|what are you|examples?|\?+)$/;
const RE_HELLO = /^(hi|hello|hey|hallo|gruezi|gruetzi|salut|bonjour|ciao|servus|good (morning|afternoon|evening)|moin)( there)?$/;
const RE_THANKS = /^(thanks?|thank you|thx|merci|danke|grazie|cheers|great|perfect|nice|cool|ok|okay|super)( (so much|very much|a lot))?$/;
const RE_FEEDBACK = /^(feedback|bug report|bug|feature request|propose|proposal|please add|could you add|can you add|would you add|add (?:a |the |new )?(?:city|venue|hall|festival|church)|missing (?:city|venue)|you should|it would be (?:nice|great|good)|i wish|claim)\b/;
const RE_FEEDBACK_RAW = /^\s*(?:suggestions?|ideas?|requests?|issues?|problems?)\s*[:\-–—]/i;
const RE_FEEDBACK_ANY = /\b(propose|suggest|add) (?:a |the |new )?(?:city|venue|concert hall|hall|festival)\b/;
const RE_NOTES = /^(?:show (?:me )?)?(?:my (?:notes|feedback|suggestions|saved notes|feedback notes)|notes)$/;
const RE_MINE = / (my concerts|my plans|my calendar|my saved|my bookmarks|my tickets|my list|my agenda|saved concerts|concerts i saved|what am i going to|what im going to|concerts im going to|concerts i am going to|am i going to) /;

// ---------- indexes ----------
let STATIC = null;
function addKey(map, key, value) {
  const k = prep(key);
  if (!k || k.length < 2) return;
  if (!map.has(k)) map.set(k, new Set());
  map.get(k).add(value);
}
const sortedKeys = (map) => [...map.keys()].sort((a, b) => b.length - a.length || a.localeCompare(b));
const ARTICLE_RE = /^(the|a|an|la|le|les|il|der|die|das|ein|eine|l) /;

function buildStatic() {
  const formKeys = new Set();
  for (const f of FORMS) f.keys.forEach((k) => formKeys.add(prep(k)));
  for (const t of TYPE_PHRASES) t.keys.forEach((k) => formKeys.add(prep(k)));

  // composers
  const composers = new Map();
  for (const c of repo.allComposers()) {
    const full = prep(c.name);
    const keys = [full, prep(c.short), ...(COMPOSER_ALIASES[c.id] || []).map(prep)];
    const last = full.split(' ').pop();
    if (!NOT_A_SURNAME.has(last)) keys.push(last);
    for (const k of keys) {
      if (!k || k === 'part' || k === 'ii') continue;
      addKey(composers, k, c.id);
      if (!k.includes(' ') && !k.endsWith('s')) addKey(composers, `${k}s`, c.id); // "Mahlers 2", "Bachs"
    }
  }
  addKey(composers, 'strauss', 'johann-strauss');
  addKey(composers, 'strauss', 'richard-strauss');

  // works (+ missing works)
  const works = new Map();
  const missing = new Map();
  for (const w of repo.allWorks()) {
    const comp = repo.composer(w.composerId);
    const add = (k) => {
      const p = prep(k);
      for (const v of [p, p.replace(ARTICLE_RE, '')]) {
        if (v.length >= 4 && !formKeys.has(v) && !STOP.has(v)) addKey(works, v, w.id);
      }
    };
    add(w.title);
    add(w.title.split(/[“”"(,:–]/)[0]);
    const paren = w.title.match(/\(([^)]+)\)/);
    if (paren && !/^\d+$/.test(paren[1].trim())) add(paren[1]);
    const nick = w.title.match(/“([^”]+)”/);
    if (nick) {
      const n = prep(nick[1]);
      const formWord = (prep(w.title).match(/\b(symphony|quartet|concerto|trio|quintet|sonata)\b/) || [])[1];
      if (formWord) addKey(works, `${n} ${formWord}`, w.id);
      if (comp) addKey(works, `${prep(comp.short)} ${n}`, w.id);
      if (!AMBIG_NICK.has(n)) add(nick[1]);
    }
    for (const a of WORK_ALIASES[w.id] || []) addKey(works, a, w.id);
  }
  MISSING.forEach((m, i) => m.keys.forEach((k) => addKey(missing, k, i)));
  const catalogs = repo.allWorks().filter((w) => w.catalog).map((w) => ({ key: prep(w.catalog), w }));

  // places
  const cities = new Map();
  for (const c of repo.allCities()) {
    addKey(cities, c.name, c.id);
    for (const a of CITY_ALIASES[c.id] || []) addKey(cities, a, c.id);
  }
  const cantons = new Map();
  const cityKeys = new Set(cities.keys());
  const cantonCodes = uniq(repo.allCities().map((c) => c.canton));
  for (const code of uniq([...cantonCodes, ...Object.keys(CANTON_ALIASES)])) {
    const name = prep(repo.cantonName(code));
    if (!name) continue;
    for (const k of [`canton of ${name}`, `canton ${name}`, `kanton ${name}`, `${name} canton`, `canton de ${name}`]) addKey(cantons, k, code);
    if (!cityKeys.has(name)) addKey(cantons, name, code);
    for (const a of CANTON_ALIASES[code] || []) addKey(cantons, a, code);
  }
  const regions = new Map();
  REGIONS.forEach((r, i) => r.keys.forEach((k) => addKey(regions, k, i)));

  // single phrase tables
  const typeKeys = new Map();
  TYPE_PHRASES.forEach((t, i) => t.keys.forEach((k) => addKey(typeKeys, k, i)));
  const formMap = new Map();
  FORMS.forEach((f, i) => f.keys.forEach((k) => addKey(formMap, k, i)));
  const roleMap = new Map();
  ROLES.forEach((r, i) => r.keys.forEach((k) => addKey(roleMap, k, i)));
  const daypartMap = new Map();
  DAYPARTS.forEach((d, i) => d.keys.forEach((k) => addKey(daypartMap, k, i)));
  const periodMap = new Map();
  PERIODS.forEach((p, i) => p.keys.forEach((k) => addKey(periodMap, k, i)));

  // fuzzy vocabulary: single words ≥ 5 letters -> what they stand for
  const fuzzy = new Map();
  const addFuzzy = (word, entry) => {
    if (word.length < 5 || word.includes(' ') || STOP.has(word)) return;
    if (!fuzzy.has(word)) fuzzy.set(word, entry);
  };
  for (const [k, ids] of composers) addFuzzy(k, { kind: 'composer', ids: [...ids] });
  for (const [k, ids] of works) addFuzzy(k, { kind: 'work', ids: [...ids] });
  for (const [k, ids] of cities) addFuzzy(k, { kind: 'city', ids: [...ids] });
  for (const [k, codes] of cantons) addFuzzy(k, { kind: 'canton', ids: [...codes] });
  for (const [k, idx] of typeKeys) addFuzzy(k, { kind: 'type', ids: [...idx] });
  for (const [k, idx] of formMap) addFuzzy(k, { kind: 'form', ids: [...idx] });

  return {
    composers, composerKeys: sortedKeys(composers),
    works, workKeys: sortedKeys(works), missing, missingKeys: sortedKeys(missing), catalogs,
    cities, cityKeys: sortedKeys(cities), cantons, cantonKeys: sortedKeys(cantons), regions, regionKeys: sortedKeys(regions),
    typeKeys, typeKeyList: sortedKeys(typeKeys), formMap, formKeys: sortedKeys(formMap), roleMap, roleKeys: sortedKeys(roleMap),
    daypartMap, daypartKeys: sortedKeys(daypartMap), periodMap, periodKeys: sortedKeys(periodMap), fuzzy,
  };
}
const S = () => STATIC || (STATIC = buildStatic());

// Venues and performers change with imports / the demo switch, so they are indexed per question.
function dynamicIndex() {
  const venues = new Map();
  for (const v of repo.allVenues()) addKey(venues, v.name, v.id);
  for (const [id, keys] of Object.entries(VENUE_ALIASES)) {
    if (!repo.venue(id)) continue;
    for (const k of keys) addKey(venues, k, id);
  }
  const artistFull = new Map();
  const artistParts = new Map();
  for (const a of repo.allArtists()) {
    const full = prep(a.name);
    if (full.length >= 4) addKey(artistFull, full, a.id);
    const words = full.split(' ');
    if (a.kind === 'ensemble') {
      for (const w of words) if (w.length >= 4 && !ENSEMBLE_GENERIC.has(w) && !STOP.has(w)) addKey(artistParts, w, a.id);
    } else if (words.length > 1) {
      const last = words[words.length - 1];
      if (last.length >= 4 && !STOP.has(last)) addKey(artistParts, last, a.id);
    }
  }
  return {
    venues, venueKeys: sortedKeys(venues),
    artistFull, artistFullKeys: sortedKeys(artistFull),
    artistParts, artistPartKeys: sortedKeys(artistParts),
  };
}

// ---------- dates ----------
function dayLabel(day, today) {
  if (day === today) return 'today';
  if (day === addDays(today, 1)) return 'tomorrow';
  if (day === addDays(today, -1)) return 'yesterday';
  return `on ${relDayLabel(day, today)}`;
}

function monthRange(m0, year, mod, prepWord, today) {
  const ty = yearOf(today);
  const tm = Number(today.slice(5, 7)) - 1;
  let y = year || (m0 < tm ? ty + 1 : ty);
  const span = (yy) => {
    const last = daysIn(yy, m0);
    let a = 1;
    let b = last;
    if (mod === 'early') b = 10;
    else if (mod === 'mid') { a = 11; b = 20; }
    else if (mod === 'late') a = 21;
    return [ymd(yy, m0, a), ymd(yy, m0, b)];
  };
  let [from, to] = span(y);
  if (!year && to < today) { y += 1; [from, to] = span(y); }
  const name = `${MONTH_NAMES[m0]}${y !== ty ? ` ${y}` : ''}`;
  const modLabel = mod === 'mid' ? `mid-${name}` : mod ? `${mod} ${name}` : name;
  if (prepWord === 'until' || prepWord === 'till' || prepWord === 'through' || prepWord === 'by') return { from: today, to: ymd(y, m0, daysIn(y, m0)), label: `until the end of ${name}` };
  if (prepWord === 'before') return { from: today, to: addDays(ymd(y, m0, 1), -1), label: `before ${name}` };
  if (prepWord === 'after' || prepWord === 'from') return { from: prepWord === 'after' ? addDays(ymd(y, m0, daysIn(y, m0)), 1) : ymd(y, m0, 1), to: null, label: `${prepWord} ${name}` };
  return { from, to, label: `in ${modLabel}`, past: !!year && to < today };
}

function easterSunday(y) {
  const a = y % 19; const b = Math.floor(y / 100); const c = y % 100; const d = Math.floor(b / 4); const e = b % 4;
  const f = Math.floor((b + 8) / 25); const g = Math.floor((b - f + 1) / 3); const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4); const k = c % 4; const l = (32 + 2 * e + 2 * i - h - k) % 7; const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); const day = ((h + l - 7 * m + 114) % 31) + 1;
  return ymd(y, month - 1, day);
}

// Picks the first date expression and removes it from ctx.rest.
function parseDate(ctx) {
  const T = ctx.today;
  const ty = yearOf(T);
  const tm = Number(T.slice(5, 7)) - 1;
  const td = Number(T.slice(8, 10));
  const wdT = weekdayOf(T);
  const single = (day, part = null) => ({ from: day, to: day, label: dayLabel(day, T), past: day < T, part });
  const valid = (y, m0, d) => m0 >= 0 && m0 < 12 && d >= 1 && d <= daysIn(y, m0);
  const futureDay = (m0, d, year) => {
    let y = year || ty;
    if (!year && ymd(y, m0, d) < T) y += 1;
    return valid(y, m0, d) ? ymd(y, m0, d) : null;
  };
  let m;

  // numeric dates: 2026-11-14 · 14.11. · 14.11.2026 · 14/11
  m = ctx.raw.match(/\b(20\d\d)-(\d{1,2})-(\d{1,2})\b/);
  if (m && valid(+m[1], +m[2] - 1, +m[3]) && takeRe(ctx, new RegExp(` ${m[1]} ${m[2]} ${m[3]} `))) {
    return single(ymd(+m[1], +m[2] - 1, +m[3]));
  }
  // Swiss "14.11." / "14.11.2026" (second dot required) and "14/11"
  m = ctx.raw.match(/(?:^|[^\d.])(\d{1,2})\.(\d{1,2})\.(\d{2,4})?(?!\d)/) || ctx.raw.match(/(?:^|[^\d/])(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?(?![\d/])/);
  if (m && +m[2] >= 1 && +m[2] <= 12 && +m[1] >= 1 && +m[1] <= 31) {
    const year = m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : null;
    const day = futureDay(+m[2] - 1, +m[1], year);
    if (day && takeRe(ctx, new RegExp(` ${m[1]} ${m[2]}${m[3] ? ` ${m[3]}` : ''} `))) return single(day);
  }
  // 14 November · 14th of Nov 2026 · November 14 · Nov 14th
  m = ctx.rest.match(new RegExp(` (?:on )?(?:the )?(\\d{1,2})(?:st|nd|rd|th)? (?:of )?(${MONTH_RE})(?: (20\\d\\d))? `));
  if (m) {
    const day = futureDay(MONTH_WORDS[m[2]], +m[1], m[3] ? +m[3] : null);
    if (day) { takeRe(ctx, new RegExp(esc(m[0]))); return single(day); }
  }
  m = ctx.rest.match(new RegExp(` (?:on )?(${MONTH_RE}) (\\d{1,2})(?:st|nd|rd|th)?(?: (20\\d\\d))? `));
  if (m) {
    const day = futureDay(MONTH_WORDS[m[1]], +m[2], m[3] ? +m[3] : null);
    if (day) { takeRe(ctx, new RegExp(esc(m[0]))); return single(day); }
  }
  // on the 14th
  m = ctx.rest.match(new RegExp(` (?:on )?the (\\d{1,2})(?:st|nd|rd|th) (?!(?:${NUM_FORM_RE}|movement|century|time|row|edition|anniversary|variation)\\b)`));
  if (m) {
    const d = +m[1];
    let y = ty;
    let mo = tm;
    if (d < td) { mo += 1; if (mo > 11) { mo = 0; y += 1; } }
    if (valid(y, mo, d)) { takeRe(ctx, new RegExp(esc(m[0]))); return single(ymd(y, mo, d)); }
  }

  // relative days
  if (takeRe(ctx, / (?:the )?day after tomorrow /)) return single(addDays(T, 2));
  if ((m = takeRe(ctx, / (tonight|this evening|this afternoon|this morning|today)(?: (night|evening))? /))) {
    const w = m[1];
    const part = w === 'tonight' || w === 'this evening' || m[2] ? 'evening' : w === 'this afternoon' ? 'afternoon' : w === 'this morning' ? 'morning' : null;
    return { ...single(T, part), label: w === 'tonight' || w === 'this evening' ? 'tonight' : w === 'today' ? 'today' : w };
  }
  if ((m = takeRe(ctx, / tomorrow(?: (night|evening|afternoon|morning))? /))) {
    const part = m[1] === 'night' ? 'evening' : m[1] || null;
    return { ...single(addDays(T, 1), part), label: m[1] ? `tomorrow ${m[1]}` : 'tomorrow' };
  }
  if (takeRe(ctx, / yesterday /)) return single(addDays(T, -1));

  // weekends, weeks, months
  if ((m = takeRe(ctx, / (?:(this|next|last|the|coming) )?weekend /))) {
    const sat = wdT === 0 ? addDays(T, -1) : addDays(T, 6 - wdT);
    if (m[1] === 'last') {
      const lastSat = addDays(T, -(wdT === 6 ? 7 : wdT === 0 ? 8 : wdT + 1));
      return { from: lastSat, to: addDays(lastSat, 1), label: 'last weekend', past: true };
    }
    if (m[1] === 'next') return { from: addDays(sat, 7), to: addDays(sat, 8), label: 'next weekend' };
    return { from: maxKey(sat, T), to: addDays(sat, 1), label: 'this weekend' };
  }
  const monday = addDays(T, -((wdT + 6) % 7));
  if ((m = takeRe(ctx, / (this|next|last|coming) week /))) {
    if (m[1] === 'next') return { from: addDays(monday, 7), to: addDays(monday, 13), label: 'next week' };
    if (m[1] === 'last') return { from: addDays(monday, -7), to: addDays(monday, -1), label: 'last week', past: true };
    return { from: T, to: addDays(monday, 6), label: 'this week' };
  }
  if ((m = takeRe(ctx, / (this|next|last|coming) month /))) {
    if (m[1] === 'next' || m[1] === 'coming') {
      const y = tm === 11 ? ty + 1 : ty;
      const mo = (tm + 1) % 12;
      return { from: ymd(y, mo, 1), to: ymd(y, mo, daysIn(y, mo)), label: 'next month' };
    }
    if (m[1] === 'last') {
      const y = tm === 0 ? ty - 1 : ty;
      const mo = (tm + 11) % 12;
      return { from: ymd(y, mo, 1), to: ymd(y, mo, daysIn(y, mo)), label: 'last month', past: true };
    }
    return { from: T, to: ymd(ty, tm, daysIn(ty, tm)), label: 'this month' };
  }
  const NUMW = Object.keys(NUMWORDS).join('|');
  if ((m = takeRe(ctx, new RegExp(` (?:in |over |within |during |for )?(?:the )?(?:next|coming|following) (?:(\\d{1,2}|${NUMW}) )?(?:of )?(days?|weeks?) `)))) {
    const n = m[1] ? (NUMWORDS[m[1]] || +m[1]) : m[2].startsWith('week') ? 1 : 7;
    const span = m[2].startsWith('week') ? n * 7 : n;
    return { from: T, to: addDays(T, Math.max(1, span) - 1), label: `in the next ${span === 7 && m[2].startsWith('week') && n === 1 ? 'week' : `${span} days`}` };
  }
  if ((m = takeRe(ctx, new RegExp(` within (?:a |one |(\\d{1,2}|${NUMW}) )?(days?|weeks?) `)))) {
    const n = m[1] ? (NUMWORDS[m[1]] || +m[1]) : 1;
    const span = m[2].startsWith('week') ? n * 7 : n;
    return { from: T, to: addDays(T, span - 1), label: `in the next ${span} days` };
  }

  // weekdays: on Friday, next Saturday, Friday night, Sundays (recurring)
  m = ctx.rest.match(new RegExp(` (?:(this|next|on|coming|every) )?(${WD_RE})(s)?(?: (night|evening|afternoon|morning))? `));
  if (m) {
    takeRe(ctx, new RegExp(esc(m[0])));
    const wd = WD_WORDS[m[2]];
    const part = m[4] === 'night' ? 'evening' : m[4] || null;
    if (m[3] || m[1] === 'every') return { from: T, to: null, weekday: wd, label: `on ${WD_LONG[wd]}s`, part };
    let diff = (wd - wdT + 7) % 7;
    if (m[1] === 'next' && diff === 0) diff = 7;
    return single(addDays(T, diff), part);
  }

  // months: in November, late October, early December 2026, until March
  const monthRe = new RegExp(` (?:(early|late|mid|end of|the end of|beginning of|the beginning of|start of|the start of|middle of|the middle of) )?(?:(in|during|for|this|next|of|until|till|through|before|by|after|from) )?(?:(early|late|mid) )?(${MONTH_RE})(?: (20\\d\\d))? `, 'g');
  let mm;
  while ((mm = monthRe.exec(ctx.rest))) {
    const word = mm[4];
    const hasContext = mm[1] || mm[2] || mm[3] || mm[5];
    if (AMBIG_MONTH.has(word) && !hasContext) { monthRe.lastIndex = mm.index + 1; continue; }
    const modRaw = mm[1] || mm[3] || '';
    const mod = /early|beginning|start/.test(modRaw) ? 'early' : /mid|middle/.test(modRaw) ? 'mid' : /late|end/.test(modRaw) ? 'late' : null;
    ctx.rest = `${ctx.rest.slice(0, mm.index)} | ${ctx.rest.slice(mm.index + mm[0].length)}`;
    return monthRange(MONTH_WORDS[word], mm[5] ? +mm[5] : null, mod, mm[2], T);
  }

  // holidays and seasons
  if (takeRe(ctx, / (?:new years? eve|new year|new years|silvester|sylvester|nye|nouvel an) /)) {
    const y = T > ymd(ty, 0, 2) ? ty : ty - 1;
    return { from: ymd(y, 11, 30), to: ymd(y + 1, 0, 2), label: 'around New Year' };
  }
  if (takeRe(ctx, / (?:christmas|xmas|weihnachten|noel)(?: eve| day| time| season| holidays)? /)) {
    const y = T > ymd(ty, 11, 26) ? ty + 1 : ty;
    return { from: maxKey(ymd(y, 11, 18), T), to: ymd(y, 11, 26), label: 'around Christmas' };
  }
  if (takeRe(ctx, / (?:advent|adventszeit) /)) {
    const y = T > ymd(ty, 11, 24) ? ty + 1 : ty;
    return { from: maxKey(ymd(y, 10, 27), T), to: ymd(y, 11, 24), label: 'during Advent' };
  }
  if (takeRe(ctx, / (?:easter|ostern|paques) /)) {
    let e = easterSunday(ty);
    if (addDays(e, 1) < T) e = easterSunday(ty + 1);
    return { from: maxKey(addDays(e, -3), T), to: addDays(e, 1), label: 'over Easter' };
  }
  if ((m = takeRe(ctx, / (?:(this|next|in the|in) )?(winter|spring|summer|autumn|fall) /))) {
    if (m[2] === 'fall' && !m[1]) { /* "fall" on its own is just a word */ }
    else {
      const season = m[2] === 'fall' ? 'autumn' : m[2];
      const starts = { spring: 2, summer: 5, autumn: 8, winter: 11 };
      const s0 = starts[season];
      let y = ty;
      let from = ymd(y, s0, 1);
      const endOf = (yy) => (season === 'winter' ? ymd(yy + 1, 1, daysIn(yy + 1, 1)) : ymd(yy, s0 + 2, daysIn(yy, s0 + 2)));
      let to = endOf(y);
      if (season === 'winter' && tm <= 1) { y -= 1; from = ymd(y, 11, 1); to = endOf(y); }
      if (to < T || (m[1] === 'next' && from <= T)) { y += 1; from = ymd(y, s0, 1); to = endOf(y); }
      return { from: maxKey(from, T), to, label: `${m[1] === 'next' ? 'next' : 'this'} ${season}` };
    }
  }
  return null;
}

// ---------- parsing ----------
function takeFromList(ctx, keys, map, onHit) {
  for (const k of keys) if (take(ctx, k)) onHit(map.get(k), k);
}

export function parse(text, { today = todayKey() } = {}) {
  const st = S();
  const dyn = dynamicIndex();
  const raw = String(text || '').trim();
  const q = pad(prep(raw));
  const ctx = { raw, today, q, rest: q };
  const p = {
    raw, q, today,
    date: null, part: null, weekday: null,
    venueIds: [], cityIds: [], placeLabel: '', regionLabel: '', near: false,
    composerIds: [], ambiguousComposer: false, nation: null, period: null,
    works: [], missing: [], forms: [], types: [], roles: [], artists: [],
    featured: RE_FEATURED.test(q), performer: null, unknown: [], unknownRaw: '', corrections: [], unknownPlace: null,
    cues: { recording: RE_RECORDING.test(q), live: RE_LIVE.test(q), tempo: RE_TEMPO.test(q) },
  };
  const addAll = (arr, values) => { for (const v of values) if (!arr.includes(v)) arr.push(v); };

  // 1. performers by full name, venues
  takeFromList(ctx, dyn.artistFullKeys, dyn.artistFull, (ids) => addAll(p.artists, ids));
  takeFromList(ctx, dyn.venueKeys, dyn.venues, (ids) => addAll(p.venueIds, ids));

  // 2. works: catalogue numbers, missing works, titles and nicknames
  const catRe = / (bwv|hwv|k|d|op|opp|hob|sz|wwv|s) ((?:[ivxl]+ )?\d{1,4}(?: no \d{1,2})?) /;
  let cm;
  while ((cm = takeRe(ctx, catRe))) {
    const ref = `${cm[1]} ${cm[2]}`;
    const num = cm[2].split(' ')[0];
    const hits = st.catalogs.filter(({ key }) =>
      key === ref || key.startsWith(`${ref} `) ||
      (cm[1] === 'op' && key.startsWith('opp ') && key.split(' ').includes(num)) ||
      (cm[1] === 'op' && key.startsWith('op ') && key.split(' ')[1] === num && !cm[2].includes(' no ')));
    addAll(p.works, uniq(hits.map((h) => h.w.id)));
  }
  takeFromList(ctx, st.missingKeys, st.missing, (idx) => { for (const i of idx) if (!p.missing.includes(MISSING[i])) p.missing.push(MISSING[i]); });
  takeFromList(ctx, st.workKeys, st.works, (ids) => addAll(p.works, ids));

  // 3. dates and parts of the day
  p.date = parseDate(ctx);
  if (p.date?.part) p.part = p.date.part;
  if (p.date?.weekday != null) p.weekday = p.date.weekday;
  for (const k of st.daypartKeys) {
    if (take(ctx, k) && !p.part) p.part = DAYPARTS[[...st.daypartMap.get(k)][0]].id;
  }

  // 4. composers (found first, consumed after the numbered-work patterns)
  const found = [];
  let scan = ctx.rest;
  for (const k of st.composerKeys) {
    if (scan.includes(pad(k))) {
      found.push(k);
      while (scan.includes(pad(k))) scan = scan.replace(pad(k), ' | ');
    }
  }
  if (/p(?:ä|ae)rt\b/i.test(raw) && !found.includes('arvo part')) { addAll(p.composerIds, ['part']); take(ctx, 'part'); }
  for (const k of found) {
    const ids = [...st.composers.get(k)];
    if (ids.length > 1) p.ambiguousComposer = true;
    addAll(p.composerIds, ids);
  }
  // numbered works: "Mahler 2", "Beethoven's ninth", "Brahms symphony no 4", "the second piano concerto"
  const numbered = (n, form, compIds) => {
    const pool = compIds.length ? repo.allWorks().filter((w) => compIds.includes(w.composerId)) : repo.allWorks();
    const re = new RegExp(`\\bNo\\. ?${n}\\b`);
    let hits = pool.filter((w) => re.test(w.title));
    if (form) {
      const f = /symphon|sinfonie/.test(form) ? /Symphony/ : new RegExp(form.replace(/ /g, ' '), 'i');
      hits = hits.filter((w) => f.test(w.title));
    } else if (hits.length > 1) {
      const sym = hits.filter((w) => w.genre === 'symphony');
      if (sym.length) hits = sym;
    }
    if (hits.length) { addAll(p.works, hits.map((w) => w.id)); return true; }
    if (compIds.length === 1 && n <= 15) {
      const formCap = form ? (/symphon|sinfonie/.test(form) ? 'Symphony' : form.split(' ').map(cap1).join(' ')) : 'Symphony';
      const known = MISSING.find((x) => x.composerId === compIds[0] && x.title.startsWith(`${formCap} No. ${n} `));
      const comp = repo.composer(compIds[0]);
      const miss = known || { composerId: compIds[0], title: `${formCap} No. ${n}`, term: `${comp?.short || ''} ${formCap} No. ${n}`.trim(), synthetic: true };
      if (!p.missing.includes(miss)) p.missing.push(miss);
      return true;
    }
    return false;
  };
  const toNum = (s) => ORDINALS[s] || Number(s);
  for (const k of found) {
    const ids = [...st.composers.get(k)];
    const re = new RegExp(` ${esc(k)} (?:(${NUM_FORM_RE}) )?(?:no )?(\\d{1,3}|${ORD_RE})(?:st|nd|rd|th)?(?: (${NUM_FORM_RE}))? `);
    let m;
    while ((m = ctx.rest.match(re))) {
      const n = toNum(m[2]);
      if (!n || n > 110) break;
      const form = m[1] || m[3] || null;
      if (!numbered(n, form, ids)) break;
      ctx.rest = `${ctx.rest.slice(0, m.index)} | ${ctx.rest.slice(m.index + m[0].length)}`;
    }
  }
  const formNumRe = new RegExp(` (?:the )?(?:(${ORD_RE}|\\d{1,3}(?:st|nd|rd|th)) (${NUM_FORM_RE})|(${NUM_FORM_RE}) (?:no )?(\\d{1,3})) `);
  let fm;
  while ((fm = ctx.rest.match(formNumRe))) {
    const ordWord = fm[1] || '';
    const n = fm[1] ? toNum(/^\d/.test(ordWord) ? ordWord.replace(/\D+$/, '') : ordWord) : Number(fm[4]);
    const form = fm[2] || fm[3];
    const ok = !!n && n <= 110 && numbered(n, form, p.composerIds);
    if (!ok && !p.composerIds.length) break;
    ctx.rest = `${ctx.rest.slice(0, fm.index)} | ${ctx.rest.slice(fm.index + fm[0].length)}`;
  }
  for (const k of found) take(ctx, k);

  // 5. composer groups: "the Swiss composer", "French music", "Baroque"
  const natRe = / (?:(?:that|the|a|an|any|some) )?(swiss|french|german|austrian|italian|russian|czech|norwegian|finnish|hungarian|polish|estonian|english|british|american) (composers?|music|works?|pieces?|repertoire|masters?) /;
  const natM = takeRe(ctx, natRe) || (() => {
    const m2 = takeRe(ctx, / (composers?) from (switzerland|france|germany|austria|italy|russia|norway|finland|hungary|poland|estonia|england) /);
    return m2 ? [m2[0], COUNTRY_WORDS[m2[2]], m2[1]] : null;
  })();
  if (natM) {
    const [country, adj] = NATIONS[natM[1]];
    const ids = repo.allComposers().filter((c) => (c.country || '').includes(country)).map((c) => c.id);
    p.nation = { adj, singular: natM[2] === 'composer', ids, label: `${adj} composers` };
    addAll(p.composerIds, ids);
  }
  takeFromList(ctx, st.periodKeys, st.periodMap, (idx) => {
    const per = PERIODS[[...idx][0]];
    const ids = repo.allComposers().filter(per.test).map((c) => c.id);
    p.period = { label: per.label, ids };
    addAll(p.composerIds, ids);
  });

  // 6. places
  p.near = RE_NEAR.test(ctx.rest);
  const placeLabels = [];
  takeFromList(ctx, st.regionKeys, st.regions, (idx) => {
    const r = REGIONS[[...idx][0]];
    addAll(p.cityIds, repo.allCities().filter((c) => r.cantons.includes(c.canton)).map((c) => c.id));
    placeLabels.push(r.label);
  });
  takeFromList(ctx, st.cityKeys, st.cities, (ids) => {
    addAll(p.cityIds, ids);
    placeLabels.push(...[...ids].map((id) => repo.city(id)?.name).filter(Boolean));
  });
  takeFromList(ctx, st.cantonKeys, st.cantons, (codes) => {
    for (const code of codes) {
      addAll(p.cityIds, repo.allCities().filter((c) => c.canton === code).map((c) => c.id));
      placeLabels.push(`the canton of ${repo.cantonName(code)}`);
    }
  });
  if (p.near && p.cityIds.length === 1) {
    const c0 = repo.city(p.cityIds[0]);
    if (c0?.lat) {
      const near = repo.allCities().filter((c) => c.lat && kmBetween(c0, c) <= 25).map((c) => c.id);
      addAll(p.cityIds, near);
      placeLabels.splice(0, placeLabels.length, `near ${c0.name}`);
    }
  }
  p.placeLabel = uniq(placeLabels).join(' or ');

  // 7. types, forms, roles
  takeFromList(ctx, st.typeKeyList, st.typeKeys, (idx) => {
    const t = TYPE_PHRASES[[...idx][0]];
    if (!p.types.includes(t.type)) p.types.push(t.type);
    if (t.role) { const r = ROLES.find((x) => x.keys.includes(t.role)); if (r && !p.roles.includes(r)) p.roles.push(r); }
    if (t.form) { const f = FORMS.find((x) => x.id === t.form); if (f && !p.forms.includes(f)) p.forms.push(f); }
  });
  takeFromList(ctx, st.formKeys, st.formMap, (idx) => { const f = FORMS[[...idx][0]]; if (!p.forms.includes(f)) p.forms.push(f); });
  takeFromList(ctx, st.roleKeys, st.roleMap, (idx) => { const r = ROLES[[...idx][0]]; if (!p.roles.includes(r)) p.roles.push(r); });

  // 8. performers by surname / distinctive ensemble word
  takeFromList(ctx, dyn.artistPartKeys, dyn.artistParts, (ids) => addAll(p.artists, ids));

  // 9. what is left: fuzzy matches for typos, then unknown words
  let left = ctx.rest.split(' ').filter((t) => t && t !== '|' && !STOP.has(t) && !/^\d+(st|nd|rd|th)?$/.test(t) && !(t in NUMWORDS) && !(t in ORDINALS));
  const fuzzyVocab = [...st.fuzzy.entries(), ...[...dyn.artistParts.entries()].filter(([k]) => k.length >= 5).map(([k, ids]) => [k, { kind: 'artist', ids: [...ids] }])];
  const still = [];
  for (const t of left) {
    if (t.length < 5) { still.push(t); continue; }
    const max = t.length >= 8 ? 2 : 1;
    let best = null;
    let bestD = max + 1;
    let tie = false;
    const sig = (e) => `${e.kind}:${e.ids.join(',')}`;
    for (const [word, entry] of fuzzyVocab) {
      const d = distance(t, word, max);
      if (d < bestD) { best = [word, entry]; bestD = d; tie = false; } else if (d === bestD && best && sig(best[1]) !== sig(entry)) tie = true;
    }
    if (!best || bestD > max || tie) { still.push(t); continue; }
    const [word, entry] = best;
    if (entry.kind === 'composer') addAll(p.composerIds, entry.ids);
    else if (entry.kind === 'work') addAll(p.works, entry.ids);
    else if (entry.kind === 'city') addAll(p.cityIds, entry.ids);
    else if (entry.kind === 'canton') addAll(p.cityIds, repo.allCities().filter((c) => entry.ids.includes(c.canton)).map((c) => c.id));
    else if (entry.kind === 'type') { const ty = TYPE_PHRASES[entry.ids[0]].type; if (!p.types.includes(ty)) p.types.push(ty); }
    else if (entry.kind === 'form') { const f = FORMS[entry.ids[0]]; if (!p.forms.includes(f)) p.forms.push(f); }
    else if (entry.kind === 'artist') addAll(p.artists, entry.ids);
    p.corrections.push([t, displayOf(entry, word)]);
    if ((entry.kind === 'city' || entry.kind === 'canton') && !p.placeLabel) p.placeLabel = displayOf(entry, word);
  }
  p.unknown = still;

  // performer for recordings: "Abbado's …", "… by Gould", "… conducted by Karajan"
  const isComposerWord = (w) => st.composers.has(prep(w));
  const isKnownWord = (w) => st.composers.has(w) || st.cities.has(w) || STOP.has(w) || dyn.venues.has(w);
  const poss = [...raw.matchAll(/(?:^|\s)([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ.-]+(?:\s[A-ZÀ-Ý][A-Za-zÀ-ÿ.-]+)?)['’]s?(?=\s|$)/g)]
    .map((x) => x[1]).filter((w) => !isComposerWord(w) && !STOP.has(prep(w)) && !st.cities.has(prep(w)));
  const by = raw.match(/\b(?:by|with|conducted by|played by|sung by|from)\s+([A-ZÀ-Ý][A-Za-zÀ-ÿ.-]+(?:\s[A-ZÀ-Ý][A-Za-zÀ-ÿ.-]+)?)/);
  let performer = poss[0] || (by && !isComposerWord(by[1]) && !st.cities.has(prep(by[1])) ? by[1] : null);
  if (performer) {
    const pk = prep(performer);
    const pw = pk.split(' ');
    // composers, places and performers already in Klang's listings are not "recording artists"
    if (pw.every(isKnownWord) || dyn.artistFull.has(pk) || pw.some((w) => dyn.artistParts.has(w))) performer = null;
  }
  if (performer) {
    const pw = new Set(prep(performer).split(' '));
    p.performer = performer;
    p.unknown = p.unknown.filter((t) => !pw.has(t));
  }
  // what the unknown words looked like in the original text ("Kavakos", "Shanghai")
  if (p.unknown.length) {
    const set = new Set(p.unknown);
    const words = raw.split(/[\s,;:!?]+/).filter((w) => w && set.has(prep(w)));
    p.unknownRaw = words.join(' ') || p.unknown.join(' ');
    const placeM = [...raw.matchAll(/\b(?:in|near|around|at)\s+([A-ZÀ-Ý][A-Za-zÀ-ÿ-]+)/g)].find((x) => set.has(prep(x[1])));
    if (placeM) p.unknownPlace = placeM[1];
  }

  // forms + composers: "Brahms violin concerto" -> that work
  if (p.forms.length && p.composerIds.length && !p.nation && !p.period) {
    const hits = repo.allWorks().filter((w) => p.composerIds.includes(w.composerId) && p.forms.some((f) => f.test(w)));
    if (hits.length) { addAll(p.works, hits.map((w) => w.id)); p.forms = []; }
    else p.formMiss = p.forms.map((f) => f.label);
  }
  // keep works consistent with named composers when both are given
  if (p.works.length && p.composerIds.length && !p.nation && !p.period) {
    const consistent = p.works.filter((id) => p.composerIds.includes(repo.work(id)?.composerId));
    if (consistent.length) p.works = consistent;
  }
  return p;
}

function displayOf(entry, word) {
  if (entry.kind === 'composer') return repo.composer(entry.ids[0])?.name || word;
  if (entry.kind === 'work') return repo.work(entry.ids[0])?.title || word;
  if (entry.kind === 'city') return repo.city(entry.ids[0])?.name || word;
  if (entry.kind === 'canton') return repo.cantonName(entry.ids[0]);
  if (entry.kind === 'artist') return repo.artist(entry.ids[0])?.name || word;
  if (entry.kind === 'type') return TYPE_LABELS[TYPE_PHRASES[entry.ids[0]].type] || word;
  if (entry.kind === 'form') return FORMS[entry.ids[0]].label;
  return word;
}

function kmBetween(a, b) {
  const R = 6371;
  const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// ---------- concert search ----------
const venueName = (c) => repo.venue(c.venueId)?.name || c.venueName || 'a venue to be announced';
function whenWhere(c, today) {
  const rel = relDayLabel(c.day, today);
  const d = rel === 'Today' || rel === 'Tomorrow' ? rel.toLowerCase() : rel;
  return `${d}, ${timeOf(c.start)} at ${venueName(c)}`;
}
const composerOf = (pr) => pr.composerId || (pr.workId ? repo.work(pr.workId)?.composerId : null);

function explainedComposers(p) {
  const fromWorks = new Set(p.works.map((id) => repo.work(id)?.composerId));
  return p.composerIds.filter((id) => !fromWorks.has(id) || p.nation || p.period);
}

function findConcerts(p, relax = {}) {
  const T = p.today;
  const useDate = p.date && !relax.date;
  const past = useDate && p.date.past;
  const from = useDate ? (past ? p.date.from : maxKey(p.date.from, T)) : T;
  let to = useDate ? p.date.to : null;
  if (past && (!to || to >= T)) to = addDays(T, -1);
  const usePlace = !relax.place;
  const cityIds = usePlace && !p.venueIds.length ? p.cityIds : [];
  const types = relax.types ? [] : p.types;
  let list = repo.query({ from, to, cityIds, types });
  if (usePlace && p.venueIds.length) list = list.filter((c) => p.venueIds.includes(c.venueId));

  const wIds = new Set(p.works);
  const cIds = new Set(explainedComposers(p));
  for (const m of p.missing) if (m.composerId) cIds.add(m.composerId);
  const formTests = relax.types ? [] : p.forms.map((f) => f.test);
  if (wIds.size || cIds.size || formTests.length) {
    list = list.filter((c) => (c.program || []).some((pr) => {
      if (pr.workId && wIds.has(pr.workId)) return true;
      if (cIds.has(composerOf(pr))) return true;
      const w = pr.workId ? repo.work(pr.workId) : null;
      return !!w && formTests.some((t) => t(w));
    }));
  }
  if (p.artists.length) list = list.filter((c) => (c.credits || []).some((cr) => p.artists.includes(cr.artistId)));
  if (p.roles.length && !relax.roles) {
    const roles = new Set(p.roles.flatMap((r) => r.roles));
    list = list.filter((c) => (c.credits || []).some((cr) => roles.has(cr.role)));
  }
  if (!relax.date) {
    if (p.part) { const dp = DAYPART_BY_ID[p.part]; list = list.filter((c) => dp.test(timeOf(c.start))); }
    if (p.weekday != null) list = list.filter((c) => weekdayOf(c.day) === p.weekday);
  }
  if (p.featured) list = list.filter((c) => c.featured);
  // several named things: concerts with more of them first, then by date
  if (wIds.size + cIds.size > 1 && !p.nation && !p.period) {
    const score = (c) => (c.program || []).filter((pr) => wIds.has(pr.workId) || cIds.has(composerOf(pr))).length;
    list = [...list].sort((a, b) => (score(b) > 1) - (score(a) > 1) || a.start.localeCompare(b.start));
  }
  return list;
}

// "with Mahler in Zurich in November"
function describe(p, relax = {}) {
  const parts = [];
  const subject = [];
  if (p.works.length) {
    const titles = p.works.slice(0, 3).map((id) => shortTitle(repo.work(id)));
    subject.push(listJoin(titles, 'or'));
  }
  const comps = explainedComposers(p);
  if (p.nation) subject.push(`music by ${p.nation.label}`);
  else if (p.period) subject.push(`${p.period.label} music`);
  else if (comps.length) subject.push(listJoin(comps.slice(0, 4).map((id) => repo.composer(id)?.short).filter(Boolean), 'or'));
  if (p.missing.length && !p.works.length && !comps.length) subject.push(listJoin(uniq(p.missing.map((m) => repo.composer(m.composerId)?.short || m.composerName)).filter(Boolean), 'or'));
  if (!relax.types) {
    const fl = p.forms.filter((f) => !f.noun).map((f) => f.label);
    if (fl.length) subject.push(listJoin(fl, 'or'));
  }
  if (p.artists.length) subject.push(listJoin(p.artists.slice(0, 3).map((id) => repo.artist(id)?.name).filter(Boolean), 'or'));
  if (p.roles.length && !relax.roles) subject.push(listJoin(p.roles.map((r) => r.label), 'or'));
  if (subject.length) parts.push(`with ${subject.join(' and ')}`);
  if (!relax.place) {
    if (p.venueIds.length) parts.push(`at ${venueGroupLabel(p.venueIds)}`);
    else if (p.placeLabel) parts.push(p.placeLabel.startsWith('near ') ? p.placeLabel : `in ${p.placeLabel}`);
  }
  if (!relax.date) {
    if (p.date) parts.push(p.date.label);
    const dpart = p.part && DAYPART_BY_ID[p.part];
    if (dpart && !(p.date && /tonight|night|evening|afternoon|morning/.test(p.date.label))) parts.push(dpart.label);
  }
  return parts.join(' ');
}

function venueGroupLabel(ids) {
  const names = uniq(ids.map((id) => (repo.venue(id)?.name || '').split(' – ')[0]).filter(Boolean));
  if (names.length <= 2) return listJoin(names, 'or');
  return `${names[0]} and ${names.length - 1} other venues`;
}

function nounFor(p, relax = {}) {
  const opera = !relax.types && p.forms.find((f) => f.noun);
  let n = opera ? opera.noun : p.types.length === 1 && !relax.types ? TYPE_NOUN[p.types[0]] : ['concert', 'concerts'];
  if (p.featured) n = n.map((x) => `featured ${x}`);
  return n;
}

function shortTitle(w) {
  if (!w) return '';
  const comp = repo.composer(w.composerId);
  const base = w.title.split(/[“”"(,:–]/)[0].trim();
  if (/^(Symphony|Piano Concerto|Violin Concerto|Cello Concerto|Clarinet|String Quartet|String Quintet|Piano Quintet|Piano Trio|Piano Sonata|Partita|Cello Suite|Brandenburg|Concerto|Octet|Requiem|Mass|Cantata|Four Ballades|24 Preludes|Préludes)/.test(base)) {
    let core = /^Mass/.test(base) ? base : base.replace(/ in [A-G](?:-flat|-sharp)? (?:major|minor).*$/, '').replace(/ for solo violin$/, '').trim();
    const nick = w.title.match(/“([^”]+)”/);
    if (!/No\./.test(core)) {
      // keep it identifiable: "Haydn String Quartet “Emperor”", "Mozart Clarinet Quintet K. 581"
      if (nick) core += ` “${nick[1]}”`;
      else if (w.catalog && !w.catalog.includes(',') && !/Requiem|Mass|Concerto for/.test(core)) core += ` ${w.catalog}`;
    }
    return `${comp?.short || ''} ${core}`.trim();
  }
  return base;
}

// ---------- answers ----------
const concertItems = (list, n = MAX_ITEMS) => list.slice(0, n).map((c) => ({ kind: 'concert', id: c.id }));
function cleanPrompt(s) { return s.replace(/\s+/g, ' ').trim(); }
function addFollow(arr, s) {
  const t = cleanPrompt(s);
  if (t && !arr.some((x) => x.toLowerCase() === t.toLowerCase()) && arr.length < 4) arr.push(cap1(t));
}
function topCityOf(list, exclude = []) {
  const counts = new Map();
  for (const c of list) if (c.cityId && !exclude.includes(c.cityId)) counts.set(c.cityId, (counts.get(c.cityId) || 0) + 1);
  const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return best ? repo.city(best[0]) : null;
}

function subjectPrompt(p) {
  if (p.works.length === 1) return shortTitle(repo.work(p.works[0]));
  const comps = explainedComposers(p);
  if (p.nation) return `${p.nation.adj} composers`;
  if (p.period) return `${p.period.label} music`;
  if (comps.length === 1) return repo.composer(comps[0])?.short || '';
  if (p.forms.length === 1) return p.forms[0].prompt;
  if (p.types.length === 1) return TYPE_PROMPT[p.types[0]];
  if (p.roles.length === 1) return `Concerts with ${p.roles[0].noun}s`;
  if (p.artists.length === 1) return repo.artist(p.artists[0])?.name || 'Concerts';
  return 'Concerts';
}
const asConcerts = (s) => (/concerts?|music|recitals?|opera|programmes?|vocal|quartets|trios|concertos|symphonies|sonatas|requiems|oratorios|cantatas|masses|songs/i.test(s) ? s : `${s} concerts`);
function placePrompt(p) {
  if (p.venueIds.length) return `at ${venueGroupLabel(p.venueIds)}`;
  if (p.placeLabel) return p.placeLabel.startsWith('near ') ? p.placeLabel : `in ${p.placeLabel}`;
  return '';
}

function followUpsForConcerts(p, list) {
  const out = [];
  const S0 = subjectPrompt(p);
  const P = placePrompt(p);
  if (!p.date) addFollow(out, `${S0} ${P} this weekend`);
  else addFollow(out, `${S0} ${P}${S0 === 'Concerts' && !P ? ' next month' : ''}`);
  if (P) addFollow(out, `${asConcerts(S0)} anywhere in Switzerland`);
  else {
    const city = topCityOf(list);
    if (city) addFollow(out, `${S0} in ${city.name}`);
  }
  if (p.works.length === 1) addFollow(out, `Recordings of ${shortTitle(repo.work(p.works[0]))}`);
  else if (explainedComposers(p).length === 1 && !p.nation && !p.period) addFollow(out, `Recordings of ${repo.composer(explainedComposers(p)[0])?.short}`);
  else if (!p.types.length && !p.forms.length) addFollow(out, `Chamber music ${P} this weekend`);
  return out.slice(0, 3);
}

function concertLink(p, relax) {
  const representable = !p.works.length && !p.composerIds.length && !p.missing.length && !p.forms.length && !p.artists.length &&
    !p.roles.length && !p.part && p.weekday == null && !p.featured && !(p.date && p.date.past) && !(p.venueIds.length && !relax.place);
  const cityIds = relax.place ? [] : p.cityIds;
  const types = relax.types ? [] : p.types;
  const day = !relax.date && p.date && p.date.from > p.today ? p.date.from : null;
  if (!representable || (!cityIds.length && !types.length && !day)) return null;
  return { label: 'Open in Concerts', filters: { cityIds: [...cityIds], types: [...types], day } };
}

function answerConcerts(p, { entityRows = [] } = {}) {
  const relax = {};
  let list = findConcerts(p);
  const desc0 = describe(p);
  const steps = [];
  if (!list.length && !(p.date && p.date.past)) {
    const order = [
      ['date', !!(p.date || p.part || p.weekday != null)],
      ['place', !!(p.cityIds.length || p.venueIds.length)],
      ['types', !!(p.types.length || p.forms.length)],
      ['roles', !!p.roles.length],
    ];
    for (const [step, active] of order) {
      if (!active) continue;
      relax[step] = true;
      steps.push(step);
      list = findConcerts(p, relax);
      if (list.length) break;
    }
  }
  const n = list.length;
  const [one, many] = nounFor(p, relax);
  const many0 = nounFor(p)[1];
  const intro = introNote(p);
  const room = MAX_ITEMS - entityRows.length;
  const shown = Math.min(n, room);
  const tail = n === 0 ? '' : n === 1 ? ' — here it is.' : n <= room ? ' — here they are.' : ` — here are the next ${shown}.`;
  const descN = describe(p, relax);
  const past = p.date && p.date.past && !relax.date;
  const countText = n === 1 ? `one ${one}` : `${n.toLocaleString('en-US')} ${many}`;
  let reply;
  if (n === 0) {
    reply = `${intro}I couldn't find any ${past ? '' : 'upcoming '}${many0}${desc0 ? ` ${desc0}` : ''}.`;
  } else if (steps.length) {
    const where = relax.place && !relax.date ? ' elsewhere in Switzerland' : relax.date && !relax.place ? ' on other dates' : '';
    reply = `${intro}No ${many0}${desc0 ? ` ${desc0}` : ''}. I found ${countText}${descN ? ` ${descN}` : ''}${where}${tail}`;
  } else {
    reply = `${intro}I found ${countText}${desc0 ? ` ${desc0}` : ''}${tail}`;
  }
  if (p.formMiss && p.composerIds.length) reply += ` (Klang has no ${listJoin(p.formMiss, 'or')} by ${listJoin(p.composerIds.map((id) => repo.composer(id)?.short), 'or')}.)`;
  const followUps = followUpsForConcerts(p, list);
  if (n === 0) {
    const others = findConcerts(p, { place: true, date: true });
    const city = topCityOf(others, p.cityIds);
    if (city) followUps.unshift(cleanPrompt(`${subjectPrompt(p)} in ${city.name}`));
  }
  return {
    intent: 'concert',
    reply,
    items: [...entityRows, ...concertItems(list, room)].slice(0, MAX_ITEMS),
    followUps: uniq(followUps).slice(0, 3),
    link: n ? concertLink(p, relax) : null,
  };
}

function introNote(p) {
  const bits = [];
  if (p.corrections.length) bits.push(`(Reading “${p.corrections[0][0]}” as ${p.corrections[0][1]}.)`);
  if (p.unknownPlace) bits.push(`Klang only covers Switzerland, so I left out “${p.unknownPlace}”.`);
  else if (p.unknownRaw && /[A-ZÀ-Ý]/.test(p.unknownRaw)) bits.push(`I don't know “${p.unknownRaw}”, so I left it out.`);
  if (p.missing.length && !p.works.length) {
    const m = p.missing[0];
    const comp = repo.composer(m.composerId);
    bits.push(`${comp ? `${comp.short}'s ` : ''}${m.title} isn't in Klang's repertoire yet, so I looked for ${comp ? comp.short : 'its composer'} instead.`);
  }
  return bits.length ? `${bits.join(' ')} ` : '';
}

function upcomingFor(opts, today) {
  return repo.query({ from: today, ...opts });
}
function life(c) {
  return c.died ? `${c.born}–${c.died}` : `born ${c.born}`;
}
function firstSentence(text, max = 240) {
  if (!text) return '';
  const para = String(text).split(/\n\n/)[0].trim();
  const m = para.match(/^(.{40,}?[.!?])(?:\s|$)/);
  const s = m ? m[1] : para;
  return s.length > max ? `${s.slice(0, max - 1).trim()}…` : s;
}

function answerComposers(p) {
  const T = p.today;
  const ids = explainedComposers(p).length ? explainedComposers(p) : p.composerIds;
  const comps = ids.map((id) => repo.composer(id)).filter(Boolean);
  if (!comps.length) return answerHelp();
  if (comps.length > 1) {
    const list = findConcerts({ ...p, works: [] });
    const rows = comps.slice(0, 4).map((c) => ({ kind: 'composer', id: c.id }));
    const names = listJoin(comps.map((c) => c.name), p.ambiguousComposer ? 'or' : 'and');
    const reply = p.ambiguousComposer
      ? `Did you mean ${names}? ${list.length ? `Between them there are ${plural(list.length, 'upcoming concert')}.` : ''}`.trim()
      : `${names}: ${list.length ? `${plural(list.length, 'upcoming concert')} feature their music.` : 'nothing of theirs is on the Swiss calendar right now.'}`;
    return {
      intent: 'composer', reply,
      items: [...rows, ...concertItems(list, MAX_ITEMS - rows.length)],
      followUps: comps.slice(0, 3).map((c) => `${c.short} concerts`),
    };
  }
  const c = comps[0];
  const ups = upcomingFor({ composerId: c.id }, T);
  const counts = new Map();
  for (const con of ups) for (const pr of con.program || []) {
    if (pr.workId && repo.work(pr.workId)?.composerId === c.id) counts.set(pr.workId, (counts.get(pr.workId) || 0) + 1);
  }
  const topWorks = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([id]) => id);
  const bio = firstSentence(BIOS && BIOS[c.id]);
  const often = topWorks.length ? ` ${listJoin(topWorks.map((id) => shortTitle(repo.work(id))))} ${topWorks.length > 1 ? 'are' : 'is'} programmed most.` : '';
  const reply = `${introNote(p)}${c.name} (${life(c)}), ${c.country}.${bio ? ` ${bio}` : ''} ${ups.length
    ? `${plural(ups.length, 'upcoming concert')} in Switzerland feature${ups.length === 1 ? 's' : ''} ${c.short}'s music — the next is ${whenWhere(ups[0], T)}.${often}`
    : `Nothing by ${c.short} is on the Swiss calendar in Klang right now.`}`;
  const rows = [{ kind: 'composer', id: c.id }, ...topWorks.map((id) => ({ kind: 'work', id }))];
  const followUps = [];
  if (ups.length) addFollow(followUps, `${c.short} this weekend`);
  const city = topCityOf(ups);
  if (city) addFollow(followUps, `${c.short} in ${city.name}`);
  addFollow(followUps, `Recordings of ${c.short}`);
  return { intent: 'composer', reply, items: [...rows, ...concertItems(ups, MAX_ITEMS - rows.length)], followUps };
}

function answerWorks(p) {
  const T = p.today;
  const works = p.works.map((id) => repo.work(id)).filter(Boolean);
  if (!works.length && p.missing.length) return answerMissing(p);
  if (!works.length) return answerHelp();
  if (works.length > 1) {
    const ws = works.slice(0, 4);
    const list = findConcerts({ ...p, composerIds: [] });
    const reply = `${introNote(p)}I found ${works.length} works: ${listJoin(ws.map((w) => `${shortTitle(w)} (${repo.composer(w.composerId)?.short})`), 'and')}. ${list.length ? `${plural(list.length, 'upcoming concert')} include${list.length === 1 ? 's' : ''} one of them.` : 'None of them is on a Swiss programme right now.'}`;
    return {
      intent: 'work', reply,
      items: [...ws.map((w) => ({ kind: 'work', id: w.id })), ...concertItems(list, MAX_ITEMS - ws.length)],
      followUps: ws.slice(0, 3).map((w) => `Recordings of ${shortTitle(w)}`),
    };
  }
  const w = works[0];
  const comp = repo.composer(w.composerId);
  const ups = upcomingFor({ workId: w.id }, T);
  const meta = [comp?.short, w.catalog, w.year].filter(Boolean).join(', ');
  const reply = `${introNote(p)}${w.title} — ${meta}. ${w.blurb || ''} ${ups.length
    ? `${plural(ups.length, 'upcoming performance')} in Switzerland — the next is ${whenWhere(ups[0], T)}.`
    : `It isn't on any Swiss programme in Klang right now.`}`.replace(/\s+/g, ' ').trim();
  const followUps = [];
  addFollow(followUps, `Recordings of ${shortTitle(w)}`);
  if (comp) addFollow(followUps, `More by ${comp.short}`);
  if (!ups.length && comp) addFollow(followUps, `${comp.short} concerts`);
  else if (ups.length > 1) {
    const city = topCityOf(ups);
    if (city) addFollow(followUps, `${shortTitle(w)} in ${city.name}`);
  }
  return { intent: 'work', reply, items: [{ kind: 'work', id: w.id }, ...concertItems(ups, MAX_ITEMS - 1)], followUps };
}

function answerMissing(p) {
  const T = p.today;
  const m = p.missing[0];
  const comp = m.composerId ? repo.composer(m.composerId) : null;
  const by = comp ? comp.short : m.composerName;
  const ups = comp ? upcomingFor({ composerId: comp.id }, T) : [];
  const label = `${by ? `${by}'s ` : ''}${m.title}`;
  const reply = `${label}${m.note ? ` — ${m.note} —` : ''} isn't in Klang's repertoire yet, so I can't match it to concerts. Here are recordings on Apple Music${comp && ups.length ? `, and the next concerts with ${comp.short}` : ''}.`;
  const items = [{ kind: 'recording', data: { term: m.term, label, composerId: comp?.id || null } }];
  if (comp) items.push({ kind: 'composer', id: comp.id });
  items.push(...concertItems(ups, 4));
  const followUps = [];
  if (comp) { addFollow(followUps, `${comp.short} concerts`); addFollow(followUps, `Tell me about ${comp.short}`); }
  return { intent: 'work', reply, items: items.slice(0, MAX_ITEMS), followUps };
}

function answerArtists(p) {
  const T = p.today;
  const artists = p.artists.map((id) => repo.artist(id)).filter(Boolean);
  if (!artists.length) return answerHelp();
  if (artists.length > 1) {
    const list = findConcerts(p);
    const rows = artists.slice(0, 4).map((a) => ({ kind: 'artist', id: a.id }));
    return {
      intent: 'artist',
      reply: `I found ${artists.length} performers: ${listJoin(artists.slice(0, 4).map((a) => a.name), 'and')}. ${list.length ? `${plural(list.length, 'upcoming concert')} with them.` : ''}`.trim(),
      items: [...rows, ...concertItems(list, MAX_ITEMS - rows.length)],
      followUps: artists.slice(0, 3).map((a) => `${a.name} concerts`),
    };
  }
  const a = artists[0];
  const ups = upcomingFor({ artistId: a.id }, T);
  const role = a.kind === 'ensemble' ? (a.ensembleType || 'ensemble') : (a.role || 'performer').toLowerCase();
  const reply = `${a.name} — ${role}${a.demo ? ' (a demo performer)' : ''}. ${ups.length
    ? `${plural(ups.length, 'upcoming concert')} in Klang — the next is ${whenWhere(ups[0], T)}.`
    : 'No upcoming concerts in Klang right now.'}`;
  const followUps = [];
  const city = topCityOf(ups);
  if (city) addFollow(followUps, `Concerts in ${city.name} this weekend`);
  if (a.kind !== 'ensemble' && a.role) addFollow(followUps, `${cap1((ROLES.find((r) => r.roles.includes(a.role)) || {}).noun || 'performer')}s this weekend`);
  return { intent: 'artist', reply, items: [{ kind: 'artist', id: a.id }, ...concertItems(ups, MAX_ITEMS - 1)], followUps };
}

function answerPeople(p) {
  // "that Swiss composer" / "Swiss composers"
  if (p.nation) {
    const T = p.today;
    const comps = p.nation.ids.map((id) => repo.composer(id)).filter(Boolean)
      .map((c) => ({ c, n: upcomingFor({ composerId: c.id }, T).length }))
      .sort((a, b) => b.n - a.n || a.c.born - b.c.born);
    if (!comps.length) return { intent: 'people', reply: `Klang has no ${p.nation.label} in its repertoire yet.`, items: [], followUps: [] };
    const names = listJoin(comps.map(({ c }) => `${c.name} (${life(c)})`));
    const reply = comps.length === 1
      ? `That would be ${names}.`
      : `${p.nation.adj === 'Swiss' ? 'Switzerland’s composers in Klang' : `${p.nation.adj} composers in Klang`}: ${names}.${p.nation.singular ? ' Which one did you mean?' : ''}`;
    return {
      intent: 'people', reply,
      items: comps.slice(0, MAX_ITEMS).map(({ c }) => ({ kind: 'composer', id: c.id })),
      followUps: comps.slice(0, 3).map(({ c }) => `${c.short} concerts`),
    };
  }
  // "pianists", "conductors"
  const roles = new Set(p.roles.flatMap((r) => r.roles));
  const T = p.today;
  const people = repo.allArtists().filter((a) => roles.has(a.role))
    .map((a) => ({ a, n: upcomingFor({ artistId: a.id }, T).length }))
    .sort((x, y) => y.n - x.n || x.a.name.localeCompare(y.a.name));
  const noun = p.roles[0].noun;
  if (!people.length) return { intent: 'people', reply: `I couldn't find any ${noun}s in Klang's listings.`, items: [], followUps: [`${cap1(noun)}s this weekend`] };
  const demo = people.some(({ a }) => a.demo);
  return {
    intent: 'people',
    reply: `${plural(people.length, noun)} appear in Klang's listings${demo ? ' (demo names)' : ''} — here are the busiest.`,
    items: people.slice(0, MAX_ITEMS).map(({ a }) => ({ kind: 'artist', id: a.id })),
    followUps: [`${cap1(noun)}s this weekend`, `${cap1(noun)}s in Zurich`, `${cap1(noun)}s in Geneva`],
  };
}

function recordingTerm(p) {
  const w = p.works.length ? repo.work(p.works[0]) : null;
  const m = !w && p.missing.length ? p.missing[0] : null;
  const compId = w?.composerId || m?.composerId || (explainedComposers(p)[0] || p.composerIds[0]) || null;
  const comp = compId ? repo.composer(compId) : null;
  let base;
  let label;
  if (w) {
    base = p.performer ? shortTitle(w).includes(comp?.short || '~') ? shortTitle(w) : `${comp?.short || ''} ${shortTitle(w)}` : w.q || `${comp?.short || ''} ${w.title}`;
    label = shortTitle(w).startsWith(comp?.short || '~') ? shortTitle(w) : `${comp ? `${comp.short}'s ` : ''}${shortTitle(w)}`;
  } else if (m) {
    base = m.term;
    label = `${m.composerName || comp?.short || ''}${comp || m.composerName ? "'s " : ''}${m.title}`;
  } else if (comp) {
    const form = p.forms[0];
    base = `${comp.short}${form ? ` ${form.label.replace(/^an? /, '')}` : ''}`;
    label = form ? `${comp.short}'s ${form.label.replace(/^an? /, '')}` : comp.name;
  } else if (p.forms.length) {
    base = p.forms[0].label.replace(/^an? /, '');
    label = base;
  } else if (p.unknownRaw) {
    base = p.unknownRaw;
    label = `“${p.unknownRaw}”`;
  }
  if (!base && !p.performer) return null;
  const term = cleanPrompt([p.performer, base].filter(Boolean).join(' '));
  const loose = !w && !m && !comp;
  return { term, label: label || null, loose, workId: w?.id || null, composerId: comp?.id || null, performer: p.performer || null };
}

function answerRecording(p) {
  const rec = recordingTerm(p);
  if (!rec) {
    return {
      intent: 'recording',
      reply: 'Which recording are you after? Name a work or a performer — for example “Abbado’s Mahler 2” or “Winterreise recordings”.',
      items: [], followUps: ["Abbado's Mahler 2", 'Recordings of Winterreise', 'a slower Goldbergs'],
    };
  }
  const tempo = p.cues.tempo
    ? ' Apple’s catalogue doesn’t list tempos, so I can’t sort by speed — open a few and compare; timings differ a lot between performers.'
    : '';
  const what = rec.label ? `recordings ${rec.loose ? 'for' : 'of'} ${rec.label}${rec.performer ? ` with ${rec.performer}` : ''}` : `recordings with ${rec.performer}`;
  const reply = `${p.corrections.length ? `(Reading “${p.corrections[0][0]}” as ${p.corrections[0][1]}.) ` : ''}Here are ${what} on Apple Music — tap Listen to play one in full.${tempo}`;
  rec.label = rec.label || rec.performer;
  const items = [{ kind: 'recording', data: { ...rec, tempo: !!p.cues.tempo } }];
  if (rec.workId) items.push({ kind: 'work', id: rec.workId });
  else if (rec.composerId) items.push({ kind: 'composer', id: rec.composerId });
  const followUps = [];
  const w = rec.workId ? repo.work(rec.workId) : null;
  if (w) {
    addFollow(followUps, `${shortTitle(w)} concerts`);
    addFollow(followUps, `Tell me about ${shortTitle(w)}`);
  } else if (rec.composerId) {
    addFollow(followUps, `${repo.composer(rec.composerId).short} concerts`);
  }
  if (rec.performer && (w || rec.composerId)) addFollow(followUps, `Recordings of ${w ? shortTitle(w) : repo.composer(rec.composerId).short}`);
  return { intent: 'recording', reply, items, followUps };
}

function answerUnknown(p) {
  const term = p.unknownRaw || p.unknown.join(' ');
  if (!term) return answerHelp();
  const res = repo.search(term, MAX_ITEMS);
  const items = [
    ...res.composers.map((c) => ({ kind: 'composer', id: c.id })),
    ...res.works.map((w) => ({ kind: 'work', id: w.id })),
    ...res.artists.map((a) => ({ kind: 'artist', id: a.id })),
    ...res.venues.map((v) => ({ kind: 'venue', id: v.id })),
    ...res.cities.map((c) => ({ kind: 'city', id: c.id })),
  ].slice(0, 4);
  items.push(...concertItems(res.concerts, MAX_ITEMS - items.length));
  if (items.length) {
    return {
      intent: 'search',
      reply: `Here's what I found for “${term}” in Klang's listings.`,
      items,
      followUps: ['Concerts this weekend', 'Chamber music in Geneva this weekend'],
    };
  }
  const looksLikeName = /[A-ZÀ-Ý]/.test(term) || p.unknown.length <= 3;
  if (looksLikeName) {
    return {
      intent: 'unknown',
      reply: `I couldn't find “${term}” in Klang's Swiss listings — performers here come from the concerts on this device. If it's an artist or a work, here are recordings on Apple Music.`,
      items: [{ kind: 'recording', data: { term, label: `“${term}”`, performer: null } }],
      followUps: ['Concerts this weekend', 'that Swiss composer', 'Any Mahler in Zurich in November'],
    };
  }
  return answerHelp(`I'm not sure what you mean by “${term}”.`);
}

const HELP_PROMPTS = ['Any Mahler in Zurich in November', 'chamber music in Geneva this weekend', 'Winterreise', "Abbado's Mahler 2"];
function answerHelp(prefix = '') {
  return {
    intent: 'help',
    reply: `${prefix ? `${prefix} ` : ''}I can find concerts, people, works and recordings — by composer, work, city, venue, date or type. Everything runs on this device; nothing you type is sent anywhere. Try one of these:`,
    items: [],
    followUps: HELP_PROMPTS,
  };
}

function answerCode(raw, today) {
  let t = raw.trim().replace(/^(?:concert )?code[:\s]+/i, '').trim();
  const urlM = t.match(/concert\/([^/?#\s]+)/);
  if (urlM) t = decodeURIComponent(urlM[1]);
  t = t.replace(/^#/, '').toLowerCase();
  if (!/^[a-z0-9][\w.:-]*$/.test(t) || !/\d/.test(t) || !/[-_]/.test(t)) return null;
  const candidates = [t, `demo-${t}`];
  const short = t.match(/^(?:demo-)?([a-z-]+?)-(p?)(\d{1,3})$/);
  if (short) candidates.push(`demo-${short[1]}-${short[2]}${short[3].padStart(3, '0')}`);
  const c = candidates.map((id) => repo.concert(id)).find(Boolean);
  if (!c) {
    return /^(?:concert )?code\b/i.test(raw.trim())
      ? { intent: 'code', reply: `I couldn't find a concert with the code “${t}”. Codes are shown on each concert page.`, items: [], followUps: ['Concerts this weekend'] }
      : null;
  }
  const city = repo.city(c.cityId)?.name;
  return {
    intent: 'code',
    reply: `That's “${c.title}” — ${whenWhere(c, today)}${city ? `, ${city}` : ''}.`,
    items: [{ kind: 'concert', id: c.id }],
    followUps: [],
  };
}

function feedbackKind(q) {
  if (/ (city|town) /.test(q)) return 'city';
  if (/ (venue|hall|church|festival|theatre|theater) /.test(q)) return 'venue';
  if (/ (bug|broken|error|crash|wrong|doesnt work|not working) /.test(q)) return 'bug';
  if (/ (suggest|suggestion|idea|would be|wish|should|please add|could you|can you) /.test(q)) return 'suggestion';
  return 'feedback';
}
const FEEDBACK_LABEL = { city: 'city proposal', venue: 'venue proposal', bug: 'bug report', suggestion: 'suggestion', feedback: 'feedback' };

function answerFeedback(raw, q, { forced = false } = {}) {
  const body = raw.replace(/^\s*(feedback|suggestions?|ideas?|bug|requests?|issues?|problems?|proposal)\s*[:\-–—]\s*/i, '').trim();
  const content = prep(body).replace(/^(feedback|suggestions?|suggest|ideas?|bug|issue|problem|request|propose|proposal|please add|add|claim)( (a|an|the|new))?( (city|venue|hall|festival|church|artist))?/, '').trim();
  if (!forced && content.replace(/\s+/g, '').length < 3) {
    return {
      intent: 'feedback',
      reply: 'Sure — write your feedback, idea, or the city or venue you’d like Klang to cover, and I’ll keep it on this device.',
      items: [], followUps: [], expect: 'feedback',
    };
  }
  const kind = feedbackKind(q);
  return {
    intent: 'feedback',
    reply: `Thank you — I've saved your ${FEEDBACK_LABEL[kind]} on this device. Klang has no server, so nothing is sent; ask for “my notes” any time to see what you've written.`,
    items: [],
    followUps: ['My notes', 'Concerts this weekend'],
    feedback: { kind, text: raw.trim() },
  };
}

function answerNotes() {
  const notes = feedbackNotes();
  if (!notes.length) return { intent: 'notes', reply: 'You haven’t left any notes yet. Type “feedback:” followed by your idea, or propose a city or venue.', items: [], followUps: ['Propose a venue'] };
  const lines = notes.slice(0, 5).map((n) => `• ${n.text}`).join('\n');
  return {
    intent: 'notes',
    reply: `Your ${plural(notes.length, 'note')} on this device${notes.length > 5 ? ' (latest 5)' : ''}:\n${lines}`,
    items: [], followUps: [],
  };
}

function answerMine(today) {
  const ids = uniq([...store.markedIds('going'), ...store.markedIds('saved')]);
  const list = repo.query({ from: today, ids, includeHidden: true });
  if (!list.length) {
    return { intent: 'mine', reply: "You haven't saved any upcoming concerts yet — tap Save or Going on a concert and it shows up here.", items: [], followUps: ['Concerts this weekend'] };
  }
  const going = list.filter((c) => store.isMarked(c.id, 'going')).length;
  return {
    intent: 'mine',
    reply: `You have ${plural(list.length, 'upcoming concert')} saved${going ? ` (${going} marked Going)` : ''} — the next is ${whenWhere(list[0], today)}.`,
    items: concertItems(list),
    followUps: [],
  };
}

// ---------- main entry ----------
export function answer(text, { today = todayKey(), expect = null } = {}) {
  const raw = String(text || '').trim();
  const q = pad(prep(raw));
  if (expect === 'feedback') {
    if (/^ (cancel|never mind|nevermind|no|stop|forget it) $/.test(q)) return { intent: 'thanks', reply: 'No problem — nothing saved.', items: [], followUps: HELP_PROMPTS.slice(0, 2) };
    if (raw) return answerFeedback(raw, q, { forced: true });
  }
  if (!q.trim()) return answerHelp();
  const t = q.trim();
  if (RE_HELLO.test(t)) return { ...answerHelp(), reply: 'Hello! Just say what you’re after — a concert, a person, a work or a recording. Everything stays on this device.' };
  if (RE_HELP.test(t)) return answerHelp();
  if (RE_THANKS.test(t)) return { intent: 'thanks', reply: "You're welcome! Ask me anything else about concerts in Switzerland.", items: [], followUps: HELP_PROMPTS.slice(0, 2) };
  if (RE_NOTES.test(t)) return answerNotes();
  const code = answerCode(raw, today);
  if (code) return code;
  if (RE_FEEDBACK.test(t) || RE_FEEDBACK_RAW.test(raw) || RE_FEEDBACK_ANY.test(q)) return answerFeedback(raw, q);
  if (RE_MINE.test(q)) return answerMine(today);

  const p = parse(raw, { today });
  const hasPlace = p.cityIds.length > 0 || p.venueIds.length > 0;
  const hasWhen = !!(p.date || p.part || p.weekday != null);
  const hasProgram = p.works.length || p.missing.length || p.composerIds.length || p.forms.length;
  const strongRecording = RE_RECORDING_STRONG.test(p.q);
  const recordingCueOf = () => p.cues.recording || (p.performer && (p.works.length || p.missing.length || p.composerIds.length));
  const liveCue = p.cues.live || hasPlace || hasWhen || p.types.length || p.featured;
  // "Gould Goldbergs", "Kavakos Brahms": an unknown capitalised name next to music -> a performer
  if (!p.performer && !liveCue && !p.nation && !p.period && (p.works.length || p.missing.length || p.composerIds.length) &&
      p.unknown.length && p.unknown.length <= 3 && /^[A-ZÀ-Ý]/.test(p.unknownRaw) && !p.unknownPlace) {
    p.performer = p.unknownRaw;
    p.unknown = [];
    p.unknownRaw = '';
  }

  if (recordingCueOf() && (strongRecording || p.performer || !p.cues.live) && !hasPlace && !hasWhen) return answerRecording(p);
  if (liveCue || (p.roles.length && (hasPlace || hasWhen)) || (p.period && !p.nation)) {
    // place-only questions ("Tonhalle", "Geneva") lead with the place itself
    const placeOnly = hasPlace && !hasProgram && !p.artists.length && !p.roles.length && !p.types.length && !hasWhen && !p.featured;
    const rows = [];
    if (placeOnly) {
      if (p.venueIds.length) uniq(p.venueIds).slice(0, 2).forEach((id) => rows.push({ kind: 'venue', id }));
      else if (p.cityIds.length <= 2 && !p.near) p.cityIds.forEach((id) => rows.push({ kind: 'city', id }));
    }
    const res = answerConcerts(p, { entityRows: rows });
    if (placeOnly && res.items.length > rows.length) {
      const n = findConcerts(p).length;
      const count = n === 1 ? 'one upcoming concert' : `${n.toLocaleString('en-US')} upcoming concerts`;
      const tail = n > MAX_ITEMS - rows.length ? 'here are the next ones' : n === 1 ? 'here it is' : 'here they are';
      const named = p.venueIds.length ? venueGroupLabel(p.venueIds) : rows.length ? p.placeLabel : '';
      const where = p.placeLabel.startsWith('near ') ? p.placeLabel : `in ${p.placeLabel}`;
      res.reply = named
        ? `${introNote(p)}${named} has ${count} in Klang — ${tail}.`
        : `${introNote(p)}There ${n === 1 ? 'is' : 'are'} ${count} ${where} — ${tail}.`;
    }
    return res;
  }
  if (p.nation) return answerPeople(p);
  if (p.works.length || p.missing.length) return answerWorks(p);
  if (p.composerIds.length) return answerComposers(p);
  if (p.artists.length) return answerArtists(p);
  if (p.roles.length) return answerPeople(p);
  if (p.forms.length) return answerConcerts(p);
  if (p.unknown.length || p.performer) {
    if (p.performer && !p.unknown.length) return answerRecording(p);
    return answerUnknown(p);
  }
  return answerHelp();
}

// ---------- feedback notes (this device only) ----------
export function feedbackNotes() {
  const list = storage.get(NOTES_KEY, []);
  return Array.isArray(list) ? list.filter((n) => n && typeof n.text === 'string') : [];
}

export function saveFeedback(note) {
  if (!note || !note.text) return;
  const list = [{ kind: note.kind || 'feedback', text: String(note.text).slice(0, 2000), at: new Date().toISOString() }, ...feedbackNotes()].slice(0, 100);
  storage.set(NOTES_KEY, list);
}
