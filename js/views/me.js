// Me — personal settings, modelled on Sheng's Me / Settings (screens me-01…05, SPEC §3.12),
// plus Push preferences, Your region, Hidden concerts, Legal & Privacy and the in-app
// Notifications feed. Klang has no account and no server: everything lives on this device.
//
// Exports: render (#/me), renderReminders (#/me/reminders), renderHidden (#/me/hidden),
// renderRegion (#/me/region), renderLegal (#/me/legal), renderNotifications (#/notifications),
// plus listNotifications() and unreadCount() for the Activity bell / Discover badge.

import { h, icon, clear, toast, download, plural, debounce, normalize } from '../util.js';
import * as store from '../store.js';
import * as repo from '../repo.js';
import { buildICS } from '../ics.js';
import { ITUNES_CREDIT, classicalChart } from '../music.js';
import { href, eventRow, emptyState, toggle, segmented, venueLabel, cityLabel, initials } from '../ui/components.js';
import { openSheet } from '../ui/sheet.js';
import {
  todayKey, addDays, dayKeyOf, timeOf, zurichISO, relDayLabel, monthShort, monthLong, dayNum, weekdayShort, daysBetween, yearOf,
} from '../time.js';
import { ARTICLES } from '../content/editorials.js';
import { GUIDES } from '../content/guides.js';
import { PORTRAITS, commonsPage } from '../content/portraits.js';

const VERSION = '1.1';
const BUILD = '2026.10.26';
const DAY_MS = 86400000;

// ---------- icons not in util.js (same markup as util.icon) ----------
const EXTRA_ICONS = {
  updown: '<path d="M8 9.5l4-4 4 4M8 14.5l4 4 4-4"/>',
  moon: '<path d="M20 14.6A8.2 8.2 0 1 1 9.4 4a6.6 6.6 0 0 0 10.6 10.6z"/>',
  people: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="17" cy="9" r="2.6"/><path d="M15.6 14.1A5 5 0 0 1 21 19"/>',
  wave: '<path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 10.5v3"/>',
  shield: '<path d="M12 3l8 3v6c0 4.6-3.4 8-8 9-4.6-1-8-4.4-8-9V6z"/><path d="M9 12l2.2 2.2L15.5 10"/>',
  review: '<path d="M4 5h16v11H9.5L5 20z"/><path d="M12 7.4l1.1 2.2 2.4.35-1.75 1.7.4 2.4L12 12.9l-2.15 1.15.4-2.4L8.5 9.95l2.4-.35z" fill="currentColor" stroke="none"/>',
  calx: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M10 13.5l4 4M14 13.5l-4 4"/>',
  framed: '<rect x="4" y="3.5" width="16" height="17" rx="2"/><path d="M8 8.5h8M8 12.5h8M8 16.5h5"/>',
  okcircle: '<circle cx="12" cy="12" r="9" fill="currentColor" stroke="none"/><path d="M8 12.4l2.7 2.7L16.2 9.6" style="stroke:var(--bg)" stroke-width="2.2"/>',
  joystick: '<circle cx="12" cy="6.5" r="3"/><path d="M12 9.5v6"/><path d="M5 16.5c0-1.1 3.1-2 7-2s7 .9 7 2-3.1 2-7 2-7-.9-7-2z"/><path d="M5 16.5v2c0 1.1 3.1 2 7 2s7-.9 7-2v-2"/>',
};

