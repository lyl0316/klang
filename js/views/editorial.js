// Editorials (Sheng §3.6): the list of original essays, grouped by month, and the article reader.
//   #/editorials               -> renderList({})               all editorials, filter by type
//   #/editorials/<composerId>  -> renderList({ composerId })   "<Composer> · Editorials": All / Featured / Mentioned
//   #/article/<id>             -> renderArticle({ id })
// Content: ARTICLES from js/content/editorials.js (may still be empty — elegant empty state).
// Recording embeds use the free iTunes Search API (metadata only) with the iTunes credit; Klang plays
// no audio — Play all and each embed open the recording in Apple Music Classical (or Apple Music),
// which plays it in full. Ratings, saves and the article playlist stay on this device.
// No community features: no comments, reactions or public reviews.

import { h, icon, toast, plural } from '../util.js';
import * as repo from '../repo.js';
import * as store from '../store.js';
import { ARTICLES } from '../content/editorials.js';
import { searchAlbums, albumTracks, classicalSearchURL } from '../music.js';
import { listenLink, makePiece, workPiece, pieceURL, toPlain, onListening, playAppName, APPLE_CREDIT, refineQueued } from '../applemusic.js';
import { openSaveSheet } from '../ui/save.js';
import { searchTerm, matchWorkTracks } from '../ui/listen.js';
import { openSheet } from '../ui/sheet.js';
import { href, chip, emptyState, venueLabel, cityLabel, withFace } from '../ui/components.js';
import { openReport } from './entity.js';
import { todayKey, dayKeyOf, timeOf, monthShort, monthLong, dayNum, yearOf, weekdayShort } from '../time.js';

const SEARCH_LIMIT = 25; // same as listen.js, so one cached iTunes search serves both
const TYPE_LABEL = { essay: 'Essay', city: 'City', 'on-a-work': 'On a work', 'on-a-form': 'On a form' };
const TYPE_ORDER = ['Essay', 'City', 'On a work', 'On a form'];

// ---------- data helpers ----------
const articles = () => (Array.isArray(ARTICLES) ? ARTICLES : []).filter((a) => a && a.id != null && a.title);
const findArticle = (id) => articles().find((a) => String(a.id) === String(id));
const validDay = (d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);
const byDateDesc = (a, b) =>
  String(validDay(b.date) ? b.date : '').localeCompare(String(validDay(a.date) ? a.date : '')) || String(a.title).localeCompare(String(b.title));
const typeLabel = (t) => (t ? TYPE_LABEL[String(t).toLowerCase()] || String(t) : '');
const articleHref = (id) => `#/article/${encodeURIComponent(id)}`;
const safeUrl = (u) => typeof u === 'string' && /^https?:\/\//i.test(u);
const stripMarks = (s) => String(s || '').replace(/_([^_\n]+)_/g, '$1');

function recordingBlocks(a) {
  return (a.blocks || []).filter((b) => b && b.type === 'recording' && repo.work(b.workId));
}

// Works of the recording blocks, in article order, each once.
function recordingWorks(a) {
  const seen = new Set();
  const out = [];
  for (const b of recordingBlocks(a)) {
    if (seen.has(b.workId)) continue;
    seen.add(b.workId);
    out.push(repo.work(b.workId));
  }
  return out;
}

// Every composer an article touches: its composerIds, people, works and blocks.
function composerIdsOf(a) {
  const ids = new Set((a.composerIds || []).filter(Boolean));
  for (const p of a.people || []) if (p && p.composerId) ids.add(p.composerId);
  for (const id of a.workIds || []) {
    const w = repo.work(id);
    if (w) ids.add(w.composerId);
  }
  for (const b of a.blocks || []) {
    if (!b) continue;
    if (b.workId) {
      const w = repo.work(b.workId);
      if (w) ids.add(w.composerId);
    }
    if (b.composerId) ids.add(b.composerId);
  }
  return ids;
}
const isFeatured = (a, cid) => (a.composerIds || [])[0] === cid;
const mentions = (a, cid) => composerIdsOf(a).has(cid);

function fmtDay(d) {
  if (!validDay(d)) return '';
  const base = `${monthShort(d)} ${dayNum(d)}`;
  return yearOf(d) === yearOf(todayKey()) ? base : `${base}, ${yearOf(d)}`;
}
const fmtLongDay = (d) => (validDay(d) ? `${dayNum(d)} ${monthLong(d.slice(0, 7))} ${yearOf(d)}` : '');

// Inline emphasis: _italic_ -> <em>. Everything else is plain text.
function rich(text) {
  const out = [];
  String(text || '').split(/(_[^_\n]+_)/g).forEach((part, i) => {
    if (!part) return;
    out.push(i % 2 === 1 ? h('em', {}, part.slice(1, -1)) : part);
  });
  return out;
}

