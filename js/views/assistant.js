// Search tab = Assistant (beta), modelled on Sheng's Assistant (SPEC §3.10, screens assistant-01…03):
// a full-screen page (the dock / tab bar is hidden, see css/parity-personal.css) with its own top
// bar (back ‹ · "Assistant (beta)" · history), "Just say what you're after.", four intent cards with
// tappable 「example」 prompts, the dashed concert-code / feedback card, and a bottom panel: compact
// "Now listening" row (or the 30-second preview playing), the input, and "Runs on this device"
// (Sheng's quota line) beside the round ↑. Recording cards offer ▶ Preview (30 seconds inside Klang)
// and "Apple Music Classical ↗" (the full piece), and can be saved to the Library (ui/save.js).
// Unlike Sheng it is fully local: answers come from js/assistant-engine.js (rules over Klang's real
// listings), in Chinese when the interface is Chinese — it also understands Chinese questions
// ("苏黎世 马勒"). Nothing typed here leaves the device, and there is no question quota.
// Conversations are kept for 3 days (store.saveAssistantConversation).

import { h, icon, clear, toast } from '../util.js';
import * as repo from '../repo.js';
import * as store from '../store.js';
import { todayKey, relDayLabel, timeOf, dayKeyOf } from '../time.js';
import { href, concertCard, avatar } from '../ui/components.js';
import { openSheet } from '../ui/sheet.js';
import { matchWorkTracks } from '../ui/listen.js';
import { openSaveSheet } from '../ui/save.js';
import { goBack } from '../main.js';
import { searchAlbums, albumTracks, preview, previewState, ITUNES_CREDIT } from '../music.js';
import {
  workPiece, albumPiece, listenLink, onListening, clearListening, playAppName, searchURL,
} from '../applemusic.js';
import { previewButton, classicalButton } from '../ui/preview.js';
import { previewOf } from '../ui/player.js';
import { answer, saveFeedback } from '../assistant-engine.js';
import { t, tn, fmtN, isZh, cityName, cantonName, composerName, composerShort, roleLabel, countryName } from '../i18n.js';

const ACTIVE_KEY = 'klang.assistant.active';
const THINK_MS = 420;

// Example prompts per interface language (each is a question the engine understands).
const CARDS = [
  { icon: 'person', title: 'Find a person / ensemble', examples: ['Tonhalle', 'that Swiss composer'], zh: ['Tonhalle', '那位瑞士作曲家'] },
  { icon: 'worklist', title: 'Find a work', examples: ['Winterreise', 'the Bach with 30 variations'], zh: ['冬之旅', '有 30 段变奏的巴赫作品'] },
  { icon: 'disc', title: 'Find a recording', examples: ["Abbado's Mahler 2", 'a slower Goldbergs'], zh: ['马勒第二交响曲的录音', '更慢的哥德堡变奏曲'] },
  { icon: 'calendar', title: 'Find a concert', examples: ['Any Mahler in Zurich in November', 'chamber music in Geneva this weekend'], zh: ['11月苏黎世的马勒', '本周末日内瓦的室内乐'] },
];