function glyph(name, size = 20, cls = '') {
  if (!EXTRA_ICONS[name]) return icon(name, size, cls);
  const span = document.createElement('span');
  span.className = `icon ${cls}`.trim();
  span.setAttribute('aria-hidden', 'true');
  span.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${EXTRA_ICONS[name]}</svg>`;
  return span;
}

// ---------- shared builders ----------
// One settings row like Sheng's: line icon · title (+ grey subtitle) · value · chevron.
function row({ ic = null, icCls = '', title, sub = null, value = null, valueCls = '', to = null, external = false, onClick = null, right = null, tone = null, chevron = true, cls = null }) {
  const tag = to ? 'a' : onClick ? 'button' : 'div';
  const attrs = { class: ['me-row', tone && `tone-${tone}`, !ic && 'no-ic', cls], href: to, onclick: onClick, type: tag === 'button' ? 'button' : null };
  if (to && external) {
    attrs.target = '_blank';
    attrs.rel = 'noopener';
  }
  const showChevron = chevron && (to || onClick);
  return h(tag, attrs,
    ic ? h('span', { class: ['me-ic', icCls] }, glyph(ic, 20)) : null,
    h('span', { class: 'me-main' }, h('span', { class: 'me-t' }, title), sub ? h('span', { class: 'me-s' }, sub) : null),
    h('span', { class: 'me-right' },
      value != null && value !== '' ? h('span', { class: ['me-val', valueCls] }, value) : null,
      right,
      showChevron ? glyph(external ? 'external' : 'chevron', external ? 14 : 16) : null));
}

// A picker row: a transparent native <select> covers the row (iOS shows its wheel / menu).
function pickerRow({ ic = null, icCls = '', title, sub = null, options, value, onChange, cls = null, disabled = false, chevron = false }) {
  const labelOf = (v) => (options.find(([k]) => String(k) === String(v)) || options[0])[1];
  const val = h('span', { class: 'me-val' }, labelOf(value));
  const select = h('select', { class: 'me-select', 'aria-label': title, disabled },
    options.map(([k, l]) => h('option', { value: String(k) }, l)));
  select.value = String(value);
  select.addEventListener('change', () => {
    val.textContent = labelOf(select.value);
    onChange(select.value);
  });
  return h('label', { class: ['me-row', 'picker', !ic && 'no-ic', disabled && 'dim', cls] },
    ic ? h('span', { class: ['me-ic', icCls] }, glyph(ic, 20)) : null,
    h('span', { class: 'me-main' }, h('span', { class: 'me-t' }, title), sub ? h('span', { class: 'me-s' }, sub) : null),
    h('span', { class: 'me-right' }, val, chevron ? glyph('chevron', 16) : glyph('updown', 15)),
    select);
}

function group(label, rows, foot = null) {
  return [
    label ? h('h2', { class: 'me-glabel' }, label) : null,
    h('div', { class: 'me-group' }, rows),
    foot ? h('p', { class: 'me-gfoot' }, foot) : null,
  ];
}

function radio({ on = false, part = false, title, sub = null, count = null, onClick, disabled = false }) {
  return h('button', {
    class: ['me-radio', on && 'on', part && 'part', disabled && 'off'],
    type: 'button',
    'aria-pressed': on ? 'true' : 'false',
    disabled,
    onclick: onClick,
  },
  h('span', { class: 'dot' }),
  h('span', { class: 'grow' }, h('span', { class: 'me-t' }, title), sub ? h('span', { class: 'me-s' }, sub) : null),
  count != null ? h('span', { class: 'n' }, typeof count === 'number' ? count.toLocaleString('en-US') : count) : null);
}

function regionSummary() {
  const ids = (store.pref('regionCityIds') || []).filter((id) => repo.city(id));
  if (!ids.length) return 'Nationwide';
  if (ids.length <= 2) return ids.map((id) => repo.city(id).name).join(', ');
  return `${ids.length} cities`;
}

// ---------- calendar export (saved + going upcoming, with alarms) ----------
function icsEntry(c) {
  return {
    concert: c,
    venueName: venueLabel(c),
    cityName: cityLabel(c),
    programLines: repo.programItems(c).map((p) =>
      [p.composerName, [p.title, p.catalog].filter(Boolean).join(', ')].filter(Boolean).join(' — ')).filter(Boolean),
    creditLines: (c.credits || []).map((cr) => (cr.role ? `${cr.role}: ${cr.name}` : cr.name)).filter(Boolean),
  };
}

// New Year mode: Johann Strauss concerts of the New Year season (20 Dec – 10 Jan).
function newYearConcerts() {
  const today = todayKey();
  const y = yearOf(today);
  const md = today.slice(5);
  const season = md <= '01-10' ? y - 1 : y;
  const from = `${season}-12-20` > today ? `${season}-12-20` : today;
  const to = `${season + 1}-01-10`;
  if (from > to) return [];
  return repo.query({ from, to, composerId: 'johann-strauss' }).filter((c) => c.status !== 'cancelled');
}

function exportCalendar() {
  const now = Date.now();
  const ids = new Set([...store.markedIds('saved'), ...store.markedIds('going')]);
  const mine = [...ids].map((id) => repo.concert(id))
    .filter((c) => c && Date.parse(c.start) + (c.durationMin || 120) * 60000 > now);
  const extra = store.pref('newYearMode') ? newYearConcerts().filter((c) => !ids.has(c.id)) : [];
  const list = [...mine, ...extra].sort((a, b) => a.start.localeCompare(b.start));
  if (!list.length) {
    toast('Save a concert or mark it Going first');
    return;
  }
  const reminderDays = (store.pref('reminderDays') || []).map(Number).filter((d) => d > 0);
  download(`klang-my-concerts-${todayKey()}.ics`, buildICS(list.map(icsEntry), { reminderDays }), 'text/calendar');
  const parts = [`${plural(list.length, 'concert')} exported`];
  if (extra.length) parts.push(`incl. ${extra.length} Strauss`);
  if (reminderDays.length) parts.push('with reminders');
  toast(parts.join(' · '));
}

function exportBackup() {
  download(`klang-backup-${todayKey()}.json`, store.exportUserData(), 'application/json');
  toast('Backup saved to your downloads');
}

// ---------- avatar ----------
function downscale(file, size = 160) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const w = img.naturalWidth;
        const hgt = img.naturalHeight;
        const s = Math.min(w, hgt);
        if (!s) throw new Error('empty image');
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#1f1f23';
        ctx.fillRect(0, 0, size, size);
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, (w - s) / 2, (hgt - s) / 2, s, s, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.86));
      } catch (err) {
        reject(err);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not decode the image'));
    };
    img.src = url;
  });
}

function profileBlock() {
  const face = h('span', { class: 'me-face' });
  const removeSlot = h('div', { class: 'me-remove-slot' });
  const input = h('input', { type: 'file', accept: 'image/*', class: 'sr-only', 'aria-label': 'Choose a profile photo' });
  const nameInput = h('input', {
    class: 'me-name', type: 'text', value: store.pref('profileName') || '', placeholder: 'Your name',
    maxlength: '40', autocomplete: 'nickname', enterkeyhint: 'done', 'aria-label': 'Your name', spellcheck: 'false',
  });

  function paintFace() {
    const src = store.pref('avatar');
    const name = (nameInput.value || store.pref('profileName') || '').trim();
    clear(face).append(src
      ? h('img', { src, alt: 'Your photo' })
      : name ? h('span', { class: 'me-initials' }, initials(name)) : glyph('person', 40));
    clear(removeSlot);
    if (src) {
      removeSlot.append(h('button', {
        class: 'me-remove', type: 'button',
        onclick: () => {
          store.setPref('avatar', null);
          paintFace();
          toast('Photo removed');
        },
      }, 'Remove photo'));
    }
  }

  input.addEventListener('change', async () => {
    const file = input.files && input.files[0];
    if (!file) return;
    try {
      const url = await downscale(file, 160);
      store.setPref('avatar', url);
      paintFace();
      toast('Photo updated');
    } catch {
      toast('Couldn’t read this image — try a JPEG or PNG');
    } finally {
      input.value = '';
    }
  });

  const save = () => {
    const v = nameInput.value.trim();
    if (v !== (store.pref('profileName') || '')) store.setPref('profileName', v);
    paintFace();
  };
  // the "@name" field grows with the name (browsers without CSS field-sizing)
  const fit = () => { nameInput.size = Math.max(9, Math.min(28, (nameInput.value || '').length + 1)); };
  fit();
  nameInput.addEventListener('input', fit);
  nameInput.addEventListener('input', debounce(save, 600));
  nameInput.addEventListener('change', save);
  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') nameInput.blur();
  });

  paintFace();
  // Like Sheng: only the photo (with a camera badge) above the card; the name is the card's
  // "@handle" line, edited in place.
  return {
    el: h('div', { class: 'me-profile' },
      h('label', { class: 'me-avatar', title: 'Change photo' }, face, h('span', { class: 'me-cam' }, icon('camera', 14)), input),
      removeSlot),
    nameInput,
  };
}

// "@name · Free" replaces Sheng's "@handle · Trial" account / subscription card.
function accountCard(nameInput) {
  return h('div', { class: 'me-card' },
    h('div', { class: 'me-card-top' },
      h('label', { class: 'me-handle' }, h('span', { class: 'at', 'aria-hidden': 'true' }, '@'), nameInput),
      h('span', { class: 'me-pill' }, 'Free')),
    h('div', { class: 'me-card-t' }, 'Free & private'),
    h('div', { class: 'me-card-s' }, 'Everything is stored on this device. No account needed.'),
    h('a', { class: 'me-card-btn', href: '#/me/data' }, 'Back up & import data'),
    h('div', { class: 'me-card-links' },
      h('button', { type: 'button', onclick: exportBackup }, 'Export backup'),
      h('a', { href: '#/me/data' }, 'Restore backup')));
}

// ---------- sheets ----------
function openLanguageSheet() {
  const langs = [['English', null, true], ['Deutsch', 'German'], ['Français', 'French'], ['Italiano', 'Italian']];
  const body = h('div', {},
    h('div', { class: 'me-group' }, langs.map(([name, en, on]) => radio({
      on: !!on, title: name, sub: en, count: on ? 'Current' : 'Later', disabled: !on, onClick: () => {},
    }))),
    h('p', { class: 'me-gfoot' }, 'Klang is in English for now. Concert titles, programmes and venue names stay in their original language.'));
  openSheet({ title: 'Language', body, closeLabel: 'Done' });
}

function openWebSheet() {
  const link = `${location.origin}${location.pathname}`;
  const step = (ic, title, text) => h('div', { class: 'me-row no-chevron' },
    h('span', { class: 'me-ic' }, glyph(ic, 20)),
    h('span', { class: 'me-main' }, h('span', { class: 'me-t' }, title), h('span', { class: 'me-s' }, text)));
  const copy = h('button', {
    class: 'btn primary block', type: 'button',
    onclick: async () => {
      try {
        await navigator.clipboard.writeText(link);
        toast('Link copied');
      } catch {
        toast(link);
      }
    },
  }, icon('share', 16), 'Copy link to Klang');
  const body = h('div', {},
    h('p', { class: 'me-sheet-lead' }, 'Klang runs in any modern browser — add it to your Home Screen and it opens like an app, even offline.'),
    h('div', { class: 'me-group' },
      step('share', 'iPhone & iPad', 'In Safari, tap Share, then “Add to Home Screen”.'),
      step('download', 'Android', 'In Chrome, open the ⋮ menu, then “Add to Home screen” or “Install app”.'),
      step('globe', 'Computer', 'Chrome and Edge show an install button in the address bar; in Safari on a Mac use File → Add to Dock.')),
    h('p', { class: 'me-gfoot' }, 'Your data stays in the browser you use — move it to another device with a backup in Data & imports.'));
  openSheet({ title: 'Android & Web', body, footer: copy, closeLabel: 'Done' });
}

// ========== #/me ==========
export function render() {
  const theme = store.pref('theme') || 'system';
  const hiddenN = store.hiddenIds().length;
  const importsN = (store.getImports() || []).length;

  const profile = profileBlock();
  const body = h('div', { class: 'me' },
    profile.el,
    accountCard(profile.nameInput),
    ...group('General', [
      row({ ic: 'globe', title: 'Language', value: 'English', onClick: openLanguageSheet }),
      pickerRow({
        ic: 'contrast', title: 'Appearance', value: theme, chevron: true,
        options: [['system', 'System'], ['dark', 'Dark'], ['light', 'Light']],
        onChange: (v) => store.setPref('theme', v),
      }),
      row({ ic: 'bell', title: 'Push preferences', to: '#/me/reminders' }),
      pickerRow({
        ic: 'headphones', title: 'Podcast app', value: store.pref('podcastApp') || 'apple',
        options: [['apple', 'Apple Podcasts'], ['other', 'Other']],
        onChange: (v) => store.setPref('podcastApp', v),
      }),
    ]),
    ...group('Concerts', [
      row({ ic: 'joystick', title: 'Your region', value: regionSummary(), to: '#/me/region' }),
      row({ ic: 'eyeoff', title: 'Hidden concerts', value: hiddenN ? String(hiddenN) : null, to: '#/me/hidden' }),
      row({
        ic: 'sparkle', icCls: 'red', title: 'New Year mode',
        right: toggle(store.pref('newYearMode'), (v) => {
          store.setPref('newYearMode', v);
          toast(v ? 'New Year mode on — Strauss concerts join your calendar' : 'New Year mode off');
        }, 'New Year mode'),
      }),
    ], 'Show concerts featuring Johann Strauss on your calendar.'),
    ...group('Connections', [
      row({
        ic: 'music', title: 'Apple Music', to: 'https://music.apple.com/ch/', external: true, chevron: false,
        right: h('span', { class: 'me-ok' }, glyph('okcircle', 15), 'Previews'),
      }),
      row({ ic: 'calendar', title: 'Calendar', value: 'Export .ics', valueCls: 'accent', onClick: exportCalendar, chevron: false }),
      row({ ic: 'upload', title: 'Data & imports', value: importsN ? `${importsN} imported` : null, to: '#/me/data' }),
    ]),
    ...group('About', [
      row({ ic: 'star', title: 'Rate Klang', tone: 'accent', onClick: () => toast('Thanks!') }),
      row({ ic: 'download', title: 'Android & Web', onClick: openWebSheet }),
      row({ ic: 'shield', title: 'Legal & Privacy', to: '#/me/legal' }),
    ]),
    h('p', { class: 'me-version' }, `Version ${VERSION} · build ${BUILD}`));

  return { title: 'Me', back: true, body };
}

// ========== #/me/reminders — Push preferences ==========
// Same list as Sheng (me-03 / me-04). `goingPreview` mirrors Sheng's "Purchased-event preview"
// (Klang has no ticket purchases, so it uses concerts you marked Going); it is not in
// REMINDER_DEFAULTS, so an unset value counts as on.
const LIMIT_OPTIONS = [['unlimited', 'Unlimited'], ['1', '1 a day'], ['3', '3 a day']];
const PUSH_GROUPS = [
  {
    label: 'Concerts',
    items: [
      { key: 'openingSoon', ic: 'bell', t: 'Opening-soon reminders', s: '7 days and 1 day before a saved concert', limit: 'openingSoonLimit' },
      { key: 'castChanges', ic: 'people', t: 'Cast & programme changes', s: 'When a saved concert’s performers or programme change' },
      { key: 'reschedule', ic: 'calx', t: 'Reschedule & cancellation', s: 'Time or venue changes and cancellations for saved concerts' },
      { key: 'goingPreview', ic: 'ticket', t: 'Going-event preview', s: 'A listening guide the day before a concert you’re going to' },
    ],
  },
  {
    label: 'Discovery',
    items: [
      { key: 'favoriteWorkOnStage', ic: 'framed', t: 'Favorite work on stage', s: 'A work you like gets a new performance, anywhere', limit: 'favoriteWorkLimit' },
      { key: 'newRecordingMatch', ic: 'wave', t: 'New recording match', s: 'A new recording of a work you like', limit: 'newRecordingLimit' },
      { key: 'dailyContent', ic: 'sun', t: 'Daily content', s: 'A work or a page of music history each morning' },
      { key: 'eveningLive', ic: 'moon', t: 'Evening live recommendation', s: 'A major work being performed live tonight' },
    ],
    foot: 'Pushes beyond the daily limit are dropped for that day, not held.',
  },
  {
    label: 'After the concert',
    items: [
      { key: 'postEventReview', ic: 'review', t: 'Post-event review invitation', s: 'An invitation to rate a concert you attended' },
    ],
  },
];

const prefOn = (key) => store.reminderPref(key) ?? true;
const limitValue = (key) => {
  const v = store.reminderPref(key);
  return v == null ? 'unlimited' : String(v);
};

export function renderReminders() {
  const blocks = [];
  for (const g of PUSH_GROUPS) {
    const rows = [];
    for (const it of g.items) {
      let limitRow = null;
      const paintLimit = (on) => {
        if (!limitRow) return;
        limitRow.classList.toggle('dim', !on);
        const sel = limitRow.querySelector('select');
        if (sel) sel.disabled = !on;
      };
      rows.push(h('div', { class: 'me-row push' },
        h('span', { class: 'me-ic red' }, glyph(it.ic, 20)),
        h('span', { class: 'me-main' }, h('span', { class: 'me-t' }, it.t), h('span', { class: 'me-s' }, it.s)),
        h('span', { class: 'me-right' }, toggle(prefOn(it.key), (v) => {
          store.setReminderPref(it.key, v);
          paintLimit(v);
        }, it.t))));
      if (it.limit) {
        limitRow = pickerRow({
          title: 'Daily limit', cls: 'limit', value: limitValue(it.limit), options: LIMIT_OPTIONS,
          disabled: !prefOn(it.key),
          onChange: (v) => store.setReminderPref(it.limit, v),
        });
        rows.push(limitRow);
      }
    }
    blocks.push(...group(g.label, rows, g.foot || null));
  }

  const days = (store.pref('reminderDays') || []).map(Number).filter((d) => d > 0).sort((a, b) => b - a);
  const alarmText = days.length
    ? `Calendar files you export carry alarms ${days.map((d) => (d === 1 ? '1 day' : d === 7 ? '1 week' : `${d} days`)).join(' and ')} before each concert.`
    : 'Calendar files you export carry no alarms at the moment.';

  const body = h('div', { class: 'me me-push' },
    h('p', { class: 'me-intro' }, 'Choose which pushes you want, by type.'),
    ...blocks,
    h('p', { class: 'me-note' },
      'Klang has no server, so nothing is pushed to your phone. Notifications are worked out on this device and appear in the app — tap the bell in ',
      h('a', { href: '#/activity' }, 'Activity'), ' or open ', h('a', { href: '#/notifications' }, 'Notifications'), '. ',
      alarmText, ' ', h('a', { href: '#/me/data' }, 'Change alarms'), '.'));

  return { title: 'Push preferences', back: true, body };
}

// ========== #/me/hidden ==========
export function renderHidden() {
  const body = h('div', { class: 'me me-hidden' });

  function paint() {
    const ids = store.hiddenIds();
    clear(body);
    if (!ids.length) {
      body.append(emptyState('eyeoff', 'No hidden concerts', 'Concerts you hide stay out of your lists. They’ll show up here, so you can bring them back.',
        h('a', { class: 'btn small', href: '#/concerts' }, 'Browse concerts')));
      return;
    }
    body.append(h('p', { class: 'me-intro' }, `${plural(ids.length, 'concert')} hidden from your lists. Unhide one to see it again.`));
    const rows = ids.map((id) => ({ id, c: repo.concert(id) }))
      .sort((a, b) => (a.c ? a.c.start : '9999').localeCompare(b.c ? b.c.start : '9999'));
    for (const { id, c } of rows) {
      const unhide = h('button', {
        class: 'btn small', type: 'button', 'aria-label': `Unhide ${c ? c.title : 'concert'}`,
        onclick: () => {
          if (store.isHidden(id)) store.toggleHidden(id);
          toast('Concert unhidden');
          paint();
        },
      }, 'Unhide');
      body.append(h('div', { class: 'me-hidden-row' },
        c ? eventRow(c) : h('div', { class: 'event-row me-gone' },
          h('div', { class: 'main' }, h('div', { class: 't' }, 'No longer listed'), h('div', { class: 's' }, 'This concert was removed from the data.'))),
        unhide));
    }
    if (ids.length > 1) {
      body.append(h('button', {
        class: 'btn block me-unhide-all', type: 'button',
        onclick: () => {
          for (const id of store.hiddenIds()) store.toggleHidden(id);
          toast('All concerts unhidden');
          paint();
        },
      }, 'Unhide all'));
    }
  }

  paint();
  return { title: 'Hidden concerts', back: true, body };
}

// ========== #/me/region ==========
// Sheng: a radio list of countries + Next. Klang is Switzerland-only, so "your region" is the
// default Location filter: all of Switzerland, or chosen cities / whole cantons. Saved on tap.
export function renderRegion() {
  const cities = [...repo.allCities()];
  const allIds = cities.map((c) => c.id);
  const counts = repo.cityCounts();
  const total = [...counts.values()].reduce((s, n) => s + n, 0);
  cities.sort((a, b) => (counts.get(b.id) || 0) - (counts.get(a.id) || 0) || a.name.localeCompare(b.name));
  const cantons = [...new Set(cities.map((c) => c.canton))]
    .map((code) => {
      const list = cities.filter((c) => c.canton === code);
      return { code, name: repo.cantonName(code), cities: list, count: list.reduce((s, c) => s + (counts.get(c.id) || 0), 0) };
    })
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  let picked = new Set((store.pref('regionCityIds') || []).filter((id) => allIds.includes(id)));
  let mode = 'cities';
  const summary = h('p', { class: 'me-gfoot me-region-foot' });
  const seg = h('div', { class: 'me-region-seg' });
  const list = h('div');

  function commit() {
    if (picked.size === allIds.length) picked = new Set();
    const ids = [...picked];
    store.setPref('regionCityIds', ids);
    store.setFilters({ cityIds: [...ids] });
    paint();
  }

  function paint() {
    clear(seg).append(segmented([['cities', 'Cities'], ['cantons', 'Cantons']], mode, (v) => {
      mode = v;
      paint();
    }));
    // One radio list like Sheng's (me-05): the whole country first, then cities or cantons.
    const all = radio({
      on: picked.size === 0, title: 'All of Switzerland', count: total,
      onClick: () => {
        picked = new Set();
        commit();
      },
    });
    let rows;
    if (mode === 'cities') {
      rows = cities.map((c) => radio({
        on: picked.has(c.id), title: c.name, count: counts.get(c.id) || 0,
        onClick: () => {
          if (picked.has(c.id)) picked.delete(c.id);
          else picked.add(c.id);
          commit();
        },
      }));
    } else {
      rows = cantons.map((k) => {
        const n2 = k.cities.filter((c) => picked.has(c.id)).length;
        const allIn = n2 === k.cities.length;
        return radio({
          on: allIn, part: n2 > 0 && !allIn, title: k.name, sub: k.cities.map((c) => c.name).join(', '), count: k.count,
          onClick: () => {
            for (const c of k.cities) {
              if (allIn) picked.delete(c.id);
              else picked.add(c.id);
            }
            commit();
          },
        });
      });
    }
    clear(list).append(h('div', { class: 'me-group me-region-list' }, all, rows));
    const n = picked.size ? [...picked].reduce((s2, id) => s2 + (counts.get(id) || 0), 0) : total;
    clear(summary).append(`The Concerts tab opens with ${regionSummary() === 'Nationwide' ? 'all of Switzerland' : regionSummary()} · ${plural(n, 'upcoming concert')}`);
  }

  paint();
  const body = h('div', { class: 'me me-region' },
    h('p', { class: 'me-intro' }, 'Browse every event in your own region, without limits.'),
    seg, list, summary);
  return { title: 'Your region', back: true, body };
}

// ========== #/me/legal ==========
const LEGAL = [
  ['Your data stays on this device', [
    'Klang has no accounts and no server of its own. Your saved, going and attended concerts, private reviews, favourites, library, region, notification settings, name and photo are stored only in this browser.',
    'Nothing is sent to us — there is no “us” to send it to. Clearing your browser’s website data deletes it, so export a backup in Data & imports to keep a copy or to move to another device.',
    'No analytics, no tracking, no advertising.',
  ]],
  ['Demo concerts', [
    'Concerts tagged “Demo” are generated for illustration: the venues and works are real, but the performers, dates and programmes are invented. Don’t buy tickets or travel because of them.',
    'You can turn demo data off and import real listings (.ics calendars or JSON feeds) in Data & imports.',
  ]],
  ['Music previews', [
    ITUNES_CREDIT,
    'Recordings are found with Apple’s public iTunes Search API. Previews are streamed from Apple and never downloaded or stored by Klang. Full tracks open in Apple Music or Apple Music Classical, which need your own subscription.',
  ]],
  ['Composer portraits', [
    'Composer portraits come from Wikimedia Commons and are shown only when Commons marks the file as public domain (or “no restrictions”). They load from Wikimedia’s servers, which see your IP address under the Wikimedia privacy policy. The list below links each portrait to its file page.',
  ]],
  ['Other services', [
    'The Source Serif 4 typeface is loaded from Google Fonts (SIL Open Font License). Podcast links open Apple Podcasts. When Klang contacts Apple or Google, they see your IP address, under their own privacy policies.',
  ]],
  ['Trademarks', [
    'Apple, Apple Music, Apple Music Classical, Apple Podcasts, iTunes and AirPlay are trademarks of Apple Inc., registered in the U.S. and other countries. Venue, orchestra and festival names belong to their owners. Klang is not affiliated with or endorsed by any of them.',
  ]],
  ['Inspired by Sheng', [
    'Klang’s design follows Sheng (响声), a classical-music companion app for iPhone. Klang is an independent, non-commercial project and is not affiliated with Sheng or its developer.',
    'Community features — profiles, following people, comments, reactions and public reviews — are deliberately left out. Klang is personal only.',
  ]],
  ['No warranty', [
    'Klang is provided as is. Always check dates, times and tickets with the venue or organiser.',
  ]],
];

function portraitCredits() {
  return h('ul', { class: 'me-credits' }, Object.entries(PORTRAITS).map(([id, p]) => h('li', {},
    h('a', { href: commonsPage(p.file), target: '_blank', rel: 'noopener' }, repo.composer(id)?.name || id),
    ` — ${p.by}${p.date ? `, ${p.date}` : ''} · ${p.licence}`)));
}

export function renderLegal() {
  const body = h('div', { class: 'me me-legal' },
    h('p', { class: 'me-legal-lead' }, 'The short version: everything stays on your device.'),
    LEGAL.map(([title, paras]) => h('section', { class: 'me-legal-sec' },
      h('h2', {}, title),
      paras.map((p) => h('p', {}, p)),
      title === 'Composer portraits' ? portraitCredits() : null)),
    h('p', { class: 'me-version' }, `Klang ${VERSION} · build ${BUILD}`));
  return { title: 'Legal & Privacy', back: true, body };
}

// ========== notifications (computed on this device) ==========
// Each: { id, type, kind, icon, title, text, at (ms), href, external? }
const atZ = (dayKey, hhmm) => new Date(zurichISO(dayKey, hhmm)).getTime();
const endOf = (c) => Date.parse(c.start) + (c.durationMin || 120) * 60000;

function hash(s) {
  let x = 2166136261;
  for (let i = 0; i < s.length; i++) {
    x ^= s.charCodeAt(i);
    x = Math.imul(x, 16777619);
  }
  return x >>> 0;
}

function limitOf(key) {
  const v = store.reminderPref(key);
  const n = Number(v);
  return v == null || v === 'unlimited' || !n ? Infinity : n;
}

// Daily limit: keep the first N of each (Zurich) day; the rest are dropped, not held.
function capPerDay(list, limit) {
  if (!Number.isFinite(limit)) return list;
  const perDay = new Map();
  const out = [];
  for (const n of [...list].sort((a, b) => a.at - b.at)) {
    const d = dayKeyOf(new Date(n.at));
    const k = perDay.get(d) || 0;
    if (k < limit) {
      out.push(n);
      perDay.set(d, k + 1);
    }
  }
  return out;
}

function whereOf(c) {
  return [venueLabel(c), cityLabel(c)].filter(Boolean).join(', ');
}

function whenOf(c) {
  return `${relDayLabel(c.day)} · ${timeOf(c.start)}`;
}

// earliest time each concert was saved / marked going, and each favourite was added
function activityTimes() {
  const marked = new Map();
  const faved = new Map();
  for (const e of store.timeline()) {
    const t = Date.parse(e.at);
    if (!t) continue;
    if (e.kind === 'concert' && (e.type === 'saved' || e.type === 'going')) {
      if (!marked.has(e.id) || t < marked.get(e.id)) marked.set(e.id, t);
    } else if (e.type === 'favorite') {
      const k = `${e.kind}:${e.id}`;
      if (!faved.has(k) || t < faved.get(k)) faved.set(k, t);
    }
  }
  return { marked, faved };
}

function openingSoon(now, marked) {
  if (!prefOn('openingSoon')) return [];
  const ids = new Set([...store.markedIds('saved'), ...store.markedIds('going')]);
  const out = [];
  for (const id of ids) {
    const c = repo.concert(id);
    if (!c || c.status === 'cancelled' || Date.parse(c.start) <= now) continue;
    for (const d of [7, 1]) {
      const t = atZ(addDays(c.day, -d), '09:00');
      if (t > now || now - t > 14 * DAY_MS) continue;
      if (marked.has(id) && marked.get(id) > t) continue; // saved after the reminder would have gone out
      out.push({
        id: `soon${d}:${id}`, type: 'openingSoon', kind: d === 1 ? 'Opening tomorrow' : 'Opening in a week', icon: 'bell',
        title: c.title, text: `${whenOf(c)} · ${whereOf(c)}`, at: t, href: href.concert(id),
      });
    }
  }
  return capPerDay(out, limitOf('openingSoonLimit'));
}

function cancellations(now, marked) {
  if (!prefOn('reschedule')) return [];
  const ids = new Set([...store.markedIds('saved'), ...store.markedIds('going')]);
  const morning = Math.min(now, atZ(todayKey(), '08:00'));
  const out = [];
  for (const id of ids) {
    const c = repo.concert(id);
    if (!c || c.status !== 'cancelled' || endOf(c) < now - 2 * DAY_MS) continue;
    out.push({
      id: `cancel:${id}`, type: 'reschedule', kind: 'Cancelled', icon: 'calx',
      title: c.title, text: `${whenOf(c)} · ${whereOf(c)} — this concert has been cancelled.`,
      at: Math.min(now, Math.max(marked.get(id) || 0, morning)), href: href.concert(id),
    });
  }
  return out;
}

function goingPreviews(now) {
  if (!prefOn('goingPreview')) return [];
  const out = [];
  for (const id of store.markedIds('going')) {
    const c = repo.concert(id);
    if (!c || c.status === 'cancelled' || Date.parse(c.start) <= now) continue;
    const t = atZ(addDays(c.day, -1), '10:00');
    if (t > now) continue;
    const works = repo.programItems(c).filter((p) => p.title);
    const names = works.slice(0, 3).map((p) => [p.composerShort, p.title].filter(Boolean).join(': '));
    const guide = works.some((p) => p.work && GUIDES[p.work.id]);
    out.push({
      id: `preview:${id}`, type: 'goingPreview', kind: 'Before you go', icon: 'ticket',
      title: c.title,
      text: `${whenOf(c)}. ${names.length ? `On the programme: ${names.join(' · ')}${works.length > 3 ? ' …' : ''}. ` : ''}${guide ? 'Read the listening guide and preview the music.' : 'Preview the music before you go.'}`,
      at: t, href: href.concert(id),
    });
  }
  return out;
}

function favoritesOnStage(now, faved) {
  if (!prefOn('favoriteWorkOnStage')) return [];
  const out = [];
  const seen = new Set();
  const nextOf = (opts) => repo.upcoming(opts).find((c) => c.status !== 'cancelled' && Date.parse(c.start) > now && !seen.has(c.id));
  const when = (c, key) => Math.max(faved.get(key) || 0, atZ(addDays(c.day, -45), '10:00'));
  for (const workId of store.followed('work')) {
    const w = repo.work(workId);
    const c = w && nextOf({ workId });
    if (!c) continue;
    const t = when(c, `work:${workId}`);
    if (t > now) continue;
    seen.add(c.id);
    const comp = repo.composer(w.composerId);
    out.push({
      id: `stage:${workId}:${c.id}`, type: 'favoriteWorkOnStage', kind: 'Favorite work on stage', icon: 'framed',
      title: w.title, text: `${comp ? `${comp.name} · ` : ''}${c.title} · ${whenOf(c)} · ${whereOf(c)}`, at: t, href: href.concert(c.id),
    });
  }
  for (const composerId of store.followed('composer')) {
    const comp = repo.composer(composerId);
    const c = comp && nextOf({ composerId });
    if (!c) continue;
    const t = when(c, `composer:${composerId}`);
    if (t > now) continue;
    seen.add(c.id);
    const works = repo.programItems(c).filter((p) => p.composer && p.composer.id === composerId).map((p) => p.title);
    out.push({
      id: `stage:${composerId}:${c.id}`, type: 'favoriteWorkOnStage', kind: 'Favorite composer on stage', icon: 'framed',
      title: `${comp.name}${works.length ? ` — ${works[0]}` : ''}`, text: `${c.title} · ${whenOf(c)} · ${whereOf(c)}`, at: t, href: href.concert(c.id),
    });
  }
  return capPerDay(out, limitOf('favoriteWorkLimit'));
}

function dailyItem(day) {
  const md = day.slice(5);
  const anniv = repo.allComposers().filter((c) => c.bornDate === md || c.diedDate === md);
  if (anniv.length) {
    const c = anniv[hash(day) % anniv.length];
    const born = c.bornDate === md;
    const year = born ? c.born : c.died;
    const years = yearOf(day) - year;
    return {
      kind: 'On this day', icon: 'history',
      title: born ? `${c.name} was born ${years} years ago` : `${c.name} died ${years} years ago`,
      text: `${born ? 'Born' : 'Died'} ${dayNum(day)} ${monthLong(day.slice(0, 7))} ${year}${c.country ? ` · ${c.country}` : ''}. Explore the works and where they’re played next.`,
      href: href.composer(c.id),
    };
  }
  if (ARTICLES.length && hash(`${day}:read`) % 3 === 0) {
    const a = ARTICLES[hash(day) % ARTICLES.length];
    return { kind: 'Today’s read', icon: 'book', title: a.title, text: a.dek || '', href: `#/article/${encodeURIComponent(a.id)}` };
  }
  const works = repo.allWorks();
  if (!works.length) return null;
  const w = works[hash(day) % works.length];
  const comp = repo.composer(w.composerId);
  return {
    kind: 'Work of the day', icon: 'sun', title: w.title,
    text: [[comp ? comp.name : null, w.year].filter(Boolean).join(', '), w.blurb].filter(Boolean).join(' — '),
    href: href.work(w.id),
  };
}

