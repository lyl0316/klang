// KLANG-WIDGET 7: tomorrow's concerts on the iPhone Home Screen and Lock Screen, and a notification
// when a favourite composer, work or performer is on stage in your cities.
// Runs in the free Scriptable app (scriptable.app). This file is a module: the small loader
// (klang-loader.js, the script people paste) downloads it on every run, keeps the last working copy
// on the phone, and calls main(). Edits here reach every phone at its next widget refresh.
// Setup page: https://lyl0316.github.io/klang/tools/widget/
// Data: data/widget.json (the next few days with Klang's own concert and city ids, written by
// tools/widget/widget-feed.mjs in the daily build).
//
// Which concerts: the same place as Klang's Concerts tab. Me › iPhone widget in Klang opens
// scriptable:///run/Klang?place={"ids":[…],"label":"…"}; this script saves it on the phone and the
// widget filters with Klang's own rule (repo.query): no ids = Switzerland, a city id, or
// 'country:<id>' for a whole country. With &auto=1 (Klang's "Update the widget automatically", sent
// whenever the place changes) it saves quietly: no message, no preview, so ◀ Klang goes straight back. A widget's own Parameter (long-press › Edit Widget) wins over it:
// Switzerland, Austria, Germany, France, Italy or All. Tapping a concert opens it in Klang.
// Sizes: small, medium, large (Home Screen); accessoryRectangular, accessoryInline and
// accessoryCircular (Lock Screen, iOS 16+).
//
// Favourite alerts (21 Nov 2026): Klang can't push (it has no server), so the widget does it. The
// same link carries &favs={"on":1,"m":{id:name},"w":{…},"a":{…}} (composers, works, performers, with
// names in Klang's language; "on" is Me › Reminders › Favorite work on stage). Whenever the widget
// runs (iOS refreshes it a few times a day), it reads data/widget-alerts.json (the next 14 days with
// composer, work and artist ids), finds concerts in the saved place that name a favourite, and posts
// one local notification for the new ones. Each concert is announced once (klang-widget-alerted.json).
// No notifications at night: between 22:00 and 08:00 it waits for a later run.
//
// Tomorrow at 8 pm (owner's request, 21 Nov 2026): each run before 20:00 schedules (or replaces, same
// identifier) a notification for 20:00 with tomorrow's concerts in the saved place, favourites first
// (♥). iOS decides when widgets run, so if no run happened before 20:00 it is posted at the first run
// between 20:00 and 22:00, else skipped that day. "eve": 0 in &favs (Me › Reminders › Tomorrow's
// concerts) turns it off; without it the notification is on.

const SITE = "https://lyl0316.github.io/klang/";
const FEED = SITE + "data/widget.json";
const PLACE_KEY = "klang.widget.place";
const PLACE_FILE = "klang-widget-place.json";
const ALERTS = SITE + "data/widget-alerts.json";
const FAVS_KEY = "klang.widget.favs";
const FAVS_FILE = "klang-widget-favs.json";
const ALERTED_FILE = "klang-widget-alerted.json";
const ALERTS_MAX_AGE = 4 * 3600 * 1000; // read widget-alerts.json again after 4 hours
const EVENING_FILE = "klang-widget-evening.json"; // { day: "YYYY-MM-DD", at: ms } of the last evening notification
const EVENING_HOUR = 20;
const TEST_DELAY = 8000; // a test notification comes 8 seconds later: time to go to the Home Screen
const COUNTRIES = { switzerland: "Switzerland", austria: "Austria", germany: "Germany", france: "France", italy: "Italy", all: "" };
const SHORT = { ch: "switzerland", at: "austria", de: "germany", fr: "france", it: "italy", "瑞士": "switzerland", "奥地利": "austria", "德国": "germany", "法国": "france", "意大利": "italy", "全部": "all" };

