// Me — personal settings, modelled on Sheng's Me / Settings (screens me-01…05, SPEC §3.12),
// plus Language (Automatic · English · 简体中文), Push preferences, Your region, Hidden concerts,
// Legal & Privacy (incl. where the concert listings come from) and the in-app Notifications feed,
// worked out from the real listings. Klang has no account and no server: everything lives on this
// device.
//
// Exports: render (#/me), renderReminders (#/me/reminders), renderHidden (#/me/hidden),
// renderRegion (#/me/region), renderLegal (#/me/legal), renderNotifications (#/notifications),
// plus listNotifications() and unreadCount() for the Activity bell / Discover badge.

import { h, icon, clear, toast, download, plural, debounce, normalize } from '../util.js';
import * as store from '../store.js';
import * as repo from '../repo.js';
import { buildICS } from '../ics.js';
import { classicalChart } from '../music.js';
import { PLAY_APPS, playApp, playAppName, albumURL } from '../applemusic.js';
import { href, eventRow, emptyState, toggle, segmented, venueLabel, cityLabel, initials, sourceCredit } from '../ui/components.js';
import { openSheet } from '../ui/sheet.js';
import {
  todayKey, addDays, dayKeyOf, timeOf, zurichISO, relDayLabel, monthLong, dayNum, weekdayShort, daysBetween, yearOf,
} from '../time.js';
import {
  t, tn, fmtN, isZh, lang, setLang, LANGS, cityName, cantonName as cantonLabel, countryName, composerName, composerShort,
  dayMonth, joinList, tidyZh,
} from '../i18n.js';
import { otherCountries, countryCities } from '../data/countries.js';
import { updatedLabel, listingStats } from './settings.js';
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
  count != null ? h('span', { class: 'n' }, typeof count === 'number' ? fmtN(count) : count) : null);
}

// Between the parts of a sentence that holds links: a space in English, none in Chinese.
const sp = () => (isZh() ? '' : ' ');
// joinList with a space between "和" and Latin names or digits ("1 周和 1 天", "Casino Bern 和 Sion …").
const joinWords = (list) => joinList(list).replace(/和(?=[0-9A-Za-zÀ-ž])/g, '和 ').replace(/([0-9A-Za-zÀ-ž.)])和/g, '$1 和');

// t() with a date in it: the date is put in after translating, because Chinese tidying would drop
// the space in "10月30日 周五".
const keepDate = (s) => (isZh() ? tidyZh(s.replace(/日 (周|星期)/g, '日\u0001$1')).replace(/\u0001/g, ' ') : s);
const tDate = (text, vars, dateVars) => keepDate(Object.entries(dateVars).reduce((s, [k, v]) => s.replace(`{${k}}`, v), t(text, vars)));

// Names sort in the interface language (pinyin order in Chinese).
const byName = (a, b) => String(a).localeCompare(String(b), isZh() ? 'zh-Hans-CN' : 'en');

// "Nationwide" / "Zurich, Basel" / "5 cities"
function regionSummary() {
  const ids = (store.pref('regionCityIds') || []).filter((id) => repo.city(id));
  if (!ids.length) return t('Nationwide');
  if (ids.length <= 2) return ids.map((id) => cityName(repo.city(id))).join(isZh() ? '、' : ', ');
  return tn(ids.length, '{n} city', '{n} cities');
}

// ---------- calendar export (saved + going upcoming, with alarms) ----------
function icsEntry(c) {
  return {
    concert: c,
    venueName: venueLabel(c),
    cityName: repo.city(c.cityId)?.name || '', // the town's own name, so Maps finds it whatever the interface language
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
    toast(t('Save a concert or mark it Going first'));
    return;
  }
  const reminderDays = (store.pref('reminderDays') || []).map(Number).filter((d) => d > 0);
  download(`klang-my-concerts-${todayKey()}.ics`, buildICS(list.map(icsEntry), { reminderDays }), 'text/calendar');
  const parts = [tn(list.length, '{n} concert exported', '{n} concerts exported')];
  if (extra.length) parts.push(t('incl. {n} Strauss', { n: fmtN(extra.length) }));
  if (reminderDays.length) parts.push(t('with reminders'));
  toast(parts.join(' · '));
}

function exportBackup() {
  download(`klang-backup-${todayKey()}.json`, store.exportUserData(), 'application/json');
  toast(t('Backup saved to your downloads'));
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
      reject(new Error(t('Could not decode the image')));
    };
    img.src = url;
  });
}

