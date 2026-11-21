// iPhone widget link (tools/widget/, runs in the free Scriptable app). Klang has no server and iOS keeps
// apps apart, so the only way to tell the widget which cities to show is to open Scriptable with them:
// scriptable:///run/Klang?place={"ids":[…],"label":"…"} runs the widget's script once, which saves the place.
//
// Me › iPhone widget has the manual row ("Send my cities and favourites to the widget") and the switch "Update the widget
// automatically" (prefs.widgetAutoSync, off by default, per device). When it is on, confirming a new place
// (Location sheet, or leaving Your region) opens Scriptable in that same tap, with &auto=1 so the script
// saves quietly; then one tap on ◀ Klang (top left) comes back. prefs.widgetSentKey remembers what was sent
// last, so an unchanged place never opens Scriptable.
//
// Favourite alerts (21 Nov 2026): the same link carries &favs= with the composers, works and performers
// marked ♥ (names in the interface language) and "on" from Me › Reminders › Favorite work on stage. The
// widget then posts an iPhone notification when one of them is on stage in these cities (it has the next
// 14 days in data/widget-alerts.json). The sent key covers the favourites too, so Me shows when the
// widget's copy is out of date; hearts alone never open Scriptable (that would leave Klang on every tap).
import * as store from '../store.js';
import * as repo from '../repo.js';
import { t, tn, isZh, cityName, countryName, composerShort } from '../i18n.js';
import { country as countryById } from '../data/countries.js';

// The place Klang opens with (Concerts tab): "Switzerland" / "Zurich, Basel" / "Austria" / "5 cities"
export function placeSummary(ids = store.homePlace()) {
  if (!ids.length) return t('Switzerland');
  const [cid, name] = ids[0].startsWith('country:') ? ids[0].slice(8).split('|') : [];
  if (cid && !name) return countryName(countryById(cid)?.name || cid);
  if (ids.length <= 2) return ids.map((id) => cityName(repo.city(id)) || id.split('|')[1] || id).join(isZh() ? '、' : ', ');
  return tn(ids.length, '{n} city', '{n} cities');
}

// Composers, works and performers marked ♥, with the names the notification shows:
// { on: 1|0, eve: 1|0, m: { composerId: name }, w: { workId: title }, a: { artistId: name } }
// eve = Me › Reminders › Tomorrow's concerts (the widget's 8 pm notification).
export function widgetFavs() {
  const names = (kind, nameOf) => Object.fromEntries(store.followed(kind).map((id) => [id, nameOf(id)]).filter(([, n]) => n));
  return {
    on: store.reminderPref('favoriteWorkOnStage') === false ? 0 : 1,
    eve: store.reminderPref('tomorrowEvening') === false ? 0 : 1,
    m: names('composer', (id) => composerShort(repo.composer(id))),
    w: names('work', (id) => (repo.work(id) || repo.dynamicWork(id))?.title || ''),
    a: names('artist', (id) => repo.artist(id)?.name || ''),
  };
}

const sentKey = () => {
  const favs = ['composer', 'work', 'artist'].flatMap((kind) => store.followed(kind).map((id) => `${kind}:${id}`));
  const on = store.reminderPref('favoriteWorkOnStage') === false ? 0 : 1;
  const eve = store.reminderPref('tomorrowEvening') === false ? 0 : 1;
  return [[...store.homePlace()].sort().join(','), on, favs.sort().join(',')].join('|') + (eve ? '' : '|eve0');
};

export function widgetLink({ auto = false } = {}) {
  const place = { ids: store.homePlace(), label: placeSummary() };
  const favs = widgetFavs();
  return `scriptable:///run/Klang?place=${encodeURIComponent(JSON.stringify(place))}`
    + `&favs=${encodeURIComponent(JSON.stringify(favs))}${auto ? '&auto=1' : ''}`;
}

// The widget has older cities or favourites than Klang (only once something was sent).
export function widgetOutOfDate() {
  const sent = store.pref('widgetSentKey');
  return !!sent && sent !== sentKey();
}

// Call when the manual row is tapped (its own link does the opening).
export function markWidgetSent() {
  store.setPref('widgetSentKey', sentKey());
}

// Call synchronously inside a tap, after the place was saved: iOS only opens another app from a tap.
export function syncWidget() {
  if (!store.pref('widgetAutoSync')) return false;
  const key = sentKey();
  if (key === store.pref('widgetSentKey')) return false;
  store.setPref('widgetSentKey', key);
  location.href = widgetLink({ auto: true });
  return true;
}