function labels() {
  return Device.language().startsWith("zh")
    ? { tomorrow: "明天", short: "明天", more: (n) => `还有 ${n} 场`, count: (n) => `${n} 场音乐会`, inline: (n) => `明天 ${n} 场音乐会`, none: "明天没有音乐会", old: "节目单还没更新",
        fail: "无法加载音乐会", locale: "zh-CN", saved: (p) => `小组件现在显示${p}明天的音乐会。回到 Klang 即可。`, ok: "好",
        alertsOn: (names, p) => `${names}在${p}有演出时，Klang 会通知你。`, list: (a) => a.join("、"), some: (a, rest) => `${a.join("、")}等 ${a.length + rest} 个`,
        favOne: (names) => `${names}上演`, favMany: (n) => `你喜欢的音乐人和作品有 ${n} 场演出`, andMore: (n) => `还有 ${n} 场`,
        eveTitle: (n, p) => `明天${p}有 ${n} 场音乐会`,
        testSent: (n) => n ? `${n} 条测试通知会在几秒后到达。现在回到主屏幕或锁定 iPhone。` : "没有可以发送的内容：请先在 Klang 里标几个 ♥。",
        alertsReady: "提醒已开启", alertsReadyBody: (p) => `你喜欢的作曲家、作品或演奏家在${p}有演出时，Klang 会通知你。`,
        names: { switzerland: "瑞士", austria: "奥地利", germany: "德国", france: "法国", italy: "意大利", all: "全部" } }
    : { tomorrow: "Tomorrow", short: "tomorrow", more: (n) => `${n} more`, count: (n) => (n === 1 ? "1 concert" : `${n} concerts`),
        inline: (n) => `Tomorrow: ${n === 1 ? "1 concert" : `${n} concerts`}`, none: "No concerts tomorrow",
        old: "Listings not updated yet", fail: "Couldn't load concerts", locale: "en-GB",
        saved: (p) => `The widget now shows tomorrow's concerts in ${p}. You can go back to Klang.`, ok: "OK", names: COUNTRIES,
        alertsOn: (names, p) => `You'll get a notification when ${names} ${names.includes(",") || names.includes(" and ") ? "are" : "is"} on stage in ${p}.`,
        list: (a) => (a.length < 3 ? a.join(" and ") : `${a.slice(0, -1).join(", ")} and ${a[a.length - 1]}`), some: (a, rest) => `${a.join(", ")} and ${rest} more`,
        favOne: (names) => `${names} on stage`, favMany: (n) => `${n} concerts with your favourites`, andMore: (n) => `and ${n} more`,
        eveTitle: (n, p) => `Tomorrow in ${p}: ${n === 1 ? "1 concert" : `${n} concerts`}`,
        testSent: (n) => n ? `${n === 1 ? "A test notification arrives" : `${n} test notifications arrive`} in a few seconds. Go to the Home Screen or lock your iPhone now.` : "Nothing to send yet.",
        alertsReady: "Klang alerts are on", alertsReadyBody: (p) => `You'll hear here when a favourite composer, work or performer is on stage in ${p}.` };
}

// ----- the place and the favourites (sent from Klang, kept on the phone) -----
// Saved twice, in Scriptable's keychain and in a file, so the widget finds them either way.
function saveKept(key, file, value) {
  const json = JSON.stringify(value);
  try { Keychain.set(key, json); } catch (e) { /* the file below */ }
  try {
    const fm = FileManager.local();
    fm.writeString(fm.joinPath(fm.documentsDirectory(), file), json);
  } catch (e) { /* the keychain above */ }
}

function kept(key, file, ok) {
  try { if (Keychain.contains(key)) { const v = ok(JSON.parse(Keychain.get(key))); if (v) return v; } } catch (e) { /* try the file */ }
  try {
    const fm = FileManager.local();
    const path = fm.joinPath(fm.documentsDirectory(), file);
    if (fm.fileExists(path)) return ok(JSON.parse(fm.readString(path)));
  } catch (e) { /* none */ }
  return null;
}

const savePlace = (place) => saveKept(PLACE_KEY, PLACE_FILE, place);
const savedPlace = () => kept(PLACE_KEY, PLACE_FILE, (p) => (p && Array.isArray(p.ids) ? p : null));

// { on, m: { composerId: name }, w: { workId: title }, a: { artistId: name } }
function cleanFavs(f) {
  if (!f || typeof f !== "object") return null;
  const map = (x) => {
    const out = {};
    if (x && typeof x === "object") for (const [k, v] of Object.entries(x)) if (k) out[String(k)] = String(v || k);
    return out;
  };
  return { on: f.on !== 0 && f.on !== false, eve: f.eve !== 0 && f.eve !== false, m: map(f.m), w: map(f.w), a: map(f.a) };
}
const saveFavs = (favs) => saveKept(FAVS_KEY, FAVS_FILE, favs);
const savedFavs = () => kept(FAVS_KEY, FAVS_FILE, cleanFavs);
const favCount = (f) => (f ? Object.keys(f.m).length + Object.keys(f.w).length + Object.keys(f.a).length : 0);