function profileBlock() {
  const face = h('span', { class: 'me-face' });
  const removeSlot = h('div', { class: 'me-remove-slot' });
  const input = h('input', { type: 'file', accept: 'image/*', class: 'sr-only', 'aria-label': t('Choose a profile photo') });
  const nameInput = h('input', {
    class: 'me-name', type: 'text', value: store.pref('profileName') || '', placeholder: t('Your name'),
    maxlength: '40', autocomplete: 'nickname', enterkeyhint: 'done', 'aria-label': t('Your name'), spellcheck: 'false',
  });

  function paintFace() {
    const src = store.pref('avatar');
    const name = (nameInput.value || store.pref('profileName') || '').trim();
    clear(face).append(src
      ? h('img', { src, alt: t('Your photo') })
      : name ? h('span', { class: 'me-initials' }, initials(name)) : glyph('person', 40));
    clear(removeSlot);
    if (src) {
      removeSlot.append(h('button', {
        class: 'me-remove', type: 'button',
        onclick: () => {
          store.setPref('avatar', null);
          paintFace();
          toast(t('Photo removed'));
        },
      }, t('Remove photo')));
    }
  }

  input.addEventListener('change', async () => {
    const file = input.files && input.files[0];
    if (!file) return;
    try {
      const url = await downscale(file, 160);
      store.setPref('avatar', url);
      paintFace();
      toast(t('Photo updated'));
    } catch {
      toast(t('Couldn’t read this image — try a JPEG or PNG'));
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
      h('label', { class: 'me-avatar', title: t('Change photo') }, face, h('span', { class: 'me-cam' }, icon('camera', 14)), input),
      removeSlot),
    nameInput,
  };
}

// "@name · Free" replaces Sheng's "@handle · Trial" account / subscription card.
function accountCard(nameInput) {
  return h('div', { class: 'me-card' },
    h('div', { class: 'me-card-top' },
      h('label', { class: 'me-handle' }, h('span', { class: 'at', 'aria-hidden': 'true' }, '@'), nameInput),
      h('span', { class: 'me-pill' }, t('Free'))),
    h('div', { class: 'me-card-t' }, t('Free & private')),
    h('div', { class: 'me-card-s' }, t('Everything is stored on this device. No account needed.')),
    h('a', { class: 'me-card-btn', href: '#/me/data' }, t('Back up & import data')),
    h('div', { class: 'me-card-links' },
      h('button', { type: 'button', onclick: exportBackup }, t('Export backup')),
      h('a', { href: '#/me/data' }, t('Restore backup'))));
}

// ---------- sheets ----------
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
        toast(t('Link copied'));
      } catch {
        toast(link);
      }
    },
  }, icon('share', 16), t('Copy link to Klang'));
  const body = h('div', {},
    h('p', { class: 'me-sheet-lead' }, t('Klang runs in any modern browser — add it to your Home Screen and it opens like an app, even offline.')),
    h('div', { class: 'me-group' },
      step('share', t('iPhone & iPad'), t('In Safari, tap Share, then “Add to Home Screen”.')),
      step('download', 'Android', t('In Chrome, open the ⋮ menu, then “Add to Home screen” or “Install app”.')),
      step('globe', t('Computer'), t('Chrome and Edge show an install button in the address bar; in Safari on a Mac use File → Add to Dock.'))),
    h('p', { class: 'me-gfoot' }, t('Your data stays in the browser you use — move it to another device with a backup in Data & imports.')));
  openSheet({ title: t('Android & Web'), body, footer: copy, closeLabel: t('Done') });
}

// ========== #/me ==========
// Language: Automatic (follows the phone) · English · 简体中文. The row says "Language" in both
// languages so it can be found whichever one is showing.
function languageRow() {
  const auto = (navigator.languages?.[0] || navigator.language || '').toLowerCase().startsWith('zh') ? '简体中文' : 'English';
  const options = LANGS.map(([k, label]) => [k, k === 'auto' ? (isZh() ? `${t('Automatic')}（${auto}）` : `${t('Automatic')} (${auto})`) : label]);
  return pickerRow({
    ic: 'globe', title: isZh() ? '语言 · Language' : 'Language · 语言', value: store.pref('lang') || 'auto', chevron: true,
    options,
    onChange: (v) => setLang(v), // main.js redraws the shell and this page in the new language
  });
}