function dailyContent(now) {
  if (!prefOn('dailyContent')) return [];
  const out = [];
  const today = todayKey();
  for (let k = 0; k < 3; k++) {
    const day = addDays(today, -k);
    const t = atZ(day, '08:00');
    if (t > now) continue;
    const item = dailyItem(day);
    if (item) out.push({ id: `daily:${day}`, type: 'dailyContent', at: t, ...item });
  }
  return out;
}

function eveningPick(day) {
  const region = new Set(store.pref('regionCityIds') || []);
  const all = repo.query({ from: day, to: day }).filter((c) => c.status !== 'cancelled');
  const pool = region.size && all.some((c) => region.has(c.cityId)) ? all.filter((c) => region.has(c.cityId)) : all;
  let best = null;
  for (const c of pool) {
    for (const it of repo.programItems(c)) {
      if (!it.work) continue;
      const score = (it.work.minutes || 0) + (c.featured ? 30 : 0) + (it.work.opera ? 20 : 0);
      if (!best || score > best.score || (score === best.score && c.id < best.c.id)) best = { c, it, score };
    }
  }
  return best;
}

function eveningLive(now) {
  if (!prefOn('eveningLive')) return [];
  const out = [];
  const today = todayKey();
  for (const day of [today, addDays(today, -1)]) {
    const t = atZ(day, '16:00');
    if (t > now) continue;
    const pick = eveningPick(day);
    if (!pick) continue;
    const { c, it } = pick;
    out.push({
      id: `live:${day}`, type: 'eveningLive', kind: 'Live tonight', icon: 'moon',
      title: it.title, text: `${it.composerName ? `${it.composerName} · ` : ''}${c.title} · ${timeOf(c.start)} · ${whereOf(c)}`,
      at: t, href: href.concert(c.id),
    });
  }
  return out;
}

