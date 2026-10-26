// Search tab = Assistant (beta), modelled on Sheng's Assistant (SPEC §3.10, screens assistant-01…03):
// a full-screen page (the dock / tab bar is hidden, see css/parity-personal.css) with its own top
// bar (back ‹ · "Assistant (beta)" · history), "Just say what you're after.", four intent cards with
// tappable 「example」 prompts, the dashed concert-code / feedback card, and a bottom panel: compact
// now-playing row, the input, and "Runs on this device" (Sheng's quota line) beside the round ↑.
// Unlike Sheng it is fully local: answers come from
// js/assistant-engine.js (rules over Klang's own data) — nothing typed here leaves the device,
// and there is no question quota. Conversations are kept for 3 days (store.saveAssistantConversation).

import { h, icon, clear, toast, plural } from '../util.js';
import * as repo from '../repo.js';
import * as store from '../store.js';
import { todayKey, relDayLabel, timeOf, dayKeyOf } from '../time.js';
import { href, concertCard, avatar } from '../ui/components.js';
import { openSheet } from '../ui/sheet.js';
import { matchWorkTracks } from '../ui/listen.js';
import { openPlayer } from '../ui/player.js'; // also lets the full player record each queue for "Up next"
import { goBack } from '../main.js';
import {
  searchAlbums, albumTracks, player, playerState,
  classicalAlbumURL, classicalSearchURL, appleMusicSearchURL, ITUNES_CREDIT,
} from '../music.js';
import { answer, saveFeedback } from '../assistant-engine.js';

const ACTIVE_KEY = 'klang.assistant.active';
const THINK_MS = 420;
const PLACEHOLDER = 'Concerts, people, works, recordings…';

