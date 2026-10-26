// Settings — "Data & imports": where the concert listings come from (the real feed, with Refresh),
// your own .ics / JSON imports, home city, calendar reminders, backup and about. Everything here is
// personal and stays on this device.

import { h, icon, toast, download, storage } from '../util.js';
import * as store from '../store.js';
import * as repo from '../repo.js';
import * as feed from '../feed.js';
import { parseICS, parseFeed } from '../ics.js';
import { searchURL } from '../applemusic.js';
import { ITUNES_CREDIT } from '../music.js';
import { rowItem, toggle, segmented, chip } from '../ui/components.js';
import { todayKey, dayKeyOf, timeOf, relDayLabel } from '../time.js';
import { t, tn, fmtN, cityName, joinList, isZh, tidyZh } from '../i18n.js';

const VERSION = '1.1';
const FEED_URL_KEY = 'klang.feedUrl';
const REMINDER_OPTIONS = [[1, '1 day'], [3, '3 days'], [7, '1 week'], [14, '2 weeks']];
const THEMES = [['system', 'System'], ['dark', 'Dark'], ['light', 'Light']];

const FEED_EXAMPLE = `{
  "concerts": [
    {
      "title": "Beethoven Seven",
      "start": "2026-11-14T19:30:00+01:00",
      "venueName": "Tonhalle Zürich",
      "city": "Zurich",
      "type": "orchestral",
      "series": "Season subscription A",
      "durationMin": 110,
      "credits": [{ "role": "Conductor", "name": "Jane Doe" }],
      "program": [{ "composer": "Beethoven", "title": "Symphony No. 7" }],
      "ticketUrl": "https://example.ch/tickets"
    }
  ]
}`;

// ---------- small builders ----------
// Chinese tidying (no spaces between Chinese characters) that keeps the space in "10月30日 周五".
const keepDate = (s) => (isZh() ? tidyZh(s.replace(/日 (周|星期)/g, '日\u0001$1')).replace(/\u0001/g, ' ') : s);
// Between the parts of a sentence that holds links: a space in English, none in Chinese.
const sp = () => (isZh() ? '' : ' ');
// joinList with a space between "和" and Latin names or digits ("1 周和 1 天", "Casino Bern 和 Sion …").
const joinWords = (list) => joinList(list).replace(/和(?=[0-9A-Za-zÀ-ž])/g, '和 ').replace(/([0-9A-Za-zÀ-ž.)])和/g, '$1 和');
const groupLabel = (text) => h('div', { class: 'group-label' }, text);
const note = (...children) => h('p', { class: 'settings-note' }, ...children);

function dangerRow(opts) {
  const el = rowItem(opts);
  el.classList.add('danger');
  return el;
}

// A row that opens the file picker. A <label> around the input works everywhere (incl. iOS)
// without scripting a click on a hidden input.
function fileRow({ title, subtitle = null, leadIcon, accept, onText }) {
  const input = h('input', { type: 'file', accept, class: 'sr-only' });
  input.addEventListener('change', async () => {
    const file = input.files && input.files[0];
    if (!file) return;
    try {
      await onText(await file.text(), file);
    } catch (err) {
      toast(t('Couldn’t read {name}: {error}', { name: file.name, error: err.message || err }));
    } finally {
      input.value = '';
    }
  });
  return h('label', { class: 'row-item file-row' },
    h('span', { class: 'lead-icon' }, icon(leadIcon, 18)),
    h('div', { class: 'main' }, h('div', { class: 't' }, title), subtitle && h('div', { class: 's' }, subtitle)),
    h('div', { class: 'right' }, icon('chevron', 16)),
    input);
}

// ---------- imports ----------
function parseAny(text) {
  const s = String(text || '').replace(/^﻿/, '').trim();
  if (/^BEGIN:VCALENDAR/i.test(s) || /(^|\n)BEGIN:VEVENT/.test(s)) return parseICS(s);
  if (s.startsWith('{') || s.startsWith('[')) return parseFeed(s);
  throw new Error(t('this is neither an .ics calendar nor a JSON feed'));
}

// Pull to refresh (feed.pullToRefresh): reload the saved import URL, if there is one. Resolves to
// the number of new concerts, or null when no URL is saved or it can't be loaded.
export async function refreshSavedFeed() {
  const url = storage.get(FEED_URL_KEY, '');
  if (!url) return null;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const list = parseAny(await res.text());
    const byId = new Map(store.getImports().map((c) => [c.id, c]));
    const before = new Set(byId.keys());
    for (const c of list) byId.set(c.id, { ...c, sourceUrl: url });
    store.setImports([...byId.values()]);
    return list.filter((c) => !before.has(c.id)).length;
  } catch {
    return null;
  }
}

