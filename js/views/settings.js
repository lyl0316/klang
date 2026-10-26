// Settings — concert data (demo listings, .ics / JSON imports), calendar reminders,
// appearance, backup and about. Everything here is personal and stays on this device.

import { h, icon, toast, download, plural, storage } from '../util.js';
import * as store from '../store.js';
import * as repo from '../repo.js';
import { parseICS, parseFeed } from '../ics.js';
import { ITUNES_CREDIT } from '../music.js';
import { rowItem, toggle, segmented, chip } from '../ui/components.js';
import { todayKey } from '../time.js';

const VERSION = '1.0';
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
      toast(`Couldn’t read ${file.name}: ${err.message || err}`);
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
  const t = String(text || '').replace(/^﻿/, '').trim();
  if (/^BEGIN:VCALENDAR/i.test(t) || /(^|\n)BEGIN:VEVENT/.test(t)) return parseICS(t);
  if (t.startsWith('{') || t.startsWith('[')) return parseFeed(t);
  throw new Error('this is neither an .ics calendar nor a JSON feed');
}

// Pull to refresh on the Concerts list: reload the saved feed URL, if there is one. Resolves to
// the number of new concerts, or null when no feed is saved or it can't be loaded.
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
    toast('No concerts found in it');
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
    ? `${plural(added, 'concert')} imported${updated ? ` · ${updated.toLocaleString('en-US')} updated` : ''}`
    : `${plural(updated, 'concert')} already imported — updated`);
}

function urlLoader() {
  const input = h('input', {
    class: 'input',
    type: 'url',
    inputmode: 'url',
    placeholder: 'https://…/season.ics or .json',
    'aria-label': 'Calendar or feed URL',
    autocomplete: 'off',
    autocapitalize: 'off',
    spellcheck: 'false',
  });
  input.value = storage.get(FEED_URL_KEY, '') || '';
  const btn = h('button', { class: 'btn small primary', type: 'submit' }, 'Load');
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
      show('That doesn’t look like a web address.');
      return;
    }
    input.value = url;
    storage.set(FEED_URL_KEY, url);
    btn.disabled = true;
    btn.textContent = 'Loading…';
    show('');
    let text;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`the server answered ${res.status}`);
      text = await res.text();
    } catch (err) {
      show(err instanceof TypeError
        ? 'Couldn’t load it from the browser. Most sites don’t let other web pages read their files (CORS). Download the .ics or .json file and use Import above instead.'
        : `Couldn’t load it: ${err.message}.`);
      btn.disabled = false;
      btn.textContent = 'Load';
      return;
    }
    try {
      mergeImports(parseAny(text), { sourceUrl: url });
    } catch (err) {
      show(`Loaded, but couldn’t read it: ${err.message || err}.`);
    }
    btn.disabled = false;
    btn.textContent = 'Load';
  }

  return h('div', { class: 'settings-pad' },
    h('div', { class: 'settings-pad-title' }, icon('external', 16), 'Load from a URL'),
    h('form', { class: 'url-form', novalidate: true, onsubmit: load }, input, btn),
    status);
}

// ---------- groups ----------
function dataGroup() {
  const imported = store.getImports().length;
  const rows = [
    rowItem({
      title: 'Show demo concerts',
      subtitle: 'Real Swiss venues and repertoire, invented performers',
      leadIcon: 'sparkle',
      right: toggle(store.pref('showDemo'), (on) => {
        store.setPref('showDemo', on);
        toast(on ? 'Demo concerts on' : 'Demo concerts hidden');
      }, 'Show demo concerts'),
    }),
    fileRow({
      title: 'Import calendar (.ics)',
      subtitle: 'A venue’s or orchestra’s season calendar',
      leadIcon: 'calendar',
      accept: '.ics,.ical,.ifb,.icalendar,text/calendar',
      onText: (text) => mergeImports(parseAny(text)),
    }),
    fileRow({
      title: 'Import JSON feed',
      subtitle: 'Format below',
      leadIcon: 'notes',
      accept: '.json,application/json',
      onText: (text) => mergeImports(parseAny(text)),
    }),
    urlLoader(),
    rowItem({ title: 'Imported concerts', leadIcon: 'list', right: h('span', {}, imported.toLocaleString('en-US')) }),
  ];
  if (imported) {
    rows.push(dangerRow({
      title: 'Remove imported concerts',
      leadIcon: 'close',
      onClick: () => {
        if (!confirm(`Remove ${plural(imported, 'imported concert')}? Your marks and reviews stay and come back if you import them again.`)) return;
        store.setImports([]);
        toast('Imported concerts removed');
      },
    }));
  }
  return [
    groupLabel('Concert data'),
    h('div', { class: 'group' }, rows),
    note('Demo concerts fill the calendar so you can try everything. Turn them off to see only the listings you import. Imports are matched to known Swiss venues and cities and stay on this device.'),
    h('details', { class: 'settings-details' },
      h('summary', {}, 'JSON feed format'),
      h('p', {}, 'An array of concerts, or ', h('code', {}, '{ "concerts": [...] }'), '. Only ', h('code', {}, 'title'), ' and ', h('code', {}, 'start'),
        ' (ISO 8601) are required. Optional: city or cityId, venueName or venueId, type (recital, orchestral, chamber, vocal-opera, mixed), series, durationMin, credits, program, notes, ticketUrl.'),
      h('pre', {}, FEED_EXAMPLE)),
  ];
}

