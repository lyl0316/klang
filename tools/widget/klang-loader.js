// Klang: tomorrow's concerts on the iPhone Home Screen and Lock Screen (Scriptable widget).
// Paste this once into Scriptable. Each time it runs it fetches the latest widget from the Klang
// site, so it never needs pasting again. Setup: https://lyl0316.github.io/klang/tools/widget/
const CODE_URL = "https://lyl0316.github.io/klang/tools/widget/klang-widget.js";
const fm = FileManager.local();
const file = (name) => fm.joinPath(fm.documentsDirectory(), name + ".js");
const LATEST = "klang-widget-latest";
const GOOD = "klang-widget-good";

try {
  const req = new Request(CODE_URL);
  req.timeoutInterval = 15;
  const code = await req.loadString();
  if (code.includes("KLANG-WIDGET") && code.includes("module.exports")) fm.writeString(file(LATEST), code);
} catch (e) {
  // Offline: use the copy already on this iPhone.
}

// Scriptable finds modules by name in its local folder; the full path is the fallback.
const load = (name) => {
  try { return importModule(name); } catch (e) { return importModule(file(name)); }
};
let shown = false;
for (const name of [LATEST, GOOD]) {
  if (shown || !fm.fileExists(file(name))) continue;
  try {
    await load(name).main();
    if (name === LATEST) fm.writeString(file(GOOD), fm.readString(file(LATEST)));
    shown = true;
  } catch (e) {
    console.error(`Klang widget (${name}): ${e}`);
  }
}
if (!shown) {
  const w = new ListWidget();
  w.addText("Klang: connect to the internet and open the widget once.").font = Font.systemFont(12);
  if (config.runsInWidget) Script.setWidget(w);
  else await w.presentSmall();
}
Script.complete();