export function render() {
  const theme = store.pref('theme') || 'system';
  const hiddenN = store.hiddenIds().length;
  const importsN = (store.getImports() || []).length;

  const profile = profileBlock();
  const body = h('div', { class: 'me' },
    profile.el,
    accountCard(profile.nameInput),
    ...group(t('General'), [
      languageRow(),
      pickerRow({
        ic: 'contrast', title: t('Appearance'), value: theme, chevron: true,
        options: [['system', t('System')], ['dark', t('Dark')], ['light', t('Light')]],
        onChange: (v) => store.setPref('theme', v),
      }),
      row({ ic: 'bell', title: t('Push preferences'), to: '#/me/reminders' }),
      pickerRow({
        ic: 'headphones', title: t('Podcast app'), value: store.pref('podcastApp') || 'apple',
        options: [['apple', 'Apple Podcasts'], ['other', t('Other')]],
        onChange: (v) => store.setPref('podcastApp', v),
      }),
    ]),
    ...group(t('Concerts'), [
      row({ ic: 'joystick', title: t('Your region'), value: regionSummary(), to: '#/me/region' }),
      row({ ic: 'eyeoff', title: t('Hidden concerts'), value: hiddenN ? fmtN(hiddenN) : null, to: '#/me/hidden' }),
      row({
        ic: 'sparkle', icCls: 'red', title: t('New Year mode'),
        right: toggle(store.pref('newYearMode'), (v) => {
          store.setPref('newYearMode', v);
          toast(v ? t('New Year mode on — Strauss concerts join your calendar') : t('New Year mode off'));
        }, t('New Year mode')),
      }),
    ], t('Show concerts featuring Johann Strauss on your calendar.')),
    ...group(t('Connections'), [
      // Listen / Play open the piece in this app (applemusic.js); Preview plays 30 s inside Klang.
      pickerRow({
        ic: 'music', title: t('Play in'), value: playApp(),
        options: PLAY_APPS.map(([k, l]) => [k, t(l)]),
        onChange: (v) => store.setPref('playIn', v === 'music' ? 'music' : 'classical'),
      }),
      row({ ic: 'calendar', title: t('Calendar'), value: t('Export .ics'), valueCls: 'accent', onClick: exportCalendar, chevron: false }),
      row({ ic: 'upload', title: t('Data & imports'), value: importsN ? t('{n} imported', { n: fmtN(importsN) }) : null, to: '#/me/data' }),
    ], t('Preview plays 30 seconds inside Klang. Listen and Play open the piece in this app, where it plays in full with your Apple Music subscription.')),
    ...group(t('About'), [
      row({ ic: 'star', title: t('Rate Klang'), tone: 'accent', onClick: () => toast(t('Thanks!')) }),
      row({ ic: 'download', title: t('Android & Web'), onClick: openWebSheet }),
      row({ ic: 'shield', title: t('Legal & Privacy'), to: '#/me/legal' }),
    ]),
    h('p', { class: 'me-version' }, t('Version {v} · build {build}', { v: VERSION, build: BUILD })));

  return { title: t('Me'), back: true, body };
}

// ========== #/me/reminders — Push preferences ==========
// Same list as Sheng (me-03 / me-04). `goingPreview` mirrors Sheng's "Purchased-event preview"
// (Klang has no ticket purchases, so it uses concerts you marked Going); it is not in
// REMINDER_DEFAULTS, so an unset value counts as on.
const LIMIT_OPTIONS = [['unlimited', 'Unlimited'], ['1', '1 a day'], ['3', '3 a day']]; // labels go through t()
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
        h('span', { class: 'me-main' }, h('span', { class: 'me-t' }, t(it.t)), h('span', { class: 'me-s' }, t(it.s))),
        h('span', { class: 'me-right' }, toggle(prefOn(it.key), (v) => {
          store.setReminderPref(it.key, v);
          paintLimit(v);
        }, t(it.t)))));
      if (it.limit) {
        limitRow = pickerRow({
          title: t('Daily limit'), cls: 'limit', value: limitValue(it.limit), options: LIMIT_OPTIONS.map(([k, l]) => [k, t(l)]),
          disabled: !prefOn(it.key),
          onChange: (v) => store.setReminderPref(it.limit, v),
        });
        rows.push(limitRow);
      }
    }
    blocks.push(...group(t(g.label), rows, g.foot ? t(g.foot) : null));
  }

  const days = (store.pref('reminderDays') || []).map(Number).filter((d) => d > 0).sort((a, b) => b - a);
  const alarmText = days.length
    ? t('Calendar files you export carry alarms {times} before each concert.', {
      times: joinWords(days.map((d) => (d === 7 ? t('1 week') : d === 14 ? t('2 weeks') : tn(d, '{n} day', '{n} days')))),
    })
    : t('Calendar files you export carry no alarms at the moment.');

  const body = h('div', { class: 'me me-push' },
    h('p', { class: 'me-intro' }, t('Choose which pushes you want, by type.')),
    ...blocks,
    h('p', { class: 'me-note' },
      t('Klang has no server, so nothing is pushed to your phone. Notifications are worked out on this device from the real concert listings and appear in the app — tap the bell in'), sp(),
      h('a', { href: '#/activity' }, t('Activity')), sp(), t('or open'), sp(), h('a', { href: '#/notifications' }, t('Notifications')), t('.'), sp(),
      alarmText, sp(), h('a', { href: '#/me/data' }, t('Change alarms')), t('.')));

  return { title: t('Push preferences'), back: true, body };
}