function reviewInvites(now) {
  if (!prefOn('postEventReview')) return [];
  const ids = new Set([...store.markedIds('attended'), ...store.markedIds('going')]);
  const out = [];
  for (const id of ids) {
    const c = repo.concert(id);
    if (!c || c.status === 'cancelled') continue;
    const end = endOf(c);
    if (end > now || now - end > 7 * DAY_MS) continue;
    if (store.markOf(id).rating) continue;
    out.push({
      id: `review:${id}`, type: 'postEventReview', kind: 'How was it?', icon: 'review',
      title: c.title, text: `${relDayLabel(c.day)} at ${venueLabel(c)}. Rate it and note your favourite piece — your review stays private.`,
      at: Math.min(now, end + 30 * 60000), href: href.concert(id),
    });
  }
  return out;
}

// New releases on Apple's Swiss classical chart by composers you like (async, network).
async function recordingMatches(now) {
  if (!prefOn('newRecordingMatch')) return [];
  const compIds = new Set(store.followed('composer'));
  for (const wid of store.followed('work')) {
    const w = repo.work(wid);
    if (w) compIds.add(w.composerId);
  }
  const keys = [...compIds].map((id) => repo.composer(id)).filter(Boolean)
    .map((c) => ({ c, key: normalize(c.short.replace(/^[A-Z]\.\s*/, '').replace(/\s+II$/, '')).replace(/[^a-z0-9]+/g, ' ').trim() }))
    .filter((k) => k.key.length >= 3);
  if (!keys.length) return [];
  const chart = await classicalChart(50);
  const out = [];
  for (const a of chart) {
    const hay = ` ${normalize(`${a.title} ${a.artist}`).replace(/[^a-z0-9]+/g, ' ')} `;
    const hit = keys.find((k) => hay.includes(` ${k.key} `));
    const released = Date.parse(a.releaseDate);
    if (!hit || !released || released > now || now - released > 60 * DAY_MS) continue;
    out.push({
      id: `rec:${a.id}`, type: 'newRecordingMatch', kind: 'New recording', icon: 'wave',
      title: a.title, text: `${a.artist} · a new release for ${hit.c.name}. Opens in Apple Music.`,
      at: Math.min(now, atZ(dayKeyOf(new Date(released)), '10:00')), href: a.url, external: true,
    });
  }
  return capPerDay(out, limitOf('newRecordingLimit'));
}