// "Johann Sebastian Bach" -> "JB", "Les Délices" -> "LD"
function monogram(name) {
  const words = String(name || '').split(/\s+/).filter((w) => /^[A-ZÀ-ÝŒ]/.test(w));
  if (!words.length) return (String(name || '?').trim()[0] || '?').toUpperCase();
  return words.length === 1 ? words[0][0] : words[0][0] + words[words.length - 1][0];
}

// ---------- line-art header illustrations (static, trusted markup) ----------
function scoreArt() {
  const staves = [58, 92].flatMap((y0) => [[36, 110], [130, 204]].map(([x1, x2]) =>
    [0, 4, 8, 12, 16].map((d) => `M${x1} ${y0 + d}H${x2}`).join(''))).join('');
  const bars = 'M73 58V74M110 58V74M73 92V108M110 92V108M167 58V74M204 58V74M167 92V108M204 92V108M36 58V74M36 92V108M130 58V74M130 92V108';
  const notes = [[45, 70], [54, 66], [63, 62], [82, 64], [91, 68], [100, 72], [45, 100], [56, 96], [64, 104], [84, 98], [96, 94],
    [140, 66], [150, 62], [158, 68], [176, 70], [186, 64], [196, 60], [140, 98], [150, 102], [160, 96], [178, 94], [192, 100]];
  const heads = notes.map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="2.9" ry="2.1" transform="rotate(-20 ${x} ${y})" fill="currentColor" stroke="none"/>`).join('');
  const stems = notes.map(([x, y]) => `M${x + 2.6} ${y}V${y - 12}`).join('');
  return `<path d="M120 44Q86 30 26 38V132Q86 124 120 140Z"/><path d="M120 44Q154 30 214 38V132Q154 124 120 140"/>` +
    `<path d="M26 132V137Q86 129 120 145Q154 129 214 137V132" opacity=".7"/>` +
    `<path d="${staves}" opacity=".5"/><path d="${bars}" opacity=".6"/>${heads}<path d="${stems}"/>` +
    `<path d="M234 108C216 116 192 132 170 154"/><path d="M234 108C224 106 206 116 190 134M234 108C232 118 220 132 202 144" opacity=".8"/><path d="M170 154L165 158"/>`;
}

function organArt() {
  const tops = [58, 64, 70, 74, 64, 50, 36, 50, 64, 74, 70, 64, 58];
  const pipes = tops.map((top, i) => {
    const x = 50 + i * 11;
    return `M${x} ${top}V108M${x + 8} ${top}V108M${x} ${top}H${x + 8}M${x} 108L${x + 4} 116L${x + 8} 108M${x + 1.5} 100L${x + 4} 96L${x + 6.5} 100`;
  }).join('');
  return `<path d="M36 134V64Q36 54 46 50L120 22L194 50Q204 54 204 64V134"/><path d="${pipes}"/>` +
    `<path d="M36 118H204M36 134H204"/><path d="M58 124H182M58 129H182" opacity=".7"/><path d="M92 146H148M96 146V152M144 146V152"/>`;
}

const ART = {
  lake: '<circle cx="184" cy="38" r="12"/><path d="M60 40q4-4 8 0q4-4 8 0M82 30q3-3 6 0q3-3 6 0"/>' +
    '<path d="M16 100L50 70L64 80L98 44L124 72L138 62L168 86L186 76L224 100"/><path d="M88 55L98 44L108 55L102 52L97 58L93 53Z"/>' +
    '<path d="M12 100H228"/><path d="M30 112H72M90 112H102M146 112H200M48 124H88M154 124H182M66 136H96M118 136H150M94 148H130" opacity=".7"/>' +
    '<path d="M104 122H140L133 129H111Z"/><path d="M122 122V90"/><path d="M122 92L137 119H122Z"/><path d="M120 97L109 119H120Z"/>',
  mountains: '<circle cx="198" cy="34" r="9"/><path d="M150 30q3-3 6 0q3-3 6 0"/>' +
    '<path d="M8 132L58 62L82 92L120 30L160 86L178 66L232 132"/><path d="M48 76L58 62L68 76L63 72L58 78L53 72Z"/>' +
    '<path d="M107 51L120 30L135 51L128 46L120 54L113 46Z"/><path d="M172 73L178 66L184 73L178 70Z"/>' +
    '<path d="M120 54L114 80M120 54L128 76M58 78L62 98" opacity=".6"/><path d="M8 132H232"/>' +
    '<path d="M22 132L28 114L34 132M28 132V136M40 132L45 119L50 132M45 132V135M200 132L206 112L212 132M206 132V136M216 132L220 121L224 132"/>' +
    '<path d="M134 132V118L146 110L158 118V132M130 121L146 107L162 121M143 132V124H149V132"/>',
  train: '<circle cx="52" cy="28" r="8"/><path d="M8 54H232"/><path d="M24 54V98M216 54V98" opacity=".7"/><path d="M8 98H232M8 104H232"/>' +
    '<path d="M16 150V126A18 18 0 0 1 52 126V150M59 150V126A18 18 0 0 1 95 126V150M102 150V126A18 18 0 0 1 138 126V150M145 150V126A18 18 0 0 1 181 126V150M188 150V126A18 18 0 0 1 224 126V150"/>' +
    '<path d="M4 150H236" opacity=".6"/><rect x="30" y="74" width="54" height="20" rx="4"/><rect x="88" y="74" width="54" height="20" rx="4"/>' +
    '<path d="M146 94V78Q146 74 150 74H194Q204 74 209 84L212 94Z"/>' +
    '<path d="M37 79h8v6h-8zM51 79h8v6h-8zM65 79h8v6h-8zM95 79h8v6h-8zM109 79h8v6h-8zM123 79h8v6h-8zM154 79h8v6h-8zM197 78h6l4 7h-10z"/>' +
    '<path d="M30 89H84M88 89H142M146 89H210" opacity=".6"/>' +
    '<circle cx="40" cy="96" r="2.4"/><circle cx="74" cy="96" r="2.4"/><circle cx="98" cy="96" r="2.4"/><circle cx="132" cy="96" r="2.4"/><circle cx="158" cy="96" r="2.4"/><circle cx="200" cy="96" r="2.4"/>' +
    '<path d="M168 74L176 64L184 74M176 64V57M170 56H182"/>',
  violin: '<g transform="rotate(-14 110 80)">' +
    '<path d="M110 50C122 50 134 52 134 64C134 74 124 76 124 86C124 96 138 98 138 116C138 134 124 140 110 140C96 140 82 134 82 116C82 98 96 96 96 86C96 76 86 74 86 64C86 52 98 50 110 50Z"/>' +
    '<path d="M106 18L105 86H115L114 18"/><path d="M106 18V12M114 18V12"/><circle cx="110" cy="8" r="5"/><path d="M108 8a2 2 0 1 1 2 2"/>' +
    '<path d="M104 13H99M116 13H121M104 17H100M116 17H120"/><path d="M100 94c-3 6 3 12 0 18M120 94c3 6-3 12 0 18"/>' +
    '<path d="M101 106H119"/><path d="M106 122H114L112 136H108Z"/><path d="M108 18V122M112 18V122" opacity=".6"/></g>' +
    '<path d="M150 152Q182 90 214 14"/><path d="M156 150L218 18" opacity=".7"/><path d="M146 146L154 150L151 156L143 152Z"/>',
  piano: '<path d="M224 22V8L234 10V20"/><circle cx="221.5" cy="22" r="2.6" fill="currentColor" stroke="none"/><circle cx="231.5" cy="20" r="2.6" fill="currentColor" stroke="none"/>' +
    '<path d="M86 90L180 36Q198 28 206 42L216 90"/><path d="M146 90L160 48"/><path d="M50 90L58 72H80L76 90"/>' +
    '<path d="M36 90H202Q216 90 216 100V106H36Z"/><path d="M22 92H36M22 92V99H36"/>' +
    '<path d="M42 106V138M39 138H46M198 106V138M195 138H202M130 106V132"/><path d="M86 106L84 126H96L94 106M84 130H96"/>' +
    '<path d="M4 108H26V112H4ZM6 112V138M24 112V138"/><path d="M4 140H236" opacity=".5"/>',
  villa: '<circle cx="206" cy="34" r="8"/><path d="M8 124H232"/>' +
    '<path d="M28 136H60M84 136H128M150 136H178M52 148H96M122 148H150M190 146H214" opacity=".7"/>' +
    '<path d="M72 124V76H168V124"/><path d="M64 78L120 46L176 78"/><path d="M146 61V44H154V65.5"/><circle cx="120" cy="63" r="5"/>' +
    '<path d="M82 86h10v14h-10zM100 86h10v14h-10zM130 86h10v14h-10zM148 86h10v14h-10zM82 106h10v14h-10zM148 106h10v14h-10z"/>' +
    '<path d="M114 124V110Q120 104 126 110V124"/><path d="M46 124C38 104 40 82 48 64C56 82 58 104 50 124Z"/>' +
    '<path d="M30 124C25 110 27 96 32 86C37 96 39 110 34 124Z"/><circle cx="198" cy="98" r="16"/><path d="M198 114V124"/>',
  organ: organArt(),
  score: scoreArt(),
};

function illustration(key, cls = '') {
  const art = ART[String(key || '').toLowerCase()] || ART.score;
  return h('div', {
    class: ['ed-illus', cls],
    'aria-hidden': 'true',
    html: `<svg viewBox="0 0 240 160" width="240" height="160" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${art}</svg>`,
  });
}

// =====================================================================
// LIST
// =====================================================================
const filterMemo = new Map(); // scope ('' or composerId) -> active chip, kept while the app is open

export function renderList({ composerId } = {}) {
  const comp = composerId ? repo.composer(composerId) : null;
  const all = articles().sort(byDateDesc);
  const scope = comp ? all.filter((a) => mentions(a, comp.id)) : all;
  const title = comp ? `${comp.name} · Editorials` : 'Editorials';
  const body = h('div', { class: 'ed-list-page' });

  if (!all.length) {
    body.append(h('div', { class: 'ed-empty' },
      illustration('score', 'small'),
      h('h3', {}, 'The first editorials are on their way'),
      h('p', {}, 'Essays on works, musical forms and Switzerland’s music cities — written for Klang, with their sources — will appear here.'),
      h('a', { class: 'btn small', href: '#/concerts' }, icon('calendar', 15), 'Browse concerts')));
    return { title, back: true, body };
  }
  if (comp && !scope.length) {
    body.append(emptyState('book', `No editorials on ${comp.short || comp.name} yet`,
      'New essays are added regularly. Meanwhile, the others are a good read.',
      h('a', { class: 'btn small', href: '#/editorials' }, 'All editorials')));
    return { title, back: true, body };
  }

  let filters;
  if (comp) {
    const featured = scope.filter((a) => isFeatured(a, comp.id));
    filters = [
      { key: 'all', label: 'All', items: scope },
      { key: 'featured', label: 'Featured', items: featured },
      { key: 'mentioned', label: 'Mentioned', items: scope.filter((a) => !isFeatured(a, comp.id)) },
    ];
  } else {
    const rank = (t) => (TYPE_ORDER.indexOf(t) + 1) || 99;
    const types = [...new Set(scope.map((a) => typeLabel(a.type)).filter(Boolean))].sort((x, y) => rank(x) - rank(y) || x.localeCompare(y));
    filters = [{ key: 'all', label: 'All', items: scope },
      ...types.map((t) => ({ key: t, label: t, items: scope.filter((a) => typeLabel(a.type) === t) }))];
  }

  const memoKey = comp ? comp.id : '';
  let active = filterMemo.get(memoKey) || 'all';
  if (!filters.some((f) => f.key === active)) active = 'all';

  const chipsRow = h('div', { class: 'chip-row ed-chips', role: 'toolbar', 'aria-label': 'Filter editorials' });
  const listEl = h('div', { class: 'ed-list' });
  const paint = () => {
    chipsRow.replaceChildren(...filters.map((f) => chip(f.label, {
      active: f.key === active,
      count: f.items.length,
      onClick: () => {
        active = f.key;
        filterMemo.set(memoKey, active);
        paint();
      },
    })));
    const items = filters.find((f) => f.key === active).items;
    listEl.replaceChildren(...(items.length ? monthGroups(items)
      : [h('p', { class: 'ed-none' }, active === 'featured' ? 'No editorial is centred on this composer yet.' : 'Nothing here yet.')]));
  };
  paint();

  if (filters.length > 1) body.append(chipsRow);
  body.append(listEl);
  return { title, back: true, body };
}

function monthGroups(items) {
  const groups = [];
  for (const a of items) {
    const key = validDay(a.date) ? a.date.slice(0, 7) : '';
    let g = groups[groups.length - 1];
    if (!g || g.key !== key) groups.push((g = { key, items: [] }));
    g.items.push(a);
  }
  return groups.map((g) => h('section', { class: 'ed-month' },
    h('h2', { class: 'ed-month-h' }, g.key ? `${monthLong(g.key)} ${g.key.slice(0, 4)}` : 'Undated'),
    h('div', { class: 'ed-group' }, g.items.map(articleRow))));
}

function articleRow(a) {
  const n = recordingWorks(a).length; // unique works = what the article playlist plays
  return h('a', { class: 'ed-row', href: articleHref(a.id) },
    h('div', { class: 'main' },
      h('div', { class: 't' }, rich(a.title)),
      a.dek && h('div', { class: 'd' }, rich(a.dek)),
      h('div', { class: 'meta' },
        a.type && h('span', { class: 'ed-type' }, typeLabel(a.type)),
        validDay(a.date) && h('span', { class: 'ed-date' }, fmtDay(a.date)),
        n > 0 && h('span', { class: 'ed-recs' }, `${plural(n, 'recording')} ▸`))),
    icon('chevron', 16, 'faint'));
}

// =====================================================================
// ARTICLE
// =====================================================================
export function renderArticle({ id } = {}) {
  const a = findArticle(id);
  if (!a) {
    return {
      title: 'Editorial',
      back: true,
      body: emptyState('book', 'Article not found', 'It may have been renamed or taken down.',
        h('a', { class: 'btn small', href: '#/editorials' }, 'All editorials')),
    };
  }

  // Klang plays no audio: the recordings pill (Play all) and each embed's cover and caption are
  // real links that open the recording in Apple Music Classical (or Apple Music, chosen in Me).
  const ctx = {
    article: a,
    cards: [], // recording embeds { work, el, save }
    pieces: new Map(), // workId -> the piece its links play (updated in place once the recording is found)
    links: new Map(), // workId -> listen links that play it
    lookups: new Map(), // workId -> Promise<{ album, piece } | null>
    chain: Promise.resolve(), // lookups run one at a time
    alive: true,
  };

  const works = recordingWorks(a);
  for (const w of works) ctx.pieces.set(w.id, searchPiece(w));
  // Count unique works, not recording blocks: a work can have two captioned blocks, but the pill
  // (and the Library playlist) play one recording per work.
  const nRec = works.length;

  // --- header: Play all pill + add, title, dek
  // Play all = the first recording, with the others queued in article order (the mini player's
  // ⏭ opens the next one in Apple Music).
  const queue = works.map((w) => ctx.pieces.get(w.id));
  const pill = nRec ? listenLink(queue[0], [plural(nRec, 'recording'), icon('play', 10)], {
    cls: 'ed-recpill',
    queue,
    index: 0,
    label: `Play all ${plural(nRec, 'recording')} from this article in ${playAppName()}`,
  }) : null;
  if (pill) ctx.links.set(works[0].id, [pill]);

  const titleEl = h('h1', { class: 'ed-title' }, rich(a.title));
  const head = h('header', { class: 'ed-head' },
    illustration(a.illustration),
    nRec ? h('div', { class: 'ed-actions' }, pill, addButton(a, ctx, works)) : h('div', { class: 'ed-actions-gap' }),
    nRec ? h('p', { class: 'ed-listen-note' }, `Plays in full in ${playAppName()}`) : null,
    titleEl,
    a.dek && h('p', { class: 'ed-dek' }, rich(a.dek)));

  // --- body
  const bodyEl = h('div', { class: 'ed-body' }, (a.blocks || []).map((b) => renderBlock(b, ctx)));
  const credit = works.length ? h('p', { class: 'ed-credit' }, APPLE_CREDIT, ' ',
    h('a', { href: classicalSearchURL(searchTerm(works[0])), target: '_blank', rel: 'noopener' }, 'Open Apple Music Classical'), '.') : null;

  const root = h('article', { class: 'ed-article' },
    head,
    peopleSection(a),
    h('hr', { class: 'ed-rule' }),
    bodyEl,
    endMatter(a, credit));

  // Find every recording now, in article order, so that Play all is ready when tapped.
  for (const w of works) resolveWork(ctx, w).catch(() => {});

  // Header title fades in once the big title has scrolled away (CSS in shell.css).
  const onScroll = () => root.classList.toggle('ed-scrolled', titleEl.getBoundingClientRect().bottom < 64);
  window.addEventListener('scroll', onScroll, { passive: true });

  // The recording you last opened in Apple Music lights up; the pill too while its run is playing.
  const workIds = works.map((w) => w.id).join(' ');
  const unListen = onListening((L) => {
    const wid = L.current?.workId;
    for (const c of ctx.cards) c.el.classList.toggle('is-current', !!wid && c.work.id === wid);
    pill?.classList.toggle('on', L.queue.length > 1 && L.queue.map((p) => p.workId).join(' ') === workIds);
  });
  const unStore = store.subscribe((topic) => {
    if (topic === 'library') ctx.cards.forEach((c) => c.save.paint());
  });

  const shareBtn = h('button', { class: 'icon-btn ed-share', type: 'button', 'aria-label': 'Share this article', onclick: () => shareArticle(a) }, icon('share', 18));

  return {
    title: stripMarks(a.title),
    back: true,
    actions: [shareBtn],
    body: root,
    cleanup() {
      window.removeEventListener('scroll', onScroll);
      ctx.alive = false;
      unListen();
      unStore();
    },
  };
}

// ---------- recordings (Apple Music) ----------
// A work's links start as an Apple Music search for it, then point at your version (Versions on
// the work page; else the first recording found) at the work's first track.
function searchPiece(work) {
  return makePiece({ title: work.title, composer: repo.composer(work.composerId)?.name || null, workId: work.id });
}

async function lookupWork(work) {
  const albums = await searchAlbums(searchTerm(work), SEARCH_LIMIT);
  const chosen = store.listenChoice(work.id); // the version picked on the work page, if any
  const album = albums.find((x) => String(x.id) === String(chosen)) || albums[0] || null;
  if (!album) return null;
  let first = null;
  try {
    first = matchWorkTracks(work, (await albumTracks(album.id)).tracks)?.tracks[0] || null;
  } catch {
    // no track list: the links open the album
  }
  return { album, piece: workPiece(work, repo.composer(work.composerId)?.name, album, first) };
}

function resolveWork(ctx, work) {
  if (!ctx.lookups.has(work.id)) {
    const p = ctx.chain.then(() => (ctx.alive ? lookupWork(work) : null)).then((res) => {
      const piece = ctx.pieces.get(work.id);
      if (res && piece) {
        Object.assign(piece, res.piece);
        for (const link of ctx.links.get(work.id) || []) link.href = pieceURL(piece);
        refineQueued(piece); // Play all tapped before this lookup finished: fix its ⏭ target
      }
      return res;
    });
    ctx.chain = p.catch(() => {});
    ctx.lookups.set(work.id, p);
  }
  return ctx.lookups.get(work.id);
}

const pieceOf = (ctx, work) => {
  if (!ctx.pieces.has(work.id)) ctx.pieces.set(work.id, searchPiece(work));
  return ctx.pieces.get(work.id);
};

function addLink(ctx, work, link) {
  if (!ctx.links.has(work.id)) ctx.links.set(work.id, []);
  ctx.links.get(work.id).push(link);
  return link;
}

// ---------- header pieces ----------
function addButton(a, ctx, works) {
  const id = `article-${a.id}`;
  const btn = h('button', { class: 'ed-add', type: 'button' });
  const paint = () => {
    const on = store.hasPlaylist(id);
    btn.classList.toggle('on', on);
    btn.replaceChildren(icon(on ? 'check' : 'plus', 17));
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.setAttribute('aria-label', on ? 'Remove this article’s playlist from your Library' : 'Add this article’s playlist to your Library');
  };
  btn.addEventListener('click', () => {
    // Plain pieces (applemusic.js), so Library plays each one in Apple Music Classical.
    const items = works.map((w) => toPlain(pieceOf(ctx, w)));
    const on = store.togglePlaylist({ id, name: stripMarks(a.title), kind: 'article', articleId: a.id, items });
    toast(on ? 'Added to Library · Playlists' : 'Removed from your Library');
    paint();
  });
  paint();
  return btn;
}

function peopleSection(a) {
  let people = (a.people || []).filter((p) => p && p.name);
  if (!people.length) {
    people = (a.composerIds || []).map((cid) => repo.composer(cid)).filter(Boolean).map((c) => ({ name: c.name, composerId: c.id }));
  }
  if (!people.length) return null;
  return h('section', { class: 'ed-people-sec', 'aria-label': 'In this article' },
    h('div', { class: 'caps-label' }, 'In this article'),
    h('div', { class: 'ed-people' }, people.map((p) => {
      const inner = [withFace(h('span', { class: 'ed-pav', 'aria-hidden': 'true' }), p.name, p.composerId, monogram(p.name)), h('span', { class: 'n' }, p.name)];
      const to = p.composerId && repo.composer(p.composerId) ? href.composer(p.composerId)
        : p.artistId && repo.artist(p.artistId) ? href.artist(p.artistId) : null;
      return to ? h('a', { class: 'ed-person', href: to }, inner) : h('span', { class: 'ed-person' }, inner);
    })));
}

// ---------- body blocks ----------
function renderBlock(b, ctx) {
  if (!b || typeof b !== 'object') return null;
  switch (b.type) {
    case 'p':
      return h('p', {}, rich(b.text));
    case 'h':
      return h('h2', { class: 'ed-h' }, rich(b.text));
    case 'quote':
      return h('blockquote', { class: 'ed-quote' },
        h('p', {}, rich(b.text)),
        b.cite && h('cite', {}, b.cite));
    case 'recording':
      return recordingEmbed(b, ctx);
    case 'work': {
      const w = repo.work(b.workId);
      return w ? h('div', { class: 'ed-workchip-wrap' }, workChip(w, true)) : null;
    }
    case 'concerts':
      return concertsEmbed(b);
    case 'image':
      return safeUrl(b.src) ? h('figure', { class: 'ed-img' },
        h('img', { src: b.src, alt: b.alt || '', loading: 'lazy' }),
        b.caption && h('figcaption', {}, rich(b.caption))) : null;
    default:
      return null;
  }
}

function workChip(work, withCatalog = false) {
  const label = withCatalog ? [work.title, work.catalog].filter(Boolean).join(', ') : work.title;
  return h('a', { class: 'ed-workchip', href: href.work(work.id) }, h('span', { class: 'lbl' }, label), h('span', { class: 'arr', 'aria-hidden': 'true' }, '→'));
}

// "+ Save" under an embed: Save to Library (the album, and/or the piece into one of your playlists).
function saveControl(piece) {
  const btn = h('button', {
    class: 'ed-rec-save',
    type: 'button',
    onclick: (e) => {
      e.stopPropagation();
      openSaveSheet(piece);
    },
  });
  const paint = () => {
    const on = (piece.collectionId != null && store.hasAlbum(piece.collectionId)) ||
      store.userPlaylists().some((pl) => (pl.items || []).some((it) => it.id === piece.id));
    btn.classList.toggle('on', on);
    btn.replaceChildren(icon(on ? 'check' : 'plus', 14), on ? 'Saved' : 'Save');
    btn.setAttribute('aria-label', `${on ? 'Saved' : 'Save'}: ${piece.title}${piece.artist ? `, ${piece.artist}` : ''} — Save to Library`);
  };
  paint();
  return { el: btn, paint };
}

function recordingEmbed(block, ctx) {
  const work = repo.work(block.workId);
  if (!work) return null;
  const comp = repo.composer(work.composerId);
  const piece = pieceOf(ctx, work);
  const cap = stripMarks(block.caption || work.title);
  const ph = h('span', { class: 'ed-rec-ph' }, icon('music', 26));
  // Sheng: cover with a play disc, serif caption, performer; then the plain work line and a
  // work chip. Cover and caption play the recording in Apple Music; "+ Save" keeps it.
  const cover = addLink(ctx, work, listenLink(piece, [ph, h('span', { class: 'ed-rec-play' }, icon('play', 13))], {
    cls: 'ed-rec-cover', label: `Play ${cap} in ${playAppName()}`,
  }));
  const capLink = addLink(ctx, work, listenLink(piece, rich(block.caption || work.title), {
    cls: 'ed-rec-cap', label: `${cap}: play in ${playAppName()}`,
  }));
  const perf = h('div', { class: 'ed-rec-perf' }, 'Finding a recording…');
  const save = saveControl(piece);
  const el = h('figure', { class: 'ed-rec', dataset: { work: work.id } },
    h('div', { class: 'ed-rec-card' }, cover, h('div', { class: 'ed-rec-text' }, capLink, perf, save.el)),
    h('figcaption', { class: 'ed-rec-work', title: comp?.name || null }, [work.title, work.catalog].filter(Boolean).join(', ')),
    workChip(work));
  ctx.cards.push({ work, el, save });

  resolveWork(ctx, work).then((res) => {
    if (!res) {
      perf.textContent = 'Not found on Apple Music · tap to search';
      return;
    }
    if (res.album.artwork) ph.replaceWith(h('img', { src: res.album.artwork, alt: '', loading: 'lazy' }));
    perf.textContent = res.album.artist || '';
    perf.title = res.album.title || '';
    save.paint();
  }).catch(() => {
    perf.textContent = 'Apple Music is not reachable right now';
  });
  return el;
}

// Next three Swiss performances of a work (or a composer), as compact rows with a date badge.
function concertsEmbed(block) {
  const work = block.workId ? repo.work(block.workId) : null;
  const comp = !work && block.composerId ? repo.composer(block.composerId) : null;
  if (!work && !comp) return null;
  const list = repo.upcoming(work ? { workId: work.id } : { composerId: comp.id });
  const label = work ? `${work.title} · live in Switzerland` : `${comp.short || comp.name} · live in Switzerland`;
  const to = work ? href.work(work.id) : href.composer(comp.id);
  // Sheng embeds the concert rows straight into the text, followed by a centred link chip.
  const more = h('a', { class: 'ed-workchip', href: to },
    h('span', { class: 'lbl' }, work ? [work.title, work.catalog].filter(Boolean).join(', ') : (comp.name || comp.short)),
    list.length > 3 ? h('span', { class: 'n' }, `${list.length} dates`) : null,
    h('span', { class: 'arr', 'aria-hidden': 'true' }, '→'));
  return h('section', { class: 'ed-live', 'aria-label': label },
    list.length
      ? h('div', { class: 'ed-live-list' }, list.slice(0, 3).map(concertRow))
      : h('p', { class: 'ed-live-none' }, 'No Swiss dates announced yet.'),
    more);
}

function concertRow(c) {
  const day = c.day || dayKeyOf(c.start);
  const where = [venueLabel(c), cityLabel(c)].filter(Boolean).join(', ');
  const year = yearOf(day) !== yearOf(todayKey()) ? ` ${yearOf(day)}` : '';
  return h('a', { class: ['ed-concert', c.status === 'cancelled' && 'is-cancelled'], href: href.concert(c.id) },
    h('span', { class: 'ed-cbadge', 'aria-hidden': 'true' }, h('span', { class: 'm' }, monthShort(day)), h('span', { class: 'd' }, dayNum(day))),
    h('span', { class: 'main' },
      h('span', { class: 't' }, c.title),
      h('span', { class: 's' }, h('b', {}, `${weekdayShort(day)}${year} ${timeOf(c.start)}`), where ? ` · ${where}` : '',
        c.status === 'cancelled' ? h('span', { class: 'tag cancelled' }, 'Cancelled') : null)),
    icon('chevron', 14, 'faint'));
}

// ---------- end matter ----------
function endMatter(a, credit) {
  const sources = (a.sources || []).filter((s) => s && (s.title || s.url));
  const title = stripMarks(a.title);
  return h('footer', { class: 'ed-endmatter' },
    h('div', { class: 'ed-end', role: 'separator' }, 'END'),
    ratingBlock(a),
    h('div', { class: 'ed-pills' },
      h('button', { class: 'ed-pill report', type: 'button', onclick: () => openReport({ kind: 'article', name: `“${title}”`, path: articleHref(a.id) }) },
        h('span', { class: 'dot', 'aria-hidden': 'true' }, '!'), 'Report a problem'),
      h('button', { class: 'ed-pill', type: 'button', onclick: () => openWishSheet(a) }, icon('sparkle', 14), 'Wish for a topic'),
      h('a', { class: 'ed-pill', href: '#/editorials' }, 'Recent editorials')),
    h('button', { class: 'ed-how', type: 'button', onclick: () => openHowSheet(a, sources.length) }, 'How Klang’s editorials use AI', icon('info', 15)),
    sources.length ? h('div', { class: 'ed-sources' },
      h('div', { class: 'ed-sources-h' }, 'Sources:'),
      h('ul', {}, sources.map((s) => h('li', {}, safeUrl(s.url)
        ? h('a', { href: s.url, target: '_blank', rel: 'noopener noreferrer' }, s.title || s.url.replace(/^https?:\/\/(www\.)?/i, '').split('/')[0])
        : s.title)))) : null,
    credit,
    validDay(a.date) ? h('p', { class: 'ed-colophon sr-only' }, `${typeLabel(a.type)} · Published ${fmtLongDay(a.date)}`) : null);
}

// "Wish for a topic": Klang has no server, so the wish is shared (or copied) like a report.
function openWishSheet(a) {
  const note = h('textarea', { class: 'ep-report-note', rows: '4', placeholder: 'A work, a composer, a city, a form…', 'aria-label': 'Your topic' });
  const send = async () => {
    const text = note.value.trim();
    if (!text) {
      toast('Write a topic first');
      note.focus();
      return;
    }
    const msg = `Klang — editorial wish\n${text}\n(after reading “${stripMarks(a.title)}”)`;
    try {
      if (navigator.share) await navigator.share({ title: 'Editorial wish', text: msg });
      else {
        await navigator.clipboard.writeText(msg);
        toast('Copied to the clipboard');
      }
      sheet.close();
    } catch (err) {
      if (err?.name !== 'AbortError') toast('Couldn’t share — copy the text instead');
    }
  };
  const sheet = openSheet({
    title: 'Wish for a topic',
    closeLabel: 'Close',
    body: h('div', { class: 'ep-sheet-text' },
      h('p', {}, 'What should the next editorial be about?'), note,
      h('p', { class: 'fine' }, 'Klang has no server: share the wish with whoever writes for you, or keep it as a note.')),
    footer: h('button', { class: 'btn primary block', type: 'button', onclick: send }, icon('share', 16), 'Share wish'),
  });
  sheet.el.classList.add('ep-sheet');
}

function ratingBlock(a) {
  const stars = h('div', { class: 'ed-stars', role: 'radiogroup', 'aria-label': 'Rate this article' });
  const paint = () => {
    const n = store.articleRating(a.id);
    stars.replaceChildren(...[1, 2, 3, 4, 5].map((i) => h('button', {
      class: ['ed-star', i <= n && 'on'],
      type: 'button',
      role: 'radio',
      'aria-checked': i === n ? 'true' : 'false',
      'aria-label': plural(i, 'star'),
      onclick: () => {
        const next = i === store.articleRating(a.id) ? 0 : i;
        store.setArticleRating(a.id, next);
        toast(next ? `Rated ${next} of 5 · saved on this device` : 'Rating removed');
        paint();
      },
    }, icon('star', 30))));
  };
  paint();
  return h('div', { class: 'ed-rate' }, h('div', { class: 'ed-rate-label' }, 'Rate this article'), stars);
}

function openHowSheet(a, nSources) {
  const sheet = openSheet({
    title: 'How Klang’s editorials use AI',
    closeLabel: 'Close',
    body: h('div', { class: 'ed-how-body' },
      h('p', {}, 'This editorial was written for Klang with AI assistance and checked against the sources listed at the end of the article.'),
      h('p', {}, 'Dates, catalogue numbers and first performances follow those sources. Recordings are matched live from Apple Music, so the version you hear may differ from the one described — you can pick another version on each work page.'),
      h('p', {}, 'Klang has no accounts and no comments. Your rating and the article playlist stay on this device.'),
      nSources ? h('p', { class: 'faint' }, `${plural(nSources, 'source')} cited for “${stripMarks(a.title)}”.`) : null),
  });
  sheet.el.classList.add('ep-sheet');
}

async function shareArticle(a) {
  const url = `${location.href.split('#')[0]}${articleHref(a.id)}`;
  const title = stripMarks(a.title);
  const text = a.dek ? `${title} — ${stripMarks(a.dek)}` : title;
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return;
    } catch (err) {
      if (err?.name === 'AbortError') return;
    }
  }
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    toast('Link copied');
  } catch {
    toast('Couldn’t copy — use the address bar link');
  }
}
