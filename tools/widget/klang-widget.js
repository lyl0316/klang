// KLANG-WIDGET 3: tomorrow's concerts on the iPhone Home Screen and Lock Screen.
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
// 'country:<id>' for a whole country. A widget's own Parameter (long-press › Edit Widget) wins over it:
// Switzerland, Austria, Germany, France, Italy or All. Tapping a concert opens it in Klang.
// Sizes: small, medium, large (Home Screen); accessoryRectangular, accessoryInline and
// accessoryCircular (Lock Screen, iOS 16+).

const SITE = "https://lyl0316.github.io/klang/";
const FEED = SITE + "data/widget.json";
const PLACE_KEY = "klang.widget.place";
const PLACE_FILE = "klang-widget-place.json";
const COUNTRIES = { switzerland: "Switzerland", austria: "Austria", germany: "Germany", france: "France", italy: "Italy", all: "" };
const SHORT = { ch: "switzerland", at: "austria", de: "germany", fr: "france", it: "italy", "瑞士": "switzerland", "奥地利": "austria", "德国": "germany", "法国": "france", "意大利": "italy", "全部": "all" };

function labels() {
  return Device.language().startsWith("zh")
    ? { tomorrow: "明天", short: "明天", more: (n) => `还有 ${n} 场`, count: (n) => `${n} 场音乐会`, inline: (n) => `明天 ${n} 场音乐会`, none: "明天没有音乐会", old: "节目单还没更新",
        fail: "无法加载音乐会", locale: "zh-CN", saved: (p) => `小组件现在显示${p}明天的音乐会。回到 Klang 即可。`, ok: "好",
        names: { switzerland: "瑞士", austria: "奥地利", germany: "德国", france: "法国", italy: "意大利", all: "全部" } }
    : { tomorrow: "Tomorrow", short: "tomorrow", more: (n) => `${n} more`, count: (n) => (n === 1 ? "1 concert" : `${n} concerts`),
        inline: (n) => `Tomorrow: ${n === 1 ? "1 concert" : `${n} concerts`}`, none: "No concerts tomorrow",
        old: "Listings not updated yet", fail: "Couldn't load concerts", locale: "en-GB",
        saved: (p) => `The widget now shows tomorrow's concerts in ${p}. You can go back to Klang.`, ok: "OK", names: COUNTRIES };
}

// ----- the place (sent from Klang, kept on the phone) -----
// Saved twice, in Scriptable's keychain and in a file, so the widget finds it either way.
function savePlace(place) {
  const json = JSON.stringify(place);
  try { Keychain.set(PLACE_KEY, json); } catch (e) { /* the file below */ }
  try {
    const fm = FileManager.local();
    fm.writeString(fm.joinPath(fm.documentsDirectory(), PLACE_FILE), json);
  } catch (e) { /* the keychain above */ }
}

function savedPlace() {
  const ok = (p) => p && Array.isArray(p.ids) ? p : null;
  try { if (Keychain.contains(PLACE_KEY)) { const p = ok(JSON.parse(Keychain.get(PLACE_KEY))); if (p) return p; } } catch (e) { /* try the file */ }
  try {
    const fm = FileManager.local();
    const file = fm.joinPath(fm.documentsDirectory(), PLACE_FILE);
    if (fm.fileExists(file)) return ok(JSON.parse(fm.readString(file)));
  } catch (e) { /* none */ }
  return null;
}

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
  // Sent from Klang (Me › iPhone widget): keep the place, say so, then show the preview.
  const sent = (args.queryParameters || {}).place;
  if (sent && !config.runsInWidget) {
    try {
      const p = JSON.parse(sent);
      if (Array.isArray(p.ids)) {
        const place = { ids: p.ids.map(String), label: String(p.label || "") };
        savePlace(place);
        const L = labels();
        const a = new Alert();
        a.title = "Klang";
        a.message = L.saved(place.label || L.names.switzerland);
        a.addAction(L.ok);
        await a.present();
      }
    } catch (e) { /* not a place from Klang: just show the widget */ }
  }
  const family = config.widgetFamily || "medium";
  const s = await state();
  const widget = family.startsWith("accessory") ? lockWidget(family, s) : homeWidget(family, s);
  widget.refreshAfterDate = new Date(Date.now() + 2 * 3600 * 1000);
  if (config.runsInWidget) Script.setWidget(widget);
  else await widget.presentMedium();
}

module.exports = { main, version: 3 };