// Merge into the stored imports, replacing entries with the same id.
function mergeImports(list, extra = {}) {
  if (!list.length) {
    toast(t('No concerts found in it'));
    return;
  }
  const byId = new Map(store.getImports().map((c) => [c.id, c]));
  const before = new Set(byId.keys());
  for (const c of list) byId.set(c.id, { ...c, ...extra });
  const ids = new Set(list.map((c) => c.id));
  const added = [...ids].filter((id) => !before.has(id)).length;
  const updated = ids.size - added;
  store.setImports([...byId.values()]);
  toast(added
    ? `${tn(added, '{n} concert imported', '{n} concerts imported')}${updated ? ` · ${t('{n} updated', { n: fmtN(updated) })}` : ''}`
    : tn(updated, '{n} concert already imported — updated', '{n} concerts already imported — updated'));
}

function urlLoader() {
  const input = h('input', {
    class: 'input',
    type: 'url',
    inputmode: 'url',
    placeholder: t('https://…/season.ics or .json'),
    'aria-label': t('Calendar or feed URL'),
    autocomplete: 'off',
    autocapitalize: 'off',
    spellcheck: 'false',
  });
  input.value = storage.get(FEED_URL_KEY, '') || '';
  const btn = h('button', { class: 'btn small primary', type: 'submit' }, t('Load'));
  const status = h('p', { class: 'settings-note url-status', role: 'status', 'aria-live': 'polite', hidden: true });
  const show = (text) => {
    status.textContent = text;
    status.hidden = !text;
  };

  async function load(e) {
    e.preventDefault();
    let url = input.value.trim();
    if (!url) {
      input.focus();
      return;
    }
    url = url.replace(/^webcals?:\/\//i, 'https://');
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    try {
      url = new URL(url).href;
    } catch {
      show(t('That doesn’t look like a web address.'));
      return;
    }
    input.value = url;
    storage.set(FEED_URL_KEY, url);
    btn.disabled = true;
    btn.textContent = t('Loading…');
    show('');
    let text;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(t('the server answered {status}', { status: res.status }));
      text = await res.text();
    } catch (err) {
      show(err instanceof TypeError
        ? t('Couldn’t load it from the browser. Most sites don’t let other web pages read their files (CORS). Download the .ics or .json file and use Import above instead.')
        : t('Couldn’t load it: {error}.', { error: err.message }));
      btn.disabled = false;
      btn.textContent = t('Load');
      return;
    }
    try {
      mergeImports(parseAny(text), { sourceUrl: url });
    } catch (err) {
      show(t('Loaded, but couldn’t read it: {error}.', { error: err.message || err }));
    }
    btn.disabled = false;
    btn.textContent = t('Load');
  }

  return h('div', { class: 'settings-pad' },
    h('div', { class: 'settings-pad-title' }, icon('external', 16), t('Load from a URL')),
    h('form', { class: 'url-form', novalidate: true, onsubmit: load }, input, btn),
    status);
}

// ---------- groups ----------
// When the listings were built: "Today 08:27" / "今天 08:27".
export function updatedLabel(iso) {
  if (!iso || Number.isNaN(Date.parse(iso))) return '';
  return `${relDayLabel(dayKeyOf(iso))} ${timeOf(iso)}`;
}

// The real listings now in Klang: upcoming concerts from the feed and the sources they come from.
export function listingStats() {
  const today = todayKey();
  const list = repo.allConcerts().filter((c) => c.feedId && c.day >= today);
  return { concerts: list.length, sources: new Set(list.map((c) => c.source).filter(Boolean)).size };
}

// "Concert listings: updated <time> · N concerts from M sources" with Refresh.
function listingsGroup() {
  const line = h('div', { class: 's' });
  const btn = h('button', { class: 'btn small me-refresh', type: 'button' }, icon('versions', 14), t('Refresh'));
  function paint() {
    const info = repo.feedInfo();
    const { concerts, sources } = listingStats();
    line.textContent = info.loaded
      ? [
        info.generatedAt ? keepDate(t('Updated {date}').replace('{date}', updatedLabel(info.generatedAt))) : null,
        t('{concerts} from {sources}', {
          concerts: tn(concerts, '{n} concert', '{n} concerts'),
          sources: tn(sources, '{n} source', '{n} sources'),
        }),
      ].filter(Boolean).join(' · ')
      : (info.error ? t('Could not load the listings') : t('Loading…'));
  }
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.classList.add('busy');
    const res = await feed.refreshFeed();
    btn.disabled = false;
    btn.classList.remove('busy');
    paint();
    toast(!res.ok ? t('Could not load the listings')
      : res.added ? tn(res.added, '{n} new concert', '{n} new concerts') : t('Up to date'));
  });
  paint();
  return [
    groupLabel(t('Real listings')),
    h('div', { class: 'group' },
      h('div', { class: 'row-item me-listings' },
        h('span', { class: 'lead-icon' }, icon('calendar', 18)),
        h('div', { class: 'main' }, h('div', { class: 't' }, t('Concert listings')), line),
        h('div', { class: 'right' }, btn)),
      rowItem({ title: t('Where they come from'), subtitle: t('Every source, with its credit'), leadIcon: 'info', to: '#/me/legal' })),
    note(t('Real listings from the venues’ and orchestras’ own websites, updated daily.'), sp(),
      t('Only the facts are shown — date, time, venue, performers and programme. Always check with the venue before you buy tickets or travel.')),
  ];
}