// ========== #/me/hidden ==========
export function renderHidden() {
  const body = h('div', { class: 'me me-hidden' });

  function paint() {
    const ids = store.hiddenIds();
    clear(body);
    if (!ids.length) {
      body.append(emptyState('eyeoff', t('No hidden concerts'), t('Concerts you hide stay out of your lists. They’ll show up here, so you can bring them back.'),
        h('a', { class: 'btn small', href: '#/concerts' }, t('Browse concerts'))));
      return;
    }
    body.append(h('p', { class: 'me-intro' }, tn(ids.length, '{n} concert hidden from your lists. Unhide it to see it again.', '{n} concerts hidden from your lists. Unhide one to see it again.')));
    const rows = ids.map((id) => ({ id, c: repo.concert(id) }))
      .sort((a, b) => (a.c ? a.c.start : '9999').localeCompare(b.c ? b.c.start : '9999'));
    for (const { id, c } of rows) {
      const unhide = h('button', {
        class: 'btn small', type: 'button', 'aria-label': c ? t('Unhide {title}', { title: c.title }) : t('Unhide'),
        onclick: () => {
          if (store.isHidden(id)) store.toggleHidden(id);
          toast(t('Concert unhidden'));
          paint();
        },
      }, t('Unhide'));
      body.append(h('div', { class: 'me-hidden-row' },
        c ? eventRow(c) : h('div', { class: 'event-row me-gone' },
          h('div', { class: 'main' }, h('div', { class: 't' }, t('No longer listed')), h('div', { class: 's' }, t('This concert is no longer in the listings.')))),
        unhide));
    }
    if (ids.length > 1) {
      body.append(h('button', {
        class: 'btn block me-unhide-all', type: 'button',
        onclick: () => {
          for (const id of store.hiddenIds()) store.toggleHidden(id);
          toast(t('All concerts unhidden'));
          paint();
        },
      }, t('Unhide all')));
    }
  }

  paint();
  return { title: t('Hidden concerts'), back: true, body };
}

