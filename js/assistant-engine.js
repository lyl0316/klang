// Klang Assistant engine — a fully local, rule-based stand-in for Sheng's AI assistant.
// Nothing is sent anywhere: the text is parsed with rules and answered from repo.js.
//
//   answer(text, { today, expect }) -> {
//     reply: string,                       // one friendly paragraph
//     items: [{ kind, id?, data? }],       // ≤ 8: 'concert' | 'composer' | 'work' | 'artist' | 'venue' | 'city' | 'recording'
//                                          //   recording: data = { term, label, workId?, composerId?, performer?, tempo? }
//                                          //   (the view runs music.searchAlbums(data.term))
//     followUps: string[],                 // suggestion chips; each is a prompt answer() understands
//     intent: 'concert' | 'work' | 'composer' | 'artist' | 'people' | 'recording' | 'code' | 'mine'
//             | 'feedback' | 'notes' | 'help' | 'thanks' | 'search' | 'unknown',
//     link?: { label, filters: { cityIds, types, day } },  // optional "Open in Concerts" (Concerts-tab filters)
//     feedback?: { kind, text },           // caller stores it with saveFeedback() — no network
//     expect?: 'feedback' }                // the next message should be taken as feedback
//
// Understands: dates (today, tonight, tomorrow, this/next weekend, this/next week, this/next month,
// in <month>, early/mid/late <month>, on <weekday>, on the 14th, 14 November, 14.11., next 10 days,
// Christmas, New Year, Easter, seasons), Swiss cities/cantons/regions (+ German/French/Italian names,
// "near X"), venues, composers (names, misspellings, epithets, "the Swiss composer"), works (titles,
// nicknames, catalogue numbers such as BWV 988 or Op. 77, "Mahler 2", "Beethoven's ninth"), forms,
// concert types, performers and roles, recordings ("Abbado's Mahler 2", "a slower Goldbergs"),
// concert codes (concert ids), feedback / suggestions (kept on this device).
// Chinese questions ("苏黎世 马勒", "日内瓦 这个周末 室内乐", "马勒第二交响曲的录音") are first mapped
// to the same English vocabulary (fromZh: city, canton, composer and work names from zh-names.js,
// dates, types, forms, roles). Replies are in Chinese when the interface is (template strings), with
// Chinese follow-up prompts; concert titles, venue names and work titles stay as published.
// Answers come from the real listings only (repo.js).
//
// Also exported: saveFeedback(note), feedbackNotes(), parse(text, { today }), prep(text) and
// fromZh(text) (for tests).

import * as repo from './repo.js';
import * as store from './store.js';
import { normalize, plural, storage, TYPE_LABELS } from './util.js';
import { todayKey, addDays, weekdayOf, relDayLabel, timeOf, yearOf } from './time.js';
import { BIOS } from './content/bios.js';
import {
  isZh, tidyZh, fmtN, cityName, composerName as zhComposerName, composerShort as zhComposerShort,
  cantonName as zhCantonName, countryName, typeLabel, roleLabel,
} from './i18n.js';
import { ZH_CITIES, ZH_CANTONS, ZH_COMPOSERS, ZH_COMPOSERS_SHORT, ZH_COUNTRIES } from './i18n/zh-names.js';
import { ZH_PLACES } from './i18n/zh-concerts.js';

const MAX_ITEMS = 8;
const NOTES_KEY = 'klang.assistant.notes';