// Everything that can be computed without the network, newest first.
export function listNotifications(now = Date.now()) {
  const { marked, faved } = activityTimes();
  const all = [
    ...openingSoon(now, marked),
    ...cancellations(now, marked),
    ...goingPreviews(now),
    ...favoritesOnStage(now, faved),
    ...dailyContent(now),
    ...eveningLive(now),
    ...reviewInvites(now),
  ];
  return all.sort((a, b) => b.at - a.at || a.id.localeCompare(b.id)).slice(0, 80);
}

export function unreadCount() {
  try {
    return listNotifications().filter((n) => !store.isNotificationRead(n.id)).length;
  } catch (err) {
    console.error(err);
    return 0;
  }
}

function relTime(t, now) {
  const s = Math.max(0, (now - t) / 1000);
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  const d = dayKeyOf(new Date(t));
  const diff = daysBetween(d, todayKey());
  const hhmm = timeOf(new Date(t).toISOString());
  if (diff <= 0) return `${Math.floor(s / 3600)} h ago`;
  if (diff === 1) return `Yesterday ${hhmm}`;
  if (diff < 7) return `${weekdayShort(d)} ${hhmm}`;
  return `${monthShort(d)} ${dayNum(d)}`;
}

function sectionOf(t) {
  const diff = daysBetween(dayKeyOf(new Date(t)), todayKey());
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return 'This week';
  return 'Earlier';
}