// ========== #/me/region ==========
// Sheng: a radio list of countries + Next. Klang's listings are Swiss, so "your region" is the
// default Location filter: all of Switzerland, or chosen cities / whole cantons. Saved on tap.
// Sheng's other countries are listed below with 0 events — Klang has no listings there yet.
export function renderRegion() {
  const cities = [...repo.allCities()];
  const allIds = cities.map((c) => c.id);
  const counts = repo.cityCounts();
  const total = [...counts.values()].reduce((s, n) => s + n, 0);
  cities.sort((a, b) => (counts.get(b.id) || 0) - (counts.get(a.id) || 0) || byName(cityName(a), cityName(b)));
  // towns a listing names without a known canton are grouped under "Other towns"
  const cantons = [...new Set(cities.map((c) => c.canton || ''))]
    .map((code) => {
      const list = cities.filter((c) => (c.canton || '') === code);
      return {
        code, name: code ? cantonLabel(code, repo.cantonName(code)) : t('Other towns'),
        cities: list, count: list.reduce((s, c) => s + (counts.get(c.id) || 0), 0),
      };
    })
    .sort((a, b) => (!a.code) - (!b.code) || b.count - a.count || byName(a.name, b.name));

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
    clear(seg).append(segmented([['cities', t('Cities')], ['cantons', t('Cantons')]], mode, (v) => {
      mode = v;
      paint();
    }));
    // One radio list like Sheng's (me-05): the whole country first, then cities or cantons.
    const all = radio({
      on: picked.size === 0, title: t('All of Switzerland'), count: total,
      onClick: () => {
        picked = new Set();
        commit();
      },
    });
    let rows;
    if (mode === 'cities') {
      rows = cities.map((c) => radio({
        on: picked.has(c.id), title: cityName(c), count: counts.get(c.id) || 0,
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
          on: allIn, part: n2 > 0 && !allIn, title: k.name, sub: k.cities.map((c) => cityName(c)).join(isZh() ? '、' : ', '), count: k.count,
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
    clear(summary).append(t('The Concerts tab opens with {where} · {count}', {
      where: picked.size ? regionSummary() : t('all of Switzerland'),
      count: tn(n, '{n} upcoming concert', '{n} upcoming concerts'),
    }));
  }

  // Sheng's other countries: names only, 0 events each (no feeds outside Switzerland yet).
  const abroad = h('details', { class: 'me-abroad' },
    h('summary', {}, h('span', {}, t('Other countries')), h('span', { class: 'me-abroad-n' }, fmtN(otherCountries().length))),
    h('p', { class: 'me-gfoot' }, t('Klang has no listings outside Switzerland yet.')),
    h('div', { class: 'me-group me-region-list' }, otherCountries().map((c) => radio({
      title: countryName(c.name), sub: tn(countryCities(c).length, '{n} city', '{n} cities'), count: 0, disabled: true, onClick: () => {},
    }))));

  paint();
  const body = h('div', { class: 'me me-region' },
    h('p', { class: 'me-intro' }, t('Browse every event in your own region, without limits.')),
    seg, list, summary, abroad);
  return { title: t('Your region'), back: true, body };
}

// ========== #/me/legal ==========
// Sections: [title, paragraphs]; all English text goes through t(). 'listings' and 'portraits' get
// a list of their own below the paragraphs.
const LEGAL = [
  ['Your data stays on this device', [
    'Klang has no accounts and no server of its own. Your saved, going and attended concerts, private reviews, favourites, library, region, notification settings, name and photo are stored only in this browser.',
    'Nothing is sent to us — there is no “us” to send it to. Clearing your browser’s website data deletes it, so export a backup in Data & imports to keep a copy or to move to another device.',
    'No analytics, no tracking, no advertising.',
  ]],
  ['Concert listings', [
    'Klang shows real concerts only. Every day it reads the public calendars of the venues, orchestras and festivals below, from their own websites or open data, and keeps only the facts: date and time, title, venue and city, performers and their roles, the works, a cancellation and the link to the event page.',
    'Descriptions, programme notes and images are never copied. Every concert links back to its source for details and tickets.',
    'Listings can change at short notice. Always check with the venue or organiser before you buy tickets or travel.',
    'Klang has no listings outside Switzerland yet, so other countries show no concerts. Concerts you import yourself stay on this device.',
  ], 'listings'],
  ['Listening', [
    'Preview plays Apple’s 30-second preview of a recording inside Klang. Previews are streamed from Apple and never stored. 30-second previews provided courtesy of iTunes.',
    'Apple Music Classical ↗, Listen and Play open the piece — or the whole album — in Apple Music Classical or Apple Music (choose which in Me → Play in), where it plays in full. Both need your own Apple Music subscription.',
    'Recording details (albums, tracks, artwork) come from Apple’s public iTunes Search API and are cached on this device for a week. Your Library and playlists only keep links to the recordings.',
  ]],
  ['Composer portraits', [
    'Composer portraits come from Wikimedia Commons and are shown only when Commons marks the file as public domain (or “no restrictions”). They load from Wikimedia’s servers, which see your IP address under the Wikimedia privacy policy. The list below links each portrait to its file page.',
  ], 'portraits'],
  ['Other services', [
    'The Source Serif 4 typeface is loaded from Google Fonts (SIL Open Font License). Podcast links open Apple Podcasts. When Klang contacts Apple or Google, they see your IP address, under their own privacy policies.',
  ]],
  ['Trademarks', [
    'Apple, Apple Music, Apple Music Classical, Apple Podcasts, iTunes and AirPlay are trademarks of Apple Inc., registered in the U.S. and other countries. Venue, orchestra and festival names belong to their owners. Klang is not affiliated with or endorsed by any of them.',
  ]],
  ['Inspired by Sheng', [
    'Klang’s design follows Sheng (响声), a classical-music companion app for iPhone. Klang is an independent, non-commercial project and is not affiliated with Sheng or its developer, and it never uses Sheng’s data.',
    'Community features — profiles, following people, comments, reactions and public reviews — are deliberately left out. Klang is personal only.',
  ]],
  ['No warranty', [
    'Klang is provided as is. Always check dates, times and tickets with the venue or organiser.',
  ]],
];

// Portrait credits: the painter or photographer as Commons names them; in Chinese the generic words are
// translated ("Unknown painter" → "佚名画家", "attributed to …" → "传为 … 所作", "c. 1780" → "约 1780 年").
function creditBy(by) {
  if (!isZh()) return by;
  const att = /^attributed to (.+)$/.exec(by);
  if (att) return t('attributed to {name}', { name: att[1] });
  const loc = /^(.+?) \(Library of Congress\)$/.exec(by);
  if (loc) return `${t(loc[1])}（${t('Library of Congress')}）`;
  return t(by);
}
const creditDate = (d) => (isZh() ? d.replace(/^c\. /, '约 ').replace(/(\d{4})s$/, '$1 年代').replace(/(\d)$/, '$1 年') : d);
function portraitCredits() {
  return h('ul', { class: 'me-credits' }, Object.entries(PORTRAITS).map(([id, p]) => h('li', {},
    h('a', { href: commonsPage(p.file), target: '_blank', rel: 'noopener' }, repo.composer(id) ? composerName(repo.composer(id)) : id),
    ` — ${creditBy(p.by)}${p.date ? `${isZh() ? '，' : ', '}${creditDate(p.date)}` : ''} · ${t(p.licence)}`)));
}

const hostOf = (url) => {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url || ''; }
};
// Organisers that allow the facts only, with a link back (their credit says "Facts only").
const factsOnly = (src) => /facts only/i.test(src.attribution || '');

// Where the listings come from: every source of the feed with its own credit (as published; rebuilt in Chinese).
function listingSources() {
  const info = repo.feedInfo();
  const sources = [...(info.sources || [])].sort((a, b) => byName(a.name, b.name));
  if (!sources.length) {
    return h('p', { class: 'me-legal-note' }, info.error ? t('Could not load the listings') : t('Loading…'));
  }
  const { concerts, sources: active } = listingStats();
  const linked = sources.filter(factsOnly);
  return [
    h('p', { class: 'me-legal-note' }, [
      info.generatedAt ? tDate('Updated {date}', null, { date: updatedLabel(info.generatedAt) }) : null,
      t('{concerts} from {sources}', {
        concerts: tn(concerts, '{n} upcoming concert', '{n} upcoming concerts'),
        sources: tn(active, '{n} source', '{n} sources'),
      }),
    ].filter(Boolean).join(' · ')),
    linked.length ? h('p', {}, t('These organisers allow Klang to show their listings as facts only: each of their concerts links back to their own website for details and tickets — {names}.', {
      names: joinWords(linked.map((x) => x.name)),
    })) : null,
    h('ul', { class: 'me-sources' }, sources.map((src) => h('li', {},
      h('div', { class: 'me-src-top' },
        src.site ? h('a', { href: src.site, target: '_blank', rel: 'noopener' }, src.name) : h('span', {}, src.name),
        h('span', { class: 'me-src-n' }, src.past ? t('past concerts only') : tn(src.count || 0, '{n} concert', '{n} concerts'))),
      h('div', { class: 'me-src-credit' }, sourceCredit(src.attribution, src.name) || (src.site ? hostOf(src.site) : '')),
      factsOnly(src) ? h('div', { class: 'me-src-flag' }, icon('external', 12), t('Facts only, linked back to {site}', { site: hostOf(src.site) })) : null))),
  ];
}

export function renderLegal() {
  const body = h('div', { class: 'me me-legal' },
    h('p', { class: 'me-legal-lead' }, t('The short version: everything stays on your device.')),
    LEGAL.map(([title, paras, extra]) => h('section', { class: 'me-legal-sec', id: extra ? `legal-${extra}` : null },
      h('h2', {}, t(title)),
      paras.map((p) => h('p', {}, t(p))),
      extra === 'listings' ? listingSources() : null,
      extra === 'portraits' ? portraitCredits() : null)),
    h('p', { class: 'me-version' }, t('Klang {v} · build {build}', { v: VERSION, build: BUILD })));
  return { title: t('Legal & Privacy'), back: true, body };
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
  const city = repo.city(c.cityId);
  return [venueLabel(c), city ? cityName(city) : cityLabel(c)].filter(Boolean).join(isZh() ? '，' : ', ');
}

function whenOf(c) {
  return `${relDayLabel(c.day)} · ${timeOf(c.start)}`;
}

// Composer countries in the interface language ("Czech lands" has no entry and stays as written).
const countryOf = (name) => countryName(name === 'England' ? 'United Kingdom' : name === 'USA' ? 'United States' : name);

// earliest time each concert was saved / marked going, and each favourite was added
function activityTimes() {
  const marked = new Map();
  const faved = new Map();
  for (const e of store.timeline()) {
    const ts = Date.parse(e.at);
    if (!ts) continue;
    if (e.kind === 'concert' && (e.type === 'saved' || e.type === 'going')) {
      if (!marked.has(e.id) || ts < marked.get(e.id)) marked.set(e.id, ts);
    } else if (e.type === 'favorite') {
      const k = `${e.kind}:${e.id}`;
      if (!faved.has(k) || ts < faved.get(k)) faved.set(k, ts);
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
      const ts = atZ(addDays(c.day, -d), '09:00');
      if (ts > now || now - ts > 14 * DAY_MS) continue;
      if (marked.has(id) && marked.get(id) > ts) continue; // saved after the reminder would have gone out
      out.push({
        id: `soon${d}:${id}`, type: 'openingSoon', kind: d === 1 ? t('Opening tomorrow') : t('Opening in a week'), icon: 'bell',
        title: c.title, text: `${whenOf(c)} · ${whereOf(c)}`, at: ts, href: href.concert(id),
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
      id: `cancel:${id}`, type: 'reschedule', kind: t('Cancelled'), icon: 'calx',
      title: c.title, text: tDate('{when} · {where} — this concert has been cancelled.', { where: whereOf(c) }, { when: whenOf(c) }),
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
    const ts = atZ(addDays(c.day, -1), '10:00');
    if (ts > now) continue;
    const works = repo.programItems(c).filter((p) => p.title);
    const names = works.slice(0, 3).map((p) => [p.composer ? composerShort(p.composer) : p.composerShort, p.title].filter(Boolean).join(isZh() ? '：' : ': '));
    const guide = works.some((p) => p.work && GUIDES[p.work.id]);
    out.push({
      id: `preview:${id}`, type: 'goingPreview', kind: t('Before you go'), icon: 'ticket',
      title: c.title,
      text: [
        `${whenOf(c)}${isZh() ? '。' : '.'}`,
        names.length ? t('On the programme: {works}.', { works: `${names.join(' · ')}${works.length > 3 ? ' …' : ''}` }) : null,
        guide ? t('Read the listening guide and listen to the music.') : t('Listen to the music before you go.'),
      ].filter(Boolean).join(isZh() ? '' : ' '),
      at: ts, href: href.concert(id),
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
    const ts = when(c, `work:${workId}`);
    if (ts > now) continue;
    seen.add(c.id);
    const comp = repo.composer(w.composerId);
    out.push({
      id: `stage:${workId}:${c.id}`, type: 'favoriteWorkOnStage', kind: t('Favorite work on stage'), icon: 'framed',
      title: w.title, text: `${comp ? `${composerName(comp)} · ` : ''}${c.title} · ${whenOf(c)} · ${whereOf(c)}`, at: ts, href: href.concert(c.id),
    });
  }
  for (const composerId of store.followed('composer')) {
    const comp = repo.composer(composerId);
    const c = comp && nextOf({ composerId });
    if (!c) continue;
    const ts = when(c, `composer:${composerId}`);
    if (ts > now) continue;
    seen.add(c.id);
    const works = repo.programItems(c).filter((p) => p.composer && p.composer.id === composerId).map((p) => p.title);
    out.push({
      id: `stage:${composerId}:${c.id}`, type: 'favoriteWorkOnStage', kind: t('Favorite composer on stage'), icon: 'framed',
      title: `${composerName(comp)}${works.length ? ` — ${works[0]}` : ''}`, text: `${c.title} · ${whenOf(c)} · ${whereOf(c)}`, at: ts, href: href.concert(c.id),
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
    const name = composerName(c);
    const date = isZh() ? `${year}年${dayMonth(day)}` : `${dayNum(day)} ${monthLong(day.slice(0, 7))} ${year}`;
    const country = c.country ? c.country.split(' / ').map(countryOf).join(' / ') : '';
    return {
      kind: t('On this day'), icon: 'history',
      title: born ? t('{name} was born {n} years ago', { name, n: years }) : t('{name} died {n} years ago', { name, n: years }),
      text: `${born ? t('Born {date}', { date }) : t('Died {date}', { date })}${country ? ` · ${country}` : ''}${isZh() ? '。' : '. '}${t('Explore the works and where they’re played next.')}`,
      href: href.composer(c.id),
    };
  }
  if (ARTICLES.length && hash(`${day}:read`) % 3 === 0) {
    const a = ARTICLES[hash(day) % ARTICLES.length];
    return { kind: t('Today’s read'), icon: 'book', title: a.title, text: a.dek || '', href: `#/article/${encodeURIComponent(a.id)}` };
  }
  const works = repo.allWorks();
  if (!works.length) return null;
  const w = works[hash(day) % works.length];
  const comp = repo.composer(w.composerId);
  // the work's blurb is written English text: it stays out of the Chinese line
  return {
    kind: t('Work of the day'), icon: 'sun', title: w.title,
    text: [[comp ? composerName(comp) : null, w.year].filter(Boolean).join(isZh() ? '，' : ', '), isZh() ? null : w.blurb].filter(Boolean).join(' — '),
    href: href.work(w.id),
  };
}

function dailyContent(now) {
  if (!prefOn('dailyContent')) return [];
  const out = [];
  const today = todayKey();
  for (let k = 0; k < 3; k++) {
    const day = addDays(today, -k);
    const ts = atZ(day, '08:00');
    if (ts > now) continue;
    const item = dailyItem(day);
    if (item) out.push({ id: `daily:${day}`, type: 'dailyContent', at: ts, ...item });
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
    const ts = atZ(day, '16:00');
    if (ts > now) continue;
    const pick = eveningPick(day);
    if (!pick) continue;
    const { c, it } = pick;
    out.push({
      id: `live:${day}`, type: 'eveningLive', kind: t('Live tonight'), icon: 'moon',
      title: it.title, text: `${it.composer ? `${composerName(it.composer)} · ` : it.composerName ? `${it.composerName} · ` : ''}${c.title} · ${timeOf(c.start)} · ${whereOf(c)}`,
      at: ts, href: href.concert(c.id),
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
      id: `review:${id}`, type: 'postEventReview', kind: t('How was it?'), icon: 'review',
      title: c.title, text: tDate('{when} at {venue}. Rate it and note your favourite piece — your review stays private.', { venue: venueLabel(c) }, { when: relDayLabel(c.day) }),
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
      id: `rec:${a.id}`, type: 'newRecordingMatch', kind: t('New recording'), icon: 'wave',
      title: a.title, text: t('{artist} · a new release for {composer}. Opens in {app}.', { artist: a.artist, composer: composerName(hit.c), app: t(playAppName()) }),
      at: Math.min(now, atZ(dayKeyOf(new Date(released)), '10:00')), href: albumURL(a.id), external: true,
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

function relTime(at, now) {
  const s = Math.max(0, (now - at) / 1000);
  if (s < 60) return t('Just now');
  if (s < 3600) return t('{n} min ago', { n: Math.floor(s / 60) });
  const d = dayKeyOf(new Date(at));
  const diff = daysBetween(d, todayKey());
  const hhmm = timeOf(new Date(at).toISOString());
  if (diff <= 0) return t('{n} h ago', { n: Math.floor(s / 3600) });
  if (diff === 1) return t('Yesterday {time}', { time: hhmm });
  if (diff < 7) return `${weekdayShort(d)} ${hhmm}`;
  return dayMonth(d);
}

function sectionOf(at) {
  const diff = daysBetween(dayKeyOf(new Date(at)), todayKey());
  if (diff <= 0) return t('Today');
  if (diff === 1) return t('Yesterday');
  if (diff < 7) return t('This week');
  return t('Earlier');
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
    clear(tabsEl).append(...[['concerts', t('Concerts')], ['discovery', t('Discovery')]].map(([k, label]) => {
      const n = list.filter((x) => tabOf(x) === k && unread.has(x.id)).length;
      return h('button', {
        class: ['nt-tab', tab === k && 'on'], type: 'button', role: 'tab', 'aria-selected': tab === k ? 'true' : 'false',
        onclick: () => {
          tab = k;
          paintTabs();
          paint();
        },
      }, label, n ? h('i', { class: 'nt-tab-dot', 'aria-label': t('{n} new', { n }) }) : null);
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
      isNew ? h('span', { class: 'nt-dot', role: 'img', 'aria-label': t('New') }) : null);
  }

  function paint() {
    clear(listEl);
    const shown = list.filter((n) => tabOf(n) === tab);
    if (!shown.length) {
      const anyOn = PUSH_GROUPS.some((g) => g.label.startsWith(tab === 'concerts' ? 'Concerts' : 'Discovery') && g.items.some((it) => prefOn(it.key)))
        || (tab === 'concerts' && prefOn('postEventReview'));
      listEl.append(h('div', { class: 'nt-empty' },
        h('p', {}, t('No notifications yet')),
        h('small', {}, anyOn
          ? (tab === 'concerts'
            ? t('Reminders and changes for concerts you save show up here.')
            : t('Favourite works or composers — recommendations show up here.'))
          : [tab === 'concerts' ? t('Concert pushes are switched off in') : t('Discovery pushes are switched off in'), sp(),
            h('a', { href: '#/me/reminders' }, t('Push preferences')), t('.')])));
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
    t('Worked out on this device from the real concert listings each time you open Klang — nothing is pushed to your phone. For alerts, export your concerts to your calendar from'), sp(),
    h('a', { href: '#/me' }, t('Me')), t('; the file includes alarms.'), sp(),
    h('a', { href: '#/me/reminders' }, t('Push preferences')), t('.')));

  return {
    title: t('Notifications'),
    back: true,
    actions: [h('a', { class: 'icon-btn', href: '#/me/reminders', 'aria-label': t('Push preferences') }, icon('gear', 18))],
    body,
    cleanup: () => { alive = false; },
  };
}