// { ids, label } or { all: true, label: "" }
function pickPlace(L) {
  const raw = (args.widgetParameter || "").trim().toLowerCase();
  const k = COUNTRIES[raw] !== undefined ? raw : SHORT[raw];
  if (k === "all") return { all: true, ids: [], label: "" };
  if (k === "switzerland") return { ids: [], label: L.names.switzerland };
  if (k) return { ids: ["country:" + k], label: L.names[k] };
  return savedPlace() || { ids: [], label: L.names.switzerland };
}

// Klang's rule (js/repo.js query): no ids = Switzerland; else the concert's city, or its whole country.
function inPlace(c, place) {
  if (place.all) return true;
  if (!place.ids.length) return c.k === "switzerland";
  return place.ids.includes(c.y) || (c.k !== "switzerland" && place.ids.includes("country:" + c.k));
}

// ----- data -----
async function loadData() {
  const fm = FileManager.local();
  const file = fm.joinPath(fm.cacheDirectory(), "klang-widget.json");
  try {
    const req = new Request(FEED);
    req.timeoutInterval = 15;
    const data = await req.loadJSON();
    if (!data || !Array.isArray(data.concerts)) throw new Error("bad data");
    fm.writeString(file, JSON.stringify(data));
    return data;
  } catch (e) {
    return fm.fileExists(file) ? JSON.parse(fm.readString(file)) : null;
  }
}