const CARDS = [
  { icon: 'person', title: 'Find a person / ensemble', examples: ['Tonhalle', 'that Swiss composer'] },
  { icon: 'worklist', title: 'Find a work', examples: ['Winterreise', 'the Bach with 30 variations'] },
  { icon: 'disc', title: 'Find a recording', examples: ["Abbado's Mahler 2", 'a slower Goldbergs'] },
  { icon: 'calendar', title: 'Find a concert', examples: ['Any Mahler in Zurich in November', 'chamber music in Geneva this weekend'] },
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
const upLabel = (n) => (n ? `${n.toLocaleString('en-US')} upcoming` : 'Nothing upcoming');

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
    return linkRow(href.composer(c.id), avatar(c.name, true, c.id), c.name,
      [`${c.born}–${c.died || ''}`, c.country, upLabel(repo.upcoming({ composerId: c.id }).length)].join(' · '), true);
  }
  if (item.kind === 'work') {
    const w = repo.work(item.id);
    if (!w) return null;
    const comp = repo.composer(w.composerId);
    return linkRow(href.work(w.id), leadIcon('music'), w.title,
      [comp?.short, w.catalog, w.year, upLabel(repo.upcoming({ workId: w.id }).length)].filter(Boolean).join(' · '), true);
  }
  if (item.kind === 'artist') {
    const a = repo.artist(item.id);
    if (!a) return null;
    return linkRow(href.artist(a.id), avatar(a.name, true), a.name,
      [a.kind === 'ensemble' ? 'Ensemble' : a.role, a.demo ? 'Demo' : null, upLabel(repo.upcoming({ artistId: a.id }).length)].filter(Boolean).join(' · '));
  }
  if (item.kind === 'venue') {
    const v = repo.venue(item.id);
    if (!v) return null;
    return linkRow(href.venue(v.id), leadIcon('pin'), v.name,
      [repo.city(v.cityId)?.name, upLabel(repo.upcoming({ venueId: v.id }).length)].filter(Boolean).join(' · '));
  }
  if (item.kind === 'city') {
    const c = repo.city(item.id);
    if (!c) return null;
    return linkRow(href.city(c.id), leadIcon('map'), c.name,
      `${repo.cantonName(c.canton)} · ${upLabel(repo.upcoming({ cityIds: [c.id] }).length)}`);
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
  const historyBtn = h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Recent conversations', onclick: openHistory }, icon('history', 20));
  const top = h('div', { class: 'as-top' },
    leftSide,
    h('div', { class: 'as-title' }, 'Assistant', h('span', { class: 'as-beta' }, '(beta)')),
    h('div', { class: 'as-side right' }, historyBtn));
  const main = h('div', { class: 'as-main' });

  // Bottom panel like Sheng's (the tab bar is hidden on this full-screen page): a compact
  // now-playing row (Paused · equalizer · play · expand ⌃), the input, then the "quota" line
  // (Klang has no quota — it says where answers come from) beside the round ↑ button.
  const input = h('textarea', { class: 'as-input', rows: '1', placeholder: PLACEHOLDER, 'aria-label': 'Ask the assistant', enterkeyhint: 'send', autocomplete: 'off' });
  const sendBtn = h('button', { class: 'as-send', type: 'submit', 'aria-label': 'Send', disabled: true }, icon('send', 18));
  const composer = h('form', { class: 'as-composer', onsubmit: (e) => { e.preventDefault(); send(input.value); } },
    input,
    h('div', { class: 'as-compose-foot' }, h('span', { class: 'as-quota' }, 'Runs on this device'), sendBtn));
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
    input.placeholder = conv?.expect === 'feedback' ? 'Your feedback, idea, or a city or venue…' : PLACEHOLDER;
  }

  root.append(top, main, panel);

  // ---------- compact now playing (above the input) ----------
  let npSig = '';
  function paintNowPlaying(st) {
    const sig = st.track ? `${st.track.id}|${st.playing}` : '';
    if (sig === npSig) return;
    npSig = sig;
    npRow.hidden = !st.track;
    root.classList.toggle('has-np', !!st.track);
    if (!st.track) {
      clear(npRow);
      return;
    }
    const t = st.track;
    const playBtn = h('button', {
      class: 'as-np-btn', type: 'button', 'aria-label': st.playing ? 'Pause' : 'Play',
      onclick: (e) => { e.stopPropagation(); player.toggle(); },
    }, icon(st.playing ? 'pause' : 'play', 17));
    const expand = h('button', {
      class: 'as-np-btn faint', type: 'button', 'aria-label': 'Open the player',
      onclick: (e) => { e.stopPropagation(); openPlayer(); },
    }, h('span', { class: 'as-up' }, icon('down', 18)));
    clear(npRow).append(
      t.artwork ? h('img', { class: 'as-np-art', src: t.artwork, alt: '' }) : h('span', { class: 'as-np-art ph' }, icon('music', 14)),
      h('span', { class: 'as-np-meta' },
        h('span', { class: 'as-np-t' }, t.title || ''),
        h('span', { class: 'as-np-s' }, st.playing ? (t.artist || 'Playing') : 'Paused')),
      h('span', { class: ['as-eq', st.playing && 'on'], 'aria-hidden': 'true' }, h('i'), h('i'), h('i'), h('i')),
      playBtn,
      expand);
  }
  npRow.addEventListener('click', () => openPlayer());
  unsubs.push(player.subscribe(paintNowPlaying));

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
      ? h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'New conversation', title: 'New conversation', onclick: newConversation }, icon('back', 20))
      : h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Back', onclick: leave }, icon('back', 20)));
    clear(main).append(conv ? thread() : intro());
    paintPlaceholder();
    paintPlaying(playerState());
  }

  function intro() {
    return h('div', { class: 'as-intro' },
      h('h1', { class: 'as-hello' }, 'Just say what you’re after.'),
      h('div', { class: 'as-cards' }, CARDS.map((c) => h('div', { class: 'as-card' },
        h('div', { class: 'as-card-head' }, cardIcon(c.icon, 16), h('span', {}, c.title)),
        h('div', { class: 'as-examples' }, c.examples.map((ex) =>
          h('button', { class: 'as-ex', type: 'button', onclick: () => send(ex) }, `「${ex}」`)))))),
      h('button', { class: 'as-dashed', type: 'button', onclick: () => input.focus() },
        icon('ticket', 16),
        h('span', {}, 'Or type a concert code · feedback, suggestions, propose a city or venue')));
  }

  function thread() {
    const msgs = conv.messages || [];
    const lastBot = msgs.map((m) => m.role).lastIndexOf('assistant');
    return h('div', { class: 'as-thread' }, msgs.map((m, i) => message(m, i === lastBot)));
  }

  function message(m, isLast) {
    if (m.role === 'user') return h('div', { class: 'as-msg user' }, h('div', { class: 'as-bubble' }, m.text));
    const d = m.data || {};
    return h('div', { class: 'as-msg bot' },
      h('div', { class: 'as-who' }, icon('sparkle', 12), 'Assistant'),
      h('div', { class: 'as-bubble' }, m.text),
      results(d.items || [], d),
      d.link && h('button', { class: 'btn small as-open', type: 'button', onclick: () => openInConcerts(d.link) }, icon('calendar', 14), d.link.label),
      isLast && d.followUps?.length ? h('div', { class: 'as-suggest-row' },
        d.followUps.map((t) => h('button', { class: 'as-suggest', type: 'button', onclick: () => send(t) }, t))) : null);
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

  // ---------- recordings (iTunes Search: previews streamed only, with Apple credit + links) ----------
  function recordingBlock(d) {
    const term = d.term;
    const work = d.workId ? repo.work(d.workId) : null;
    const row = h('div', { class: 'h-scroll as-rec-row', 'aria-busy': 'true' },
      [0, 1, 2].map(() => h('div', { class: 'album-card' }, h('div', { class: 'art skeleton' }), h('div', { class: 'skeleton as-skel-line' }))));
    const credit = h('p', { class: 'listen-credit' }, ITUNES_CREDIT, ' ',
      h('a', { href: classicalSearchURL(term), target: '_blank', rel: 'noopener' }, 'Apple Music Classical'), ' · ',
      h('a', { href: appleMusicSearchURL(term), target: '_blank', rel: 'noopener' }, 'Apple Music'));
    const wrap = h('div', { class: 'as-rec' },
      h('div', { class: 'as-rec-head' }, icon('album', 15), h('span', {}, d.label ? `Recordings · ${d.label}` : 'Recordings')),
      row, credit);

    async function load() {
      let albums;
      try {
        albums = await searchAlbums(term, 12);
      } catch (err) {
        row.removeAttribute('aria-busy');
        row.replaceChildren(h('div', { class: 'as-rec-msg' },
          h('p', {}, `Couldn’t reach Apple Music${err?.message ? ` — ${err.message}` : ''}.`),
          h('button', { class: 'btn small', type: 'button', onclick: () => { row.setAttribute('aria-busy', 'true'); load(); } }, 'Try again')));
        return;
      }
      row.removeAttribute('aria-busy');
      if (!albums.length) {
        row.replaceChildren(h('div', { class: 'as-rec-msg' },
          h('p', {}, 'No recordings found on Apple Music for this search.'),
          h('a', { class: 'btn small', href: classicalSearchURL(term), target: '_blank', rel: 'noopener' }, icon('external', 14), 'Search Apple Music Classical')));
        return;
      }
      row.replaceChildren(...albums.slice(0, 10).map((a) => albumCard(a, work)));
      paintPlaying(playerState());
    }
    load();
    return wrap;
  }

  function albumCard(a, work) {
    const listen = h('button', { class: 'btn small primary as-listen', type: 'button', dataset: { album: String(a.id) } }, icon('play', 13), 'Listen');
    listen.addEventListener('click', () => playAlbum(a, work, listen));
    const lib = h('button', { class: 'icon-btn as-lib', type: 'button' });
    const paintLib = () => {
      const on = store.hasAlbum(a.id);
      lib.replaceChildren(icon(on ? 'check' : 'plus', 15));
      lib.classList.toggle('active', on);
      lib.setAttribute('aria-label', on ? 'Remove from library' : 'Add to library');
    };
    lib.addEventListener('click', () => {
      const on = store.toggleAlbum({ id: a.id, title: a.title, artist: a.artist, artwork: a.artwork, url: a.url, year: a.year, workId: work?.id });
      toast(on ? 'Added to your library' : 'Removed from your library');
      paintLib();
    });
    paintLib();
    return h('div', { class: 'album-card as-album' },
      h('a', { href: classicalAlbumURL(a.id), target: '_blank', rel: 'noopener', 'aria-label': `${a.title} in Apple Music Classical` },
        a.artwork ? h('img', { class: 'art', src: a.artwork, alt: '', loading: 'lazy' }) : h('div', { class: 'art' })),
      h('div', { class: 't' }, a.title),
      h('div', { class: 's' }, [a.artist, a.year].filter(Boolean).join(' · ')),
      h('div', { class: 'as-album-actions' }, listen, lib));
  }

  async function playAlbum(a, work, btn) {
    const st = playerState();
    if (st.track && String(st.track.albumId) === String(a.id)) {
      player.toggle();
      return;
    }
    btn.disabled = true;
    try {
      const { album, tracks } = await albumTracks(a.id);
      const withPreview = tracks.filter((t) => t.preview);
      const m = work ? matchWorkTracks(work, withPreview) : null;
      const list = (m ? m.tracks : withPreview).map((t) => ({ ...t, albumId: a.id, url: t.url || album?.url || a.url }));
      if (!list.length) {
        toast('No previews for this album — open it in Apple Music');
        return;
      }
      player.play(list[0], list);
    } catch (err) {
      toast(`Couldn’t load the previews${err?.message ? ` — ${err.message}` : ''}`);
    } finally {
      btn.disabled = false;
    }
  }

  function paintPlaying(st) {
    for (const btn of root.querySelectorAll('.as-listen')) {
      const on = !!st.track && String(st.track.albumId) === btn.dataset.album && st.playing;
      btn.replaceChildren(icon(on ? 'pause' : 'play', 13), on ? 'Pause' : 'Listen');
      btn.classList.toggle('on', on);
    }
  }
  let lastSig = '';
  unsubs.push(player.subscribe((st) => {
    const sig = `${st.track?.albumId ?? ''}|${st.playing}`;
    if (sig === lastSig) return;
    lastSig = sig;
    paintPlaying(st);
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
      toast('That conversation has expired');
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
      h('div', { class: 'as-who' }, icon('sparkle', 12), 'Assistant'),
      h('div', { class: 'as-bubble as-typing', role: 'status', 'aria-label': 'Thinking' }, h('i'), h('i'), h('i')));
    list.append(thinking);
    const users = list.querySelectorAll('.as-msg.user');
    users[users.length - 1]?.scrollIntoView({ block: 'start', behavior: 'smooth' });

    await new Promise((r) => setTimeout(r, THINK_MS));
    let res;
    try {
      res = answer(q, { today: todayKey(), expect });
    } catch (err) {
      console.error(err);
      res = { reply: 'Sorry — I got confused by that one. Try naming a composer, a work, a city or a date.', items: [], followUps: ['Concerts this weekend', 'Winterreise'] };
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
    paintPlaying(playerState());
  }

  // ---------- history sheet (like Sheng: last 3 days, Done, can't be recovered) ----------
  function openHistory() {
    const list = store.assistantConversations().sort((a, b) => String(b.at).localeCompare(String(a.at)));
    const body = h('div', { class: 'as-hist' });
    const sheet = openSheet({
      title: 'Recent conversations',
      subtitle: 'Last 3 days · clear automatically',
      body,
      footer: h('p', { class: 'as-hist-foot' }, 'Expired conversations can’t be recovered'),
      closeLabel: 'Done',
    });
    sheet.el.classList.add('as-hist-sheet');
    if (!list.length) {
      body.append(h('div', { class: 'as-hist-empty' }, icon('history', 30), h('p', {}, 'No conversations in the last 3 days')));
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
          h('div', { class: 't' }, c.title || first?.text || 'Conversation'),
          h('div', { class: 's' }, `${whenOf(c.at)} · ${plural(n, 'question')}`)),
        h('div', { class: 'right' }, c.id === activeId ? h('span', { class: 'as-hist-open' }, 'Open') : null, icon('chevron', 16)));
    })));
    let armed = false;
    const clearBtn = h('button', { class: 'as-hist-clear', type: 'button' }, 'Clear all conversations');
    clearBtn.addEventListener('click', () => {
      if (!armed) {
        armed = true;
        clearBtn.textContent = 'Tap again to clear — this can’t be undone';
        return;
      }
      store.clearAssistantConversations();
      sheet.close();
      newConversation();
      toast('Conversations cleared');
    });
    body.append(clearBtn);
  }

  paint();
  paintSend();
  // Coming back to the tab (not via Back): show the latest question rather than the top.
  if (conv) requestAnimationFrame(() => { if (alive && window.scrollY === 0) scrollToLatest(); });

  return {
    title: 'Assistant',
    header: false,
    body: root,
    cleanup() {
      alive = false;
      unsubs.forEach((u) => u());
    },
  };
}