// ========== #/notifications ==========
export function renderNotifications() {
  const now = Date.now();
  let list = listNotifications(now);
  const unread = new Set(list.filter((n) => !store.isNotificationRead(n.id)).map((n) => n.id));
  const body = h('div', { class: 'me nt-page' });
  const listEl = h('div', { class: 'nt-list' });
  const tabsEl = h('div', { class: 'nt-tabs', role: 'tablist' });
  let alive = true;
  // Two pill tabs like Sheng's Messages (Reactions / Comments): Concerts · Discovery.
  const CONCERT_TYPES = new Set(['openingSoon', 'reschedule', 'goingPreview', 'postEventReview']);
  const tabOf = (n) => (CONCERT_TYPES.has(n.type) ? 'concerts' : 'discovery');
  let tab = list.some((n) => tabOf(n) === 'concerts') || !list.length ? 'concerts' : 'discovery';

  function paintTabs() {
    clear(tabsEl).append(...[['concerts', 'Concerts'], ['discovery', 'Discovery']].map(([k, label]) => {
      const n = list.filter((x) => tabOf(x) === k && unread.has(x.id)).length;
      return h('button', {
        class: ['nt-tab', tab === k && 'on'], type: 'button', role: 'tab', 'aria-selected': tab === k ? 'true' : 'false',
        onclick: () => {
          tab = k;
          paintTabs();
          paint();
        },
      }, label, n ? h('i', { class: 'nt-tab-dot', 'aria-label': `${n} new` }) : null);
    }));
  }

  function ntRow(n) {
    const isNew = unread.has(n.id);
    const attrs = { class: ['nt-row', isNew && 'unread'], href: n.href || null };
    if (n.href && n.external) {
      attrs.target = '_blank';
      attrs.rel = 'noopener';
    }
    return h(n.href ? 'a' : 'div', attrs,
      h('span', { class: 'nt-ic' }, glyph(n.icon, 18)),
      h('span', { class: 'nt-main' },
        h('span', { class: 'nt-top' }, h('span', { class: 'nt-kind' }, n.kind), h('span', { class: 'nt-time' }, relTime(n.at, now))),
        h('span', { class: 'nt-t' }, n.title),
        n.text ? h('span', { class: 'nt-x' }, n.text) : null),
      isNew ? h('span', { class: 'nt-dot', role: 'img', 'aria-label': 'New' }) : null);
  }

  function paint() {
    clear(listEl);
    const shown = list.filter((n) => tabOf(n) === tab);
    if (!shown.length) {
      const groupLabel = tab === 'concerts' ? 'Concerts' : 'Discovery';
      const anyOn = PUSH_GROUPS.some((g) => g.label.startsWith(tab === 'concerts' ? 'Concerts' : 'Discovery') && g.items.some((it) => prefOn(it.key)))
        || (tab === 'concerts' && prefOn('postEventReview'));
      listEl.append(h('div', { class: 'nt-empty' },
        h('p', {}, 'No notifications yet'),
        h('small', {}, anyOn
          ? (tab === 'concerts'
            ? 'Reminders and changes for concerts you save show up here.'
            : 'Favourite works or composers — recommendations show up here.')
          : [`${groupLabel} pushes are switched off in `, h('a', { href: '#/me/reminders' }, 'Push preferences'), '.'])));
      return;
    }
    let current = null;
    let sec = null;
    for (const n of shown) {
      const s = sectionOf(n.at);
      if (s !== current) {
        current = s;
        sec = h('section', { class: 'nt-sec' }, h('h2', { class: 'caps-label' }, s));
        listEl.append(sec);
      }
      sec.append(ntRow(n));
    }
  }

  paintTabs();
  paint();
  if (unread.size) store.markNotificationsRead([...unread]);

  recordingMatches(now).then((recs) => {
    if (!alive || !recs.length) return;
    const known = new Set(list.map((n) => n.id));
    const fresh = recs.filter((n) => !known.has(n.id));
    if (!fresh.length) return;
    for (const n of fresh) if (!store.isNotificationRead(n.id)) unread.add(n.id);
    list = [...list, ...fresh].sort((a, b) => b.at - a.at || a.id.localeCompare(b.id));
    paintTabs();
    paint();
    store.markNotificationsRead(fresh.map((n) => n.id));
  }).catch(() => {});

  body.append(tabsEl, listEl, h('p', { class: 'me-note' },
    'Worked out on this device each time you open Klang — nothing is pushed to your phone. For alerts, export your concerts to your calendar from ',
    h('a', { href: '#/me' }, 'Me'), '; the file includes alarms. ',
    h('a', { href: '#/me/reminders' }, 'Push preferences'), '.'));

  return {
    title: 'Notifications',
    back: true,
    actions: [h('a', { class: 'icon-btn', href: '#/me/reminders', 'aria-label': 'Push preferences' }, icon('gear', 18))],
    body,
    cleanup: () => { alive = false; },
  };
}