// Sheng's "Your region", city-sized: Home shows this week's count for your city.
function homeCityGroup() {
  const select = h('select', { class: 'input', id: 'home-city', 'aria-label': 'Home city' },
    h('option', { value: '' }, 'None (all of Switzerland)'),
    [...repo.allCities()].sort((a, b) => a.name.localeCompare(b.name)).map((c) => h('option', { value: c.id }, c.name)));
  select.value = store.pref('homeCityId') || '';
  select.addEventListener('change', () => {
    const id = select.value || null;
    store.setPref('homeCityId', id);
    toast(id ? `Home city: ${repo.city(id)?.name || id}` : 'Home city cleared');
  });
  return [
    groupLabel('Your city'),
    h('div', { class: 'group' },
      h('div', { class: 'settings-pad' },
        h('label', { class: 'settings-pad-title', for: 'home-city' }, icon('pin', 16), 'Home city'),
        select)),
    note('Home shows how many concerts are on in your city this week. To browse only your city, use the Location filter in Concerts or follow the city.'),
  ];
}

function joinWords(list) {
  if (list.length < 2) return list.join('');
  return `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`;
}

function remindersGroup() {
  const current = new Set((store.pref('reminderDays') || []).map(Number));
  const chips = REMINDER_OPTIONS.map(([days, label]) => chip(`${label} before`, {
    active: current.has(days),
    iconName: current.has(days) ? 'check' : 'bell',
    onClick: () => {
      if (current.has(days)) current.delete(days);
      else current.add(days);
      store.setPref('reminderDays', [...current].sort((a, b) => b - a));
    },
  }));
  const chosen = REMINDER_OPTIONS.filter(([d]) => current.has(d)).sort((a, b) => b[0] - a[0]).map(([, label]) => label);
  return [
    groupLabel('Reminders'),
    h('div', { class: 'group' },
      h('div', { class: 'settings-pad' },
        h('div', { class: 'settings-pad-title' }, icon('bell', 16), 'Alerts in calendar exports'),
        h('div', { class: 'chip-wrap' }, chips))),
    note(chosen.length
      ? `Each concert you export gets an alert ${joinWords(chosen)} before it starts. `
      : 'Exports carry no alerts. ',
    'Klang sends no notifications; reminders live in your own calendar. Export from ',
    h('a', { href: '#/mine' }, 'My Concerts'), ' with the calendar button.'),
  ];
}

function appearanceGroup() {
  return [
    groupLabel('Appearance'),
    h('div', { class: 'group' },
      h('div', { class: 'settings-pad' },
        segmented(THEMES, store.pref('theme') || 'system', (v) => store.setPref('theme', v)))),
    note('System follows your device’s light or dark mode.'),
  ];
}

// Re-emit the theme so the shell re-applies it after a restore or reset.
function reapplyPrefs() {
  store.setPref('theme', store.pref('theme') || 'system');
}

function backupGroup() {
  return [
    groupLabel('Backup'),
    h('div', { class: 'group' },
      rowItem({
        title: 'Export my data',
        subtitle: 'Marks, reviews, follows, imports and settings (.json)',
        leadIcon: 'download',
        onClick: () => {
          download(`klang-backup-${todayKey()}.json`, store.exportUserData(), 'application/json');
          toast('Backup downloaded');
        },
      }),
      fileRow({
        title: 'Restore from file',
        subtitle: 'Replaces what’s on this device',
        leadIcon: 'upload',
        accept: '.json,application/json',
        onText: (text) => {
          if (!confirm('Replace your marks, reviews, follows, imports and settings on this device with this backup?')) return;
          store.importUserData(text);
          reapplyPrefs();
          toast('Backup restored');
        },
      }),
      dangerRow({
        title: 'Reset everything',
        subtitle: 'Delete all your data on this device',
        leadIcon: 'close',
        onClick: () => {
          if (!confirm('Delete all your marks, reviews, follows, imported concerts and settings on this device? This can’t be undone — export a backup first if unsure.')) return;
          store.resetAll();
          storage.remove('klang.recent');
          storage.remove(FEED_URL_KEY);
          try {
            sessionStorage.removeItem('klang.search.q');
          } catch {
            /* ignore */
          }
          reapplyPrefs();
          toast('Everything reset');
        },
      })),
    note('Klang has no accounts and no server: your marks, reviews and follows are stored only in this browser on this device. Export a backup to move them or keep them safe.'),
  ];
}

function aboutGroup() {
  const appleRow = rowItem({
    title: 'Music previews',
    subtitle: `${ITUNES_CREDIT} Apple Music and Apple Music Classical are trademarks of Apple Inc.`,
    leadIcon: 'music',
    to: 'https://music.apple.com/ch/',
  });
  appleRow.target = '_blank';
  appleRow.rel = 'noopener';
  return [
    groupLabel('About'),
    h('div', { class: 'group' },
      rowItem({ title: 'Klang', subtitle: 'Classical concerts across Switzerland', leadIcon: 'sparkle', right: h('span', {}, `Version ${VERSION}`) }),
      rowItem({ title: 'Demo data', subtitle: 'Demo concerts use real Swiss venues and repertoire with invented performers.', leadIcon: 'calendar' }),
      appleRow,
      rowItem({ title: 'Inspired by Sheng (响声)', subtitle: 'The classical-music companion app for iPhone. Klang is an independent project.', leadIcon: 'heart' }),
      rowItem({ title: 'Your data', subtitle: 'Marks, reviews, follows and settings are stored only on this device.', leadIcon: 'person' })),
    h('p', { class: 'settings-version' }, `Klang ${VERSION}`),
  ];
}

// ---------- view ----------
// Route #/me/data — "Data & imports" (reached from Me → Connections). Appearance, reminders and
// region now live on the Me page, like Sheng's settings.
export function render() {
  return {
    title: 'Data & imports',
    back: true,
    body: h('div', { class: 'settings' },
      dataGroup(),
      homeCityGroup(),
      remindersGroup(),
      backupGroup(),
      aboutGroup()),
  };
}