// Sheng's card glyphs that util.icon lacks: a note list (work) and a record (recording).
const CARD_GLYPHS = {
  worklist: '<path d="M3.5 6h9M3.5 10.5h9M3.5 15h6" /><path d="M17.5 16.8V4.8l3.6 1.2" /><circle cx="15.4" cy="17" r="2.4" fill="currentColor" stroke="none"/>',
  disc: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5.4" stroke-width="1.4"/><circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"/>',
};
function cardIcon(name, size) {
  if (!CARD_GLYPHS[name]) return icon(name, size);
  const span = document.createElement('span');
  span.className = 'icon';
  span.setAttribute('aria-hidden', 'true');
  span.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${CARD_GLYPHS[name]}</svg>`;
  return span;
}

// ---------- session: which conversation is open ----------
const session = {
  get() {
    try { return sessionStorage.getItem(ACTIVE_KEY) || null; } catch { return null; }
  },
  set(id) {
    try {
      if (id) sessionStorage.setItem(ACTIVE_KEY, id);
      else sessionStorage.removeItem(ACTIVE_KEY);
    } catch { /* ignore */ }
  },
};
let activeId = session.get();

const newId = () => `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

function findConversation(id) {
  return id ? store.assistantConversations().find((c) => c.id === id) || null : null;
}

// ---------- small row builders ----------
const leadIcon = (name) => h('span', { class: 'lead-icon' }, icon(name, 18));
const upLabel = (n) => (n ? t('{n} upcoming', { n: fmtN(n) }) : t('Nothing upcoming'));
const fmtLeft = (st) => {
  const sec = Math.max(0, (st.duration || 30) - (st.elapsed || 0));
  return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
};

function linkRow(to, lead, title, subtitle, serif = false) {
  return h('a', { class: ['row-item', serif && 'as-serif'], href: to },
    lead,
    h('div', { class: 'main' }, h('div', { class: 't' }, title), subtitle && h('div', { class: 's' }, subtitle)),
    h('div', { class: 'right' }, icon('chevron', 16)));
}

function entityRow(item) {
  if (item.kind === 'composer') {
    const c = repo.composer(item.id);
    if (!c) return null;
    return linkRow(href.composer(c.id), avatar(c.name, true, c.id), composerName(c),
      [`${c.born}–${c.died || ''}`, c.country ? c.country.split(' / ').map((x) => countryName(x)).join(' / ') : null, upLabel(repo.upcoming({ composerId: c.id }).length)].filter(Boolean).join(' · '), true);
  }
  if (item.kind === 'work') {
    const w = repo.work(item.id);
    if (!w) return null;
    const comp = repo.composer(w.composerId);
    return linkRow(href.work(w.id), leadIcon('music'), w.title,
      [comp ? composerShort(comp) : null, w.catalog, w.year, upLabel(repo.upcoming({ workId: w.id }).length)].filter(Boolean).join(' · '), true);
  }
  if (item.kind === 'artist') {
    const a = repo.artist(item.id);
    if (!a) return null;
    return linkRow(href.artist(a.id), avatar(a.name, true), a.name,
      [a.kind === 'ensemble' ? t('Ensemble') : a.role ? roleLabel(a.role) : null, upLabel(repo.upcoming({ artistId: a.id }).length)].filter(Boolean).join(' · '));
  }
  if (item.kind === 'venue') {
    const v = repo.venue(item.id);
    if (!v) return null;
    return linkRow(href.venue(v.id), leadIcon('pin'), v.name,
      [repo.city(v.cityId) ? cityName(repo.city(v.cityId)) : null, upLabel(repo.upcoming({ venueId: v.id }).length)].filter(Boolean).join(' · '));
  }
  if (item.kind === 'city') {
    const c = repo.city(item.id);
    if (!c) return null;
    return linkRow(href.city(c.id), leadIcon('map'), cityName(c),
      [c.canton ? cantonName(c.canton, repo.cantonName(c.canton)) : null, upLabel(repo.upcoming({ cityIds: [c.id] }).length)].filter(Boolean).join(' · '));
  }
  return null;
}

// ---------- view ----------
export function render() {
  let conv = findConversation(activeId);
  if (!conv) { activeId = null; session.set(null); }
  let alive = true;
  let busy = false;
  const unsubs = [];

  const root = h('div', { class: 'as-page' });
  const leftSide = h('div', { class: 'as-side' });
  const historyBtn = h('button', { class: 'icon-btn', type: 'button', 'aria-label': t('Recent conversations'), onclick: openHistory }, icon('history', 20));
  const top = h('div', { class: 'as-top' },
    leftSide,
    h('div', { class: 'as-title' }, t('Assistant'), h('span', { class: 'as-beta' }, t('(beta)'))),
    h('div', { class: 'as-side right' }, historyBtn));
  const main = h('div', { class: 'as-main' });

  // Bottom panel like Sheng's (the tab bar is hidden on this full-screen page): a compact
  // "Now listening" row (the piece last opened in Apple Music · ⏭ next · ✕), the input, then the
  // "quota" line (Klang has no quota — it says where answers come from) beside the round ↑ button.
  const input = h('textarea', { class: 'as-input', rows: '1', placeholder: t('Concerts, people, works, recordings…'), 'aria-label': t('Ask the assistant'), enterkeyhint: 'send', autocomplete: 'off' });
  const sendBtn = h('button', { class: 'as-send', type: 'submit', 'aria-label': t('Send'), disabled: true }, icon('send', 18));
  const composer = h('form', { class: 'as-composer', onsubmit: (e) => { e.preventDefault(); send(input.value); } },
    input,
    h('div', { class: 'as-compose-foot' }, h('span', { class: 'as-quota' }, t('Runs on this device')), sendBtn));
  const npRow = h('div', { class: 'as-np', hidden: true });
  const panel = h('div', { class: 'as-panel' }, npRow, composer);
  input.addEventListener('input', () => { autosize(); paintSend(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      send(input.value);
    }
  });
  function autosize() {
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
  }
  function paintSend() {
    sendBtn.disabled = busy || !input.value.trim();
  }
  function paintPlaceholder() {
    input.placeholder = conv?.expect === 'feedback' ? t('Your feedback, idea, or a city or venue…') : t('Concerts, people, works, recordings…');
  }

  root.append(top, main, panel);

  // ---------- compact "Now listening" (above the input) ----------
  // A 30-second preview playing inside Klang: its track with ❚❚/▶, the time left, ⏭ and ✕ (stop).
  // Otherwise the piece last opened in Apple Music from Klang: tap it to open it again, ⏭ opens the
  // next piece of a Play-all run, ✕ clears the row.
  let npSig = '';
  let npL = { current: null, queue: [], index: -1, next: null };
  const pvSub = h('span', { class: 'as-np-s' });
  const pvPlay = h('button', { class: 'as-np-btn', type: 'button', onclick: () => preview.toggle() });
  function paintNowListening(L = npL) {
    npL = L;
    const st = previewState();
    if (st.track) {
      const sig = `pv|${st.track.id}|${st.hasNext}`;
      if (sig !== npSig) {
        npSig = sig;
        npRow.hidden = false;
        root.classList.add('has-np');
        const tr = st.track;
        npRow.replaceChildren(...[
          h('button', { class: 'as-np-main', type: 'button', onclick: () => import('../ui/player.js').then((m) => m.openPlayer()) },
            tr.artwork ? h('img', { class: 'as-np-art', src: tr.artwork, alt: '' }) : h('span', { class: 'as-np-art ph' }, icon('music', 14)),
            h('span', { class: 'as-np-meta' }, h('span', { class: 'as-np-t' }, tr.title || ''), pvSub)),
          pvPlay,
          st.hasNext ? h('button', { class: 'as-np-btn', type: 'button', 'aria-label': t('Next preview'), onclick: () => preview.next() }, icon('forward', 17)) : null,
          h('button', { class: 'as-np-btn faint', type: 'button', 'aria-label': t('Stop preview'), onclick: () => preview.stop() }, icon('close', 15)),
        ].filter(Boolean));
      }
      pvSub.textContent = [st.playing ? t('Preview · {time} left', { time: fmtLeft(st) }) : t('Preview paused'), st.track.artist].filter(Boolean).join(' · ');
      pvPlay.replaceChildren(icon(st.playing ? 'pause' : 'play', 16));
      pvPlay.setAttribute('aria-label', st.playing ? t('Pause the preview') : t('Play the preview'));
      return;
    }
    const cur = L.current;
    const app = t(playAppName());
    const sig = cur ? `${cur.id}|${L.index}|${L.queue.length}|${app}` : '';
    if (sig === npSig) return;
    npSig = sig;
    npRow.hidden = !cur;
    root.classList.toggle('has-np', !!cur);
    if (!cur) {
      clear(npRow);
      return;
    }
    const open = listenLink(cur, [
      cur.artwork ? h('img', { class: 'as-np-art', src: cur.artwork, alt: '' }) : h('span', { class: 'as-np-art ph' }, icon('music', 14)),
      h('span', { class: 'as-np-meta' },
        h('span', { class: 'as-np-t' }, cur.title || ''),
        h('span', { class: 'as-np-s' }, [cur.artist || cur.composer, app].filter(Boolean).join(' · '))),
    ], { cls: 'as-np-main', queue: L.queue, index: L.index, label: t('Now listening: {title}. Open it again in {app}', { title: cur.title, app }) });
    // a real link, like the mini player's ⏭ (iOS hands a tapped link to the app most reliably)
    const next = L.next ? listenLink(L.next, icon('forward', 17), {
      cls: 'as-np-btn', queue: L.queue, index: L.index + 1, label: t('Next: {title}, in {app}', { title: L.next.title, app }),
    }) : null;
    const close = h('button', {
      class: 'as-np-btn faint', type: 'button', 'aria-label': t('Clear Now listening'), onclick: () => clearListening(),
    }, icon('close', 15));
    npRow.replaceChildren(...[open, next, close].filter(Boolean));
  }
  // after the tap that changed it has been handled (the tapped link must stay in the page)
  unsubs.push(onListening((L) => setTimeout(() => { if (alive) paintNowListening(L); }, 0)));
  unsubs.push(preview.subscribe(() => { if (alive) paintNowListening(); }));

  // ---------- back: a conversation returns to the start; the start leaves the Assistant ----------
  function leave() {
    const before = location.hash;
    goBack();
    // opened directly (no history inside Klang): fall back to Discover
    setTimeout(() => { if (alive && location.hash === before) location.hash = '#/discover'; }, 350);
  }

  // ---------- painting ----------
  function paint() {
    clear(leftSide).append(conv
      ? h('button', { class: 'icon-btn', type: 'button', 'aria-label': t('New conversation'), title: t('New conversation'), onclick: newConversation }, icon('back', 20))
      : h('button', { class: 'icon-btn', type: 'button', 'aria-label': t('Back'), onclick: leave }, icon('back', 20)));
    clear(main).append(conv ? thread() : intro());
    paintPlaceholder();
  }

  function intro() {
    return h('div', { class: 'as-intro' },
      h('h1', { class: 'as-hello' }, t('Just say what you’re after.')),
      h('div', { class: 'as-cards' }, CARDS.map((c) => h('div', { class: 'as-card' },
        h('div', { class: 'as-card-head' }, cardIcon(c.icon, 16), h('span', {}, t(c.title))),
        h('div', { class: 'as-examples' }, (isZh() ? c.zh : c.examples).map((ex) =>
          h('button', { class: 'as-ex', type: 'button', onclick: () => send(ex) }, `「${ex}」`)))))),
      h('button', { class: 'as-dashed', type: 'button', onclick: () => input.focus() },
        icon('ticket', 16),
        h('span', {}, t('Or type a concert code · feedback, suggestions, propose a city or venue'))));
  }

  function thread() {
    const msgs = conv.messages || [];
    const lastBot = msgs.map((m) => m.role).lastIndexOf('assistant');
    return h('div', { class: 'as-thread' }, msgs.map((m, i) => message(m, i === lastBot)));
  }

  const botText = (text) => String(text || '');

  function message(m, isLast) {
    if (m.role === 'user') return h('div', { class: 'as-msg user' }, h('div', { class: 'as-bubble' }, m.text));
    const d = m.data || {};
    return h('div', { class: 'as-msg bot' },
      h('div', { class: 'as-who' }, icon('sparkle', 12), t('Assistant')),
      h('div', { class: 'as-bubble' }, botText(m.text)),
      results(d.items || [], d),
      d.link && h('button', { class: 'btn small as-open', type: 'button', onclick: () => openInConcerts(d.link) }, icon('calendar', 14), d.link.label),
      isLast && d.followUps?.length ? h('div', { class: 'as-suggest-row' },
        d.followUps.map((q) => h('button', { class: 'as-suggest', type: 'button', onclick: () => send(q) }, q))) : null);
  }

  function results(items, d) {
    if (!items.length) return null;
    const out = h('div', { class: 'as-results' });
    let group = null;
    for (const it of items) {
      if (it.kind === 'concert') {
        group = null;
        const c = repo.concert(it.id);
        if (c) out.append(concertCard(c, { showDate: true }));
      } else if (it.kind === 'recording') {
        group = null;
        if (it.data?.term) out.append(recordingBlock(it.data));
      } else {
        const row = entityRow(it);
        if (!row) continue;
        if (!group) {
          group = h('div', { class: 'group' });
          out.append(group);
        }
        group.append(row);
      }
    }
    return out.childNodes.length ? out : null;
  }

  // ---------- recordings (iTunes Search metadata, with Apple's credit) ----------
  function recordingBlock(d) {
    const term = d.term;
    const work = d.workId ? repo.work(d.workId) : null;
    const row = h('div', { class: 'h-scroll as-rec-row', 'aria-busy': 'true' },
      [0, 1, 2].map(() => h('div', { class: 'album-card' }, h('div', { class: 'art skeleton' }), h('div', { class: 'skeleton as-skel-line' }))));
    const credit = h('p', { class: 'listen-credit' }, t(ITUNES_CREDIT), isZh() ? '' : ' ',
      h('a', { href: searchURL(term, 'classical'), target: '_blank', rel: 'noopener' }, t('Apple Music Classical')), ' · ',
      h('a', { href: searchURL(term, 'music'), target: '_blank', rel: 'noopener' }, t('Apple Music')));
    const wrap = h('div', { class: 'as-rec' },
      h('div', { class: 'as-rec-head' }, icon('album', 15), h('span', {}, d.label ? t('Recordings · {label}', { label: d.label }) : t('Recordings'))),
      row, credit);

    async function load() {
      let albums;
      try {
        albums = await searchAlbums(term, 12);
      } catch (err) {
        row.removeAttribute('aria-busy');
        row.replaceChildren(h('div', { class: 'as-rec-msg' },
          h('p', {}, t('Couldn’t reach Apple Music.')),
          h('button', { class: 'btn small', type: 'button', onclick: () => { row.setAttribute('aria-busy', 'true'); load(); } }, t('Try again'))));
        if (err) console.warn(err);
        return;
      }
      row.removeAttribute('aria-busy');
      if (!albums.length) {
        row.replaceChildren(h('div', { class: 'as-rec-msg' },
          h('p', {}, t('No recordings found on Apple Music for this search.')),
          h('a', { class: 'btn small', href: searchURL(term), target: '_blank', rel: 'noopener' }, icon('external', 14), t('Search {app}', { app: t(playAppName()) }))));
        return;
      }
      row.replaceChildren(...albums.slice(0, 10).map((a) => albumCard(a, work)));
    }
    load();
    return wrap;
  }

  // A recording card like a Listen card: the round ▶ ring on the cover plays Apple's 30-second
  // preview inside Klang (▶/❚❚ with the time left), "Apple Music Classical ↗" under it opens the
  // work on this album (album + its first track once known) to play in full; ＋ opens Save.
  function albumCard(a, work) {
    const comp = work ? repo.composer(work.composerId) : null;
    let piece = work ? workPiece(work, comp?.name, a) : albumPiece(a);
    const label = () => t('Play {title} in full in {app}', { title: work ? `${work.title}, ${a.title}` : a.title, app: t(playAppName()) });
    const coverLink = () => listenLink(piece,
      a.artwork ? h('img', { class: 'art', src: a.artwork, alt: '', loading: 'lazy' }) : h('div', { class: 'art' }),
      { cls: 'as-art', label: label() });
    const classical = () => classicalButton(piece, { cls: 'as-classical' });
    // the preview follows the same recording: the work's first movement on this album
    const pv = previewButton({
      resolve: () => previewOf(piece),
      cls: 'play pv-ring as-pv',
      label: t('Preview {title}', { title: work ? `${work.title}, ${a.title}` : a.title }),
    });
    let cover = coverLink();
    let open = classical();
    const save = h('button', {
      class: 'icon-btn as-lib', type: 'button',
      onclick: (e) => { e.stopPropagation(); openSaveSheet(piece); },
    });
    save.paint = () => {
      const on = store.hasAlbum(a.id) || store.userPlaylists().some((pl) => store.isInPlaylist(pl.id, piece.id));
      save.replaceChildren(icon(on ? 'check' : 'plus', 15));
      save.classList.toggle('active', on);
      save.setAttribute('aria-label', on ? t('Saved — change where {title} is saved', { title: a.title }) : t('Save {title} to your Library', { title: a.title }));
    };
    save.paint();
    const card = h('div', { class: 'album-card as-album', dataset: { album: String(a.id) } },
      h('div', { class: 'as-cover' }, cover, pv),
      h('div', { class: 't' }, a.title),
      h('div', { class: 's' }, [a.artist, a.year].filter(Boolean).join(' · ')),
      h('div', { class: 'as-album-actions' }, open, save));
    // When the card scrolls into view, find the work's first track so the links open that piece.
    if (work) {
      whenVisible(card, async () => {
        try {
          const { album, tracks } = await albumTracks(a.id);
          const m = matchWorkTracks(work, tracks || []);
          if (!m || !alive) return; // can't tell which tracks: keep the album link
          piece = workPiece(work, comp?.name, { ...a, artwork: a.artwork || album?.artwork }, m.tracks[0]);
          const c = coverLink();
          const o = classical();
          cover.replaceWith(c);
          open.replaceWith(o);
          cover = c;
          open = o;
          save.paint();
        } catch { /* offline: the album link still works */ }
      });
    }
    return card;
  }

  // Track lookups only for cards on screen (iTunes allows ~20 requests a minute).
  const io = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        io.unobserve(e.target);
        e.target.onVisible?.();
      }
    })
    : null;
  function whenVisible(el, fn) {
    if (!io) {
      fn();
      return;
    }
    el.onVisible = fn;
    io.observe(el);
  }
  unsubs.push(() => io?.disconnect());
  unsubs.push(store.subscribe((topic) => {
    if (topic === 'library') root.querySelectorAll('.as-lib').forEach((b) => b.paint?.());
  }));

  // ---------- actions ----------
  function openInConcerts(link) {
    const f = link.filters || {};
    store.setFilters({
      day: f.day || null, lookBack: false, cityIds: [...(f.cityIds || [])], types: [...(f.types || [])],
      featuredOnly: false, following: false,
    });
    location.hash = '#/concerts';
  }

  function newConversation() {
    conv = null;
    activeId = null;
    session.set(null);
    paint();
    window.scrollTo(0, 0);
  }

  function openConversation(id) {
    const c = findConversation(id);
    if (!c) {
      toast(t('That conversation has expired'));
      return;
    }
    conv = c;
    activeId = c.id;
    session.set(c.id);
    paint();
    requestAnimationFrame(scrollToLatest);
  }

  function scrollToLatest() {
    const users = main.querySelectorAll('.as-msg.user');
    const last = users[users.length - 1];
    if (last) last.scrollIntoView({ block: 'start' });
  }

  async function send(text) {
    const q = String(text || '').trim();
    if (!q || busy) return;
    busy = true;
    input.value = '';
    autosize();
    paintSend();
    const now = new Date().toISOString();
    const fresh = !conv;
    if (!conv) {
      conv = { id: newId(), at: now, title: q.slice(0, 120), messages: [] };
      activeId = conv.id;
      session.set(conv.id);
    }
    const c = conv; // the user may switch conversations while the answer is "thinking"
    const expect = c.expect || null;
    const userMsg = { role: 'user', text: q, at: now };
    c.messages.push(userMsg);
    c.at = now;
    store.saveAssistantConversation(c);

    // append instead of repainting, so earlier recording carousels keep their state
    let list = fresh ? null : main.querySelector('.as-thread');
    if (!list) {
      paint();
      list = main.querySelector('.as-thread');
    } else {
      list.querySelectorAll('.as-suggest-row').forEach((el) => el.remove());
      list.append(message(userMsg, false));
    }
    const thinking = h('div', { class: 'as-msg bot' },
      h('div', { class: 'as-who' }, icon('sparkle', 12), t('Assistant')),
      h('div', { class: 'as-bubble as-typing', role: 'status', 'aria-label': t('Thinking') }, h('i'), h('i'), h('i')));
    list.append(thinking);
    const users = list.querySelectorAll('.as-msg.user');
    users[users.length - 1]?.scrollIntoView({ block: 'start', behavior: 'smooth' });

    await new Promise((r) => setTimeout(r, THINK_MS));
    let res;
    try {
      res = answer(q, { today: todayKey(), expect });
    } catch (err) {
      console.error(err);
      res = isZh()
        ? { reply: '抱歉，这个问题把我难住了。试试说出一位作曲家、一部作品、一座城市或一个日期。', items: [], followUps: ['本周末的音乐会', '冬之旅'] }
        : { reply: 'Sorry — I got confused by that one. Try naming a composer, a work, a city or a date.', items: [], followUps: ['Concerts this weekend', 'Winterreise'] };
    }
    if (res.feedback) saveFeedback(res.feedback);
    c.expect = res.expect || null;
    const botMsg = {
      role: 'assistant',
      text: res.reply,
      at: new Date().toISOString(),
      data: { intent: res.intent || null, items: res.items || [], followUps: res.followUps || [], link: res.link || null },
    };
    c.messages.push(botMsg);
    c.at = botMsg.at;
    store.saveAssistantConversation(c);
    busy = false;
    paintSend();
    if (!alive || conv !== c || !thinking.isConnected) return;
    thinking.replaceWith(message(botMsg, true));
    paintPlaceholder();
  }

  // ---------- history sheet (like Sheng: last 3 days, Done, can't be recovered) ----------
  function openHistory() {
    const list = store.assistantConversations().sort((a, b) => String(b.at).localeCompare(String(a.at)));
    const body = h('div', { class: 'as-hist' });
    const sheet = openSheet({
      title: t('Recent conversations'),
      subtitle: t('Last 3 days · clear automatically'),
      body,
      footer: h('p', { class: 'as-hist-foot' }, t('Expired conversations can’t be recovered')),
      closeLabel: t('Done'),
    });
    sheet.el.classList.add('as-hist-sheet');
    if (!list.length) {
      body.append(h('div', { class: 'as-hist-empty' }, icon('history', 30), h('p', {}, t('No conversations in the last 3 days'))));
      return;
    }
    const whenOf = (iso) => {
      const day = dayKeyOf(iso);
      return `${relDayLabel(day)} · ${timeOf(iso)}`;
    };
    body.append(h('div', { class: 'group' }, list.map((c) => {
      const first = (c.messages || []).find((m) => m.role === 'user');
      const n = (c.messages || []).filter((m) => m.role === 'user').length;
      return h('button', { class: ['row-item', 'as-hist-row', c.id === activeId && 'current'], type: 'button', onclick: () => { sheet.close(); openConversation(c.id); } },
        h('span', { class: 'lead-icon' }, icon('sparkle', 16)),
        h('div', { class: 'main' },
          h('div', { class: 't' }, c.title || first?.text || t('Conversation')),
          h('div', { class: 's' }, `${whenOf(c.at)} · ${tn(n, '{n} question', '{n} questions')}`)),
        h('div', { class: 'right' }, c.id === activeId ? h('span', { class: 'as-hist-open' }, t('Open')) : null, icon('chevron', 16)));
    })));
    let armed = false;
    const clearBtn = h('button', { class: 'as-hist-clear', type: 'button' }, t('Clear all conversations'));
    clearBtn.addEventListener('click', () => {
      if (!armed) {
        armed = true;
        clearBtn.textContent = t('Tap again to clear — this can’t be undone');
        return;
      }
      store.clearAssistantConversations();
      sheet.close();
      newConversation();
      toast(t('Conversations cleared'));
    });
    body.append(clearBtn);
  }

  paint();
  paintSend();
  // Coming back to the tab (not via Back): show the latest question rather than the top.
  if (conv) requestAnimationFrame(() => { if (alive && window.scrollY === 0) scrollToLatest(); });

  return {
    title: t('Assistant'),
    header: false,
    body: root,
    cleanup() {
      alive = false;
      unsubs.forEach((u) => u());
    },
  };
}
