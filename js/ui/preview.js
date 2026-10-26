// The two listening buttons used wherever a recording appears:
//   previewButton(...)  ▶ Preview — plays Apple's 30-second preview inside Klang (tap again to pause).
//   classicalButton(piece)  "Apple Music Classical ↗" — opens the full recording in Apple Music Classical
//                       (or Apple Music, per Me › Play in) at the piece; a real link, see applemusic.js.
//
// previewButton({ resolve, cls, label })
//   resolve() returns { track, queue } (track = an albumTracks() track with .preview, ideally extended
//   with piece fields), or a Promise of it, or null when there is no preview. A synchronous result
//   plays at once; for a Promise the tap first unlocks audio (iOS needs the gesture) and plays when
//   the lookup finishes.

import { h, icon, toast } from '../util.js';
import { preview, previewState } from '../music.js';
import { listenLink, playAppName } from '../applemusic.js';
import { t } from '../i18n.js';

const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function previewButton({ resolve, cls = '', label = null } = {}) {
  let mine = null; // the track this button last started
  let loading = false;
  const text = h('span', { class: 'pv-t' }, t('Preview'));
  const btn = h('button', { type: 'button', class: ['pv-btn', cls], 'aria-label': label || t('Play a 30-second preview') }, icon('play', 12), text);

  function paint(st = previewState()) {
    if (!btn.isConnected && mine === null && !loading) return;
    const on = !!mine && st.track === mine;
    btn.classList.toggle('on', on && st.playing);
    btn.classList.toggle('loading', loading);
    btn.replaceChildren(icon(loading ? 'music' : on && st.playing ? 'pause' : 'play', 12),
      h('span', { class: 'pv-t' }, on ? (st.playing ? `${fmt(Math.max(0, st.duration - st.elapsed))}` : t('Resume')) : t('Preview')));
  }

  const unsub = preview.subscribe((st) => {
    if (!btn.isConnected && btn.dataset.mounted) { unsub(); return; }
    if (btn.isConnected) btn.dataset.mounted = '1';
    paint(st);
  });

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const st = previewState();
    if (mine && st.track === mine) { preview.toggle(); return; }
    let res;
    try { res = resolve?.(); } catch { res = null; }
    const start = (r) => {
      if (!r?.track?.preview) { toast(t('No preview for this recording')); return; }
      mine = r.track;
      preview.play(r.track, r.queue || [r.track]);
    };
    if (res && typeof res.then === 'function') {
      preview.unlock();
      loading = true;
      paint();
      res.then(start, () => toast(t('Couldn’t load the preview'))).finally(() => { loading = false; paint(); });
    } else start(res);
  });
  return btn;
}

export function classicalButton(piece, { cls = '', queue = null, index = 0, compact = false } = {}) {
  const name = playAppName();
  return listenLink(piece, [icon('external', 12), h('span', { class: 'pv-t' }, compact ? t('Open') : name)], {
    cls: `pv-btn pv-open ${cls}`,
    queue,
    index,
    label: t('Play {title} in full in {app}', { title: piece.title, app: name }),
  });
}