function importsGroup() {
  const imported = store.getImports().length;
  const rows = [
    fileRow({
      title: t('Import calendar (.ics)'),
      subtitle: t('A venue’s or orchestra’s season calendar'),
      leadIcon: 'calendar',
      accept: '.ics,.ical,.ifb,.icalendar,text/calendar',
      onText: (text) => mergeImports(parseAny(text)),
    }),
    fileRow({
      title: t('Import JSON feed'),
      subtitle: t('Format below'),
      leadIcon: 'notes',
      accept: '.json,application/json',
      onText: (text) => mergeImports(parseAny(text)),
    }),
    urlLoader(),
    rowItem({ title: t('Imported concerts'), leadIcon: 'list', right: h('span', {}, fmtN(imported)) }),
  ];
  if (imported) {
    rows.push(dangerRow({
      title: t('Remove imported concerts'),
      leadIcon: 'close',
      onClick: () => {
        if (!confirm(tn(imported, 'Remove {n} imported concert? Your marks and reviews stay and come back if you import it again.', 'Remove {n} imported concerts? Your marks and reviews stay and come back if you import them again.'))) return;
        store.setImports([]);
        toast(t('Imported concerts removed'));
      },
    }));
  }
  return [
    groupLabel(t('Your imports')),
    h('div', { class: 'group' }, rows),
    note(t('Add concerts of your own, e.g. a season calendar the listings don’t cover yet. Imports are matched to known Swiss venues and cities and stay on this device.')),
    h('details', { class: 'settings-details' },
      h('summary', {}, t('JSON feed format')),
      h('p', {}, t('An array of concerts, or { "concerts": [...] }. Only title and start (ISO 8601) are required. Optional: city or cityId, venueName or venueId, type (recital, orchestral, chamber, vocal-opera, mixed), series, durationMin, credits, program, notes, ticketUrl.')),
      h('pre', {}, FEED_EXAMPLE)),
  ];
}

// Sheng's "Your region", city-sized: Home shows this week's count for your city.
function homeCityGroup() {
  const select = h('select', { class: 'input', id: 'home-city', 'aria-label': t('Home city') },
    h('option', { value: '' }, t('None (all of Switzerland)')),
    [...repo.allCities()].sort((a, b) => cityName(a).localeCompare(cityName(b), isZh() ? 'zh-Hans-CN' : 'en')).map((c) => h('option', { value: c.id }, cityName(c))));
  select.value = store.pref('homeCityId') || '';
  select.addEventListener('change', () => {
    const id = select.value || null;
    store.setPref('homeCityId', id);
    toast(id ? t('Home city: {city}', { city: cityName(repo.city(id)) || id }) : t('Home city cleared'));
  });
  return [
    groupLabel(t('Your city')),
    h('div', { class: 'group' },
      h('div', { class: 'settings-pad' },
        h('label', { class: 'settings-pad-title', for: 'home-city' }, icon('pin', 16), t('Home city')),
        select)),
    note(t('Home shows how many concerts are on in your city this week. To browse only your city, use the Location filter in Concerts or follow the city.')),
  ];
}

function remindersGroup() {
  const current = new Set((store.pref('reminderDays') || []).map(Number));
  const chips = REMINDER_OPTIONS.map(([days, label]) => chip(t('{time} before', { time: t(label) }), {
    active: current.has(days),
    iconName: current.has(days) ? 'check' : 'bell',
    onClick: () => {
      if (current.has(days)) current.delete(days);
      else current.add(days);
      store.setPref('reminderDays', [...current].sort((a, b) => b - a));
    },
  }));
  const chosen = REMINDER_OPTIONS.filter(([d]) => current.has(d)).sort((a, b) => b[0] - a[0]).map(([, label]) => t(label));
  return [
    groupLabel(t('Reminders')),
    h('div', { class: 'group' },
      h('div', { class: 'settings-pad' },
        h('div', { class: 'settings-pad-title' }, icon('bell', 16), t('Alerts in calendar exports')),
        h('div', { class: 'chip-wrap' }, chips))),
    note(chosen.length
      ? t('Each concert you export gets an alert {times} before it starts.', { times: joinWords(chosen) })
      : t('Exports carry no alerts.'),
    sp(), t('Klang sends no notifications; reminders live in your own calendar. Export from'), sp(),
    h('a', { href: '#/activity/saved' }, t('My concerts')), sp(), t('with the calendar button.')),
  ];
}

