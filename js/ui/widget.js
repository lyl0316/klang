// iPhone widget link (tools/widget/, runs in the free Scriptable app). Klang has no server and iOS keeps
// apps apart, so the only way to tell the widget which cities to show is to open Scriptable with them:
// scriptable:///run/Klang?place={"ids":[…],"label":"…"} runs the widget's script once, which saves the place.
//
// Me › iPhone widget has the manual row ("Show my cities in the widget") and the switch "Update the widget
// automatically" (prefs.widgetAutoSync, off by default, per device). When it is on, confirming a new place
// (Location sheet, or leaving Your region) opens Scriptable in that same tap, with &auto=1 so the script
// saves quietly; then one tap on ◀ Klang (top left) comes back. prefs.widgetSentKey remembers what was sent
// last, so an unchanged place never opens Scriptable.
import * as store from '../store.js';
import * as repo from '../repo.js';
import { t, tn, isZh, cityName, countryName } from '../i18n.js';
import { country as countryById } from '../data/countries.js';

// The place Klang opens with (Concerts tab): "Switzerland" / "Zurich, Basel" / "Austria" / "5 cities"
export function placeSummary(ids = store.homePlace()) {
  if (!ids.length) return t('Switzerland');
  const [cid, name] = ids[0].startsWith('country:') ? ids[0].slice(8).split('|') : [];
  if (cid && !name) return countryName(countryById(cid)?.name || cid);
  if (ids.length <= 2) return ids.map((id) => cityName(repo.city(id)) || id.split('|')[1] || id).join(isZh() ? '、' : ', ');
  return tn(ids.length, '{n} city', '{n} cities');
}

const placeKey = (ids) => [...ids].sort().join(',');

export function widgetLink({ auto = false } = {}) {
  const place = { ids: store.homePlace(), label: placeSummary() };
  return `scriptable:///run/Klang?place=${encodeURIComponent(JSON.stringify(place))}${auto ? '&auto=1' : ''}`;
}

// Call when the manual row is tapped (its own link does the opening).
export function markWidgetSent() {
  store.setPref('widgetSentKey', placeKey(store.homePlace()));
}

// Call synchronously inside a tap, after the place was saved: iOS only opens another app from a tap.
export function syncWidget() {
  if (!store.pref('widgetAutoSync')) return false;
  const key = placeKey(store.homePlace());
  if (key === store.pref('widgetSentKey')) return false;
  store.setPref('widgetSentKey', key);
  location.href = widgetLink({ auto: true });
  return true;
}
