// Interface language: English or Simplified Chinese (简体中文).
//
// lang()            'en' | 'zh' — the "lang" preference ('auto' | 'en' | 'zh'); auto follows the phone.
// t(text, vars)     translate an English interface string; {name} placeholders are filled from vars.
//                   Strings are keyed by their English text, so untranslated ones simply stay English.
// tn(n, one, many)  plural-aware: tn(3, '{n} concert', '{n} concerts') → "3 concerts" / "3 场音乐会".
// fmtN(n)           number with grouping for the current language.
// Dates: dayMonth('2026-10-27') "Oct 27" / "10月27日", weekdayName(dayKey) "Tue" / "周二",
//        monthName(monthKey) "October" / "10月", relDay(dayKey) "Tomorrow" / "明天",
//        monthYear('2026-10') "October 2026" / "2026年10月", fullDate(dayKey) "Tue, Oct 27, 2026" / "2026年10月27日 周二".
// Lists: joinList(['A', 'B', 'C']) "A, B and C" / "A、B和C" ("Requiem 和 Te Deum" next to Latin text).
// In Chinese, t() removes stray spaces between Chinese characters and before Chinese punctuation, so a
// template like '在 {app} 中打开' reads "在 Apple Music 中打开" and "在 Apple Music 古典乐中打开"; the space
// between a date and its weekday ("10月30日 周五") stays.
// Names: cityName(city), countryName(name), cantonName(code, fallback), composerName(c), composerShort(c),
//        typeLabel(type), roleLabel(role).
//
// Translations live in js/i18n/zh-*.js (one file per area of the app, merged here).

import * as store from './store.js';
import ZH_SHELL from './i18n/zh-shell.js';
import ZH_CONCERTS, { ZH_PLACES } from './i18n/zh-concerts.js';
import ZH_CONCERT from './i18n/zh-concert.js';
import ZH_PAGES from './i18n/zh-pages.js';
import ZH_PERSONAL from './i18n/zh-personal.js';
import ZH_PLAYER from './i18n/zh-player.js';
import { ZH_CITIES, ZH_COUNTRIES, ZH_CANTONS, ZH_COMPOSERS, ZH_COMPOSERS_SHORT, ZH_TYPES, ZH_ROLES } from './i18n/zh-names.js';

const ZH = { ...ZH_SHELL, ...ZH_CONCERTS, ...ZH_CONCERT, ...ZH_PAGES, ...ZH_PERSONAL, ...ZH_PLAYER };

export const LANGS = [['auto', 'Automatic'], ['en', 'English'], ['zh', '简体中文']];

export function lang() {
  const p = store.pref('lang') || 'auto';
  if (p === 'en' || p === 'zh') return p;
  try {
    const l = (navigator.languages && navigator.languages[0]) || navigator.language || '';
    return /^zh\b/i.test(l) ? 'zh' : 'en';
  } catch {
    return 'en';
  }
}
export const isZh = () => lang() === 'zh';

export function setLang(value) {
  store.setPref('lang', value);
  applyLang();
}

// Keep <html lang> in step (fonts, screen readers, hyphenation).
export function applyLang() {
  try { document.documentElement.lang = isZh() ? 'zh-Hans' : 'en'; } catch { /* no document */ }
}

const fill = (s, vars) => (vars ? s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m)) : s);

// Chinese never has spaces between Chinese characters, nor before full-width punctuation.
const HAN = '\\u3400-\\u9fff\\uf900-\\ufaff\\u3000-\\u303f\\uff00-\\uffef';
const BETWEEN_HAN = new RegExp(`([${HAN}])[ \\u00a0]+(?=[${HAN}])`, 'g');
const BEFORE_PUNCT = /[ \u00a0]+(?=[，。：；！？、）】」』])/g;
const AFTER_PUNCT = /([（【「『，。：；！？、])[ \u00a0]+/g;
// The one space Chinese keeps: between a date and its weekday ("10月30日 周五", "2026年10月27日 星期二").
const keepSpace = (ch, rest) => ch === '日' && /^(周[一二三四五六日]|星期)/.test(rest);
export const tidyZh = (s) => String(s)
  .replace(BETWEEN_HAN, (m, ch, at, str) => (keepSpace(ch, str.slice(at + m.length)) ? m : ch))
  .replace(BEFORE_PUNCT, '').replace(AFTER_PUNCT, '$1');

export function t(text, vars = null) {
  if (text == null) return text;
  if (!isZh()) return fill(text, vars);
  const s = Object.prototype.hasOwnProperty.call(ZH, text) ? ZH[text] : text;
  return vars ? tidyZh(fill(s, vars)) : s;
}

