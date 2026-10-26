// "Save" sheet for a piece or an album: add the whole album to Library → Albums, and/or put the
// piece into one of your own playlists (or a new one). Everything stays on this device; tapping a
// saved item later plays it in Apple Music Classical / Apple Music (see applemusic.js).
//
// openSaveSheet(piece)   — piece from applemusic.makePiece / workPiece / albumPiece
// saveButton(piece, opts) — a small "Save" button that opens the sheet

import { h, icon, clear, toast } from '../util.js';
import * as store from '../store.js';
import { openSheet } from './sheet.js';
import { toPlain } from '../applemusic.js';

function albumRecord(p) {
  return { id: p.collectionId, title: p.album || p.title, artist: p.artist || '', artwork: p.artwork || null, year: p.year || '', workId: p.workId || null };
}

export function openSaveSheet(piece) {
  const p = toPlain(piece);
  const body = h('div', { class: 'save-sheet' });
  const sheet = openSheet({
    title: 'Save to Library',
    subtitle: [p.composer, p.title].filter(Boolean).join(' · '),
    body,
  });
  sheet.el.classList.add('save-sheet-wrap');
  let creating = false;

  function paint() {
    const rows = [];
    // Album
    if (p.collectionId) {
      const inLib = store.hasAlbum(p.collectionId);
      rows.push(h('div', { class: 'caps-label' }, 'Album'));
      rows.push(h('button', {
        type: 'button', class: ['save-row', inLib && 'on'], 'aria-pressed': inLib ? 'true' : 'false',
        onclick: () => {
          const on = store.toggleAlbum(albumRecord(p));
          toast(on ? 'Album added to your Library' : 'Album removed from your Library');
          paint();
        },
      },
      p.artwork ? h('img', { class: 'save-art', src: p.artwork, alt: '' }) : h('span', { class: 'save-art ph' }, icon('album', 18)),
      h('span', { class: 'save-main' }, h('span', { class: 't' }, p.album || p.title), h('span', { class: 's' }, p.artist || '')),
      h('span', { class: 'save-state' }, inLib ? icon('check', 18) : icon('plus', 18))));
    }

    // Playlists (only for a piece, or a whole album as one entry)
    rows.push(h('div', { class: 'caps-label' }, 'Add to a playlist'));
    const lists = store.userPlaylists();
    for (const pl of lists) {
      const on = store.isInPlaylist(pl.id, p.id);
      rows.push(h('button', {
        type: 'button', class: ['save-row', on && 'on'], 'aria-pressed': on ? 'true' : 'false',
        onclick: () => {
          const now = store.togglePlaylistItem(pl.id, p);
          toast(now ? `Added to “${pl.name}”` : `Removed from “${pl.name}”`);
          paint();
        },
      },
      h('span', { class: 'save-art ph' }, icon('playlist', 18)),
      h('span', { class: 'save-main' }, h('span', { class: 't' }, pl.name), h('span', { class: 's' }, `${pl.items.length} ${pl.items.length === 1 ? 'piece' : 'pieces'}`)),
      h('span', { class: 'save-state' }, on ? icon('check', 18) : icon('plus', 18))));
    }

    if (creating) {
      const input = h('input', { class: 'input', type: 'text', placeholder: 'Playlist name', 'aria-label': 'New playlist name', maxlength: '80', enterkeyhint: 'done' });
      const create = () => {
        const pl = store.createPlaylist(input.value, p);
        creating = false;
        toast(`Added to new playlist “${pl.name}”`);
        paint();
      };
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); create(); } });
      rows.push(h('form', { class: 'save-new', onsubmit: (e) => { e.preventDefault(); create(); } },
        input,
        h('button', { type: 'submit', class: 'btn small primary' }, 'Create')));
      setTimeout(() => input.focus(), 50);
    } else {
      rows.push(h('button', { type: 'button', class: 'save-row new', onclick: () => { creating = true; paint(); } },
        h('span', { class: 'save-art ph' }, icon('plus', 18)),
        h('span', { class: 'save-main' }, h('span', { class: 't' }, 'New playlist…'))));
    }
    clear(body).append(...rows);
  }
  paint();
  return sheet;
}

export function saveButton(piece, { cls = 'btn small', label = 'Save', iconOnly = false } = {}) {
  return h('button', {
    type: 'button', class: [cls, 'save-btn'], 'aria-label': `Save ${piece.title} to your Library`,
    onclick: (e) => { e.stopPropagation(); e.preventDefault(); openSaveSheet(piece); },
  }, icon('plus', 15), iconOnly ? null : label);
}