// ---------- text helpers ----------
export function prep(s) {
  const t = normalize(String(s || '').toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/ß/g, 'ss').replace(/ø/g, 'o'))
    .replace(/[’'`´]s\b/g, '')
    .replace(/[’'`´]/g, '')
    .replace(/&/g, ' and ')
    .replace(/#\s*(?=\d)/g, ' no ')
    .replace(/\b(bwv|hwv|kv|k|d|op|opp|hob|sz|wwv|no|nr|nos)\.?(?=\d)/g, '$1 ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\bkv\b/g, 'k')
    .replace(/\bnr\b/g, 'no')
    .replace(/\bnumber (?=\d)/g, 'no ')
    .replace(/\s+/g, ' ')
    .trim();
  return t;
}
const pad = (s) => ` ${s} `;

// ---------- Chinese questions ----------
// fromZh(text) -> { text, places, unknown }: Chinese words become the English vocabulary below
// (cities, cantons, composers, works, dates, types, forms, roles), Chinese numerals become digits, and
// Latin text (venue or performer names) passes through. `places` are foreign countries named (Klang has
// listings for Switzerland only); `unknown` are Chinese words that were left out.
const HAN_RE = /[\u3400-\u9fff]/;
const HAN_RUN = /[\u3400-\u9fff]+/g;
const ZH_DIGITS = { 零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
function zhNumber(s) {
  if (/^\d+$/.test(s)) return Number(s);
  if (s === '十') return 10;
  const m = s.match(/^([一二两三四五六七八九])?十([一二三四五六七八九])?$/);
  if (m) return (m[1] ? ZH_DIGITS[m[1]] : 1) * 10 + (m[2] ? ZH_DIGITS[m[2]] : 0);
  if (s.length === 1 && s in ZH_DIGITS) return ZH_DIGITS[s];
  return null;
}
const ZH_NUM = '[0-9零〇一二两三四五六七八九十]+';
const ORD_WORDS = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];
const MONTH_EN = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const ZH_FORMS = {
  交响曲: 'symphony', 钢琴协奏曲: 'piano concerto', 小提琴协奏曲: 'violin concerto', 大提琴协奏曲: 'cello concerto', 协奏曲: 'concerto',
  弦乐四重奏: 'string quartet', 四重奏: 'quartet', 钢琴奏鸣曲: 'piano sonata', 奏鸣曲: 'sonata', 钢琴三重奏: 'piano trio', 三重奏: 'trio',
  勃兰登堡协奏曲: 'brandenburg concerto', 无伴奏大提琴组曲: 'cello suite', 组曲: 'suite', 帕蒂塔: 'partita',
};
const ZH_FORM_RE = Object.keys(ZH_FORMS).sort((a, b) => b.length - a.length).join('|');
const ZH_WEEKDAYS = { 一: 'monday', 二: 'tuesday', 三: 'wednesday', 四: 'thursday', 五: 'friday', 六: 'saturday', 日: 'sunday', 天: 'sunday' };

// Fixed phrases (longest match wins). Values are English words the parser knows.
const ZH_PHRASES = {
  // dates and parts of the day
  今天晚上: 'tonight', 今晚: 'tonight', 今夜: 'tonight', 今天下午: 'this afternoon', 今天上午: 'this morning', 今天: 'today', 今日: 'today',
  明天晚上: 'tomorrow evening', 明晚: 'tomorrow evening', 明天下午: 'tomorrow afternoon', 明天上午: 'tomorrow morning', 明天: 'tomorrow',
  后天: 'day after tomorrow', 昨天: 'yesterday',
  这个周末: 'this weekend', 这周末: 'this weekend', 本周末: 'this weekend', 下个周末: 'next weekend', 下周末: 'next weekend', 上周末: 'last weekend', 周末: 'this weekend',
  这个星期: 'this week', 这星期: 'this week', 这周: 'this week', 本周: 'this week', 下个星期: 'next week', 下星期: 'next week', 下周: 'next week', 上周: 'last week',
  这个月: 'this month', 本月: 'this month', 下个月: 'next month', 下月: 'next month', 上个月: 'last month',
  圣诞节: 'christmas', 圣诞: 'christmas', 平安夜: 'christmas eve', 新年: 'new year', 元旦: 'new year', 跨年: 'new years eve', 复活节: 'easter', 将临期: 'advent',
  今年春天: 'this spring', 今年夏天: 'this summer', 今年秋天: 'this autumn', 今年冬天: 'this winter', 明年春天: 'next spring',
  春天: 'spring', 春季: 'spring', 夏天: 'summer', 夏季: 'summer', 秋天: 'autumn', 秋季: 'autumn', 冬天: 'winter', 冬季: 'winter',
  午间: 'lunchtime', 中午: 'lunchtime', 日场: 'matinee', 上午: 'morning', 早上: 'morning', 下午: 'afternoon', 晚上: 'evening', 晚间: 'evening',
  // concert types and forms
  室内乐: 'chamber music', 管弦乐: 'orchestral', 交响乐: 'orchestral', 钢琴独奏会: 'piano recital', 独奏会: 'recital', 独唱会: 'song recital',
  声乐与歌剧: 'vocal', 声乐: 'vocal', 合唱: 'choral', 轻歌剧: 'operetta', 歌剧: 'opera', 清唱剧: 'oratorio', 受难曲: 'passion', 康塔塔: 'cantata',
  弥撒曲: 'mass', 弥撒: 'mass', 安魂曲: 'requiem', 宗教音乐: 'sacred music', 艺术歌曲: 'lieder', 声乐套曲: 'song cycle', 芭蕾: 'ballet',
  变奏曲: 'variations', 段变奏: ' variations', 前奏曲: 'preludes', 五重奏: 'quintet', 八重奏: 'octet', 钢琴独奏: 'solo piano', 钢琴曲: 'piano music',
  单簧管协奏曲: 'clarinet concerto', 单簧管五重奏: 'clarinet quintet', 综合节目: 'mixed programme', 精选: 'featured', 推荐: 'recommended',
  // performers
  钢琴家: 'pianist', 小提琴家: 'violinist', 大提琴家: 'cellist', 中提琴家: 'violist', 单簧管演奏家: 'clarinettist', 长笛演奏家: 'flautist',
  双簧管演奏家: 'oboist', 圆号演奏家: 'horn player', 羽管键琴演奏家: 'harpsichordist', 指挥家: 'conductor', 指挥: 'conductor',
  女高音: 'soprano', 女中音: 'mezzo soprano', 女低音: 'alto', 男高音: 'tenor', 男中音: 'baritone', 男低音: 'bass singer',
  歌唱家: 'singer', 歌手: 'singer', 合唱团: 'choir', 钢琴: 'piano', 小提琴: 'violin', 大提琴: 'cello', 中提琴: 'viola', 单簧管: 'clarinet',
  长笛: 'flute', 双簧管: 'oboe', 羽管键琴: 'harpsichord', 管弦乐团: 'orchestra', 交响乐团: 'orchestra', 乐团: 'ensemble',
  // periods
  巴洛克: 'baroque', 古典主义: 'classical era', 维也纳古典: 'viennese classics', 浪漫主义: 'romantic', 浪漫派: 'romantic',
  二十世纪: '20th century', '20世纪': '20th century', 现代: 'contemporary', 当代: 'contemporary',
  // recordings and concerts
  录音: 'recordings', 唱片: 'recordings', 专辑: 'albums', 版本: 'versions', 聆听: 'listen', 试听: 'listen', 更慢: 'slower', 慢一点: 'slower',
  更快: 'faster', 快一点: 'faster', 历史录音: 'historic recordings', 音乐会: 'concerts', 演出: 'performances', 门票: 'tickets', 节目单: 'programme',
  // works (nicknames and Chinese titles the repertoire knows)
  冬之旅: 'winterreise', 哥德堡变奏曲: 'goldberg variations', 哥德堡: 'goldbergs', 马太受难曲: 'st matthew passion', 圣诞清唱剧: 'weihnachtsoratorium',
  'b小调弥撒': 'b minor mass', 勃兰登堡: 'brandenburg', 四季: 'four seasons', 弥赛亚: 'messiah', 哈利路亚: 'hallelujah', 创世记: 'schopfung',
  魔笛: 'magic flute', 土耳其进行曲: 'turkish march', 命运交响曲: 'fate symphony', 命运: 'fate symphony', 欢乐颂: 'ode to joy', 合唱交响曲: 'choral symphony',
  皇帝协奏曲: 'emperor concerto', 未完成交响曲: 'unvollendete', 鳟鱼: 'trout', 塞维利亚的理发师: 'barber of seville', 茶花女: 'traviata',
  漂泊的荷兰人: 'flying dutchman', 特里斯坦与伊索尔德: 'tristan', 特里斯坦: 'tristan', 蓝色多瑙河: 'blue danube', 蝙蝠: 'fledermaus',
  德意志安魂曲: 'deutsches requiem', 动物狂欢节: 'carnival of the animals', 管风琴交响曲: 'orgelsinfonie', 悲怆交响曲: 'pathetique', 悲怆: 'pathetique',
  '叶甫盖尼·奥涅金': 'onegin', 奥涅金: 'onegin', 佛罗伦萨的回忆: 'souvenir de florence', 新世界交响曲: 'new world symphony', 新世界: 'new world',
  艺术家的生涯: 'boheme', 波西米亚人: 'boheme', 复活交响曲: 'resurrection symphony', 大地之歌: 'song of the earth', 大海: 'la mer',
  牧神午后前奏曲: 'afternoon of a faun', 牧神午后: 'afternoon of a faun', 最后四首歌: 'four last songs', 查拉图斯特拉如是说: 'zarathustra',
  查拉图斯特拉: 'zarathustra', 玫瑰骑士: 'knight of the rose', 波莱罗舞曲: 'bolero', 波莱罗: 'bolero', 春之祭: 'rite of spring', 火鸟: 'firebird',
  时间终结四重奏: 'quartet for the end of time', 小交响曲: 'petite symphonie', '太平洋231': 'pacific', 英雄交响曲: 'eroica', 田园交响曲: 'pastoral symphony',
  月光奏鸣曲: 'moonlight sonata', 克鲁采奏鸣曲: 'kreutzer sonata', 致爱丽丝: 'fur elise', 巨人交响曲: 'titan', 死神与少女: 'death and the maiden',
  胡桃夹子: 'nutcracker', 天鹅湖: 'swan lake', 平均律: 'well tempered clavier', 赋格的艺术: 'art of fugue', 弦乐小夜曲: 'eine kleine nachtmusik',
  小夜曲: 'eine kleine nachtmusik', 费加罗的婚礼: 'marriage of figaro', 阿依达: 'aida', 弄臣: 'rigoletto', 尼伯龙根的指环: 'ring des nibelungen',
  女武神: 'walkure', 蝴蝶夫人: 'madama butterfly', 图兰朵: 'turandot', 今夜无人入睡: 'nessun dorma', 月光曲: 'clair de lune', 匈牙利舞曲: 'hungarian dances',
  '培尔·金特': 'peer gynt', 芬兰颂: 'finlandia', 列宁格勒: 'leningrad', 布兰诗歌: 'carmina burana', 行星组曲: 'the planets', 谜语变奏曲: 'enigma variations',
  大卫王: 'roi david', 恰空: 'chaconne', 八重奏: 'octet',
  // feedback, help, my concerts
  我的笔记: 'my notes', 我的反馈: 'my notes', 我的音乐会: 'my concerts', 我收藏的音乐会: 'my saved', 我收藏的: 'my saved', 我想去的: 'my plans',
  推荐一个场馆: 'propose a venue', 推荐场馆: 'propose a venue', 推荐一个城市: 'propose a city', 推荐城市: 'propose a city',
  添加场馆: 'add a venue', 添加城市: 'add a city', 反馈: 'feedback', 建议: 'suggestion', 音乐会代码: 'code', 代码: 'code',
  // small words
  瑞士各地: 'anywhere in switzerland', 附近: 'near', 周边: 'near', 那位: 'that', 哪位: 'which', 那个: 'that', 介绍一下: 'tell me about', 介绍: 'tell me about',
  更多: 'more', 作曲家: 'composer', 作品: 'works', 曲目: 'programme', 场馆: 'venue', 城市: 'city', 瑞士: 'switzerland',
  的: ' ', 在: 'in', 和: 'and', 与: 'and', 及: 'and', 或者: 'or', 或: 'or', 有没有: ' ', 有什么: 'whats on', 有哪些: ' ', 什么: ' ', 哪些: ' ', 哪里: 'where',
  吗: ' ', 呢: ' ', 吧: ' ', 请: ' ', 帮我: ' ', 我想: ' ', 想听: 'listen', 想看: 'concerts', 找: ' ', 查找: ' ', 搜索: ' ', 一下: ' ', 有: ' ', 段: ' ', 个: ' ', 场: ' ',
};

let ZH_TABLE = null;
function zhTable() {
  if (ZH_TABLE) return ZH_TABLE;
  const map = new Map();
  const put = (zh, en, kind = null) => { if (zh && en && !map.has(zh)) map.set(zh, { en, kind }); };
  // names first, so "苏黎世州" (canton) and "苏黎世" (city) both win over shorter phrases
  for (const [code, zh] of Object.entries(ZH_CANTONS)) {
    const name = repo.cantonName(code);
    put(zh, `canton ${name}`);
  }
  for (const [id, zh] of Object.entries(ZH_CITIES)) { const c = repo.city(id); if (c) put(zh, c.name); }
  for (const [id, zh] of Object.entries(ZH_COMPOSERS)) { const c = repo.composer(id); if (c) put(zh, c.name); }
  for (const [id, zh] of Object.entries(ZH_COMPOSERS_SHORT)) { const c = repo.composer(id); if (c) put(zh, c.name); }
  for (const [en, zh] of Object.entries(ZH_COUNTRIES)) if (en !== 'Switzerland') put(zh, `in ${en}`, 'country');
  // cities abroad (柏林, 维也纳 …): named like a country, so the reply says Klang covers Switzerland only
  for (const [en, zh] of Object.entries(ZH_PLACES)) put(zh, `in ${en}`, 'country');
  for (const [adj, zh] of Object.entries(NATIONS_ZH)) {
    put(`${zh}作曲家`, `${adj} composer`);
    put(`${zh}音乐`, `${adj} music`);
  }
  for (const [zh, en] of Object.entries(ZH_PHRASES)) put(zh, en);
  const keys = [...map.keys()].sort((a, b) => b.length - a.length);
  ZH_TABLE = { map, re: new RegExp(keys.map(esc).join('|'), 'g') };
  return ZH_TABLE;
}

export function fromZh(text, today = todayKey()) {
  const raw = String(text || '');
  if (!HAN_RE.test(raw)) return { text: raw, places: [], unknown: [] };
  let s = raw.replace(/[，。？！、；：（）《》“”「」【】]/g, (ch) => (ch === '：' ? ': ' : ' '));
  const num = (x) => zhNumber(x);
  // dates: 2027年3月 · 11月14日 · 11月上旬 · 11月
  s = s.replace(new RegExp(`(20\\d\\d)\\s*年\\s*(${ZH_NUM})\\s*月(?!\\s*${ZH_NUM}\\s*[日号])`, 'g'), (m, y, mo) => (num(mo) >= 1 && num(mo) <= 12 ? ` in ${MONTH_EN[num(mo) - 1]} ${y} ` : m));
  s = s.replace(new RegExp(`(${ZH_NUM})\\s*月\\s*(${ZH_NUM})\\s*[日号]`, 'g'), (m, mo, d) => (num(mo) >= 1 && num(mo) <= 12 && num(d) >= 1 && num(d) <= 31 ? ` ${num(d)} ${MONTH_EN[num(mo) - 1]} ` : m));
  s = s.replace(new RegExp(`(${ZH_NUM})\\s*月\\s*(上旬|初|中旬|下旬|底)`, 'g'), (m, mo, part) => {
    if (!(num(mo) >= 1 && num(mo) <= 12)) return m;
    const mod = { 上旬: 'early', 初: 'early', 中旬: 'mid', 下旬: 'late', 底: 'late' }[part];
    return ` ${mod} ${MONTH_EN[num(mo) - 1]} `;
  });
  s = s.replace(new RegExp(`(${ZH_NUM})\\s*月(份)?`, 'g'), (m, mo) => (num(mo) >= 1 && num(mo) <= 12 ? ` in ${MONTH_EN[num(mo) - 1]} ` : m));
  s = s.replace(new RegExp(`(?:未来|接下来|之后)\\s*(${ZH_NUM})\\s*天`, 'g'), (m, n) => ` next ${num(n)} days `);
  s = s.replace(/(?:未来|接下来)一周/g, ' next week ');
  // weekdays: 周五 · 星期六 · 每周三 · 下周日 (= that day of next week, Monday to Sunday)
  s = s.replace(/(每|下个|下|这个|这|本)?(?:周|星期|礼拜)([一二三四五六日天])/g, (m, pre, d) => {
    const wd = ZH_WEEKDAYS[d];
    if (pre === '每') return ` every ${wd} `;
    if (pre === '下' || pre === '下个') {
      const monday = addDays(today, -((weekdayOf(today) + 6) % 7));
      const day = addDays(monday, 7 + '一二三四五六日'.indexOf(d === '天' ? '日' : d));
      return ` ${Number(day.slice(8, 10))} ${MONTH_EN[Number(day.slice(5, 7)) - 1]} ${day.slice(0, 4)} `;
    }
    return ` on ${wd} `;
  });
  // numbered works: 第二交响曲 · 第9号交响曲 · 马勒第二 → "symphony no 2" / "second"
  s = s.replace(new RegExp(`第\\s*(${ZH_NUM})\\s*号?\\s*(${ZH_FORM_RE})`, 'g'), (m, n, form) => ` ${ZH_FORMS[form]} no ${num(n)} `);
  s = s.replace(new RegExp(`(${ZH_FORM_RE})\\s*第?\\s*(\\d{1,3})\\s*号`, 'g'), (m, form, n) => ` ${ZH_FORMS[form]} no ${n} `);
  s = s.replace(new RegExp(`第\\s*(${ZH_NUM})`, 'g'), (m, n) => {
    const k = num(n);
    return k ? ` ${k <= 10 ? ORD_WORDS[k] : `no ${k}`} ` : m;
  });
  s = s.replace(/三十\s*段?\s*变奏/g, ' 30 variations ');
  // names and phrases
  const { map, re } = zhTable();
  const places = [];
  s = s.replace(re, (m) => {
    const e = map.get(m);
    if (e.kind === 'country') places.push(m);
    return ` ${e.en} `;
  });
  const unknown = (s.match(HAN_RUN) || []).filter((w) => w.length > 1);
  s = s.replace(HAN_RUN, ' ').replace(/\s+/g, ' ').trim();
  return { text: s, places, unknown };
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const cap1 = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const uniq = (arr) => [...new Set(arr)];
const listJoin = (arr, word = 'and') =>
  arr.length <= 1 ? arr[0] || '' : `${arr.slice(0, -1).join(', ')} ${word} ${arr[arr.length - 1]}`;
const maxKey = (a, b) => (a > b ? a : b);
const ymd = (y, m0, d) => `${y}-${String(m0 + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const daysIn = (y, m0) => new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate();
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WD_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function take(ctx, key) {
  const p = pad(key);
  if (!ctx.rest.includes(p)) return false;
  while (ctx.rest.includes(p)) ctx.rest = ctx.rest.replace(p, ' | ');
  return true;
}
function takeRe(ctx, re) {
  const m = ctx.rest.match(re);
  if (!m) return null;
  ctx.rest = `${ctx.rest.slice(0, m.index)} | ${ctx.rest.slice(m.index + m[0].length)}`;
  return m;
}

// Small edit distance (optimal string alignment) with an early exit.
function distance(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const prev2 = new Array(b.length + 1).fill(0);
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    for (let j = 0; j <= b.length; j++) prev2[j] = prev[j];
    prev = cur;
  }
  return prev[b.length];
}

// ---------- vocabulary ----------
// Words that carry no search meaning (never reported as "unknown").
const STOP = new Set(`a an the any some all of in on at to for with by from and or nor me my mine i im id ive you your we us our
is are was were be been being am what whats which who whom whose where when how why show shows showing find finding search
look looking want wanna would like love please pls can could will shall should there theres here this that these those next
coming upcoming soon around near nearby about tell give get list good best great nice famous really something anything
everything lots more much many few one ones it its them they he she his her him do does did doing have has had see hear go
going goes attend attending out up maybe also just only still yet then than so very too not no yes ok okay hi hello hey
music musical concert concerts event events performance performances perform performed performing live stage ticket tickets
cheap cheaper cheapest affordable free price prices cost recording recordings record records recorded album albums version
versions cd cds listen listening play plays playing played piece pieces work works composer composers person people ensemble
ensembles artist artists performer performers musician musicians programme programmes program programs classical
switzerland swiss suisse schweiz svizzera ch venue venues hall halls city cities town towns place places date dates day days
week weeks month months year years time times evening evenings night nights morning afternoon today tonight tomorrow weekend
interpretation interpretations rendition renditions slower slow slowest faster fast fastest tempo tempi historic historical
recommend recommended recommendation recommendations suggest featuring feat including includes include without new old
latest recent full complete whole etc number op opus season seasons festival festivals happening happen on stage anywhere
everywhere somewhere elsewhere else other another again same also kind sort type types style genre genres sound sounds
called named name titled title who someone anyone thing things stuff way ways part parts bit lot lots little big small
which ones whats going on hear see watch catch visit visiting there between over under after before during till until within
via per each every if but because as such into onto upon off away back home online offline app klang sheng assistant let lets`.split(/\s+/).filter(Boolean));

const NUMWORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fourteen: 14, fifteen: 15, twenty: 20, thirty: 30, few: 3, couple: 2, a: 1 };
const ORDINALS = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10 };
const ORD_RE = Object.keys(ORDINALS).join('|');
const NUM_FORMS = ['brandenburg concerto', 'piano concerto', 'violin concerto', 'cello concerto', 'string quartet', 'piano sonata', 'piano trio', 'cello suite', 'symphony', 'symphonie', 'sinfonie', 'concerto', 'quartet', 'sonata', 'partita', 'trio'];
const NUM_FORM_RE = NUM_FORMS.join('|');

const COMPOSER_ALIASES = {
  bach: ['js bach', 'j s bach', 'johann sebastian', 'sebastian bach'],
  handel: ['haendel', 'hendel', 'georg friedrich handel'],
  vivaldi: ['red priest'],
  haydn: ['papa haydn', 'father of the symphony'],
  mozart: ['amadeus', 'wolfgang amadeus', 'mozzart'],
  beethoven: ['van beethoven', 'ludwig van'],
  mendelssohn: ['mendelssohn bartholdy', 'mendelsohn'],
  schumann: ['robert schumann', 'schuman'],
  chopin: ['szopen'],
  'johann-strauss': ['johann strauss', 'strauss ii', 'j strauss', 'waltz king', 'strauss son'],
  'richard-strauss': ['richard strauss', 'r strauss'],
  'saint-saens': ['saint saens', 'st saens', 'saintsaens'],
  tchaikovsky: ['tchaikovski', 'tschaikowsky', 'tschaikowski', 'tchaikowsky', 'chaikovsky', 'tchaikovksy', 'tschaikovsky'],
  dvorak: ['dvorjak', 'dvoraks'],
  rachmaninoff: ['rachmaninov', 'rachmaninow', 'rakhmaninov', 'rach'],
  shostakovich: ['shostakovitch', 'schostakowitsch', 'chostakovitch', 'shosty'],
  stravinsky: ['strawinsky', 'stravinski', 'strawinski'],
  bartok: ['bela bartok'],
  martin: ['frank martin'],
  bloch: ['ernest bloch'],
  honegger: ['arthur honegger'],
  part: ['arvo part', 'arvo', 'paert'],
  messiaen: ['olivier messiaen'],
  liszt: ['franz liszt'],
};
const NOT_A_SURNAME = new Set(['part', 'ii', 'strauss']);

// Nicknames and other names of works in the repertoire.
const WORK_ALIASES = {
  'bach-goldberg': ['goldbergs', 'goldberg', '30 variations', 'thirty variations', 'aria with 30 variations', 'goldberg variation'],
  'bach-st-matthew': ['matthew passion', 'st matthew', 'saint matthew passion', 'matthaus passion', 'matthauspassion', 'matthaeus passion'],
  'bach-christmas-oratorio': ['weihnachtsoratorium', 'oratorio de noel'],
  'bach-mass-b-minor': ['b minor mass', 'h moll messe'],
  'bach-cantata-140': ['wachet auf', 'sleepers wake'],
  'bach-cantata-147': ['jesu joy', 'jesu joy of mans desiring', 'herz und mund'],
  'bach-cello-suite-1': ['first cello suite'],
  'bach-partita-2': ['chaconne', 'ciaccona', 'd minor partita'],
  'bach-brandenburg-5': ['brandenburg', 'fifth brandenburg'],
  'handel-messiah': ['hallelujah chorus', 'hallelujah'],
  'vivaldi-four-seasons': ['four seasons', 'quattro stagioni', 'vier jahreszeiten', 'quatre saisons'],
  'haydn-creation': ['creation', 'schopfung', 'schoepfung'],
  'haydn-quartet-emperor': ['kaiserquartett'],
  'mozart-requiem': ['mozart requiem'],
  'mozart-magic-flute': ['magic flute', 'zauberflote', 'zauberfloete', 'flute enchantee'],
  'mozart-sonata-k331': ['alla turca', 'turkish march', 'rondo alla turca'],
  'mozart-piano-concerto-21': ['elvira madigan'],
  'beethoven-symphony-5': ['fate symphony', 'schicksalssinfonie'],
  'beethoven-symphony-9': ['ode to joy', 'choral symphony', 'an die freude', 'ode an die freude'],
  'beethoven-piano-concerto-5': ['emperor concerto'],
  'schubert-winterreise': ['winter journey', 'winterreise'],
  'schubert-trout': ['trout', 'forellenquintett', 'forelle'],
  'schubert-unfinished': ['unvollendete'],
  'schubert-string-quintet': ['schubert quintet', 'cello quintet'],
  'rossini-barber': ['barber of seville', 'barbiere', 'barbier von sevilla'],
  'mendelssohn-violin-concerto': ['mendelssohn concerto'],
  'chopin-ballades': ['ballades'],
  'chopin-preludes': ['raindrop prelude'],
  'verdi-traviata': ['traviata'],
  'verdi-requiem': ['verdi requiem'],
  'wagner-dutchman': ['flying dutchman', 'hollander'],
  'wagner-tristan-prelude': ['tristan', 'liebestod', 'tristan and isolde'],
  'jstrauss-blue-danube': ['blue danube', 'blaue donau', 'beautiful blue danube'],
  'jstrauss-fledermaus': ['fledermaus'],
  'brahms-requiem': ['german requiem', 'deutsches requiem'],
  'saint-saens-organ-symphony': ['orgelsinfonie'],
  'saint-saens-carnival': ['carnival of the animals', 'carnaval des animaux'],
  'tchaikovsky-pathetique': ['pathetique', 'pathetic symphony'],
  'tchaikovsky-onegin': ['onegin'],
  'tchaikovsky-souvenir': ['souvenir de florence'],
  'dvorak-new-world': ['new world', 'new world symphony', 'aus der neuen welt'],
  'grieg-piano-concerto': ['grieg concerto'],
  'puccini-boheme': ['boheme'],
  'mahler-symphony-2': ['resurrection', 'auferstehung', 'resurrection symphony'],
  'mahler-symphony-5': ['adagietto'],
  'mahler-lied-von-der-erde': ['song of the earth'],
  'debussy-la-mer': ['la mer'],
  'debussy-faune': ['faune', 'faun', 'afternoon of a faun', 'apres midi dun faune', 'prelude to the afternoon of a faun'],
  'rstrauss-four-last-songs': ['four last songs', 'last songs'],
  'rstrauss-zarathustra': ['zarathustra', 'space odyssey'],
  'rstrauss-rosenkavalier': ['knight of the rose'],
  'rachmaninoff-piano-concerto-2': ['rach 2', 'rach two'],
  'ravel-bolero': ['bolero'],
  'ravel-gaspard': ['gaspard', 'scarbo'],
  'stravinsky-rite': ['rite of spring', 'sacre', 'le sacre', 'fruhlingsopfer'],
  'stravinsky-firebird': ['firebird', 'oiseau de feu', 'feuervogel'],
  'martin-petite-symphonie': ['petite symphonie'],
  'honegger-pacific-231': ['pacific'],
  'honegger-symphony-3': ['symphonie liturgique'],
  'messiaen-quartet': ['quartet for the end of time', 'end of time', 'fin du temps'],
  'part-spiegel': ['spiegel'],
  'mendelssohn-octet': ['mendelssohn octet'],
};
const AMBIG_NICK = new Set(['london', 'italian', 'organ', 'emperor', 'american']);

// Well-known works that are not (yet) in Klang's repertoire: answered with the composer + recordings.
const MISSING = [
  { keys: ['eroica'], composerId: 'beethoven', title: 'Symphony No. 3 “Eroica”', term: 'Beethoven Symphony No. 3 Eroica' },
  { keys: ['pastoral symphony', 'pastorale', 'pastoral'], composerId: 'beethoven', title: 'Symphony No. 6 “Pastoral”', term: 'Beethoven Symphony No. 6 Pastoral' },
  { keys: ['moonlight sonata', 'moonlight', 'mondscheinsonate'], composerId: 'beethoven', title: 'Piano Sonata No. 14 “Moonlight”', term: 'Beethoven Moonlight Sonata' },
  { keys: ['kreutzer sonata', 'kreutzer'], composerId: 'beethoven', title: 'Violin Sonata No. 9 “Kreutzer”', term: 'Beethoven Kreutzer Sonata' },
  { keys: ['fur elise'], composerId: 'beethoven', title: 'Für Elise', term: 'Beethoven Für Elise' },
  { keys: ['big hammer', 'hammer blows', 'hammer blow', 'hammer', 'tragic symphony', 'tragische'], composerId: 'mahler', title: 'Symphony No. 6 “Tragic”', term: 'Mahler Symphony No. 6', note: 'the one with the hammer blows' },
  { keys: ['titan'], composerId: 'mahler', title: 'Symphony No. 1 “Titan”', term: 'Mahler Symphony No. 1 Titan' },
  { keys: ['death and the maiden', 'der tod und das madchen'], composerId: 'schubert', title: 'String Quartet No. 14 “Death and the Maiden”', term: 'Schubert Death and the Maiden' },
  { keys: ['great c major'], composerId: 'schubert', title: 'Symphony No. 9 “The Great”', term: 'Schubert Symphony No. 9 Great' },
  { keys: ['nutcracker'], composerId: 'tchaikovsky', title: 'The Nutcracker', term: 'Tchaikovsky Nutcracker' },
  { keys: ['swan lake'], composerId: 'tchaikovsky', title: 'Swan Lake', term: 'Tchaikovsky Swan Lake' },
  { keys: ['well tempered clavier', 'well tempered', 'wohltemperierte klavier'], composerId: 'bach', title: 'The Well-Tempered Clavier', term: 'Bach Well-Tempered Clavier' },
  { keys: ['art of fugue', 'kunst der fuge'], composerId: 'bach', title: 'The Art of Fugue', term: 'Bach Art of Fugue' },
  { keys: ['eine kleine nachtmusik', 'kleine nachtmusik'], composerId: 'mozart', title: 'Eine kleine Nachtmusik', term: 'Mozart Eine kleine Nachtmusik' },
  { keys: ['marriage of figaro', 'nozze di figaro', 'figaro'], composerId: 'mozart', title: 'Le nozze di Figaro', term: 'Mozart Le nozze di Figaro' },
  { keys: ['aida'], composerId: 'verdi', title: 'Aida', term: 'Verdi Aida' },
  { keys: ['rigoletto'], composerId: 'verdi', title: 'Rigoletto', term: 'Verdi Rigoletto' },
  { keys: ['ring cycle', 'ring des nibelungen', 'walkure', 'walkuere', 'valkyrie', 'valkyries'], composerId: 'wagner', title: 'Der Ring des Nibelungen', term: 'Wagner Ring des Nibelungen' },
  { keys: ['madama butterfly'], composerId: 'puccini', title: 'Madama Butterfly', term: 'Puccini Madama Butterfly' },
  { keys: ['turandot', 'nessun dorma'], composerId: 'puccini', title: 'Turandot', term: 'Puccini Turandot' },
  { keys: ['clair de lune'], composerId: 'debussy', title: 'Clair de lune (Suite bergamasque)', term: 'Debussy Clair de lune' },
  { keys: ['hungarian dances', 'hungarian dance'], composerId: 'brahms', title: 'Hungarian Dances', term: 'Brahms Hungarian Dances' },
  { keys: ['peer gynt'], composerId: 'grieg', title: 'Peer Gynt', term: 'Grieg Peer Gynt' },
  { keys: ['finlandia'], composerId: 'sibelius', title: 'Finlandia', term: 'Sibelius Finlandia' },
  { keys: ['leningrad'], composerId: 'shostakovich', title: 'Symphony No. 7 “Leningrad”', term: 'Shostakovich Symphony No. 7 Leningrad' },
  { keys: ['roi david', 'king david'], composerId: 'honegger', title: 'Le Roi David', term: 'Honegger Le Roi David' },
  { keys: ['jeanne darc au bucher', 'joan of arc at the stake'], composerId: 'honegger', title: 'Jeanne d’Arc au bûcher', term: 'Honegger Jeanne d’Arc au bûcher' },
  { keys: ['carmina burana'], composerName: 'Carl Orff', title: 'Carmina Burana', term: 'Orff Carmina Burana' },
  { keys: ['the planets'], composerName: 'Gustav Holst', title: 'The Planets', term: 'Holst The Planets' },
  { keys: ['enigma variations'], composerName: 'Edward Elgar', title: 'Enigma Variations', term: 'Elgar Enigma Variations' },
];

const VENUE_ALIASES = {
  'tonhalle-zurich': ['tonhalle', 'tonhalle zurich', 'tonhalle zuerich', 'grosse tonhalle'],
  'tonhalle-zurich-kleiner-saal': ['tonhalle', 'kleiner saal', 'tonhalle kleiner saal'],
  'opernhaus-zurich': ['opernhaus', 'opernhaus zurich', 'zurich opera', 'zurich opera house', 'opera zurich', 'opera house zurich'],
  'fraumunster-zurich': ['fraumunster', 'fraumuenster'],
  'grossmunster-zurich': ['grossmunster', 'grossmuenster'],
  'st-peter-zurich': ['st peter', 'st peter zurich'],
  'victoria-hall': ['victoria hall'],
  'grand-theatre-geneve': ['grand theatre', 'grand theatre de geneve', 'geneva opera', 'opera de geneve'],
  'bfm-geneve': ['bfm', 'batiment des forces motrices'],
  'conservatoire-geneve': ['conservatoire de geneve', 'geneva conservatory'],
  'cathedrale-saint-pierre-geneve': ['cathedrale saint pierre', 'st pierre cathedral'],
  'stadtcasino-basel': ['stadtcasino', 'stadtcasino basel', 'casino basel'],
  'theater-basel': ['theater basel'],
  'basler-munster': ['basler munster', 'basel minster', 'munster basel'],
  'martinskirche-basel': ['martinskirche'],
  'gare-du-nord-basel': ['gare du nord'],
  'stadthaus-winterthur': ['stadthaus', 'stadthaus winterthur'],
  'casino-bern': ['casino bern'],
  'stadttheater-bern': ['stadttheater bern', 'buhnen bern', 'buehnen bern'],
  'berner-munster': ['berner munster', 'bern minster', 'munster bern'],
  'yehudi-menuhin-forum': ['menuhin forum', 'yehudi menuhin forum'],
  'kkl-luzern': ['kkl', 'kkl luzern', 'kkl lucerne'],
  'luzerner-theater': ['luzerner theater', 'lucerne theatre'],
  'hofkirche-luzern': ['hofkirche'],
  'salle-metropole': ['metropole', 'salle metropole'],
  'opera-de-lausanne': ['opera de lausanne', 'lausanne opera'],
  'salle-paderewski': ['paderewski', 'salle paderewski'],
  'tonhalle-st-gallen': ['tonhalle st gallen'],
  'theater-st-gallen': ['theater st gallen'],
  'lac-lugano': ['lac lugano', 'lugano arte e cultura'],
  'equilibre-fribourg': ['equilibre'],
  'sudpol-kriens': ['sudpol', 'suedpol'],
  'auditorium-stravinski': ['auditorium stravinski', 'stravinski auditorium'],
  'salle-des-combins': ['combins', 'salle des combins'],
  'festival-zelt-gstaad': ['festival zelt'],
};

const CITY_ALIASES = {
  zurich: ['zuerich', 'zurigo'],
  geneva: ['geneve', 'genf', 'ginevra'],
  basel: ['bale', 'basle', 'basilea'],
  bern: ['berne', 'berna'],
  lucerne: ['luzern', 'lucerna'],
  lausanne: ['losanna'],
  'st-gallen': ['sankt gallen', 'saint gall', 'st gall', 'san gallo'],
  fribourg: ['freiburg'],
  sion: ['sitten'],
  neuchatel: ['neuenburg'],
  chur: ['coira', 'coire'],
  schaffhausen: ['schaffhouse', 'sciaffusa'],
  'la-chaux-de-fonds': ['chaux de fonds'],
  'saint-maurice': ['st maurice'],
  porrentruy: ['pruntrut'],
  winterthur: ['winti'],
};
const CANTON_ALIASES = {
  VD: ['waadt'], VS: ['wallis'], TI: ['tessin'], GR: ['graubuenden', 'grisons', 'grigioni'], AG: ['argovie'],
  TG: ['thurgovie'], SO: ['soleure'], AR: ['appenzell'], BL: ['baselland', 'basel land'], JU: [],
};
const REGIONS = [
  { keys: ['romandie', 'romandy', 'suisse romande', 'french speaking switzerland', 'french part of switzerland', 'western switzerland', 'westschweiz'], label: 'Romandie', zh: '瑞士法语区', cantons: ['GE', 'VD', 'NE', 'JU', 'VS', 'FR'] },
  { keys: ['italian speaking switzerland', 'svizzera italiana'], label: 'Italian-speaking Switzerland', zh: '瑞士意大利语区', cantons: ['TI'] },
  { keys: ['lake geneva', 'lac leman', 'lake geneva region', 'arc lemanique'], label: 'the Lake Geneva region', zh: '日内瓦湖地区', cantons: ['GE', 'VD'] },
  { keys: ['central switzerland', 'zentralschweiz'], label: 'Central Switzerland', zh: '瑞士中部', cantons: ['LU', 'ZG', 'OW', 'SZ'] },
  { keys: ['eastern switzerland', 'ostschweiz'], label: 'Eastern Switzerland', zh: '瑞士东部', cantons: ['SG', 'AR', 'TG', 'GR', 'GL', 'SH'] },
  { keys: ['german speaking switzerland', 'deutschschweiz'], label: 'German-speaking Switzerland', zh: '瑞士德语区', cantons: ['ZH', 'BE', 'BS', 'BL', 'AG', 'LU', 'ZG', 'OW', 'SZ', 'SG', 'AR', 'TG', 'GR', 'GL', 'SH', 'SO'] },
];

// Concert types (TYPE_LABELS keys). Some phrases also imply a role or a form.
const TYPE_PHRASES = [
  { keys: ['chamber music', 'chamber concert', 'chamber concerts', 'chamber', 'kammermusik', 'musique de chambre'], type: 'chamber' },
  { keys: ['piano recital', 'piano recitals'], type: 'recital', role: 'piano' },
  { keys: ['song recital', 'song recitals', 'liederabend', 'lieder recital'], type: 'recital', form: 'songs' },
  { keys: ['solo recital', 'solo recitals', 'recital', 'recitals', 'rezital', 'recitals'], type: 'recital' },
  { keys: ['orchestral', 'orchestra', 'orchestras', 'symphonic', 'symphony concert', 'symphony concerts', 'sinfoniekonzert', 'orchestral music'], type: 'orchestral' },
  { keys: ['vocal', 'choral', 'choral music', 'vocal music', 'vocal opera', 'opera and vocal'], type: 'vocal-opera' },
  { keys: ['mixed programme', 'mixed program', 'mixed'], type: 'mixed' },
];
const TYPE_NOUN = {
  recital: ['recital', 'recitals'],
  chamber: ['chamber concert', 'chamber concerts'],
  orchestral: ['orchestral concert', 'orchestral concerts'],
  'vocal-opera': ['vocal or opera performance', 'vocal and opera performances'],
  mixed: ['mixed programme', 'mixed programmes'],
};
const TYPE_PROMPT = { recital: 'Recitals', chamber: 'Chamber music', orchestral: 'Orchestral concerts', 'vocal-opera': 'Vocal and opera', mixed: 'Mixed programmes' };
const TYPE_NOUN_ZH = { recital: '独奏会', chamber: '室内乐音乐会', orchestral: '管弦乐音乐会', 'vocal-opera': '声乐与歌剧演出', mixed: '综合节目音乐会' };
const TYPE_PROMPT_ZH = { recital: '独奏会', chamber: '室内乐', orchestral: '管弦乐音乐会', 'vocal-opera': '声乐与歌剧', mixed: '综合节目' };

// Forms: filters on the works in a programme.
const FORMS = [
  { id: 'violin-concerto', zh: '小提琴协奏曲', keys: ['violin concertos', 'violin concerto'], label: 'violin concertos', prompt: 'Violin concertos', test: (w) => /Violin Concerto/.test(w.title) },
  { id: 'piano-concerto', zh: '钢琴协奏曲', keys: ['piano concertos', 'piano concerto'], label: 'piano concertos', prompt: 'Piano concertos', test: (w) => /Piano Concerto/.test(w.title) },
  { id: 'cello-concerto', zh: '大提琴协奏曲', keys: ['cello concertos', 'cello concerto'], label: 'cello concertos', prompt: 'Cello concertos', test: (w) => /Cello Concerto/.test(w.title) || w.id === 'bloch-schelomo' },
  { id: 'clarinet', zh: '单簧管作品', keys: ['clarinet concerto', 'clarinet quintet'], label: 'clarinet works', prompt: 'Clarinet works', test: (w) => /Clarinet/.test(w.title) },
  { id: 'concerto', zh: '协奏曲', keys: ['concertos', 'concerto', 'concerti'], label: 'concertos', prompt: 'Concertos', test: (w) => w.genre === 'concerto' },
  { id: 'symphony', zh: '交响曲', keys: ['symphonies', 'symphony', 'sinfonie', 'symphonie'], label: 'symphonies', prompt: 'Symphonies', test: (w) => w.genre === 'symphony' },
  { id: 'quartet', zh: '弦乐四重奏', keys: ['string quartets', 'string quartet', 'quartets', 'quartet', 'streichquartett'], label: 'string quartets', prompt: 'String quartets', test: (w) => /Quartet|Quatuor/.test(w.title) },
  { id: 'trio', zh: '钢琴三重奏', keys: ['piano trios', 'piano trio', 'trios', 'trio'], label: 'piano trios', prompt: 'Piano trios', test: (w) => /Trio/.test(w.title) },
  { id: 'quintet', zh: '五重奏', keys: ['quintets', 'quintet', 'string quintet', 'piano quintet'], label: 'quintets', prompt: 'Quintets', test: (w) => /Quintet/.test(w.title) },
  { id: 'octet', zh: '八重奏', keys: ['octet', 'octets'], label: 'an octet', prompt: 'Octets', test: (w) => /Octet/.test(w.title) },
  { id: 'sonata', zh: '奏鸣曲', keys: ['piano sonatas', 'piano sonata', 'sonatas', 'sonata'], label: 'sonatas', prompt: 'Sonatas', test: (w) => /Sonata/.test(w.title) },
  { id: 'requiem', zh: '安魂曲', keys: ['requiems', 'requiem'], label: 'a requiem', prompt: 'Requiems', test: (w) => /Requiem/.test(w.title) },
  { id: 'opera', zh: '歌剧', keys: ['operas', 'opera', 'operetta', 'operettas', 'oper'], label: 'opera', prompt: 'Opera', noun: ['opera performance', 'opera performances'], test: (w) => !!w.opera },
  { id: 'oratorio', zh: '清唱剧或受难曲', keys: ['oratorios', 'oratorio', 'passions', 'passion'], label: 'an oratorio or Passion', prompt: 'Oratorios', test: (w) => /Oratorio|Passion|Messiah|Schöpfung|In terra pax/.test(w.title) },
  { id: 'cantata', zh: '康塔塔', keys: ['cantatas', 'cantata', 'kantate', 'kantaten'], label: 'cantatas', prompt: 'Cantatas', test: (w) => /Cantata/.test(w.title) },
  { id: 'mass', zh: '弥撒', keys: ['masses', 'mass', 'messe'], label: 'a Mass', prompt: 'Masses', test: (w) => /Mass in|Messa/.test(w.title) },
  { id: 'songs', zh: '艺术歌曲', keys: ['lieder', 'song cycle', 'song cycles', 'songs', 'art song', 'art songs'], label: 'songs', prompt: 'Song recitals', test: (w) => w.genre === 'song' },
  { id: 'sacred', zh: '宗教音乐', keys: ['sacred music', 'sacred', 'church music'], label: 'sacred music', prompt: 'Sacred music', test: (w) => w.genre === 'sacred' },
  { id: 'piano', zh: '钢琴独奏作品', keys: ['solo piano', 'piano music', 'piano works', 'piano pieces'], label: 'solo piano music', prompt: 'Solo piano', test: (w) => w.genre === 'piano' },
  { id: 'solo', zh: '无伴奏弦乐作品', keys: ['solo violin', 'solo cello', 'unaccompanied'], label: 'solo string works', prompt: 'Solo Bach', test: (w) => w.genre === 'solo' },
  { id: 'ballet', zh: '芭蕾音乐', keys: ['ballet', 'ballets', 'ballet music'], label: 'ballet music', prompt: 'Ballet music', test: (w) => w.id === 'stravinsky-rite' || w.id === 'stravinsky-firebird' },
  { id: 'variations', zh: '变奏曲', keys: ['variations'], label: 'variations', prompt: 'Variations', test: (w) => /Variations/.test(w.title) },
  { id: 'preludes', zh: '前奏曲', keys: ['preludes', 'prelude'], label: 'preludes', prompt: 'Preludes', test: (w) => /Prelude|Prélude/.test(w.title) },
];

const VOICES = ['Soprano', 'Mezzo-soprano', 'Alto', 'Tenor', 'Baritone', 'Bass'];
const ROLES = [
  { keys: ['pianists', 'pianist'], label: 'a pianist', noun: 'pianist', zh: '钢琴家', roles: ['Piano'] },
  { keys: ['violinists', 'violinist', 'fiddler'], label: 'a violinist', noun: 'violinist', zh: '小提琴家', roles: ['Violin'] },
  { keys: ['cellists', 'cellist', 'violoncellist'], label: 'a cellist', noun: 'cellist', zh: '大提琴家', roles: ['Cello'] },
  { keys: ['violists', 'violist', 'viola player'], label: 'a violist', noun: 'violist', zh: '中提琴家', roles: ['Viola'] },
  { keys: ['clarinettists', 'clarinettist', 'clarinetists', 'clarinetist'], label: 'a clarinettist', noun: 'clarinettist', zh: '单簧管演奏家', roles: ['Clarinet'] },
  { keys: ['flautists', 'flautist', 'flutists', 'flutist'], label: 'a flautist', noun: 'flautist', zh: '长笛演奏家', roles: ['Flute'] },
  { keys: ['oboists', 'oboist'], label: 'an oboist', noun: 'oboist', zh: '双簧管演奏家', roles: ['Oboe'] },
  { keys: ['horn players', 'horn player', 'hornist'], label: 'a horn player', noun: 'horn player', zh: '圆号演奏家', roles: ['Horn'] },
  { keys: ['harpsichordists', 'harpsichordist'], label: 'a harpsichordist', noun: 'harpsichordist', zh: '羽管键琴演奏家', roles: ['Harpsichord'] },
  { keys: ['conductors', 'conductor', 'maestro'], label: 'a conductor', noun: 'conductor', zh: '指挥', roles: ['Conductor'] },
  { keys: ['mezzo sopranos', 'mezzo soprano', 'mezzos', 'mezzo'], label: 'a mezzo-soprano', noun: 'mezzo-soprano', zh: '女中音', roles: ['Mezzo-soprano'] },
  { keys: ['sopranos', 'soprano'], label: 'a soprano', noun: 'soprano', zh: '女高音', roles: ['Soprano'] },
  { keys: ['altos', 'alto', 'contralto'], label: 'an alto', noun: 'alto', zh: '女低音', roles: ['Alto'] },
  { keys: ['tenors', 'tenor'], label: 'a tenor', noun: 'tenor', zh: '男高音', roles: ['Tenor'] },
  { keys: ['baritones', 'baritone'], label: 'a baritone', noun: 'baritone', zh: '男中音', roles: ['Baritone'] },
  { keys: ['bass singer', 'basses'], label: 'a bass', noun: 'bass', zh: '男低音', roles: ['Bass'] },
  { keys: ['singers', 'singer', 'vocalists', 'vocalist'], label: 'a singer', noun: 'singer', zh: '歌手', roles: VOICES },
  { keys: ['choirs', 'choir', 'chorus', 'choeur', 'chor'], label: 'a choir', noun: 'choir', zh: '合唱团', roles: ['Choir'] },
  { keys: ['piano'], label: 'piano', noun: 'pianist', zh: '钢琴家', roles: ['Piano'], instrument: true },
  { keys: ['violin'], label: 'violin', noun: 'violinist', zh: '小提琴家', roles: ['Violin'], instrument: true },
  { keys: ['cello'], label: 'cello', noun: 'cellist', zh: '大提琴家', roles: ['Cello'], instrument: true },
  { keys: ['viola'], label: 'viola', noun: 'violist', zh: '中提琴家', roles: ['Viola'], instrument: true },
  { keys: ['clarinet'], label: 'clarinet', noun: 'clarinettist', zh: '单簧管演奏家', roles: ['Clarinet'], instrument: true },
  { keys: ['flute'], label: 'flute', noun: 'flautist', zh: '长笛演奏家', roles: ['Flute'], instrument: true },
  { keys: ['oboe'], label: 'oboe', noun: 'oboist', zh: '双簧管演奏家', roles: ['Oboe'], instrument: true },
  { keys: ['harpsichord'], label: 'harpsichord', noun: 'harpsichordist', zh: '羽管键琴演奏家', roles: ['Harpsichord'], instrument: true },
];

const DAYPARTS = [
  { id: 'lunch', zh: '午间', keys: ['lunchtime concerts', 'lunchtime concert', 'lunch concerts', 'lunch concert', 'lunchtime', 'lunch', 'midday', 'noon'], label: 'at lunchtime', test: (t) => t >= '11:30' && t <= '14:00' },
  { id: 'matinee', zh: '日场', keys: ['matinees', 'matinee'], label: 'as matinées', test: (t) => t < '17:00' },
  { id: 'evening', zh: '晚上', keys: ['evenings', 'evening', 'nights', 'night'], label: 'in the evening', test: (t) => t >= '17:00' },
  { id: 'afternoon', zh: '下午', keys: ['afternoons', 'afternoon'], label: 'in the afternoon', test: (t) => t >= '12:00' && t < '18:00' },
  { id: 'morning', zh: '上午', keys: ['mornings', 'morning'], label: 'in the morning', test: (t) => t < '12:00' },
];
const DAYPART_BY_ID = Object.fromEntries(DAYPARTS.map((d) => [d.id, d]));

const PERIODS = [
  { keys: ['baroque', 'barock'], label: 'Baroque', zh: '巴洛克', test: (c) => c.born < 1700 },
  { keys: ['classical era', 'classical period', 'viennese classics', 'viennese classical', 'wiener klassik'], label: 'Classical-era', zh: '古典主义时期', test: (c) => c.born >= 1730 && c.born <= 1775 },
  { keys: ['romantic', 'romantics', 'romanticism', 'romantik'], label: 'Romantic', zh: '浪漫主义', test: (c) => c.born >= 1790 && c.born <= 1865 },
  { keys: ['20th century', 'twentieth century', 'modernist', 'modern', 'contemporary', 'new music'], label: '20th-century', zh: '20 世纪', test: (c) => c.born >= 1875 },
];
const NATIONS = {
  swiss: ['Switzerland', 'Swiss'], french: ['France', 'French'], german: ['Germany', 'German'], austrian: ['Austria', 'Austrian'],
  italian: ['Italy', 'Italian'], russian: ['Russia', 'Russian'], czech: ['Czech', 'Czech'], norwegian: ['Norway', 'Norwegian'],
  finnish: ['Finland', 'Finnish'], hungarian: ['Hungary', 'Hungarian'], polish: ['Poland', 'Polish'], estonian: ['Estonia', 'Estonian'],
  english: ['England', 'English'], british: ['England', 'British'], american: ['USA', 'American'],
};
const NATIONS_ZH = {
  swiss: '瑞士', french: '法国', german: '德国', austrian: '奥地利', italian: '意大利', russian: '俄罗斯', czech: '捷克',
  norwegian: '挪威', finnish: '芬兰', hungarian: '匈牙利', polish: '波兰', estonian: '爱沙尼亚', english: '英国', british: '英国', american: '美国',
};
const COUNTRY_WORDS = { switzerland: 'swiss', france: 'french', germany: 'german', austria: 'austrian', italy: 'italian', russia: 'russian', norway: 'norwegian', finland: 'finnish', hungary: 'hungarian', poland: 'polish', estonia: 'estonian', england: 'english' };

const ENSEMBLE_GENERIC = new Set(['philharmonic', 'sinfonietta', 'chamber', 'orchestra', 'symphony', 'youth', 'valley', 'quartet',
  'quartetto', 'quatuor', 'trio', 'vokalensemble', 'ensemble', 'choeur', 'chor', 'coro', 'kammerchor', 'cantus', 'collegium',
  'capella', 'baroque', 'monte', 'rhine', 'lemanique']);

const MONTH_WORDS = {
  january: 0, jan: 0, januar: 0, janvier: 0, february: 1, feb: 1, februar: 1, fevrier: 1, march: 2, mar: 2, marz: 2, maerz: 2, mars: 2,
  april: 3, apr: 3, avril: 3, may: 4, mai: 4, june: 5, jun: 5, juni: 5, juin: 5, july: 6, jul: 6, juli: 6, juillet: 6,
  august: 7, aug: 7, aout: 7, september: 8, sep: 8, sept: 8, septembre: 8, october: 9, oct: 9, oktober: 9, octobre: 9,
  november: 10, nov: 10, novembre: 10, december: 11, dec: 11, dezember: 11, decembre: 11,
};
const AMBIG_MONTH = new Set(['may', 'march', 'mar', 'jan', 'mars']);
const MONTH_RE = Object.keys(MONTH_WORDS).sort((a, b) => b.length - a.length).join('|');
const WD_WORDS = { monday: 1, mon: 1, tuesday: 2, tues: 2, tue: 2, wednesday: 3, wed: 3, thursday: 4, thurs: 4, thur: 4, thu: 4, friday: 5, fri: 5, saturday: 6, sat: 6, sunday: 0 };
const WD_RE = Object.keys(WD_WORDS).sort((a, b) => b.length - a.length).join('|');

// ---------- cue words ----------
const RE_RECORDING = / (recordings?|recorded|records?|albums?|cds?|discography|versions?|interpretations?|renditions?|listen to|listen|streaming|stream|apple music|spotify|slower|slowest|faster|fastest|historic|historical|period instruments?|best recording|reference recording) /;
const RE_LIVE = / (live|concerts?|events?|gigs?|tonight|tickets?|on stage|performances?|performed|performing|perform|what on|whats on|happening|going on|programmes?|programs?|festivals?|where can i (?:see|hear)|calendar|agenda|schedule) /;
const RE_RECORDING_STRONG = / (recordings?|recorded|albums?|cds?|discography|apple music|spotify) /;
const RE_TEMPO = / (slower|slowest|slow|faster|fastest|fast|tempo|tempi|brisk|broad) /;
const RE_FEATURED = / (featured|highlights?|must see|must hear|top picks?|editors? picks?|recommended|recommendations?) /;
const RE_NEAR = / (near|around|close to|nearby|surroundings of|area of|region of) /;
const RE_HELP = /^(help|what can you do|how does this work|how do you work|what do you do|who are you|what are you|examples?|\?+)$/;
const RE_HELLO = /^(hi|hello|hey|hallo|gruezi|gruetzi|salut|bonjour|ciao|servus|good (morning|afternoon|evening)|moin)( there)?$/;
const RE_THANKS = /^(thanks?|thank you|thx|merci|danke|grazie|cheers|great|perfect|nice|cool|ok|okay|super)( (so much|very much|a lot))?$/;
const RE_FEEDBACK = /^(feedback|bug report|bug|feature request|propose|proposal|please add|could you add|can you add|would you add|add (?:a |the |new )?(?:city|venue|hall|festival|church)|missing (?:city|venue)|you should|it would be (?:nice|great|good)|i wish|claim)\b/;
const RE_FEEDBACK_RAW = /^\s*(?:suggestions?|ideas?|requests?|issues?|problems?)\s*[:\-–—]/i;
const RE_FEEDBACK_ANY = /\b(propose|suggest|add) (?:a |the |new )?(?:city|venue|concert hall|hall|festival)\b/;
const RE_NOTES = /^(?:show (?:me )?)?(?:my (?:notes|feedback|suggestions|saved notes|feedback notes)|notes)$/;
const RE_MINE = / (my concerts|my plans|my calendar|my saved|my bookmarks|my tickets|my list|my agenda|saved concerts|concerts i saved|what am i going to|what im going to|concerts im going to|concerts i am going to|am i going to) /;

// ---------- indexes ----------
let STATIC = null;
function addKey(map, key, value) {
  const k = prep(key);
  if (!k || k.length < 2) return;
  if (!map.has(k)) map.set(k, new Set());
  map.get(k).add(value);
}
const sortedKeys = (map) => [...map.keys()].sort((a, b) => b.length - a.length || a.localeCompare(b));
const ARTICLE_RE = /^(the|a|an|la|le|les|il|der|die|das|ein|eine|l) /;

function buildStatic() {
  const formKeys = new Set();
  for (const f of FORMS) f.keys.forEach((k) => formKeys.add(prep(k)));
  for (const t of TYPE_PHRASES) t.keys.forEach((k) => formKeys.add(prep(k)));

  // composers
  const composers = new Map();
  for (const c of repo.allComposers()) {
    const full = prep(c.name);
    const keys = [full, prep(c.short), ...(COMPOSER_ALIASES[c.id] || []).map(prep)];
    const last = full.split(' ').pop();
    if (!NOT_A_SURNAME.has(last)) keys.push(last);
    for (const k of keys) {
      if (!k || k === 'part' || k === 'ii') continue;
      addKey(composers, k, c.id);
      if (!k.includes(' ') && !k.endsWith('s')) addKey(composers, `${k}s`, c.id); // "Mahlers 2", "Bachs"
    }
  }
  addKey(composers, 'strauss', 'johann-strauss');
  addKey(composers, 'strauss', 'richard-strauss');

  // works (+ missing works)
  const works = new Map();
  const missing = new Map();
  for (const w of repo.allWorks()) {
    const comp = repo.composer(w.composerId);
    const add = (k) => {
      const p = prep(k);
      for (const v of [p, p.replace(ARTICLE_RE, '')]) {
        if (v.length >= 4 && !formKeys.has(v) && !STOP.has(v)) addKey(works, v, w.id);
      }
    };
    add(w.title);
    add(w.title.split(/[“”"(,:–]/)[0]);
    const paren = w.title.match(/\(([^)]+)\)/);
    if (paren && !/^\d+$/.test(paren[1].trim())) add(paren[1]);
    const nick = w.title.match(/“([^”]+)”/);
    if (nick) {
      const n = prep(nick[1]);
      const formWord = (prep(w.title).match(/\b(symphony|quartet|concerto|trio|quintet|sonata)\b/) || [])[1];
      if (formWord) addKey(works, `${n} ${formWord}`, w.id);
      if (comp) addKey(works, `${prep(comp.short)} ${n}`, w.id);
      if (!AMBIG_NICK.has(n)) add(nick[1]);
    }
    for (const a of WORK_ALIASES[w.id] || []) addKey(works, a, w.id);
  }
  MISSING.forEach((m, i) => m.keys.forEach((k) => addKey(missing, k, i)));
  const catalogs = repo.allWorks().filter((w) => w.catalog).map((w) => ({ key: prep(w.catalog), w }));

  // places
  const cities = new Map();
  for (const c of repo.allCities()) {
    addKey(cities, c.name, c.id);
    for (const a of CITY_ALIASES[c.id] || []) addKey(cities, a, c.id);
  }
  const cantons = new Map();
  const cityKeys = new Set(cities.keys());
  const cantonCodes = uniq(repo.allCities().map((c) => c.canton));
  for (const code of uniq([...cantonCodes, ...Object.keys(CANTON_ALIASES)])) {
    const name = prep(repo.cantonName(code));
    if (!name) continue;
    for (const k of [`canton of ${name}`, `canton ${name}`, `kanton ${name}`, `${name} canton`, `canton de ${name}`]) addKey(cantons, k, code);
    if (!cityKeys.has(name)) addKey(cantons, name, code);
    for (const a of CANTON_ALIASES[code] || []) addKey(cantons, a, code);
  }
  const regions = new Map();
  REGIONS.forEach((r, i) => r.keys.forEach((k) => addKey(regions, k, i)));

  // single phrase tables
  const typeKeys = new Map();
  TYPE_PHRASES.forEach((t, i) => t.keys.forEach((k) => addKey(typeKeys, k, i)));
  const formMap = new Map();
  FORMS.forEach((f, i) => f.keys.forEach((k) => addKey(formMap, k, i)));
  const roleMap = new Map();
  ROLES.forEach((r, i) => r.keys.forEach((k) => addKey(roleMap, k, i)));
  const daypartMap = new Map();
  DAYPARTS.forEach((d, i) => d.keys.forEach((k) => addKey(daypartMap, k, i)));
  const periodMap = new Map();
  PERIODS.forEach((p, i) => p.keys.forEach((k) => addKey(periodMap, k, i)));

  // fuzzy vocabulary: single words ≥ 5 letters -> what they stand for
  const fuzzy = new Map();
  const addFuzzy = (word, entry) => {
    if (word.length < 5 || word.includes(' ') || STOP.has(word)) return;
    if (!fuzzy.has(word)) fuzzy.set(word, entry);
  };
  for (const [k, ids] of composers) addFuzzy(k, { kind: 'composer', ids: [...ids] });
  for (const [k, ids] of works) addFuzzy(k, { kind: 'work', ids: [...ids] });
  for (const [k, ids] of cities) addFuzzy(k, { kind: 'city', ids: [...ids] });
  for (const [k, codes] of cantons) addFuzzy(k, { kind: 'canton', ids: [...codes] });
  for (const [k, idx] of typeKeys) addFuzzy(k, { kind: 'type', ids: [...idx] });
  for (const [k, idx] of formMap) addFuzzy(k, { kind: 'form', ids: [...idx] });

  return {
    composers, composerKeys: sortedKeys(composers),
    works, workKeys: sortedKeys(works), missing, missingKeys: sortedKeys(missing), catalogs,
    cities, cityKeys: sortedKeys(cities), cantons, cantonKeys: sortedKeys(cantons), regions, regionKeys: sortedKeys(regions),
    typeKeys, typeKeyList: sortedKeys(typeKeys), formMap, formKeys: sortedKeys(formMap), roleMap, roleKeys: sortedKeys(roleMap),
    daypartMap, daypartKeys: sortedKeys(daypartMap), periodMap, periodKeys: sortedKeys(periodMap), fuzzy,
  };
}
const S = () => STATIC || (STATIC = buildStatic());

// Venues and performers change with the listings (daily feed, imports), so they are indexed per question.
function dynamicIndex() {
  const venues = new Map();
  for (const v of repo.allVenues()) addKey(venues, v.name, v.id);
  for (const [id, keys] of Object.entries(VENUE_ALIASES)) {
    if (!repo.venue(id)) continue;
    for (const k of keys) addKey(venues, k, id);
  }
  const artistFull = new Map();
  const artistParts = new Map();
  for (const a of repo.allArtists()) {
    const full = prep(a.name);
    if (full.length >= 4) addKey(artistFull, full, a.id);
    const words = full.split(' ');
    if (a.kind === 'ensemble') {
      for (const w of words) if (w.length >= 4 && !ENSEMBLE_GENERIC.has(w) && !STOP.has(w)) addKey(artistParts, w, a.id);
    } else if (words.length > 1) {
      const last = words[words.length - 1];
      if (last.length >= 4 && !STOP.has(last)) addKey(artistParts, last, a.id);
    }
  }
  return {
    venues, venueKeys: sortedKeys(venues),
    artistFull, artistFullKeys: sortedKeys(artistFull),
    artistParts, artistPartKeys: sortedKeys(artistParts),
  };
}

// ---------- dates ----------
// Every date range carries an English `label` and a Chinese `zh` label for the replies.
function dayLabel(day, today) {
  if (day === today) return 'today';
  if (day === addDays(today, 1)) return 'tomorrow';
  if (day === addDays(today, -1)) return 'yesterday';
  return `on ${relDayLabel(day, today)}`;
}
// "今天" / "明天" / "10月30日 周五" (relDayLabel follows the interface language)
function dayLabelZh(day, today) {
  if (day === today) return '今天';
  if (day === addDays(today, 1)) return '明天';
  if (day === addDays(today, -1)) return '昨天';
  return relDayLabel(day, today);
}
const WD_ZH = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const SEASON_ZH = { spring: '春天', summer: '夏天', autumn: '秋天', winter: '冬天' };

function monthRange(m0, year, mod, prepWord, today) {
  const ty = yearOf(today);
  const tm = Number(today.slice(5, 7)) - 1;
  let y = year || (m0 < tm ? ty + 1 : ty);
  const span = (yy) => {
    const last = daysIn(yy, m0);
    let a = 1;
    let b = last;
    if (mod === 'early') b = 10;
    else if (mod === 'mid') { a = 11; b = 20; }
    else if (mod === 'late') a = 21;
    return [ymd(yy, m0, a), ymd(yy, m0, b)];
  };
  let [from, to] = span(y);
  if (!year && to < today) { y += 1; [from, to] = span(y); }
  const name = `${MONTH_NAMES[m0]}${y !== ty ? ` ${y}` : ''}`;
  const zhName = `${y !== ty ? `${y}年` : ''}${m0 + 1}月`;
  const modLabel = mod === 'mid' ? `mid-${name}` : mod ? `${mod} ${name}` : name;
  const modZh = `${zhName}${{ early: '上旬', mid: '中旬', late: '下旬' }[mod] || ''}`;
  if (prepWord === 'until' || prepWord === 'till' || prepWord === 'through' || prepWord === 'by') return { from: today, to: ymd(y, m0, daysIn(y, m0)), label: `until the end of ${name}`, zh: `${zhName}底前` };
  if (prepWord === 'before') return { from: today, to: addDays(ymd(y, m0, 1), -1), label: `before ${name}`, zh: `${zhName}之前` };
  if (prepWord === 'after' || prepWord === 'from') return { from: prepWord === 'after' ? addDays(ymd(y, m0, daysIn(y, m0)), 1) : ymd(y, m0, 1), to: null, label: `${prepWord} ${name}`, zh: prepWord === 'after' ? `${zhName}之后` : `${zhName}起` };
  return { from, to, label: `in ${modLabel}`, zh: modZh, past: !!year && to < today };
}

function easterSunday(y) {
  const a = y % 19; const b = Math.floor(y / 100); const c = y % 100; const d = Math.floor(b / 4); const e = b % 4;
  const f = Math.floor((b + 8) / 25); const g = Math.floor((b - f + 1) / 3); const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4); const k = c % 4; const l = (32 + 2 * e + 2 * i - h - k) % 7; const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); const day = ((h + l - 7 * m + 114) % 31) + 1;
  return ymd(y, month - 1, day);
}

// Picks the first date expression and removes it from ctx.rest.
function parseDate(ctx) {
  const T = ctx.today;
  const ty = yearOf(T);
  const tm = Number(T.slice(5, 7)) - 1;
  const td = Number(T.slice(8, 10));
  const wdT = weekdayOf(T);
  const single = (day, part = null) => ({ from: day, to: day, label: dayLabel(day, T), zh: dayLabelZh(day, T), past: day < T, part });
  const valid = (y, m0, d) => m0 >= 0 && m0 < 12 && d >= 1 && d <= daysIn(y, m0);
  const futureDay = (m0, d, year) => {
    let y = year || ty;
    if (!year && ymd(y, m0, d) < T) y += 1;
    return valid(y, m0, d) ? ymd(y, m0, d) : null;
  };
  let m;

  // numeric dates: 2026-11-14 · 14.11. · 14.11.2026 · 14/11
  m = ctx.raw.match(/\b(20\d\d)-(\d{1,2})-(\d{1,2})\b/);
  if (m && valid(+m[1], +m[2] - 1, +m[3]) && takeRe(ctx, new RegExp(` ${m[1]} ${m[2]} ${m[3]} `))) {
    return single(ymd(+m[1], +m[2] - 1, +m[3]));
  }
  // Swiss "14.11." / "14.11.2026" (second dot required) and "14/11"
  m = ctx.raw.match(/(?:^|[^\d.])(\d{1,2})\.(\d{1,2})\.(\d{2,4})?(?!\d)/) || ctx.raw.match(/(?:^|[^\d/])(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?(?![\d/])/);
  if (m && +m[2] >= 1 && +m[2] <= 12 && +m[1] >= 1 && +m[1] <= 31) {
    const year = m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : null;
    const day = futureDay(+m[2] - 1, +m[1], year);
    if (day && takeRe(ctx, new RegExp(` ${m[1]} ${m[2]}${m[3] ? ` ${m[3]}` : ''} `))) return single(day);
  }
  // 14 November · 14th of Nov 2026 · November 14 · Nov 14th
  m = ctx.rest.match(new RegExp(` (?:on )?(?:the )?(\\d{1,2})(?:st|nd|rd|th)? (?:of )?(${MONTH_RE})(?: (20\\d\\d))? `));
  if (m) {
    const day = futureDay(MONTH_WORDS[m[2]], +m[1], m[3] ? +m[3] : null);
    if (day) { takeRe(ctx, new RegExp(esc(m[0]))); return single(day); }
  }
  m = ctx.rest.match(new RegExp(` (?:on )?(${MONTH_RE}) (\\d{1,2})(?:st|nd|rd|th)?(?: (20\\d\\d))? `));
  if (m) {
    const day = futureDay(MONTH_WORDS[m[1]], +m[2], m[3] ? +m[3] : null);
    if (day) { takeRe(ctx, new RegExp(esc(m[0]))); return single(day); }
  }
  // on the 14th
  m = ctx.rest.match(new RegExp(` (?:on )?the (\\d{1,2})(?:st|nd|rd|th) (?!(?:${NUM_FORM_RE}|movement|century|time|row|edition|anniversary|variation)\\b)`));
  if (m) {
    const d = +m[1];
    let y = ty;
    let mo = tm;
    if (d < td) { mo += 1; if (mo > 11) { mo = 0; y += 1; } }
    if (valid(y, mo, d)) { takeRe(ctx, new RegExp(esc(m[0]))); return single(ymd(y, mo, d)); }
  }

  // relative days
  if (takeRe(ctx, / (?:the )?day after tomorrow /)) return single(addDays(T, 2));
  if ((m = takeRe(ctx, / (tonight|this evening|this afternoon|this morning|today)(?: (night|evening))? /))) {
    const w = m[1];
    const part = w === 'tonight' || w === 'this evening' || m[2] ? 'evening' : w === 'this afternoon' ? 'afternoon' : w === 'this morning' ? 'morning' : null;
    return {
      ...single(T, part),
      label: w === 'tonight' || w === 'this evening' ? 'tonight' : w === 'today' ? 'today' : w,
      zh: { tonight: '今晚', 'this evening': '今晚', 'this afternoon': '今天下午', 'this morning': '今天上午' }[w] || '今天',
    };
  }
  if ((m = takeRe(ctx, / tomorrow(?: (night|evening|afternoon|morning))? /))) {
    const part = m[1] === 'night' ? 'evening' : m[1] || null;
    return { ...single(addDays(T, 1), part), label: m[1] ? `tomorrow ${m[1]}` : 'tomorrow', zh: `明天${{ night: '晚上', evening: '晚上', afternoon: '下午', morning: '上午' }[m[1]] || ''}` };
  }
  if (takeRe(ctx, / yesterday /)) return single(addDays(T, -1));

  // weekends, weeks, months
  if ((m = takeRe(ctx, / (?:(this|next|last|the|coming) )?weekend /))) {
    const sat = wdT === 0 ? addDays(T, -1) : addDays(T, 6 - wdT);
    if (m[1] === 'last') {
      const lastSat = addDays(T, -(wdT === 6 ? 7 : wdT === 0 ? 8 : wdT + 1));
      return { from: lastSat, to: addDays(lastSat, 1), label: 'last weekend', zh: '上周末', past: true };
    }
    if (m[1] === 'next') return { from: addDays(sat, 7), to: addDays(sat, 8), label: 'next weekend', zh: '下周末' };
    return { from: maxKey(sat, T), to: addDays(sat, 1), label: 'this weekend', zh: '本周末' };
  }
  const monday = addDays(T, -((wdT + 6) % 7));
  if ((m = takeRe(ctx, / (this|next|last|coming) week /))) {
    if (m[1] === 'next') return { from: addDays(monday, 7), to: addDays(monday, 13), label: 'next week', zh: '下周' };
    if (m[1] === 'last') return { from: addDays(monday, -7), to: addDays(monday, -1), label: 'last week', zh: '上周', past: true };
    return { from: T, to: addDays(monday, 6), label: 'this week', zh: '本周' };
  }
  if ((m = takeRe(ctx, / (this|next|last|coming) month /))) {
    if (m[1] === 'next' || m[1] === 'coming') {
      const y = tm === 11 ? ty + 1 : ty;
      const mo = (tm + 1) % 12;
      return { from: ymd(y, mo, 1), to: ymd(y, mo, daysIn(y, mo)), label: 'next month', zh: '下个月' };
    }
    if (m[1] === 'last') {
      const y = tm === 0 ? ty - 1 : ty;
      const mo = (tm + 11) % 12;
      return { from: ymd(y, mo, 1), to: ymd(y, mo, daysIn(y, mo)), label: 'last month', zh: '上个月', past: true };
    }
    return { from: T, to: ymd(ty, tm, daysIn(ty, tm)), label: 'this month', zh: '本月' };
  }
  const NUMW = Object.keys(NUMWORDS).join('|');
  if ((m = takeRe(ctx, new RegExp(` (?:in |over |within |during |for )?(?:the )?(?:next|coming|following) (?:(\\d{1,2}|${NUMW}) )?(?:of )?(days?|weeks?) `)))) {
    const n = m[1] ? (NUMWORDS[m[1]] || +m[1]) : m[2].startsWith('week') ? 1 : 7;
    const span = m[2].startsWith('week') ? n * 7 : n;
    return { from: T, to: addDays(T, Math.max(1, span) - 1), label: `in the next ${span === 7 && m[2].startsWith('week') && n === 1 ? 'week' : `${span} days`}`, zh: `未来 ${span} 天` };
  }
  if ((m = takeRe(ctx, new RegExp(` within (?:a |one |(\\d{1,2}|${NUMW}) )?(days?|weeks?) `)))) {
    const n = m[1] ? (NUMWORDS[m[1]] || +m[1]) : 1;
    const span = m[2].startsWith('week') ? n * 7 : n;
    return { from: T, to: addDays(T, span - 1), label: `in the next ${span} days`, zh: `未来 ${span} 天` };
  }

  // weekdays: on Friday, next Saturday, Friday night, Sundays (recurring)
  m = ctx.rest.match(new RegExp(` (?:(this|next|on|coming|every) )?(${WD_RE})(s)?(?: (night|evening|afternoon|morning))? `));
  if (m) {
    takeRe(ctx, new RegExp(esc(m[0])));
    const wd = WD_WORDS[m[2]];
    const part = m[4] === 'night' ? 'evening' : m[4] || null;
    if (m[3] || m[1] === 'every') return { from: T, to: null, weekday: wd, label: `on ${WD_LONG[wd]}s`, zh: `每${WD_ZH[wd]}`, part };
    let diff = (wd - wdT + 7) % 7;
    if (m[1] === 'next' && diff === 0) diff = 7;
    return single(addDays(T, diff), part);
  }

  // months: in November, late October, early December 2026, until March
  const monthRe = new RegExp(` (?:(early|late|mid|end of|the end of|beginning of|the beginning of|start of|the start of|middle of|the middle of) )?(?:(in|during|for|this|next|of|until|till|through|before|by|after|from) )?(?:(early|late|mid) )?(${MONTH_RE})(?: (20\\d\\d))? `, 'g');
  let mm;
  while ((mm = monthRe.exec(ctx.rest))) {
    const word = mm[4];
    const hasContext = mm[1] || mm[2] || mm[3] || mm[5];
    if (AMBIG_MONTH.has(word) && !hasContext) { monthRe.lastIndex = mm.index + 1; continue; }
    const modRaw = mm[1] || mm[3] || '';
    const mod = /early|beginning|start/.test(modRaw) ? 'early' : /mid|middle/.test(modRaw) ? 'mid' : /late|end/.test(modRaw) ? 'late' : null;
    ctx.rest = `${ctx.rest.slice(0, mm.index)} | ${ctx.rest.slice(mm.index + mm[0].length)}`;
    return monthRange(MONTH_WORDS[word], mm[5] ? +mm[5] : null, mod, mm[2], T);
  }

  // holidays and seasons
  if (takeRe(ctx, / (?:new years? eve|new year|new years|silvester|sylvester|nye|nouvel an) /)) {
    const y = T > ymd(ty, 0, 2) ? ty : ty - 1;
    return { from: ymd(y, 11, 30), to: ymd(y + 1, 0, 2), label: 'around New Year', zh: '新年前后' };
  }
  if (takeRe(ctx, / (?:christmas|xmas|weihnachten|noel)(?: eve| day| time| season| holidays)? /)) {
    const y = T > ymd(ty, 11, 26) ? ty + 1 : ty;
    return { from: maxKey(ymd(y, 11, 18), T), to: ymd(y, 11, 26), label: 'around Christmas', zh: '圣诞节前后' };
  }
  if (takeRe(ctx, / (?:advent|adventszeit) /)) {
    const y = T > ymd(ty, 11, 24) ? ty + 1 : ty;
    return { from: maxKey(ymd(y, 10, 27), T), to: ymd(y, 11, 24), label: 'during Advent', zh: '将临期' };
  }
  if (takeRe(ctx, / (?:easter|ostern|paques) /)) {
    let e = easterSunday(ty);
    if (addDays(e, 1) < T) e = easterSunday(ty + 1);
    return { from: maxKey(addDays(e, -3), T), to: addDays(e, 1), label: 'over Easter', zh: '复活节期间' };
  }
  if ((m = takeRe(ctx, / (?:(this|next|in the|in) )?(winter|spring|summer|autumn|fall) /))) {
    if (m[2] === 'fall' && !m[1]) { /* "fall" on its own is just a word */ }
    else {
      const season = m[2] === 'fall' ? 'autumn' : m[2];
      const starts = { spring: 2, summer: 5, autumn: 8, winter: 11 };
      const s0 = starts[season];
      let y = ty;
      let from = ymd(y, s0, 1);
      const endOf = (yy) => (season === 'winter' ? ymd(yy + 1, 1, daysIn(yy + 1, 1)) : ymd(yy, s0 + 2, daysIn(yy, s0 + 2)));
      let to = endOf(y);
      if (season === 'winter' && tm <= 1) { y -= 1; from = ymd(y, 11, 1); to = endOf(y); }
      if (to < T || (m[1] === 'next' && from <= T)) { y += 1; from = ymd(y, s0, 1); to = endOf(y); }
      return { from: maxKey(from, T), to, label: `${m[1] === 'next' ? 'next' : 'this'} ${season}`, zh: `${m[1] === 'next' ? '明年' : '今年'}${SEASON_ZH[season]}` };
    }
  }
  return null;
}

// ---------- parsing ----------
function takeFromList(ctx, keys, map, onHit) {
  for (const k of keys) if (take(ctx, k)) onHit(map.get(k), k);
}

export function parse(text, { today = todayKey() } = {}) {
  const st = S();
  const dyn = dynamicIndex();
  const raw = String(text || '').trim();
  const q = pad(prep(raw));
  const ctx = { raw, today, q, rest: q };
  const p = {
    raw, q, today,
    date: null, part: null, weekday: null,
    venueIds: [], cityIds: [], placeLabel: '', placeZh: '', regionLabel: '', near: false,
    composerIds: [], ambiguousComposer: false, nation: null, period: null,
    works: [], missing: [], forms: [], types: [], roles: [], artists: [],
    featured: RE_FEATURED.test(q), performer: null, unknown: [], unknownRaw: '', corrections: [], unknownPlace: null,
    cues: { recording: RE_RECORDING.test(q), live: RE_LIVE.test(q), tempo: RE_TEMPO.test(q) },
  };
  const addAll = (arr, values) => { for (const v of values) if (!arr.includes(v)) arr.push(v); };

  // 1. performers by full name, venues
  takeFromList(ctx, dyn.artistFullKeys, dyn.artistFull, (ids) => addAll(p.artists, ids));
  takeFromList(ctx, dyn.venueKeys, dyn.venues, (ids) => addAll(p.venueIds, ids));

  // 2. works: catalogue numbers, missing works, titles and nicknames
  const catRe = / (bwv|hwv|k|d|op|opp|hob|sz|wwv|s) ((?:[ivxl]+ )?\d{1,4}(?: no \d{1,2})?) /;
  let cm;
  while ((cm = takeRe(ctx, catRe))) {
    const ref = `${cm[1]} ${cm[2]}`;
    const num = cm[2].split(' ')[0];
    const hits = st.catalogs.filter(({ key }) =>
      key === ref || key.startsWith(`${ref} `) ||
      (cm[1] === 'op' && key.startsWith('opp ') && key.split(' ').includes(num)) ||
      (cm[1] === 'op' && key.startsWith('op ') && key.split(' ')[1] === num && !cm[2].includes(' no ')));
    addAll(p.works, uniq(hits.map((h) => h.w.id)));
  }
  takeFromList(ctx, st.missingKeys, st.missing, (idx) => { for (const i of idx) if (!p.missing.includes(MISSING[i])) p.missing.push(MISSING[i]); });
  takeFromList(ctx, st.workKeys, st.works, (ids) => addAll(p.works, ids));

  // 3. dates and parts of the day
  p.date = parseDate(ctx);
  if (p.date?.part) p.part = p.date.part;
  if (p.date?.weekday != null) p.weekday = p.date.weekday;
  for (const k of st.daypartKeys) {
    if (take(ctx, k) && !p.part) p.part = DAYPARTS[[...st.daypartMap.get(k)][0]].id;
  }

  // 4. composers (found first, consumed after the numbered-work patterns)
  const found = [];
  let scan = ctx.rest;
  for (const k of st.composerKeys) {
    if (scan.includes(pad(k))) {
      found.push(k);
      while (scan.includes(pad(k))) scan = scan.replace(pad(k), ' | ');
    }
  }
  if (/p(?:ä|ae)rt\b/i.test(raw) && !found.includes('arvo part')) { addAll(p.composerIds, ['part']); take(ctx, 'part'); }
  for (const k of found) {
    const ids = [...st.composers.get(k)];
    if (ids.length > 1) p.ambiguousComposer = true;
    addAll(p.composerIds, ids);
  }
  // numbered works: "Mahler 2", "Beethoven's ninth", "Brahms symphony no 4", "the second piano concerto"
  const numbered = (n, form, compIds) => {
    const pool = compIds.length ? repo.allWorks().filter((w) => compIds.includes(w.composerId)) : repo.allWorks();
    const re = new RegExp(`\\bNo\\. ?${n}\\b`);
    let hits = pool.filter((w) => re.test(w.title));
    if (form) {
      const f = /symphon|sinfonie/.test(form) ? /Symphony/ : new RegExp(form.replace(/ /g, ' '), 'i');
      hits = hits.filter((w) => f.test(w.title));
    } else if (hits.length > 1) {
      const sym = hits.filter((w) => w.genre === 'symphony');
      if (sym.length) hits = sym;
    }
    if (hits.length) { addAll(p.works, hits.map((w) => w.id)); return true; }
    if (compIds.length === 1 && n <= 15) {
      const formCap = form ? (/symphon|sinfonie/.test(form) ? 'Symphony' : form.split(' ').map(cap1).join(' ')) : 'Symphony';
      const known = MISSING.find((x) => x.composerId === compIds[0] && x.title.startsWith(`${formCap} No. ${n} `));
      const comp = repo.composer(compIds[0]);
      const miss = known || { composerId: compIds[0], title: `${formCap} No. ${n}`, term: `${comp?.short || ''} ${formCap} No. ${n}`.trim(), synthetic: true };
      if (!p.missing.includes(miss)) p.missing.push(miss);
      return true;
    }
    return false;
  };
  const toNum = (s) => ORDINALS[s] || Number(s);
  for (const k of found) {
    const ids = [...st.composers.get(k)];
    const re = new RegExp(` ${esc(k)} (?:(${NUM_FORM_RE}) )?(?:no )?(\\d{1,3}|${ORD_RE})(?:st|nd|rd|th)?(?: (${NUM_FORM_RE}))? `);
    let m;
    while ((m = ctx.rest.match(re))) {
      const n = toNum(m[2]);
      if (!n || n > 110) break;
      const form = m[1] || m[3] || null;
      if (!numbered(n, form, ids)) break;
      ctx.rest = `${ctx.rest.slice(0, m.index)} | ${ctx.rest.slice(m.index + m[0].length)}`;
    }
  }
  const formNumRe = new RegExp(` (?:the )?(?:(${ORD_RE}|\\d{1,3}(?:st|nd|rd|th)) (${NUM_FORM_RE})|(${NUM_FORM_RE}) (?:no )?(\\d{1,3})) `);
  let fm;
  while ((fm = ctx.rest.match(formNumRe))) {
    const ordWord = fm[1] || '';
    const n = fm[1] ? toNum(/^\d/.test(ordWord) ? ordWord.replace(/\D+$/, '') : ordWord) : Number(fm[4]);
    const form = fm[2] || fm[3];
    const ok = !!n && n <= 110 && numbered(n, form, p.composerIds);
    if (!ok && !p.composerIds.length) break;
    ctx.rest = `${ctx.rest.slice(0, fm.index)} | ${ctx.rest.slice(fm.index + fm[0].length)}`;
  }
  for (const k of found) take(ctx, k);

  // 5. composer groups: "the Swiss composer", "French music", "Baroque"
  const natRe = / (?:(?:that|the|a|an|any|some) )?(swiss|french|german|austrian|italian|russian|czech|norwegian|finnish|hungarian|polish|estonian|english|british|american) (composers?|music|works?|pieces?|repertoire|masters?) /;
  const natM = takeRe(ctx, natRe) || (() => {
    const m2 = takeRe(ctx, / (composers?) from (switzerland|france|germany|austria|italy|russia|norway|finland|hungary|poland|estonia|england) /);
    return m2 ? [m2[0], COUNTRY_WORDS[m2[2]], m2[1]] : null;
  })();
  if (natM) {
    const [country, adj] = NATIONS[natM[1]];
    const ids = repo.allComposers().filter((c) => (c.country || '').includes(country)).map((c) => c.id);
    p.nation = { adj, zh: NATIONS_ZH[natM[1]] || adj, singular: natM[2] === 'composer', ids, label: `${adj} composers` };
    addAll(p.composerIds, ids);
  }
  takeFromList(ctx, st.periodKeys, st.periodMap, (idx) => {
    const per = PERIODS[[...idx][0]];
    const ids = repo.allComposers().filter(per.test).map((c) => c.id);
    p.period = { label: per.label, zh: per.zh, ids };
    addAll(p.composerIds, ids);
  });

  // 6. places
  p.near = RE_NEAR.test(ctx.rest);
  const placeLabels = [];
  const placeZh = [];
  takeFromList(ctx, st.regionKeys, st.regions, (idx) => {
    const r = REGIONS[[...idx][0]];
    addAll(p.cityIds, repo.allCities().filter((c) => r.cantons.includes(c.canton)).map((c) => c.id));
    placeLabels.push(r.label);
    placeZh.push(r.zh);
  });
  takeFromList(ctx, st.cityKeys, st.cities, (ids) => {
    addAll(p.cityIds, ids);
    placeLabels.push(...[...ids].map((id) => repo.city(id)?.name).filter(Boolean));
    placeZh.push(...[...ids].map((id) => repo.city(id)).filter(Boolean).map((c) => zhCity(c)));
  });
  takeFromList(ctx, st.cantonKeys, st.cantons, (codes) => {
    for (const code of codes) {
      addAll(p.cityIds, repo.allCities().filter((c) => c.canton === code).map((c) => c.id));
      placeLabels.push(`the canton of ${repo.cantonName(code)}`);
      placeZh.push(zhCanton(code));
    }
  });
  if (p.near && p.cityIds.length === 1) {
    const c0 = repo.city(p.cityIds[0]);
    if (c0?.lat) {
      const near = repo.allCities().filter((c) => c.lat && kmBetween(c0, c) <= 25).map((c) => c.id);
      addAll(p.cityIds, near);
      placeLabels.splice(0, placeLabels.length, `near ${c0.name}`);
      placeZh.splice(0, placeZh.length, `${zhCity(c0)}附近`);
    }
  }
  p.placeLabel = uniq(placeLabels).join(' or ');
  p.placeZh = uniq(placeZh).join('或');

  // 7. types, forms, roles
  takeFromList(ctx, st.typeKeyList, st.typeKeys, (idx) => {
    const t = TYPE_PHRASES[[...idx][0]];
    if (!p.types.includes(t.type)) p.types.push(t.type);
    if (t.role) { const r = ROLES.find((x) => x.keys.includes(t.role)); if (r && !p.roles.includes(r)) p.roles.push(r); }
    if (t.form) { const f = FORMS.find((x) => x.id === t.form); if (f && !p.forms.includes(f)) p.forms.push(f); }
  });
  takeFromList(ctx, st.formKeys, st.formMap, (idx) => { const f = FORMS[[...idx][0]]; if (!p.forms.includes(f)) p.forms.push(f); });
  takeFromList(ctx, st.roleKeys, st.roleMap, (idx) => { const r = ROLES[[...idx][0]]; if (!p.roles.includes(r)) p.roles.push(r); });

  // 8. performers by surname / distinctive ensemble word
  takeFromList(ctx, dyn.artistPartKeys, dyn.artistParts, (ids) => addAll(p.artists, ids));

  // 9. what is left: fuzzy matches for typos, then unknown words
  let left = ctx.rest.split(' ').filter((t) => t && t !== '|' && !STOP.has(t) && !/^\d+(st|nd|rd|th)?$/.test(t) && !(t in NUMWORDS) && !(t in ORDINALS));
  const fuzzyVocab = [...st.fuzzy.entries(), ...[...dyn.artistParts.entries()].filter(([k]) => k.length >= 5).map(([k, ids]) => [k, { kind: 'artist', ids: [...ids] }])];
  const still = [];
  for (const t of left) {
    if (t.length < 5) { still.push(t); continue; }
    const max = t.length >= 8 ? 2 : 1;
    let best = null;
    let bestD = max + 1;
    let tie = false;
    const sig = (e) => `${e.kind}:${e.ids.join(',')}`;
    for (const [word, entry] of fuzzyVocab) {
      const d = distance(t, word, max);
      if (d < bestD) { best = [word, entry]; bestD = d; tie = false; } else if (d === bestD && best && sig(best[1]) !== sig(entry)) tie = true;
    }
    if (!best || bestD > max || tie) { still.push(t); continue; }
    const [word, entry] = best;
    if (entry.kind === 'composer') addAll(p.composerIds, entry.ids);
    else if (entry.kind === 'work') addAll(p.works, entry.ids);
    else if (entry.kind === 'city') addAll(p.cityIds, entry.ids);
    else if (entry.kind === 'canton') addAll(p.cityIds, repo.allCities().filter((c) => entry.ids.includes(c.canton)).map((c) => c.id));
    else if (entry.kind === 'type') { const ty = TYPE_PHRASES[entry.ids[0]].type; if (!p.types.includes(ty)) p.types.push(ty); }
    else if (entry.kind === 'form') { const f = FORMS[entry.ids[0]]; if (!p.forms.includes(f)) p.forms.push(f); }
    else if (entry.kind === 'artist') addAll(p.artists, entry.ids);
    p.corrections.push([t, displayOf(entry, word), displayZh(entry, word)]);
    if ((entry.kind === 'city' || entry.kind === 'canton') && !p.placeLabel) {
      p.placeLabel = displayOf(entry, word);
      p.placeZh = displayZh(entry, word);
    }
  }
  p.unknown = still;

  // performer for recordings: "Abbado's …", "… by Gould", "… conducted by Karajan"
  const isComposerWord = (w) => st.composers.has(prep(w));
  const isKnownWord = (w) => st.composers.has(w) || st.cities.has(w) || STOP.has(w) || dyn.venues.has(w);
  const poss = [...raw.matchAll(/(?:^|\s)([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ.-]+(?:\s[A-ZÀ-Ý][A-Za-zÀ-ÿ.-]+)?)['’]s?(?=\s|$)/g)]
    .map((x) => x[1]).filter((w) => !isComposerWord(w) && !STOP.has(prep(w)) && !st.cities.has(prep(w)));
  const by = raw.match(/\b(?:by|with|conducted by|played by|sung by|from)\s+([A-ZÀ-Ý][A-Za-zÀ-ÿ.-]+(?:\s[A-ZÀ-Ý][A-Za-zÀ-ÿ.-]+)?)/);
  let performer = poss[0] || (by && !isComposerWord(by[1]) && !st.cities.has(prep(by[1])) ? by[1] : null);
  if (performer) {
    const pk = prep(performer);
    const pw = pk.split(' ');
    // composers, places and performers already in Klang's listings are not "recording artists"
    if (pw.every(isKnownWord) || dyn.artistFull.has(pk) || pw.some((w) => dyn.artistParts.has(w))) performer = null;
  }
  if (performer) {
    const pw = new Set(prep(performer).split(' '));
    p.performer = performer;
    p.unknown = p.unknown.filter((t) => !pw.has(t));
  }
  // what the unknown words looked like in the original text ("Kavakos", "Shanghai")
  if (p.unknown.length) {
    const set = new Set(p.unknown);
    const words = raw.split(/[\s,;:!?]+/).filter((w) => w && set.has(prep(w)));
    p.unknownRaw = words.join(' ') || p.unknown.join(' ');
    const placeM = [...raw.matchAll(/\b(?:in|near|around|at)\s+([A-ZÀ-Ý][A-Za-zÀ-ÿ-]+)/g)].find((x) => set.has(prep(x[1])));
    if (placeM) p.unknownPlace = placeM[1];
  }

  // forms + composers: "Brahms violin concerto" -> that work
  if (p.forms.length && p.composerIds.length && !p.nation && !p.period) {
    const hits = repo.allWorks().filter((w) => p.composerIds.includes(w.composerId) && p.forms.some((f) => f.test(w)));
    if (hits.length) { addAll(p.works, hits.map((w) => w.id)); p.forms = []; }
    else p.formMiss = p.forms.map((f) => f.label);
  }
  // keep works consistent with named composers when both are given
  if (p.works.length && p.composerIds.length && !p.nation && !p.period) {
    const consistent = p.works.filter((id) => p.composerIds.includes(repo.work(id)?.composerId));
    if (consistent.length) p.works = consistent;
  }
  return p;
}

// Names in Chinese (cities, cantons, composers; venues, works and performers stay as published).
const zhCity = (c) => (c ? cityName(c) : '');
const zhCanton = (code) => zhCantonName(code, repo.cantonName(code));

function displayZh(entry, word) {
  if (entry.kind === 'composer') return repo.composer(entry.ids[0]) ? zhComposerName(repo.composer(entry.ids[0])) : word;
  if (entry.kind === 'work') return repo.work(entry.ids[0]) ? `《${repo.work(entry.ids[0]).title}》` : word;
  if (entry.kind === 'city') return repo.city(entry.ids[0]) ? zhCity(repo.city(entry.ids[0])) : word;
  if (entry.kind === 'canton') return zhCanton(entry.ids[0]);
  if (entry.kind === 'type') return typeLabel(TYPE_PHRASES[entry.ids[0]].type, word);
  if (entry.kind === 'form') return FORMS[entry.ids[0]].zh;
  return displayOf(entry, word);
}

function displayOf(entry, word) {
  if (entry.kind === 'composer') return repo.composer(entry.ids[0])?.name || word;
  if (entry.kind === 'work') return repo.work(entry.ids[0])?.title || word;
  if (entry.kind === 'city') return repo.city(entry.ids[0])?.name || word;
  if (entry.kind === 'canton') return repo.cantonName(entry.ids[0]);
  if (entry.kind === 'artist') return repo.artist(entry.ids[0])?.name || word;
  if (entry.kind === 'type') return TYPE_LABELS[TYPE_PHRASES[entry.ids[0]].type] || word;
  if (entry.kind === 'form') return FORMS[entry.ids[0]].label;
  return word;
}

function kmBetween(a, b) {
  const R = 6371;
  const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// ---------- concert search ----------
const venueName = (c) => repo.venue(c.venueId)?.name || c.venueName || 'a venue to be announced';
function whenWhere(c, today) {
  const rel = relDayLabel(c.day, today);
  const d = rel === 'Today' || rel === 'Tomorrow' ? rel.toLowerCase() : rel;
  return `${d}, ${timeOf(c.start)} at ${venueName(c)}`;
}
const composerOf = (pr) => pr.composerId || (pr.workId ? repo.work(pr.workId)?.composerId : null);

function explainedComposers(p) {
  const fromWorks = new Set(p.works.map((id) => repo.work(id)?.composerId));
  return p.composerIds.filter((id) => !fromWorks.has(id) || p.nation || p.period);
}

function findConcerts(p, relax = {}) {
  const T = p.today;
  const useDate = p.date && !relax.date;
  const past = useDate && p.date.past;
  const from = useDate ? (past ? p.date.from : maxKey(p.date.from, T)) : T;
  let to = useDate ? p.date.to : null;
  if (past && (!to || to >= T)) to = addDays(T, -1);
  const usePlace = !relax.place;
  const cityIds = usePlace && !p.venueIds.length ? p.cityIds : [];
  const types = relax.types ? [] : p.types;
  let list = repo.query({ from, to, cityIds, types });
  if (usePlace && p.venueIds.length) list = list.filter((c) => p.venueIds.includes(c.venueId));

  const wIds = new Set(p.works);
  const cIds = new Set(explainedComposers(p));
  for (const m of p.missing) if (m.composerId) cIds.add(m.composerId);
  const formTests = relax.types ? [] : p.forms.map((f) => f.test);
  if (wIds.size || cIds.size || formTests.length) {
    list = list.filter((c) => (c.program || []).some((pr) => {
      if (pr.workId && wIds.has(pr.workId)) return true;
      if (cIds.has(composerOf(pr))) return true;
      const w = pr.workId ? repo.work(pr.workId) : null;
      return !!w && formTests.some((t) => t(w));
    }));
  }
  if (p.artists.length) list = list.filter((c) => (c.credits || []).some((cr) => p.artists.includes(cr.artistId)));
  if (p.roles.length && !relax.roles) {
    const roles = new Set(p.roles.flatMap((r) => r.roles));
    list = list.filter((c) => (c.credits || []).some((cr) => roles.has(cr.role)));
  }
  if (!relax.date) {
    if (p.part) { const dp = DAYPART_BY_ID[p.part]; list = list.filter((c) => dp.test(timeOf(c.start))); }
    if (p.weekday != null) list = list.filter((c) => weekdayOf(c.day) === p.weekday);
  }
  if (p.featured) list = list.filter((c) => c.featured);
  // several named things: concerts with more of them first, then by date
  if (wIds.size + cIds.size > 1 && !p.nation && !p.period) {
    const score = (c) => (c.program || []).filter((pr) => wIds.has(pr.workId) || cIds.has(composerOf(pr))).length;
    list = [...list].sort((a, b) => (score(b) > 1) - (score(a) > 1) || a.start.localeCompare(b.start));
  }
  return list;
}

// "with Mahler in Zurich in November"
function describe(p, relax = {}) {
  const parts = [];
  const subject = [];
  if (p.works.length) {
    const titles = p.works.slice(0, 3).map((id) => shortTitle(repo.work(id)));
    subject.push(listJoin(titles, 'or'));
  }
  const comps = explainedComposers(p);
  if (p.nation) subject.push(`music by ${p.nation.label}`);
  else if (p.period) subject.push(`${p.period.label} music`);
  else if (comps.length) subject.push(listJoin(comps.slice(0, 4).map((id) => repo.composer(id)?.short).filter(Boolean), 'or'));
  if (p.missing.length && !p.works.length && !comps.length) subject.push(listJoin(uniq(p.missing.map((m) => repo.composer(m.composerId)?.short || m.composerName)).filter(Boolean), 'or'));
  if (!relax.types) {
    const fl = p.forms.filter((f) => !f.noun).map((f) => f.label);
    if (fl.length) subject.push(listJoin(fl, 'or'));
  }
  if (p.artists.length) subject.push(listJoin(p.artists.slice(0, 3).map((id) => repo.artist(id)?.name).filter(Boolean), 'or'));
  if (p.roles.length && !relax.roles) subject.push(listJoin(p.roles.map((r) => r.label), 'or'));
  if (subject.length) parts.push(`with ${subject.join(' and ')}`);
  if (!relax.place) {
    if (p.venueIds.length) parts.push(`at ${venueGroupLabel(p.venueIds)}`);
    else if (p.placeLabel) parts.push(p.placeLabel.startsWith('near ') ? p.placeLabel : `in ${p.placeLabel}`);
  }
  if (!relax.date) {
    if (p.date) parts.push(p.date.label);
    const dpart = p.part && DAYPART_BY_ID[p.part];
    if (dpart && !(p.date && /tonight|night|evening|afternoon|morning/.test(p.date.label))) parts.push(dpart.label);
  }
  return parts.join(' ');
}

function venueGroupLabel(ids) {
  const names = uniq(ids.map((id) => (repo.venue(id)?.name || '').split(' – ')[0]).filter(Boolean));
  if (names.length <= 2) return listJoin(names, 'or');
  return `${names[0]} and ${names.length - 1} other venues`;
}

function nounFor(p, relax = {}) {
  const opera = !relax.types && p.forms.find((f) => f.noun);
  let n = opera ? opera.noun : p.types.length === 1 && !relax.types ? TYPE_NOUN[p.types[0]] : ['concert', 'concerts'];
  if (p.featured) n = n.map((x) => `featured ${x}`);
  return n;
}

function shortTitle(w) {
  if (!w) return '';
  const comp = repo.composer(w.composerId);
  const base = w.title.split(/[“”"(,:–]/)[0].trim();
  if (/^(Symphony|Piano Concerto|Violin Concerto|Cello Concerto|Clarinet|String Quartet|String Quintet|Piano Quintet|Piano Trio|Piano Sonata|Partita|Cello Suite|Brandenburg|Concerto|Octet|Requiem|Mass|Cantata|Four Ballades|24 Preludes|Préludes)/.test(base)) {
    let core = /^Mass/.test(base) ? base : base.replace(/ in [A-G](?:-flat|-sharp)? (?:major|minor).*$/, '').replace(/ for solo violin$/, '').trim();
    const nick = w.title.match(/“([^”]+)”/);
    if (!/No\./.test(core)) {
      // keep it identifiable: "Haydn String Quartet “Emperor”", "Mozart Clarinet Quintet K. 581"
      if (nick) core += ` “${nick[1]}”`;
      else if (w.catalog && !w.catalog.includes(',') && !/Requiem|Mass|Concerto for/.test(core)) core += ` ${w.catalog}`;
    }
    return `${comp?.short || ''} ${core}`.trim();
  }
  return base;
}

// ---------- Chinese replies ----------
// ZHO: this answer is in Chinese (set by answer()). Composer and city names are Chinese; venue
// names, performers and work titles stay as published (work titles in 《》).
let ZHO = false;
const HAN_LATIN = /([\u3400-\u9fff])([A-Za-zÀ-ž])/g;
const LATIN_HAN = /([A-Za-zÀ-ž.)])([\u3400-\u9fff])/g;
// A space between Chinese and Latin text ("在 Tonhalle Zürich 有"), none between Chinese characters or
// around Chinese punctuation; dates like "10月30日" stay tight.
// Dates keep their space before the weekday ("11月13日 周五").
const zfix = (str) => tidyZh(String(str).replace(/日 (周|星期)/g, '日\u0001$1').replace(HAN_LATIN, '$1 $2').replace(LATIN_HAN, '$1 $2'))
  .replace(/\s+/g, ' ').replace(/\u0001/g, ' ').trim();
const cShort = (c) => (c ? (ZHO ? zhComposerShort(c) : c.short) : '');
const cName = (c) => (c ? (ZHO ? zhComposerName(c) : c.name) : '');
const venueNameZh = (c) => repo.venue(c.venueId)?.name || c.venueName || '场馆待定';
function whenWhereZh(c, today) {
  return `${dayLabelZh(c.day, today)} ${timeOf(c.start)}，${venueNameZh(c)}`;
}
// "马勒《Symphony No. 2》" / "《Winterreise》"
function workZh(w) {
  if (!w) return '';
  const comp = repo.composer(w.composerId);
  const st = shortTitle(w);
  if (comp && st.startsWith(`${comp.short} `)) return `${zhComposerShort(comp)}《${st.slice(comp.short.length + 1)}》`;
  return `《${st}》`;
}
const workT = (w) => (ZHO ? workZh(w) : shortTitle(w));
const lifeZh = (c) => (c.died ? `${c.born}–${c.died}` : `生于 ${c.born} 年`);
const countryZh = (s) => (s || '').split(' / ').map((x) => countryName(x === 'England' ? 'United Kingdom' : x === 'USA' ? 'United States' : x)).join(' / ');

function venueGroupZh(ids) {
  const names = uniq(ids.map((id) => (repo.venue(id)?.name || '').split(' – ')[0]).filter(Boolean));
  if (names.length <= 2) return names.join('或');
  return `${names[0]}等 ${names.length} 个场馆`;
}
function zhWhen(p, relax = {}) {
  if (relax.date) return '其他日期';
  const dp = p.part && DAYPART_BY_ID[p.part];
  const parts = [p.date?.zh];
  if (dp && !(p.date && /今晚|晚上|下午|上午/.test(p.date.zh || ''))) parts.push(dp.zh);
  return parts.filter(Boolean).join('');
}
function zhScope(p, relax = {}) {
  const when = p.date || p.part || relax.date ? zhWhen(p, relax) : '';
  let place = '';
  if (relax.place) place = '瑞士其他地方';
  else if (p.venueIds.length) place = venueGroupZh(p.venueIds);
  else place = p.placeZh || '';
  return `${when}${place ? `在${place}` : ''}`;
}
// What the concerts have in common, as a verb phrase: "上演马勒作品" / "由 X 演出" / "有钢琴家参演".
function zhSubject(p, relax = {}) {
  const out = [];
  if (p.works.length) out.push(`上演${p.works.slice(0, 3).map((id) => workZh(repo.work(id))).join('或')}`);
  const comps = explainedComposers(p);
  if (p.nation) out.push(`上演${p.nation.zh}作曲家作品`);
  else if (p.period) out.push(`上演${p.period.zh}作品`);
  else if (comps.length) out.push(`上演${comps.slice(0, 4).map((id) => cShort(repo.composer(id))).filter(Boolean).join('或')}作品`);
  if (p.missing.length && !p.works.length && !comps.length) {
    const names = uniq(p.missing.map((m) => (repo.composer(m.composerId) ? cShort(repo.composer(m.composerId)) : m.composerName))).filter(Boolean);
    if (names.length) out.push(`上演${names.join('或')}作品`);
  }
  if (!relax.types) {
    const fl = p.forms.filter((f) => !f.noun).map((f) => f.zh);
    if (fl.length) out.push(`上演${fl.join('或')}`);
  }
  if (p.artists.length) out.push(`由${p.artists.slice(0, 3).map((id) => repo.artist(id)?.name).filter(Boolean).join('或')}演出`);
  if (p.roles.length && !relax.roles) out.push(`有${uniq(p.roles.map((r) => r.zh)).join('或')}参演`);
  return out.join('，');
}
function zhNoun(p, relax = {}) {
  const opera = !relax.types && p.forms.find((f) => f.noun);
  const n = opera ? '歌剧演出' : p.types.length === 1 && !relax.types ? TYPE_NOUN_ZH[p.types[0]] : '音乐会';
  return p.featured ? `精选${n}` : n;
}
// Follow-up prompts in Chinese (each one parses again through fromZh).
function subjectPromptZh(p) {
  if (p.works.length === 1) return workZh(repo.work(p.works[0]));
  const comps = explainedComposers(p);
  if (p.nation) return `${p.nation.zh}作曲家`;
  if (p.period) return `${p.period.zh}音乐`;
  if (comps.length === 1) return cShort(repo.composer(comps[0]));
  if (p.forms.length === 1) return p.forms[0].zh;
  if (p.types.length === 1) return TYPE_PROMPT_ZH[p.types[0]];
  if (p.roles.length === 1) return p.roles[0].zh;
  if (p.artists.length === 1) return repo.artist(p.artists[0])?.name || '音乐会';
  return '音乐会';
}
function placePromptZh(p) {
  if (p.venueIds.length) return venueGroupZh(p.venueIds);
  return p.placeZh || '';
}
function introNoteZh(p) {
  const bits = [];
  if (p.corrections.length) bits.push(`（把“${p.corrections[0][0]}”理解为${p.corrections[0][2] || p.corrections[0][1]}。）`);
  if (p.zhPlaces?.length) bits.push(`Klang 暂时只有瑞士的演出信息，所以忽略了“${uniq(p.zhPlaces).join('、')}”。`);
  else if (p.unknownPlace) bits.push(`Klang 暂时只有瑞士的演出信息，所以忽略了“${p.unknownPlace}”。`);
  else if (p.zhUnknown?.length) bits.push(`我不认识“${p.zhUnknown.join('、')}”，所以忽略了它。`);
  else if (p.unknownRaw && /[A-ZÀ-Ý]/.test(p.unknownRaw)) bits.push(`我不认识“${p.unknownRaw}”，所以忽略了它。`);
  if (p.missing.length && !p.works.length) {
    const m = p.missing[0];
    const comp = repo.composer(m.composerId);
    bits.push(`${comp ? `${cShort(comp)}的` : ''}《${m.title}》还不在 Klang 的曲目库中，所以我改为查找${comp ? cShort(comp) : '它的作曲家'}的作品。`);
  }
  return bits.join('');
}

// ---------- answers ----------
const concertItems = (list, n = MAX_ITEMS) => list.slice(0, n).map((c) => ({ kind: 'concert', id: c.id }));
function cleanPrompt(s) { return s.replace(/\s+/g, ' ').trim(); }
function addFollow(arr, s) {
  const t = cleanPrompt(s);
  if (t && !arr.some((x) => x.toLowerCase() === t.toLowerCase()) && arr.length < 4) arr.push(cap1(t));
}
function topCityOf(list, exclude = []) {
  const counts = new Map();
  for (const c of list) if (c.cityId && !exclude.includes(c.cityId)) counts.set(c.cityId, (counts.get(c.cityId) || 0) + 1);
  const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return best ? repo.city(best[0]) : null;
}

function subjectPrompt(p) {
  if (p.works.length === 1) return shortTitle(repo.work(p.works[0]));
  const comps = explainedComposers(p);
  if (p.nation) return `${p.nation.adj} composers`;
  if (p.period) return `${p.period.label} music`;
  if (comps.length === 1) return repo.composer(comps[0])?.short || '';
  if (p.forms.length === 1) return p.forms[0].prompt;
  if (p.types.length === 1) return TYPE_PROMPT[p.types[0]];
  if (p.roles.length === 1) return `Concerts with ${p.roles[0].noun}s`;
  if (p.artists.length === 1) return repo.artist(p.artists[0])?.name || 'Concerts';
  return 'Concerts';
}
const asConcerts = (s) => (/concerts?|music|recitals?|opera|programmes?|vocal|quartets|trios|concertos|symphonies|sonatas|requiems|oratorios|cantatas|masses|songs/i.test(s) ? s : `${s} concerts`);
function placePrompt(p) {
  if (p.venueIds.length) return `at ${venueGroupLabel(p.venueIds)}`;
  if (p.placeLabel) return p.placeLabel.startsWith('near ') ? p.placeLabel : `in ${p.placeLabel}`;
  return '';
}

function followUpsForConcertsZh(p, list) {
  const out = [];
  const S0 = subjectPromptZh(p);
  const P = placePromptZh(p);
  if (!p.date) addFollow(out, `${P} ${S0} 本周末`);
  else addFollow(out, `${P} ${S0}${S0 === '音乐会' && !P ? ' 下个月' : ''}`);
  if (P) addFollow(out, `瑞士各地的${S0}`);
  else {
    const city = topCityOf(list);
    if (city) addFollow(out, `${cityName(city)} ${S0}`);
  }
  if (p.works.length === 1) addFollow(out, `${workZh(repo.work(p.works[0]))} 录音`);
  else if (explainedComposers(p).length === 1 && !p.nation && !p.period) addFollow(out, `${cShort(repo.composer(explainedComposers(p)[0]))} 录音`);
  else if (!p.types.length && !p.forms.length) addFollow(out, `${P} 本周末 室内乐`);
  return out.slice(0, 3);
}

function followUpsForConcerts(p, list) {
  if (ZHO) return followUpsForConcertsZh(p, list);
  const out = [];
  const S0 = subjectPrompt(p);
  const P = placePrompt(p);
  if (!p.date) addFollow(out, `${S0} ${P} this weekend`);
  else addFollow(out, `${S0} ${P}${S0 === 'Concerts' && !P ? ' next month' : ''}`);
  if (P) addFollow(out, `${asConcerts(S0)} anywhere in Switzerland`);
  else {
    const city = topCityOf(list);
    if (city) addFollow(out, `${S0} in ${city.name}`);
  }
  if (p.works.length === 1) addFollow(out, `Recordings of ${shortTitle(repo.work(p.works[0]))}`);
  else if (explainedComposers(p).length === 1 && !p.nation && !p.period) addFollow(out, `Recordings of ${repo.composer(explainedComposers(p)[0])?.short}`);
  else if (!p.types.length && !p.forms.length) addFollow(out, `Chamber music ${P} this weekend`);
  return out.slice(0, 3);
}

function concertLink(p, relax) {
  const representable = !p.works.length && !p.composerIds.length && !p.missing.length && !p.forms.length && !p.artists.length &&
    !p.roles.length && !p.part && p.weekday == null && !p.featured && !(p.date && p.date.past) && !(p.venueIds.length && !relax.place);
  const cityIds = relax.place ? [] : p.cityIds;
  const types = relax.types ? [] : p.types;
  const day = !relax.date && p.date && p.date.from > p.today ? p.date.from : null;
  if (!representable || (!cityIds.length && !types.length && !day)) return null;
  return { label: ZHO ? '在“音乐会”中打开' : 'Open in Concerts', filters: { cityIds: [...cityIds], types: [...types], day } };
}

function answerConcerts(p, { entityRows = [] } = {}) {
  const relax = {};
  let list = findConcerts(p);
  const desc0 = describe(p);
  const steps = [];
  if (!list.length && !(p.date && p.date.past)) {
    const order = [
      ['date', !!(p.date || p.part || p.weekday != null)],
      ['place', !!(p.cityIds.length || p.venueIds.length)],
      ['types', !!(p.types.length || p.forms.length)],
      ['roles', !!p.roles.length],
    ];
    for (const [step, active] of order) {
      if (!active) continue;
      relax[step] = true;
      steps.push(step);
      list = findConcerts(p, relax);
      if (list.length) break;
    }
  }
  const n = list.length;
  const [one, many] = nounFor(p, relax);
  const many0 = nounFor(p)[1];
  const intro = introNote(p);
  const room = MAX_ITEMS - entityRows.length;
  const shown = Math.min(n, room);
  const tail = n === 0 ? '' : n === 1 ? ' — here it is.' : n <= room ? ' — here they are.' : ` — here are the next ${shown}.`;
  const descN = describe(p, relax);
  const past = p.date && p.date.past && !relax.date;
  const countText = n === 1 ? `one ${one}` : `${n.toLocaleString('en-US')} ${many}`;
  let reply;
  if (ZHO) {
    const tailZh = n === 0 ? '。' : n === 1 ? '，就是这一场。' : n <= room ? '，都在下面。' : `，以下是最近的 ${shown} 场。`;
    const mod = (scope, subj, noun, upcoming) => `${scope}${subj ? `${subj}的` : upcoming ? '即将上演的' : ''}${noun}`;
    const scope0 = zhScope(p);
    if (n === 0) reply = `${introNoteZh(p)}没有找到${mod(scope0, zhSubject(p), zhNoun(p), !past)}。`;
    else if (steps.length) {
      reply = `${introNoteZh(p)}没有找到${mod(scope0, zhSubject(p), zhNoun(p), true)}。不过${zhScope(p, relax)}有 ${fmtN(n)} 场${zhNoun(p, relax)}${zhSubject(p, relax)}${tailZh}`;
    } else {
      reply = `${introNoteZh(p)}${scope0 || '目前'}有 ${fmtN(n)} 场${zhNoun(p)}${zhSubject(p)}${tailZh}`;
    }
    if (p.formMiss && p.composerIds.length) {
      reply += `（Klang 中没有${p.composerIds.map((id) => cShort(repo.composer(id))).join('或')}的${p.forms.map((f) => f.zh).join('或')}。）`;
    }
    reply = zfix(reply);
  } else if (n === 0) {
    reply = `${intro}I couldn't find any ${past ? '' : 'upcoming '}${many0}${desc0 ? ` ${desc0}` : ''}.`;
  } else if (steps.length) {
    const where = relax.place && !relax.date ? ' elsewhere in Switzerland' : relax.date && !relax.place ? ' on other dates' : '';
    reply = `${intro}No ${many0}${desc0 ? ` ${desc0}` : ''}. I found ${countText}${descN ? ` ${descN}` : ''}${where}${tail}`;
  } else {
    reply = `${intro}I found ${countText}${desc0 ? ` ${desc0}` : ''}${tail}`;
  }
  if (!ZHO && p.formMiss && p.composerIds.length) reply += ` (Klang has no ${listJoin(p.formMiss, 'or')} by ${listJoin(p.composerIds.map((id) => repo.composer(id)?.short), 'or')}.)`;
  const followUps = followUpsForConcerts(p, list);
  if (n === 0) {
    const others = findConcerts(p, { place: true, date: true });
    const city = topCityOf(others, p.cityIds);
    if (city) followUps.unshift(cleanPrompt(ZHO ? `${cityName(city)} ${subjectPromptZh(p)}` : `${subjectPrompt(p)} in ${city.name}`));
  }
  return {
    intent: 'concert',
    reply,
    items: [...entityRows, ...concertItems(list, room)].slice(0, MAX_ITEMS),
    followUps: uniq(followUps).slice(0, 3),
    link: n ? concertLink(p, relax) : null,
  };
}

function introNote(p) {
  const bits = [];
  if (p.corrections.length) bits.push(`(Reading “${p.corrections[0][0]}” as ${p.corrections[0][1]}.)`);
  if (p.unknownPlace) bits.push(`Klang only covers Switzerland, so I left out “${p.unknownPlace}”.`);
  else if (p.unknownRaw && /[A-ZÀ-Ý]/.test(p.unknownRaw)) bits.push(`I don't know “${p.unknownRaw}”, so I left it out.`);
  if (p.missing.length && !p.works.length) {
    const m = p.missing[0];
    const comp = repo.composer(m.composerId);
    bits.push(`${comp ? `${comp.short}'s ` : ''}${m.title} isn't in Klang's repertoire yet, so I looked for ${comp ? comp.short : 'its composer'} instead.`);
  }
  return bits.length ? `${bits.join(' ')} ` : '';
}

function upcomingFor(opts, today) {
  return repo.query({ from: today, ...opts });
}
function life(c) {
  return c.died ? `${c.born}–${c.died}` : `born ${c.born}`;
}
function firstSentence(text, max = 240) {
  if (!text) return '';
  const para = String(text).split(/\n\n/)[0].trim();
  const m = para.match(/^(.{40,}?[.!?])(?:\s|$)/);
  const s = m ? m[1] : para;
  return s.length > max ? `${s.slice(0, max - 1).trim()}…` : s;
}

function answerComposers(p) {
  const T = p.today;
  const ids = explainedComposers(p).length ? explainedComposers(p) : p.composerIds;
  const comps = ids.map((id) => repo.composer(id)).filter(Boolean);
  if (!comps.length) return answerHelp();
  if (comps.length > 1) {
    const list = findConcerts({ ...p, works: [] });
    const rows = comps.slice(0, 4).map((c) => ({ kind: 'composer', id: c.id }));
    const names = listJoin(comps.map((c) => c.name), p.ambiguousComposer ? 'or' : 'and');
    const namesZh = comps.map((c) => cName(c)).join(p.ambiguousComposer ? '或' : '和');
    const reply = ZHO
      ? zfix(p.ambiguousComposer
        ? `你是指${namesZh}吗？${list.length ? `他们共有 ${fmtN(list.length)} 场即将上演的音乐会。` : ''}`
        : `${namesZh}：${list.length ? `有 ${fmtN(list.length)} 场即将上演的音乐会演出他们的作品。` : '目前瑞士的日程中没有他们的作品。'}`)
      : p.ambiguousComposer
        ? `Did you mean ${names}? ${list.length ? `Between them there are ${plural(list.length, 'upcoming concert')}.` : ''}`.trim()
        : `${names}: ${list.length ? `${plural(list.length, 'upcoming concert')} feature their music.` : 'nothing of theirs is on the Swiss calendar right now.'}`;
    return {
      intent: 'composer', reply,
      items: [...rows, ...concertItems(list, MAX_ITEMS - rows.length)],
      followUps: comps.slice(0, 3).map((c) => (ZHO ? `${cShort(c)} 音乐会` : `${c.short} concerts`)),
    };
  }
  const c = comps[0];
  const ups = upcomingFor({ composerId: c.id }, T);
  const counts = new Map();
  for (const con of ups) for (const pr of con.program || []) {
    if (pr.workId && repo.work(pr.workId)?.composerId === c.id) counts.set(pr.workId, (counts.get(pr.workId) || 0) + 1);
  }
  const topWorks = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([id]) => id);
  const bio = firstSentence(BIOS && BIOS[c.id]); // written English: left out of Chinese replies
  const often = topWorks.length ? ` ${listJoin(topWorks.map((id) => shortTitle(repo.work(id))))} ${topWorks.length > 1 ? 'are' : 'is'} programmed most.` : '';
  const reply = ZHO
    ? zfix(`${introNoteZh(p)}${cName(c)}（${lifeZh(c)}），${countryZh(c.country)}。${ups.length
      ? `瑞士有 ${fmtN(ups.length)} 场即将上演的音乐会演出${cShort(c)}的作品，最近一场是${whenWhereZh(ups[0], T)}。${topWorks.length ? `最常上演的是${topWorks.map((id) => workZh(repo.work(id))).join('和')}。` : ''}`
      : `目前 Klang 的瑞士日程中没有${cShort(c)}的作品。`}`)
    : `${introNote(p)}${c.name} (${life(c)}), ${c.country}.${bio ? ` ${bio}` : ''} ${ups.length
      ? `${plural(ups.length, 'upcoming concert')} in Switzerland feature${ups.length === 1 ? 's' : ''} ${c.short}'s music — the next is ${whenWhere(ups[0], T)}.${often}`
      : `Nothing by ${c.short} is on the Swiss calendar in Klang right now.`}`;
  const rows = [{ kind: 'composer', id: c.id }, ...topWorks.map((id) => ({ kind: 'work', id }))];
  const followUps = [];
  const city = topCityOf(ups);
  if (ZHO) {
    if (ups.length) addFollow(followUps, `${cShort(c)} 本周末`);
    if (city) addFollow(followUps, `${cityName(city)} ${cShort(c)}`);
    addFollow(followUps, `${cShort(c)} 录音`);
    return { intent: 'composer', reply, items: [...rows, ...concertItems(ups, MAX_ITEMS - rows.length)], followUps };
  }
  if (ups.length) addFollow(followUps, `${c.short} this weekend`);
  if (city) addFollow(followUps, `${c.short} in ${city.name}`);
  addFollow(followUps, `Recordings of ${c.short}`);
  return { intent: 'composer', reply, items: [...rows, ...concertItems(ups, MAX_ITEMS - rows.length)], followUps };
}

function answerWorks(p) {
  const T = p.today;
  const works = p.works.map((id) => repo.work(id)).filter(Boolean);
  if (!works.length && p.missing.length) return answerMissing(p);
  if (!works.length) return answerHelp();
  if (works.length > 1) {
    const ws = works.slice(0, 4);
    const list = findConcerts({ ...p, composerIds: [] });
    const reply = ZHO
      ? zfix(`${introNoteZh(p)}我找到 ${works.length} 部作品：${ws.map((w) => workZh(w)).join('、')}。${list.length ? `有 ${fmtN(list.length)} 场即将上演的音乐会包含其中之一。` : '目前瑞士的节目单上都没有它们。'}`)
      : `${introNote(p)}I found ${works.length} works: ${listJoin(ws.map((w) => `${shortTitle(w)} (${repo.composer(w.composerId)?.short})`), 'and')}. ${list.length ? `${plural(list.length, 'upcoming concert')} include${list.length === 1 ? 's' : ''} one of them.` : 'None of them is on a Swiss programme right now.'}`;
    return {
      intent: 'work', reply,
      items: [...ws.map((w) => ({ kind: 'work', id: w.id })), ...concertItems(list, MAX_ITEMS - ws.length)],
      followUps: ws.slice(0, 3).map((w) => (ZHO ? `${workZh(w)} 录音` : `Recordings of ${shortTitle(w)}`)),
    };
  }
  const w = works[0];
  const comp = repo.composer(w.composerId);
  const ups = upcomingFor({ workId: w.id }, T);
  const meta = [comp?.short, w.catalog, w.year].filter(Boolean).join(', ');
  const reply = ZHO
    ? zfix(`${introNoteZh(p)}《${w.title}》，${[comp ? cShort(comp) : null, w.catalog, w.year ? `${w.year} 年` : null].filter(Boolean).join('，')}。${ups.length
      ? `瑞士有 ${fmtN(ups.length)} 场即将上演的演出，最近一场是${whenWhereZh(ups[0], T)}。`
      : '目前 Klang 的瑞士节目单上没有这部作品。'}`)
    : `${introNote(p)}${w.title} — ${meta}. ${w.blurb || ''} ${ups.length
      ? `${plural(ups.length, 'upcoming performance')} in Switzerland — the next is ${whenWhere(ups[0], T)}.`
      : `It isn't on any Swiss programme in Klang right now.`}`.replace(/\s+/g, ' ').trim();
  const followUps = [];
  addFollow(followUps, ZHO ? `${workZh(w)} 录音` : `Recordings of ${shortTitle(w)}`);
  if (comp) addFollow(followUps, ZHO ? `更多${cShort(comp)}作品` : `More by ${comp.short}`);
  if (!ups.length && comp) addFollow(followUps, ZHO ? `${cShort(comp)} 音乐会` : `${comp.short} concerts`);
  else if (ups.length > 1) {
    const city = topCityOf(ups);
    if (city) addFollow(followUps, ZHO ? `${cityName(city)} ${workZh(w)}` : `${shortTitle(w)} in ${city.name}`);
  }
  return { intent: 'work', reply, items: [{ kind: 'work', id: w.id }, ...concertItems(ups, MAX_ITEMS - 1)], followUps };
}

function answerMissing(p) {
  const T = p.today;
  const m = p.missing[0];
  const comp = m.composerId ? repo.composer(m.composerId) : null;
  const by = comp ? comp.short : m.composerName;
  const ups = comp ? upcomingFor({ composerId: comp.id }, T) : [];
  const label = ZHO ? `${comp ? cShort(comp) : m.composerName || ''}《${m.title}》` : `${by ? `${by}'s ` : ''}${m.title}`;
  const reply = ZHO
    ? zfix(`${label}还不在 Klang 的曲目库中，所以无法匹配音乐会。以下是 Apple Music 上的录音${comp && ups.length ? `，以及${cShort(comp)}接下来的音乐会` : ''}。`)
    : `${label}${m.note ? ` — ${m.note} —` : ''} isn't in Klang's repertoire yet, so I can't match it to concerts. Here are recordings on Apple Music${comp && ups.length ? `, and the next concerts with ${comp.short}` : ''}.`;
  const items = [{ kind: 'recording', data: { term: m.term, label, composerId: comp?.id || null } }];
  if (comp) items.push({ kind: 'composer', id: comp.id });
  items.push(...concertItems(ups, 4));
  const followUps = [];
  if (comp && ZHO) { addFollow(followUps, `${cShort(comp)} 音乐会`); addFollow(followUps, `介绍一下${cShort(comp)}`); }
  else if (comp) { addFollow(followUps, `${comp.short} concerts`); addFollow(followUps, `Tell me about ${comp.short}`); }
  return { intent: 'work', reply, items: items.slice(0, MAX_ITEMS), followUps };
}

function answerArtists(p) {
  const T = p.today;
  const artists = p.artists.map((id) => repo.artist(id)).filter(Boolean);
  if (!artists.length) return answerHelp();
  if (artists.length > 1) {
    const list = findConcerts(p);
    const rows = artists.slice(0, 4).map((a) => ({ kind: 'artist', id: a.id }));
    return {
      intent: 'artist',
      reply: ZHO
        ? zfix(`我找到 ${artists.length} 位演出者：${artists.slice(0, 4).map((a) => a.name).join('、')}。${list.length ? `他们共有 ${fmtN(list.length)} 场即将上演的音乐会。` : ''}`)
        : `I found ${artists.length} performers: ${listJoin(artists.slice(0, 4).map((a) => a.name), 'and')}. ${list.length ? `${plural(list.length, 'upcoming concert')} with them.` : ''}`.trim(),
      items: [...rows, ...concertItems(list, MAX_ITEMS - rows.length)],
      followUps: artists.slice(0, 3).map((a) => (ZHO ? `${a.name} 音乐会` : `${a.name} concerts`)),
    };
  }
  const a = artists[0];
  const ups = upcomingFor({ artistId: a.id }, T);
  const role = a.kind === 'ensemble' ? (a.ensembleType || 'ensemble') : (a.role || 'performer').toLowerCase();
  const roleZh = a.kind === 'ensemble' ? '乐团' : a.role ? roleLabel(a.role) : '演出者';
  const reply = ZHO
    ? zfix(`${a.name}，${roleZh}。${ups.length
      ? `Klang 中有 ${fmtN(ups.length)} 场即将上演的音乐会，最近一场是${whenWhereZh(ups[0], T)}。`
      : 'Klang 中暂时没有即将上演的音乐会。'}`)
    : `${a.name} — ${role}. ${ups.length
      ? `${plural(ups.length, 'upcoming concert')} in Klang — the next is ${whenWhere(ups[0], T)}.`
      : 'No upcoming concerts in Klang right now.'}`;
  const followUps = [];
  const city = topCityOf(ups);
  const roleDef = ROLES.find((r) => r.roles.includes(a.role));
  if (ZHO) {
    if (city) addFollow(followUps, `本周末${cityName(city)}的音乐会`);
    if (a.kind !== 'ensemble' && roleDef) addFollow(followUps, `本周末的${roleDef.zh}`);
  } else {
    if (city) addFollow(followUps, `Concerts in ${city.name} this weekend`);
    if (a.kind !== 'ensemble' && a.role) addFollow(followUps, `${cap1((roleDef || {}).noun || 'performer')}s this weekend`);
  }
  return { intent: 'artist', reply, items: [{ kind: 'artist', id: a.id }, ...concertItems(ups, MAX_ITEMS - 1)], followUps };
}

function answerPeople(p) {
  // "that Swiss composer" / "Swiss composers"
  if (p.nation) {
    const T = p.today;
    const comps = p.nation.ids.map((id) => repo.composer(id)).filter(Boolean)
      .map((c) => ({ c, n: upcomingFor({ composerId: c.id }, T).length }))
      .sort((a, b) => b.n - a.n || a.c.born - b.c.born);
    if (!comps.length) return { intent: 'people', reply: ZHO ? zfix(`Klang 的曲目库中还没有${p.nation.zh}作曲家。`) : `Klang has no ${p.nation.label} in its repertoire yet.`, items: [], followUps: [] };
    const names = listJoin(comps.map(({ c }) => `${c.name} (${life(c)})`));
    const namesZh = comps.map(({ c }) => `${cName(c)}（${lifeZh(c)}）`).join('、');
    const reply = ZHO
      ? zfix(comps.length === 1 ? `应该是${namesZh}。` : `Klang 中的${p.nation.zh}作曲家：${namesZh}。${p.nation.singular ? '你指的是哪一位？' : ''}`)
      : comps.length === 1
        ? `That would be ${names}.`
        : `${p.nation.adj === 'Swiss' ? 'Switzerland’s composers in Klang' : `${p.nation.adj} composers in Klang`}: ${names}.${p.nation.singular ? ' Which one did you mean?' : ''}`;
    return {
      intent: 'people', reply,
      items: comps.slice(0, MAX_ITEMS).map(({ c }) => ({ kind: 'composer', id: c.id })),
      followUps: comps.slice(0, 3).map(({ c }) => (ZHO ? `${cShort(c)} 音乐会` : `${c.short} concerts`)),
    };
  }
  // "pianists", "conductors"
  const roles = new Set(p.roles.flatMap((r) => r.roles));
  const T = p.today;
  const people = repo.allArtists().filter((a) => roles.has(a.role))
    .map((a) => ({ a, n: upcomingFor({ artistId: a.id }, T).length }))
    .sort((x, y) => y.n - x.n || x.a.name.localeCompare(y.a.name));
  const noun = p.roles[0].noun;
  const nounZh = p.roles[0].zh;
  if (!people.length) {
    return ZHO
      ? { intent: 'people', reply: `在 Klang 的演出信息中没有找到${nounZh}。`, items: [], followUps: [`本周末的${nounZh}`] }
      : { intent: 'people', reply: `I couldn't find any ${noun}s in Klang's listings.`, items: [], followUps: [`${cap1(noun)}s this weekend`] };
  }
  return {
    intent: 'people',
    reply: ZHO
      ? zfix(`Klang 的演出信息中有 ${fmtN(people.length)} 位${nounZh}，以下是演出最多的几位。`)
      : `${plural(people.length, noun)} appear in Klang's listings — here are the busiest.`,
    items: people.slice(0, MAX_ITEMS).map(({ a }) => ({ kind: 'artist', id: a.id })),
    followUps: ZHO
      ? [`本周末的${nounZh}`, `苏黎世的${nounZh}`, `日内瓦的${nounZh}`]
      : [`${cap1(noun)}s this weekend`, `${cap1(noun)}s in Zurich`, `${cap1(noun)}s in Geneva`],
  };
}

function recordingTerm(p) {
  const w = p.works.length ? repo.work(p.works[0]) : null;
  const m = !w && p.missing.length ? p.missing[0] : null;
  const compId = w?.composerId || m?.composerId || (explainedComposers(p)[0] || p.composerIds[0]) || null;
  const comp = compId ? repo.composer(compId) : null;
  let base;
  let label;
  let labelZh;
  if (w) {
    base = p.performer ? shortTitle(w).includes(comp?.short || '~') ? shortTitle(w) : `${comp?.short || ''} ${shortTitle(w)}` : w.q || `${comp?.short || ''} ${w.title}`;
    label = shortTitle(w).startsWith(comp?.short || '~') ? shortTitle(w) : `${comp ? `${comp.short}'s ` : ''}${shortTitle(w)}`;
    labelZh = workZh(w);
  } else if (m) {
    base = m.term;
    label = `${m.composerName || comp?.short || ''}${comp || m.composerName ? "'s " : ''}${m.title}`;
    labelZh = `${comp ? zhComposerShort(comp) : m.composerName || ''}《${m.title}》`;
  } else if (comp) {
    const form = p.forms[0];
    base = `${comp.short}${form ? ` ${form.label.replace(/^an? /, '')}` : ''}`;
    label = form ? `${comp.short}'s ${form.label.replace(/^an? /, '')}` : comp.name;
    labelZh = form ? `${zhComposerShort(comp)}的${form.zh}` : zhComposerName(comp);
  } else if (p.forms.length) {
    base = p.forms[0].label.replace(/^an? /, '');
    label = base;
    labelZh = p.forms[0].zh;
  } else if (p.unknownRaw) {
    base = p.unknownRaw;
    label = `“${p.unknownRaw}”`;
    labelZh = label;
  }
  if (!base && !p.performer) return null;
  const term = cleanPrompt([p.performer, base].filter(Boolean).join(' '));
  const loose = !w && !m && !comp;
  return { term, label: (ZHO ? labelZh : label) || null, loose, workId: w?.id || null, composerId: comp?.id || null, performer: p.performer || null };
}

function answerRecording(p) {
  const rec = recordingTerm(p);
  if (!rec) {
    return ZHO
      ? {
        intent: 'recording',
        reply: '你想找哪个录音？说出作品或演奏者，例如“马勒第二交响曲的录音”或“冬之旅 录音”。',
        items: [], followUps: ['马勒第二交响曲的录音', '冬之旅 录音', '更慢的哥德堡变奏曲'],
      }
      : {
        intent: 'recording',
        reply: 'Which recording are you after? Name a work or a performer — for example “Abbado’s Mahler 2” or “Winterreise recordings”.',
        items: [], followUps: ["Abbado's Mahler 2", 'Recordings of Winterreise', 'a slower Goldbergs'],
      };
  }
  let reply;
  if (ZHO) {
    const what = rec.label ? `${rec.performer ? `${rec.performer}演奏的` : ''}${rec.label}的录音` : `${rec.performer}的录音`;
    reply = zfix(`${p.corrections.length ? `（把“${p.corrections[0][0]}”理解为${p.corrections[0][2] || p.corrections[0][1]}。）` : ''}以下是 Apple Music 上${what}。轻点“试听”可在 Klang 中试听 30 秒，或在 Apple Music 古典乐中完整收听。${p.cues.tempo
      ? 'Apple 的目录不提供速度信息，所以无法按快慢排序——多打开几个比较一下，不同演奏者的用时差别很大。' : ''}`);
  } else {
    const tempo = p.cues.tempo
      ? ' Apple’s catalogue doesn’t list tempos, so I can’t sort by speed — open a few and compare; timings differ a lot between performers.'
      : '';
    const what = rec.label ? `recordings ${rec.loose ? 'for' : 'of'} ${rec.label}${rec.performer ? ` with ${rec.performer}` : ''}` : `recordings with ${rec.performer}`;
    reply = `${p.corrections.length ? `(Reading “${p.corrections[0][0]}” as ${p.corrections[0][1]}.) ` : ''}Here are ${what} on Apple Music — tap Preview to hear 30 seconds here, or Apple Music Classical to play one in full.${tempo}`;
  }
  rec.label = rec.label || rec.performer;
  const items = [{ kind: 'recording', data: { ...rec, tempo: !!p.cues.tempo } }];
  if (rec.workId) items.push({ kind: 'work', id: rec.workId });
  else if (rec.composerId) items.push({ kind: 'composer', id: rec.composerId });
  const followUps = [];
  const w = rec.workId ? repo.work(rec.workId) : null;
  if (ZHO) {
    if (w) {
      addFollow(followUps, `${workZh(w)} 音乐会`);
      addFollow(followUps, `介绍一下${workZh(w)}`);
    } else if (rec.composerId) addFollow(followUps, `${cShort(repo.composer(rec.composerId))} 音乐会`);
    if (rec.performer && (w || rec.composerId)) addFollow(followUps, `${w ? workZh(w) : cShort(repo.composer(rec.composerId))} 录音`);
    return { intent: 'recording', reply, items, followUps };
  }
  if (w) {
    addFollow(followUps, `${shortTitle(w)} concerts`);
    addFollow(followUps, `Tell me about ${shortTitle(w)}`);
  } else if (rec.composerId) {
    addFollow(followUps, `${repo.composer(rec.composerId).short} concerts`);
  }
  if (rec.performer && (w || rec.composerId)) addFollow(followUps, `Recordings of ${w ? shortTitle(w) : repo.composer(rec.composerId).short}`);
  return { intent: 'recording', reply, items, followUps };
}

function answerUnknown(p) {
  const term = p.unknownRaw || p.unknown.join(' ');
  if (!term) return answerHelp();
  const res = repo.search(term, MAX_ITEMS);
  const items = [
    ...res.composers.map((c) => ({ kind: 'composer', id: c.id })),
    ...res.works.map((w) => ({ kind: 'work', id: w.id })),
    ...res.artists.map((a) => ({ kind: 'artist', id: a.id })),
    ...res.venues.map((v) => ({ kind: 'venue', id: v.id })),
    ...res.cities.map((c) => ({ kind: 'city', id: c.id })),
  ].slice(0, 4);
  items.push(...concertItems(res.concerts, MAX_ITEMS - items.length));
  if (items.length) {
    return {
      intent: 'search',
      reply: ZHO ? zfix(`以下是 Klang 演出信息中与“${term}”相关的结果。`) : `Here's what I found for “${term}” in Klang's listings.`,
      items,
      followUps: ZHO ? ['本周末的音乐会', '本周末日内瓦的室内乐'] : ['Concerts this weekend', 'Chamber music in Geneva this weekend'],
    };
  }
  const looksLikeName = /[A-ZÀ-Ý]/.test(term) || p.unknown.length <= 3;
  if (looksLikeName) {
    return {
      intent: 'unknown',
      reply: ZHO
        ? zfix(`在 Klang 的瑞士演出信息中没有找到“${term}”——这里的演出者来自本设备上的音乐会。如果是艺术家或作品，以下是 Apple Music 上的录音。`)
        : `I couldn't find “${term}” in Klang's Swiss listings — performers here come from the concerts on this device. If it's an artist or a work, here are recordings on Apple Music.`,
      items: [{ kind: 'recording', data: { term, label: `“${term}”`, performer: null } }],
      followUps: ZHO ? ['本周末的音乐会', '那位瑞士作曲家', '11月苏黎世的马勒'] : ['Concerts this weekend', 'that Swiss composer', 'Any Mahler in Zurich in November'],
    };
  }
  return answerHelp(ZHO ? `我不太明白“${term}”是什么意思。` : `I'm not sure what you mean by “${term}”.`);
}

const HELP_PROMPTS_EN = ['Any Mahler in Zurich in November', 'chamber music in Geneva this weekend', 'Winterreise', "Abbado's Mahler 2"];
const HELP_PROMPTS_ZH = ['11月苏黎世的马勒', '本周末日内瓦的室内乐', '冬之旅', '马勒第二交响曲的录音'];
const helpPrompts = () => (ZHO ? HELP_PROMPTS_ZH : HELP_PROMPTS_EN);
function answerHelp(prefix = '') {
  return {
    intent: 'help',
    reply: ZHO
      ? zfix(`${prefix}我可以按作曲家、作品、城市、场馆、日期或类型查找音乐会、人物、作品和录音。一切都在本设备上运行，你输入的内容不会发送到任何地方。试试这些：`)
      : `${prefix ? `${prefix} ` : ''}I can find concerts, people, works and recordings — by composer, work, city, venue, date or type. Everything runs on this device; nothing you type is sent anywhere. Try one of these:`,
    items: [],
    followUps: helpPrompts(),
  };
}

function answerCode(raw, today) {
  let t = raw.trim().replace(/^(?:concert )?code[:\s]+/i, '').trim();
  const urlM = t.match(/concert\/([^/?#\s]+)/);
  if (urlM) t = decodeURIComponent(urlM[1]);
  t = t.replace(/^#/, '').toLowerCase();
  if (!/^[a-z0-9][\w.:-]*$/.test(t) || !/\d/.test(t) || !/[-_]/.test(t)) return null;
  // concert ids: "feed-<source>-<id>" (the code is shown without "feed-" too)
  const c = [t, `feed-${t}`].map((id) => repo.concert(id)).find(Boolean);
  if (!c) {
    if (!/^(?:concert )?code\b/i.test(raw.trim())) return null;
    return ZHO
      ? { intent: 'code', reply: zfix(`没有找到代码为“${t}”的音乐会。每场音乐会的页面上都显示了代码。`), items: [], followUps: ['本周末的音乐会'] }
      : { intent: 'code', reply: `I couldn't find a concert with the code “${t}”. Codes are shown on each concert page.`, items: [], followUps: ['Concerts this weekend'] };
  }
  const city = repo.city(c.cityId);
  return {
    intent: 'code',
    reply: ZHO
      ? zfix(`这是“${c.title}”——${whenWhereZh(c, today)}${city ? `，${cityName(city)}` : ''}。`)
      : `That's “${c.title}” — ${whenWhere(c, today)}${city ? `, ${city.name}` : ''}.`,
    items: [{ kind: 'concert', id: c.id }],
    followUps: [],
  };
}

function feedbackKind(q) {
  if (/ (city|town) /.test(q)) return 'city';
  if (/ (venue|hall|church|festival|theatre|theater) /.test(q)) return 'venue';
  if (/ (bug|broken|error|crash|wrong|doesnt work|not working) /.test(q)) return 'bug';
  if (/ (suggest|suggestion|idea|would be|wish|should|please add|could you|can you) /.test(q)) return 'suggestion';
  return 'feedback';
}
const FEEDBACK_LABEL = { city: 'city proposal', venue: 'venue proposal', bug: 'bug report', suggestion: 'suggestion', feedback: 'feedback' };
const FEEDBACK_LABEL_ZH = { city: '城市建议', venue: '场馆建议', bug: '问题报告', suggestion: '建议', feedback: '反馈' };

// raw: the text as typed (kept as the note); q: its English token string (used to classify it).
function answerFeedback(raw, q, { forced = false } = {}) {
  const body = (HAN_RE.test(raw) ? fromZh(raw).text : raw).replace(/^\s*(feedback|suggestions?|ideas?|bug|requests?|issues?|problems?|proposal)\s*[:\-–—]\s*/i, '').trim();
  const content = prep(body).replace(/^(feedback|suggestions?|suggest|ideas?|bug|issue|problem|request|propose|proposal|please add|add|claim)( (a|an|the|new))?( (city|venue|hall|festival|church|artist))?/, '').trim();
  if (!forced && content.replace(/\s+/g, '').length < 3) {
    return {
      intent: 'feedback',
      reply: ZHO
        ? zfix('好的——写下你的反馈、想法，或者希望 Klang 收录的城市或场馆，我会把它保存在本设备上。')
        : 'Sure — write your feedback, idea, or the city or venue you’d like Klang to cover, and I’ll keep it on this device.',
      items: [], followUps: [], expect: 'feedback',
    };
  }
  const kind = feedbackKind(q);
  return {
    intent: 'feedback',
    reply: ZHO
      ? zfix(`谢谢！你的${FEEDBACK_LABEL_ZH[kind]}已保存在本设备上。Klang 没有服务器，所以不会发送任何内容；随时说“我的笔记”即可查看你写过的内容。`)
      : `Thank you — I've saved your ${FEEDBACK_LABEL[kind]} on this device. Klang has no server, so nothing is sent; ask for “my notes” any time to see what you've written.`,
    items: [],
    followUps: ZHO ? ['我的笔记', '本周末的音乐会'] : ['My notes', 'Concerts this weekend'],
    feedback: { kind, text: raw.trim() },
  };
}

function answerNotes() {
  const notes = feedbackNotes();
  if (!notes.length) {
    return ZHO
      ? { intent: 'notes', reply: zfix('你还没有留下任何笔记。输入“反馈：”加上你的想法，或者推荐一个城市或场馆。'), items: [], followUps: ['推荐一个场馆'] }
      : { intent: 'notes', reply: 'You haven’t left any notes yet. Type “feedback:” followed by your idea, or propose a city or venue.', items: [], followUps: ['Propose a venue'] };
  }
  const lines = notes.slice(0, 5).map((n) => `• ${n.text}`).join('\n');
  return {
    intent: 'notes',
    reply: ZHO
      ? `你在本设备上的 ${fmtN(notes.length)} 条笔记${notes.length > 5 ? '（最近 5 条）' : ''}：\n${lines}`
      : `Your ${plural(notes.length, 'note')} on this device${notes.length > 5 ? ' (latest 5)' : ''}:\n${lines}`,
    items: [], followUps: [],
  };
}

function answerMine(today) {
  const ids = uniq([...store.markedIds('going'), ...store.markedIds('saved')]);
  const list = repo.query({ from: today, ids, includeHidden: true });
  if (!list.length) {
    return ZHO
      ? { intent: 'mine', reply: '你还没有收藏即将上演的音乐会——在音乐会页面轻点“收藏”或“想去”，它就会出现在这里。', items: [], followUps: ['本周末的音乐会'] }
      : { intent: 'mine', reply: "You haven't saved any upcoming concerts yet — tap Save or Going on a concert and it shows up here.", items: [], followUps: ['Concerts this weekend'] };
  }
  const going = list.filter((c) => store.isMarked(c.id, 'going')).length;
  return {
    intent: 'mine',
    reply: ZHO
      ? zfix(`你收藏了 ${fmtN(list.length)} 场即将上演的音乐会${going ? `（其中 ${going} 场标记为“想去”）` : ''}——最近一场是${whenWhereZh(list[0], today)}。`)
      : `You have ${plural(list.length, 'upcoming concert')} saved${going ? ` (${going} marked Going)` : ''} — the next is ${whenWhere(list[0], today)}.`,
    items: concertItems(list),
    followUps: [],
  };
}

// ---------- main entry ----------
// Chinese small talk, matched on the text as typed.
const ZH_HELLO = /^(你好|您好|嗨|哈喽|哈啰|喂)[！!。.~～\s]*$/;
const ZH_HELP = /^(帮助|帮忙|你能做什么|你会做什么|你会什么|怎么用|如何使用|你是谁)[？?！!。.\s]*$/;
const ZH_THANKS = /^(谢谢|谢谢你|多谢|谢了|感谢|好的|好|太好了|棒|不错)[！!。.~～\s]*$/;
const ZH_CANCEL = /^(取消|算了|不用了|没事|不用)[！!。.\s]*$/;

export function answer(text, { today = todayKey(), expect = null } = {}) {
  ZHO = isZh();
  const typed = String(text || '').trim();
  const zhIn = fromZh(typed, today);
  const raw = zhIn.text;
  const q = pad(prep(raw));
  if (expect === 'feedback') {
    if (/^ (cancel|never mind|nevermind|no|stop|forget it) $/.test(q) || ZH_CANCEL.test(typed)) {
      return { intent: 'thanks', reply: ZHO ? '好的，没有保存任何内容。' : 'No problem — nothing saved.', items: [], followUps: helpPrompts().slice(0, 2) };
    }
    if (typed) return answerFeedback(typed, q, { forced: true });
  }
  if (ZH_HELLO.test(typed)) return { ...answerHelp(), reply: ZHO ? '你好！说说你想找什么——音乐会、人物、作品或录音都可以。所有内容都保留在本设备上。' : 'Hello! Just say what you’re after — a concert, a person, a work or a recording. Everything stays on this device.' };
  if (ZH_HELP.test(typed)) return answerHelp();
  if (ZH_THANKS.test(typed)) return { intent: 'thanks', reply: ZHO ? '不客气！关于瑞士的音乐会还有什么想问的，随时问我。' : "You're welcome! Ask me anything else about concerts in Switzerland.", items: [], followUps: helpPrompts().slice(0, 2) };
  if (!q.trim()) {
    if (zhIn.unknown.length) return answerHelp(ZHO ? `我不太明白“${zhIn.unknown.join('、')}”是什么意思。` : `I'm not sure what you mean by “${zhIn.unknown.join(' ')}”.`);
    return answerHelp();
  }
  const t = q.trim();
  if (RE_HELLO.test(t)) return { ...answerHelp(), reply: ZHO ? '你好！说说你想找什么——音乐会、人物、作品或录音都可以。所有内容都保留在本设备上。' : 'Hello! Just say what you’re after — a concert, a person, a work or a recording. Everything stays on this device.' };
  if (RE_HELP.test(t)) return answerHelp();
  if (RE_THANKS.test(t)) return { intent: 'thanks', reply: ZHO ? '不客气！关于瑞士的音乐会还有什么想问的，随时问我。' : "You're welcome! Ask me anything else about concerts in Switzerland.", items: [], followUps: helpPrompts().slice(0, 2) };
  if (RE_NOTES.test(t)) return answerNotes();
  const code = answerCode(raw, today);
  if (code) return code;
  if (RE_FEEDBACK.test(t) || RE_FEEDBACK_RAW.test(raw) || RE_FEEDBACK_ANY.test(q)) return answerFeedback(typed, q);
  if (RE_MINE.test(q)) return answerMine(today);

  const p = parse(raw, { today });
  p.zhPlaces = zhIn.places;
  p.zhUnknown = zhIn.unknown;
  const hasPlace = p.cityIds.length > 0 || p.venueIds.length > 0;
  const hasWhen = !!(p.date || p.part || p.weekday != null);
  const hasProgram = p.works.length || p.missing.length || p.composerIds.length || p.forms.length;
  const strongRecording = RE_RECORDING_STRONG.test(p.q);
  const recordingCueOf = () => p.cues.recording || (p.performer && (p.works.length || p.missing.length || p.composerIds.length));
  const liveCue = p.cues.live || hasPlace || hasWhen || p.types.length || p.featured;
  // "Gould Goldbergs", "Kavakos Brahms": an unknown capitalised name next to music -> a performer
  if (!p.performer && !liveCue && !p.nation && !p.period && (p.works.length || p.missing.length || p.composerIds.length) &&
      p.unknown.length && p.unknown.length <= 3 && /^[A-ZÀ-Ý]/.test(p.unknownRaw) && !p.unknownPlace) {
    p.performer = p.unknownRaw;
    p.unknown = [];
    p.unknownRaw = '';
  }

  if (recordingCueOf() && (strongRecording || p.performer || !p.cues.live) && !hasPlace && !hasWhen) return answerRecording(p);
  if (liveCue || (p.roles.length && (hasPlace || hasWhen)) || (p.period && !p.nation)) {
    // place-only questions ("Tonhalle", "Geneva") lead with the place itself
    const placeOnly = hasPlace && !hasProgram && !p.artists.length && !p.roles.length && !p.types.length && !hasWhen && !p.featured;
    const rows = [];
    if (placeOnly) {
      if (p.venueIds.length) uniq(p.venueIds).slice(0, 2).forEach((id) => rows.push({ kind: 'venue', id }));
      else if (p.cityIds.length <= 2 && !p.near) p.cityIds.forEach((id) => rows.push({ kind: 'city', id }));
    }
    const res = answerConcerts(p, { entityRows: rows });
    if (placeOnly && res.items.length > rows.length && ZHO) {
      const n = findConcerts(p).length;
      const tail = n > MAX_ITEMS - rows.length ? '以下是最近的几场' : n === 1 ? '就是这一场' : '都在下面';
      const named = p.venueIds.length ? venueGroupZh(p.venueIds) : rows.length ? p.placeZh : '';
      res.reply = zfix(named
        ? `${introNoteZh(p)}${named}在 Klang 中有 ${fmtN(n)} 场即将上演的音乐会，${tail}。`
        : `${introNoteZh(p)}${p.placeZh.endsWith('附近') ? p.placeZh : `在${p.placeZh}`}有 ${fmtN(n)} 场即将上演的音乐会，${tail}。`);
    } else if (placeOnly && res.items.length > rows.length) {
      const n = findConcerts(p).length;
      const count = n === 1 ? 'one upcoming concert' : `${n.toLocaleString('en-US')} upcoming concerts`;
      const tail = n > MAX_ITEMS - rows.length ? 'here are the next ones' : n === 1 ? 'here it is' : 'here they are';
      const named = p.venueIds.length ? venueGroupLabel(p.venueIds) : rows.length ? p.placeLabel : '';
      const where = p.placeLabel.startsWith('near ') ? p.placeLabel : `in ${p.placeLabel}`;
      res.reply = named
        ? `${introNote(p)}${named} has ${count} in Klang — ${tail}.`
        : `${introNote(p)}There ${n === 1 ? 'is' : 'are'} ${count} ${where} — ${tail}.`;
    }
    return res;
  }
  if (p.nation) return answerPeople(p);
  if (p.works.length || p.missing.length) return answerWorks(p);
  if (p.composerIds.length) return answerComposers(p);
  if (p.artists.length) return answerArtists(p);
  if (p.roles.length) return answerPeople(p);
  if (p.forms.length) return answerConcerts(p);
  if (p.unknown.length || p.performer) {
    if (p.performer && !p.unknown.length) return answerRecording(p);
    return answerUnknown(p);
  }
  return answerHelp();
}

// ---------- feedback notes (this device only) ----------
export function feedbackNotes() {
  const list = storage.get(NOTES_KEY, []);
  return Array.isArray(list) ? list.filter((n) => n && typeof n.text === 'string') : [];
}

export function saveFeedback(note) {
  if (!note || !note.text) return;
  const list = [{ kind: note.kind || 'feedback', text: String(note.text).slice(0, 2000), at: new Date().toISOString() }, ...feedbackNotes()].slice(0, 100);
  storage.set(NOTES_KEY, list);
}