export const fmtN = (n) => Number(n).toLocaleString(isZh() ? 'zh-CN' : 'en-US');

export function tn(n, one, many = null, vars = null) {
  const key = n === 1 ? one : (many || `${one}s`);
  return t(key, { n: fmtN(n), ...(vars || {}) });
}

// ---------- dates ----------
const WD_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WD_EN_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WD_ZH = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const WD_ZH_LONG = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
const MON_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MON_EN_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const wdIndex = (dayKey) => new Date(`${dayKey}T12:00:00Z`).getUTCDay();
const monIndex = (key) => Number(String(key).slice(5, 7)) - 1;
const dayOf = (dayKey) => Number(dayKey.slice(8, 10));

export const weekdayName = (dayKey) => (isZh() ? WD_ZH : WD_EN)[wdIndex(dayKey)];
export const weekdayLong = (dayKey) => (isZh() ? WD_ZH_LONG : WD_EN_LONG)[wdIndex(dayKey)];
export const monthShortName = (key) => (isZh() ? `${monIndex(key) + 1}月` : MON_EN[monIndex(key)]);
export const monthName = (key) => (isZh() ? `${monIndex(key) + 1}月` : MON_EN_LONG[monIndex(key)]);
export const dayMonth = (dayKey) => (isZh() ? `${monIndex(dayKey) + 1}月${dayOf(dayKey)}日` : `${MON_EN[monIndex(dayKey)]} ${dayOf(dayKey)}`);
// "26 October" / "10月26日" (day headers)
export const dayMonthLong = (dayKey) => (isZh() ? `${monIndex(dayKey) + 1}月${dayOf(dayKey)}日` : `${dayOf(dayKey)} ${MON_EN_LONG[monIndex(dayKey)]}`);
export const yearLabel = (y) => (isZh() ? `${y}年` : String(y));
// "October 2026" / "2026年10月"
export const monthYear = (monthKey) => (isZh() ? `${monthKey.slice(0, 4)}年${monIndex(monthKey) + 1}月` : `${MON_EN_LONG[monIndex(monthKey)]} ${monthKey.slice(0, 4)}`);
// "Tue, Oct 27, 2026" / "2026年10月27日 周二"
export const fullDate = (dayKey) => (isZh()
  ? `${dayKey.slice(0, 4)}年${dayMonth(dayKey)} ${weekdayName(dayKey)}`
  : `${weekdayName(dayKey)}, ${dayMonth(dayKey)}, ${dayKey.slice(0, 4)}`);

// "A, B and C" / "A、B和C"
export function joinList(items) {
  const list = (items || []).filter((x) => x != null && x !== '').map(String);
  if (list.length < 2) return list[0] || '';
  if (isZh()) {
    // "马勒和布鲁克纳", but "Requiem 和 Violin Concerto" (a space where 和 meets Latin text or digits)
    const head = list.slice(0, -1).join('、');
    const last = list[list.length - 1];
    const han = new RegExp(`[${HAN}]`);
    return `${head}${han.test(head.slice(-1)) ? '' : ' '}和${han.test(last[0]) ? '' : ' '}${last}`;
  }
  return list.length === 2 ? `${list[0]} and ${list[1]}` : `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`;
}

export function relDay(dayKey, today) {
  const diff = Math.round((Date.parse(`${dayKey}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86400000);
  if (diff === 0) return t('Today');
  if (diff === 1) return t('Tomorrow');
  if (diff === -1) return t('Yesterday');
  return null;
}

// ---------- names ----------
// a city abroad ({ abroad: true }, repo.js) takes its Chinese name from Sheng's place names
export const cityName = (city) => (city ? (isZh() && (ZH_CITIES[city.id || city] || (city.abroad && ZH_PLACES[city.name]))) || city.name || city : '');
export const countryName = (name) => (isZh() && ZH_COUNTRIES[name]) || name;
export const cantonName = (code, fallback) => (isZh() && ZH_CANTONS[code]) || fallback || code;
export const composerName = (c) => (c ? (isZh() && ZH_COMPOSERS[c.id]) || c.name : '');
export const composerShort = (c) => (c ? (isZh() && ZH_COMPOSERS_SHORT[c.id]) || c.short || c.name : '');
export const typeLabel = (type, fallback) => (isZh() && ZH_TYPES[type]) || fallback || type;
export const roleLabel = (role) => (isZh() && ZH_ROLES[role]) || role;