export function appearanceGroup() {
  return [
    groupLabel(t('Appearance')),
    h('div', { class: 'group' },
      h('div', { class: 'settings-pad' },
        segmented(THEMES.map(([k, l]) => [k, t(l)]), store.pref('theme') || 'system', (v) => store.setPref('theme', v)))),
    note(t('System follows your device’s light or dark mode.')),
  ];
}

// Re-emit the theme so the shell re-applies it after a restore or reset.
function reapplyPrefs() {
  store.setPref('theme', store.pref('theme') || 'system');
}

function backupGroup() {
  return [
    groupLabel(t('Backup')),
    h('div', { class: 'group' },
      rowItem({
        title: t('Export my data'),
        subtitle: t('Marks, reviews, follows, imports and settings (.json)'),
        leadIcon: 'download',
        onClick: () => {
          download(`klang-backup-${todayKey()}.json`, store.exportUserData(), 'application/json');
          toast(t('Backup downloaded'));
        },
      }),
      fileRow({
        title: t('Restore from file'),
        subtitle: t('Replaces what’s on this device'),
        leadIcon: 'upload',
        accept: '.json,application/json',
        onText: (text) => {
          if (!confirm(t('Replace your marks, reviews, follows, imports and settings on this device with this backup?'))) return;
          store.importUserData(text);
          reapplyPrefs();
          toast(t('Backup restored'));
        },
      }),
      dangerRow({
        title: t('Reset everything'),
        subtitle: t('Delete all your data on this device'),
        leadIcon: 'close',
        onClick: () => {
          if (!confirm(t('Delete all your marks, reviews, follows, imported concerts and settings on this device? This can’t be undone — export a backup first if unsure.'))) return;
          store.resetAll();
          storage.remove('klang.recent');
          storage.remove(FEED_URL_KEY);
          try {
            sessionStorage.removeItem('klang.search.q');
          } catch {
            /* ignore */
          }
          reapplyPrefs();
          toast(t('Everything reset'));
        },
      })),
    note(t('Klang has no accounts and no server: your marks, reviews and follows are stored only in this browser on this device. Export a backup to move them or keep them safe.')),
  ];
}

function aboutGroup() {
  const appleRow = rowItem({
    title: t('Listening'),
    subtitle: [t(ITUNES_CREDIT), t('Apple Music and Apple Music Classical are trademarks of Apple Inc.')].join(sp()),
    leadIcon: 'music',
    to: searchURL('classical'), // opens the app chosen in Me → Play in
  });
  appleRow.target = '_blank';
  appleRow.rel = 'noopener';
  return [
    groupLabel(t('About')),
    h('div', { class: 'group' },
      rowItem({ title: 'Klang', subtitle: t('Classical concerts across Switzerland'), leadIcon: 'sparkle', right: h('span', {}, t('Version {v}', { v: VERSION })) }),
      rowItem({ title: t('Concert listings'), subtitle: t('Real listings from the venues’ and orchestras’ own websites, updated daily.'), leadIcon: 'calendar', to: '#/me/legal' }),
      appleRow,
      rowItem({ title: t('Inspired by Sheng (响声)'), subtitle: t('The classical-music companion app for iPhone. Klang is an independent project.'), leadIcon: 'heart' }),
      rowItem({ title: t('Your data'), subtitle: t('Marks, reviews, follows and settings are stored only on this device.'), leadIcon: 'person' })),
    h('p', { class: 'settings-version' }, `Klang ${VERSION}`),
  ];
}

// ---------- view ----------
// Route #/me/data — "Data & imports" (reached from Me → Connections). Appearance, reminders and
// region live on the Me page too, like Sheng's settings.
export function render() {
  const body = h('div', { class: 'settings' });
  const paint = () => body.replaceChildren(...[
    listingsGroup(),
    importsGroup(),
    homeCityGroup(),
    remindersGroup(),
    backupGroup(),
    aboutGroup(),
  ].flat(Infinity).filter(Boolean));
  paint();
  // Reminder chips and the home city repaint the page; imports and the feed repaint it through main.js.
  const unsub = store.subscribe((topic) => {
    if (topic === 'prefs') paint();
  });
  return { title: t('Data & imports'), back: true, body, cleanup: unsub };
}
