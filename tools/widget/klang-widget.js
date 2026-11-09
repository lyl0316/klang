// KLANG-WIDGET 2: tomorrow's concerts on the iPhone Home Screen and Lock Screen.
// Runs in the free Scriptable app (scriptable.app). This file is a module: the small loader
// (klang-loader.js, the script people paste) downloads it on every run, keeps the last working copy
// on the phone, and calls main(). Edits here reach every phone at its next widget refresh.
// Setup page: https://lyl0316.github.io/klang/tools/widget/
// Data: data/widget.json (the next few days, written by tools/feeds/widget.py in the daily build).
// Widget parameter (long-press the widget > Edit Widget > Parameter): a country, for example
// Austria, or All. Empty means Switzerland. Tapping a concert opens it in Klang.
// Sizes: small, medium, large (Home Screen); accessoryRectangular, accessoryInline and
// accessoryCircular (Lock Screen, iOS 16+).

const SITE = "https://lyl0316.github.io/klang/";
const FEED = SITE + "data/widget.json";
const COUNTRIES = { switzerland: "Switzerland", austria: "Austria", germany: "Germany", france: "France", italy: "Italy", all: "" };
const SHORT = { ch: "switzerland", at: "austria", de: "germany", fr: "france", it: "italy", "瑞士": "switzerland", "奥地利": "austria", "德国": "germany", "法国": "france", "意大利": "italy", "全部": "all" };

function labels() {
  return Device.language().startsWith("zh")
    ? { tomorrow: "明天", short: "明天", more: (n) => `还有 ${n} 场`, count: (n) => `${n} 场音乐会`, inline: (n) => `明天 ${n} 场音乐会`, none: "明天没有音乐会", old: "节目单还没更新",
        fail: "无法加载音乐会", locale: "zh-CN", names: { switzerland: "瑞士", austria: "奥地利", germany: "德国", france: "法国", italy: "意大利", all: "全部" } }
    : { tomorrow: "Tomorrow", short: "tomorrow", more: (n) => `${n} more`, count: (n) => (n === 1 ? "1 concert" : `${n} concerts`),
        inline: (n) => `Tomorrow: ${n === 1 ? "1 concert" : `${n} concerts`}`, none: "No concerts tomorrow",
        old: "Listings not updated yet", fail: "Couldn't load concerts", locale: "en-GB", names: COUNTRIES };
}

function pickCountry() {
  const raw = (args.widgetParameter || "").trim().toLowerCase();
  if (!raw) return "switzerland";
  if (COUNTRIES[raw] !== undefined) return raw;
  return SHORT[raw] || "switzerland";
}

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

// Tomorrow's concerts for the chosen country, or a message explaining why there are none.
async function state() {
  const L = labels();
  const country = pickCountry();
  const data = await loadData();
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const key = ymd(tomorrow);
  let list = [];
  let message = null;
  if (!data) message = L.fail;
  else if (!(data.days || []).includes(key)) message = L.old;
  else {
    list = data.concerts.filter((c) => c.d === key && (country === "all" || c.k === country));
    if (!list.length) message = L.none;
  }
  return { L, country, tomorrow, list, message };
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
  row.url = SITE + "#/concert/" + encodeURIComponent(c.i);
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
  addText(col, c.v.includes(c.c) ? c.v : `${c.c} · ${c.v}`, 12, TEXT2);
  row.addSpacer();
}

function homeWidget(family, s) {
  const { L, country, tomorrow, list, message } = s;
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
  if (family !== "small" && L.names[country]) addText(head, L.names[country], 11, RED, true);
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
  const family = config.widgetFamily || "medium";
  const s = await state();
  const widget = family.startsWith("accessory") ? lockWidget(family, s) : homeWidget(family, s);
  widget.refreshAfterDate = new Date(Date.now() + 2 * 3600 * 1000);
  if (config.runsInWidget) Script.setWidget(widget);
  else await widget.presentMedium();
}

module.exports = { main, version: 2 };