function ymd(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function addText(stack, text, size, color, bold) {
  const t = stack.addText(text);
  t.font = bold ? Font.semiboldSystemFont(size) : Font.systemFont(size);
  if (color) t.textColor = color;
  t.lineLimit = 1;
  return t;
}

// Klang's concert ids start with "feed-" (older widget data had the bare feed id).
const concertURL = (c) => SITE + "#/concert/" + encodeURIComponent(String(c.i).startsWith("feed-") ? c.i : "feed-" + c.i);

// Tomorrow's concerts for the place, or a message explaining why there are none.
async function state() {
  const L = labels();
  const place = pickPlace(L);
  const data = await loadData();
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const key = ymd(tomorrow);
  let list = [];
  let message = null;
  if (!data) message = L.fail;
  else if (!(data.days || []).includes(key)) message = L.old;
  else {
    list = data.concerts.filter((c) => c.d === key && inPlace(c, place));
    if (!list.length) message = L.none;
  }
  return { L, place, tomorrow, list, message };
}

// ----- favourite alerts -----
async function loadAlerts() {
  const fm = FileManager.local();
  const file = fm.joinPath(fm.cacheDirectory(), "klang-widget-alerts.json");
  const cached = () => { try { return fm.fileExists(file) ? JSON.parse(fm.readString(file)) : null; } catch (e) { return null; } };
  try {
    const at = fm.fileExists(file) ? fm.modificationDate(file) : null;
    if (at && Date.now() - at.getTime() < ALERTS_MAX_AGE) { const c = cached(); if (c) return c; }
  } catch (e) { /* read it again */ }
  try {
    const req = new Request(ALERTS);
    req.timeoutInterval = 20;
    const data = await req.loadJSON();
    if (!data || !Array.isArray(data.concerts)) throw new Error("bad data");
    fm.writeString(file, JSON.stringify(data));
    return data;
  } catch (e) {
    return cached();
  }
}

function alertedFile() {
  const fm = FileManager.local();
  return { fm, path: fm.joinPath(fm.documentsDirectory(), ALERTED_FILE) };
}

// { concertId: day } for every concert already announced (kept until its day has passed)
function alerted() {
  const { fm, path } = alertedFile();
  try { return fm.fileExists(path) ? JSON.parse(fm.readString(path)) || {} : {}; } catch (e) { return {}; }
}

function saveAlerted(map) {
  const { fm, path } = alertedFile();
  const today = ymd(new Date());
  const keep = {};
  for (const [id, day] of Object.entries(map)) if (String(day) >= today) keep[id] = day;
  try { fm.writeString(path, JSON.stringify(keep)); } catch (e) { /* announced again next time at worst */ }
}

// The favourites a concert names: works first, then composers, then performers.
function hitsOf(c, favs) {
  const names = [];
  const add = (n) => { if (n && !names.includes(n)) names.push(n); };
  (c.w || []).forEach((id) => add(favs.w[id]));
  (c.m || []).forEach((id) => add(favs.m[id]));
  (c.a || []).forEach((id) => add(favs.a[id]));
  return names;
}

const startOf = (c) => new Date(`${c.d}T${/^\d\d:\d\d$/.test(c.t || "") ? c.t : "23:59"}:00`);

// New concerts with a favourite in the place, in time order: [{ c, names }]
function newMatches(data, favs, place, done, now) {
  if (!data || !Array.isArray(data.concerts)) return [];
  return data.concerts
    .filter((c) => !done[c.i] && inPlace(c, place) && startOf(c) > now)
    .map((c) => ({ c, names: hitsOf(c, favs) }))
    .filter((x) => x.names.length);
}

function shortNames(L, names, max = 2) {
  return names.length > max ? L.some(names.slice(0, max), names.length - max) : L.list(names);
}

function venueOf(c) {
  const plain = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return c.v && plain(c.v).includes(plain(c.c)) ? c.v : [c.v, c.c].filter(Boolean).join(", ");
}

// Posts one notification for the favourites newly on stage. foreground: Klang just opened the
// script (any hour is fine, and iOS can ask for permission to notify there).
// test: Klang's "Send a test notification" (any hour, already announced concerts too, delivered a few
// seconds later so there is time to leave Scriptable; what it shows counts as announced).
async function alertFavourites(L, { foreground = false, confirm = false, test = false } = {}) {
  const favs = savedFavs();
  if (!favs || (!favs.on && !test) || !favCount(favs)) return 0;
  const now = new Date();
  if (!foreground && (now.getHours() < 8 || now.getHours() >= 22)) return 0;
  const place = savedPlace() || { ids: [], label: L.names.switzerland };
  const placeName = place.label || L.names.switzerland;
  const data = await loadAlerts();
  const done = test ? {} : alerted();
  const found = newMatches(data, favs, place, done, now);
  const day = (c) => startOf(c).toLocaleDateString(L.locale, { weekday: "short", day: "numeric", month: "short" });
  const n = new Notification();
  n.threadIdentifier = "klang-favourites";
  n.identifier = (test ? "klang-test-favourites-" : "klang-favourites-") + now.getTime();
  if (found.length === 1) {
    const { c, names } = found[0];
    n.title = L.favOne(shortNames(L, names));
    n.body = `${day(c)} ${c.t} · ${c.n}\n${venueOf(c)}`;
    n.openURL = concertURL(c);
  } else if (found.length > 1) {
    const max = 5;
    const lines = found.slice(0, max).map(({ c, names }) => `${day(c)} ${c.t} · ${shortNames(L, names, 1)} · ${c.c || c.v}`);
    if (found.length > max) lines.push(L.andMore(found.length - max));
    n.title = L.favMany(found.length);
    n.body = lines.join("\n");
    n.openURL = concertURL(found[0].c);
  } else if (confirm || test) {
    n.title = L.alertsReady;
    n.body = L.alertsReadyBody(placeName);
    n.openURL = SITE + "#/activity";
  } else {
    return 0;
  }
  if (test) n.setTriggerDate(new Date(now.getTime() + TEST_DELAY));
  try {
    await n.schedule();
  } catch (e) {
    return 0; // not allowed to notify: try again next time
  }
  const record = test ? alerted() : done; // a test counts as the announcement: no repeat later
  for (const { c } of found) record[c.i] = c.d;
  saveAlerted(record);
  if (test) return Math.max(found.length, 1);
  return found.length;
}

// ----- tomorrow's concerts at 8 pm -----
function eveningState() {
  const fm = FileManager.local();
  const path = fm.joinPath(fm.documentsDirectory(), EVENING_FILE);
  let last = null;
  try { last = fm.fileExists(path) ? JSON.parse(fm.readString(path)) : null; } catch (e) { /* none */ }
  return { last, save: (v) => { try { fm.writeString(path, JSON.stringify(v)); } catch (e) { /* once more at worst */ } } };
}

async function eveningNotice(L, { test = false } = {}) {
  const favs = savedFavs();
  if (favs && !favs.eve && !test) return false;
  const now = new Date();
  const today = ymd(now);
  const at = new Date(now.getFullYear(), now.getMonth(), now.getDate(), EVENING_HOUR, 0, 0);
  const { last, save } = eveningState();
  const before = now < at;
  // after 20:00: only if nothing was scheduled for today yet, and not at night
  if (!test && !before && ((last && last.day === today) || now.getHours() >= 22)) return false;
  const data = await loadData();
  const tomorrow = ymd(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  if (!data || !(data.days || []).includes(tomorrow)) return false; // listings not updated yet: try next run
  const place = savedPlace() || { ids: [], label: L.names.switzerland };
  const where = place.label || L.names.switzerland;
  const list = data.concerts.filter((c) => c.d === tomorrow && inPlace(c, place));
  // favourites first (♥), then by time
  let loved = new Set();
  if (favs && favCount(favs)) {
    const alerts = await loadAlerts();
    for (const c of (alerts && alerts.concerts) || []) if (c.d === tomorrow && hitsOf(c, favs).length) loved.add(c.i);
  }
  const sorted = [...list].sort((a, b) => (loved.has(b.i) - loved.has(a.i)) || a.t.localeCompare(b.t));
  const id = (test ? "klang-test-tomorrow-" : "klang-tomorrow-") + today; // a later run before 20:00 replaces it
  if (!list.length && test) return false;
  if (!list.length) { // nothing tomorrow: no notification (and none left from an earlier place)
    try { await Notification.removePending([id]); } catch (e) { /* none pending */ }
    save({ day: today, at: 0 });
    return false;
  }
  const oneCity = place.ids.length === 1 && !place.ids[0].startsWith("country:");
  const max = 5;
  const lines = sorted.slice(0, max).map((c) => `${loved.has(c.i) ? "♥ " : ""}${c.t} ${c.n}${oneCity ? "" : ` · ${c.c}`}`);
  if (list.length > max) lines.push(L.andMore(list.length - max));
  const n = new Notification();
  n.identifier = id;
  n.threadIdentifier = "klang-tomorrow";
  n.title = L.eveTitle(list.length, where);
  n.body = lines.join("\n");
  n.openURL = list.length === 1 ? concertURL(list[0]) : SITE + "#/concerts";
  if (test) n.setTriggerDate(new Date(now.getTime() + TEST_DELAY));
  else if (before) n.setTriggerDate(at);
  try {
    await n.schedule();
  } catch (e) {
    return false;
  }
  if (test) return true;
  save({ day: today, at: (before ? at : now).getTime() });
  return true;
}

// Lock Screen: the system tints these, so they use plain white text and no colours.
function lockWidget(family, s) {
  const { L, list, message } = s;
  const w = new ListWidget();
  w.url = SITE + "#/concerts";
  if (family === "accessoryInline") {
    w.addText(message ? `Klang: ${message}` : L.inline(list.length));
    return w;
  }
  if (family === "accessoryCircular") {
    w.addAccessoryWidgetBackground = true;
    const col = w.addStack();
    col.layoutVertically();
    col.centerAlignContent();
    const top = col.addStack();
    top.addSpacer();
    addText(top, message ? "–" : String(list.length), 24, null, true);
    top.addSpacer();
    const bottom = col.addStack();
    bottom.addSpacer();
    addText(bottom, L.short, 10);
    bottom.addSpacer();
    return w;
  }
  addText(w, message ? "Klang" : `${L.tomorrow} · ${L.count(list.length)}`, 14, null, true);
  if (message) addText(w, message, 12);
  else list.slice(0, 2).forEach((c) => addText(w, `${c.t} ${c.n}`, 12));
  w.addSpacer();
  return w;
}

function concertRow(w, c, family, colors) {
  const { RED, TEXT, TEXT2 } = colors;
  const row = w.addStack();
  row.url = concertURL(c);
  if (family === "small") {
    row.layoutVertically();
    addText(row, `${c.t}  ${c.c}`, 11, TEXT2);
    addText(row, c.n, 13, TEXT, true);
    return;
  }
  row.centerAlignContent();
  const timeBox = row.addStack();
  timeBox.size = new Size(44, 0);
  addText(timeBox, c.t, 13, RED).font = Font.semiboldMonospacedSystemFont(13);
  timeBox.addSpacer();
  row.addSpacer(4);
  if (family === "medium") {
    addText(row, c.n, 13, TEXT, true);
    row.addSpacer(6);
    row.addSpacer();
    const cityBox = row.addStack();
    cityBox.size = new Size(76, 0);
    cityBox.addSpacer();
    addText(cityBox, c.c, 12, TEXT2);
    return;
  }
  const col = row.addStack();
  col.layoutVertically();
  addText(col, c.n, 14, TEXT, true);
  const plain = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const venue = c.v && plain(c.v).includes(plain(c.c)) ? c.v : [c.c, c.v].filter(Boolean).join(" · ");
  addText(col, venue, 12, TEXT2);
  row.addSpacer();
}

function homeWidget(family, s) {
  const { L, place, tomorrow, list, message } = s;
  const colors = {
    RED: Color.dynamic(new Color("#b8343f"), new Color("#e4606a")),
    TEXT: Color.dynamic(new Color("#1b1a19"), new Color("#f3f1ee")),
    TEXT2: Color.dynamic(new Color("#55514c"), new Color("#b9b5af")),
  };
  const { RED, TEXT, TEXT2 } = colors;
  const w = new ListWidget();
  w.backgroundColor = Color.dynamic(new Color("#ffffff"), new Color("#161619"));
  w.setPadding(14, 14, 12, 14);
  w.url = SITE + "#/concerts";

  const head = w.addStack();
  head.centerAlignContent();
  addText(head, L.tomorrow, family === "small" ? 15 : 16, TEXT, true);
  if (family !== "small") {
    head.addSpacer(6);
    addText(head, tomorrow.toLocaleDateString(L.locale, { weekday: "short", day: "numeric", month: "short" }), 12, TEXT2);
  }
  head.addSpacer();
  if (family !== "small" && place.label) addText(head, place.label, 11, RED, true);
  w.addSpacer(family === "large" ? 10 : 8);

  if (message) {
    addText(w, message, 13, TEXT2);
    w.addSpacer();
    return w;
  }
  const max = { small: 3, medium: 4, large: 7 }[family] || 4;
  const shown = list.length > max ? list.slice(0, max - 1) : list;
  shown.forEach((c, i) => {
    if (i) w.addSpacer(family === "large" ? 8 : family === "small" ? 5 : 6);
    concertRow(w, c, family, colors);
  });
  w.addSpacer();
  if (list.length > shown.length) addText(w, L.more(list.length - shown.length), 11, TEXT2);
  return w;
}

async function main() {
  // Sent from Klang (Me › iPhone widget): keep the place and the favourites, say so, then show the preview.
  const q = args.queryParameters || {};
  const L = labels();
  let sentFavs = null;
  if (q.place && !config.runsInWidget) {
    try {
      const p = JSON.parse(q.place);
      if (Array.isArray(p.ids)) {
        const place = { ids: p.ids.map(String), label: String(p.label || "") };
        savePlace(place);
        if (q.favs) {
          sentFavs = cleanFavs(JSON.parse(q.favs));
          if (sentFavs) saveFavs(sentFavs);
        }
        if (!q.auto && !q.test) {
          const where = place.label || L.names.switzerland;
          const a = new Alert();
          a.title = "Klang";
          const all = sentFavs ? [...Object.values(sentFavs.w), ...Object.values(sentFavs.m), ...Object.values(sentFavs.a)] : [];
          a.message = L.saved(where) + (sentFavs && sentFavs.on && all.length ? "\n\n" + L.alertsOn(shortNames(L, all, 3), where) : "");
          a.addAction(L.ok);
          await a.present();
        }
      }
    } catch (e) { /* not a place from Klang: just show the widget */ }
  }
  // Klang's "Send a test notification": both kinds now, nothing recorded, then say so.
  if (q.test && !config.runsInWidget) {
    let sent = 0;
    try { if (await eveningNotice(L, { test: true })) sent++; } catch (e) { /* the other one */ }
    try { if (await alertFavourites(L, { foreground: true, test: true })) sent++; } catch (e) { /* none */ }
    const a = new Alert();
    a.title = "Klang";
    a.message = L.testSent(sent);
    a.addAction(L.ok);
    await a.present();
    Script.complete();
    return;
  }
  // Favourite alerts: on every run; a manual send from Klang confirms with a first notification.
  try {
    await alertFavourites(L, { foreground: !config.runsInWidget, confirm: !!(sentFavs && !q.auto) });
  } catch (e) { /* the widget below matters more */ }
  try {
    await eveningNotice(L);
  } catch (e) { /* the widget below matters more */ }
  if (q.place && q.auto && !config.runsInWidget) { Script.complete(); return; } // sent automatically: nothing to show
  const family = config.widgetFamily || "medium";
  const s = await state();
  const widget = family.startsWith("accessory") ? lockWidget(family, s) : homeWidget(family, s);
  widget.refreshAfterDate = new Date(Date.now() + 2 * 3600 * 1000);
  if (config.runsInWidget) Script.setWidget(widget);
  else await widget.presentMedium();
}

module.exports = { main, version: 7 };
