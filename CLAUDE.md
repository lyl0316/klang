# Klang: handoff notes for Claude agents

Read this first. It records how Klang is built, the owner's standing rules, the decisions already
made, and how to keep the daily concert feed healthy. The user-facing overview is `README.md`;
the feed collectors are documented in `tools/feeds/README.md`; the original screen-by-screen
spec is in `../spec/` (outside this repo).

State as of 14 Nov 2026: all CI runs green, the live feed has about 8,100 upcoming concerts from
119 active sources (Berliner Philharmoniker was switched off on 13 Nov, Sommets Musicaux de Gstaad on
14 Nov, see section 5). On 14 Nov the owner handed the repo over for a general review; what was
fixed and what was left is in section 7 ("Review of 14 Nov 2026") and section 8.

## 1. What Klang is

- A mobile web app (PWA) for classical concerts, modelled screen by screen on the iOS app
  **Sheng (响声)**. It covers Switzerland, plus the main cities of Austria, Germany, France and Italy.
- **Live:** <https://lyl0316.github.io/klang/>. **Repo:** `lyl0316/klang` (public), branch `main`.
  - Locally the repo is `/Users/yinistliu/Klang/app`. `/Users/yinistliu/Klang/spec` holds Sheng
    screenshots and the spec, and `/Users/yinistliu/Klang/klang-logo` holds logo drafts. Neither is in git.
  - The parent folder was `/Users/yinistliu/xiang` until 9 Nov 2026. If it is moved again, update
    `.claude/launch.json` and rerun `tools/feeds/mac/install.sh` (it writes the script path into the
    launchd job).
- **No build step, no dependencies.** The app is plain HTML, CSS and ES modules. The feed tools
  are Python 3.9+ with the standard library only.
- **Interface:** English and Simplified Chinese. Personal only: marks, follows, library and reviews
  live in the browser's localStorage. Nothing is sent to a server; Klang has no server.

## 2. Owner's rules (do not break these)

1. **No community or social features.** No other users, comments, following people or reactions.
2. **Free Apple interfaces only.** Use the iTunes Search/Lookup API, 30-second previews, and
   `music.apple.com` / `classical.music.apple.com` links.
   - **No MusicKit or Apple Music API**: they need a paid membership. On 5 Nov 2026 the owner
     chose free links over a real library sync.
3. **Never copy Sheng's data or texts.** Every concert must be real, read from the organiser's own site.
4. **Facts only from venue sites.** Take date, time, title, venue, performers, roles, works, status
   and links. Never copy descriptions, synopses or images.
5. **Politeness.** Respect robots.txt and crawl delays, one request at a time per host, request caps.
   - If a site's robots.txt blocks ClaudeBot or AI crawlers by name, Klang does not read it: write
     no reader, or set `ENABLED = False`.
   - Never work around captchas or bot protection, and send no POST requests.
   - Skip sites whose terms forbid this use.
   - **BR Symphonieorchester stays off** (owner's decision, 30 Oct 2026). Its legal notice allows
     retrieval with credit, but its robots.txt blocks ClaudeBot. Don't raise it again unless BR
     gives permission.
6. **Git:** commit as `69394222+lyl0316@users.noreply.github.com`, never a personal email:
   `git -c user.email=69394222+lyl0316@users.noreply.github.com commit …`.
   - Push to `main` directly; that is how this repo works, and a push deploys.
7. **iPhone Mirroring** (if available) may be used only for the Sheng app and for testing Klang on
   the owner's phone. Wait for animations before tapping, and never long-drag on the Home Screen.
8. Keep the owner informed in plain language. The owner is not a programmer and often writes in
   short sentences. They follow along from their phone.

## 3. Run and test

```bash
python3 tools/serve.py            # http://localhost:8765, caching off
```

- In Claude Code desktop, start it with `preview_start {name: "klang"}`
  (config: `/Users/yinistliu/Klang/.claude/launch.json`).
- **App tests:** open <http://localhost:8765/tests/test.html>. Currently "All 61 tests passed".
- **Feed tests:** `python3 tools/feeds/selftest.py` (88 tests, offline).
- **One reader against the live site:**

  ```bash
  cd tools/feeds && python3 build.py --only KEY[,KEY2] --previous none --out /tmp/x.json --show 3 -v
  ```

  - `--previous <live concerts.json>` lets incremental readers reuse cached details.
  - `--list` prints every reader and its credit.
- **Testing in a browser:**
  - A fresh browser profile may come up in Chinese.
  - After you edit a JS file, the page can keep a stale module. Unregister the service worker or
    fetch the file with `{cache: 'reload'}`, then reload.
  - A full reload lands on `#/discover`; set `location.hash` again afterwards.
  - Modules can be imported in the page for checks: `await import('/js/repo.js')`.
- **The local `data/concerts.json` is gitignored.** It may be an old test assembly. For realistic
  data, download the live feed:

  ```bash
  curl -s https://lyl0316.github.io/klang/data/concerts.json -o data/concerts.json
  ```

## 4. Deploy and the daily feed

- **Workflow:** `.github/workflows/pages.yml`. It runs on every push, daily by cron (`17 1 * * *` UTC;
  GitHub usually starts it hours late, around 07–11 UTC), and on demand.
  1. `tools/feeds/build.py` reads all sources: 8 at once (`--jobs`), one request at a time per
     host. A full run takes about 18–35 minutes.
     - On a push it runs with `--fresh-hours 20`, so sources read in the last 20 h with unchanged
       code are reused. A code-only push deploys in under a minute.
  2. `tools/feeds/check.py` writes `data/feed-report.json`.
  3. `node tools/widget/widget-feed.mjs` writes `data/widget.json` for the iPhone widget
     (`continue-on-error`, so it can never block a deploy). It is the only Node step: it imports the
     app's own `js/feed.js` and `js/repo.js` (`js/package.json` marks them as ES modules for Node).
  4. The site deploys, then the run is marked **failed** if the check failed. GitHub then emails
     the owner; that is what "I receive some emails" means.
- **check.py:**
  - **Fails** when:
    - a site can't be read two runs in a row, or it fails and its events are lost;
    - a source that had events now returns none;
    - a source's count drops below 30% of the previous feed;
    - the feed is more than 30 h old.
  - **Warns** (no failure) when a site is out for one day with its events kept, or when a new
    source fails on its first run.
  - A failing source always **keeps its previous events**, so users don't lose concerts during an outage.
- **Mac reminder** (owner's Mac): launchd job `~/Library/LaunchAgents/ch.klang.calendar-check.plist`
  runs `tools/feeds/mac/klang_check.py` at 08:30 and 18:30.
  - It shows a pop-up only on failure, and re-enables the workflow if GitHub pauses it.
  - Log: `~/Library/Logs/klang-calendar-check.log`.

### Playbook: "a run failed"

1. Look at the failures:

   ```bash
   gh run list --limit 10
   ```

   ```bash
   curl -s https://lyl0316.github.io/klang/data/feed-report.json | python3 -m json.tool
   ```

2. For each problem source, run it locally (section 3). Usually the site changed its markup:
   save the page with curl, compare it with the reader's regexes, and fix the reader.
   - Keep the old pattern as a fallback when cheap, and update the reader's docstring.
3. If the site now blocks us (robots.txt names AI crawlers, a captcha or bot challenge, a login),
   or never answers GitHub's servers but answers locally: set `ENABLED = False` with a dated
   comment saying why. Add it to the excluded list in `tools/feeds/README.md` (section
   "Outside Switzerland", or the Swiss list).
4. Run `python3 tools/feeds/selftest.py`, then commit and push. Watch the run:

   ```bash
   gh run watch <id> --exit-status
   ```

   Check that the report says `ok` and "N/N sources".
5. Tell the owner in plain words what broke, and that it's fixed.

Recent example (5 Nov 2026, commit `bdb75b6`):
- Quartetto di Milano started writing `data-options='…'` in single quotes.
- Volksoper Wien replaced its schema.org dates with `<time datetime>` plus plain `HH:MM` spans.

## 5. Feed collectors (`tools/feeds/`)

- **Readers:** `sources/<key>.py`, one per organiser, auto-discovered. The required attributes and
  helper functions are documented in `tools/feeds/README.md` ("Adding a source", "common.py reference").
  - Shared helpers are `sources/_*.py`: regional helpers (`_vienna`, `_berlin`, `_paris`,
    `_italy_north` …), `_consent.py` and `_geneva.py`.
- **`COUNTRY`:** `'switzerland'` (the default), `'austria'`, `'germany'`, `'france'` or `'italy'`.
  - Readers abroad give English city names ('Vienna', 'Munich', 'Milan').
  - build.py stamps `country` on their events and drops tour dates that fall in another country
    (`in_other_country`, using the city lists in `js/data/`).
  - De-duplication never merges events across countries.
- **codeHash:** each source's hash covers its own file, the `_*.py` helpers it imports, and `common.py`.
  - Editing `common.py` therefore makes the next run re-read every site. Do that sparingly.
- **Incremental readers** cap their detail-page requests (`MAX_REQUESTS`, up to
  `common.MAX_REQUESTS_CAP` = 150) and reuse the previous feed's details. After a reader change,
  the details fill in over a few daily runs.
  - Examples: Tonhalle, Opernhaus, Volksoper, Musikverein, Konzerthaus Wien.
- **robots.txt handling** is in `common._load_robots`:
  - An HTML "robots.txt" that is a bot-challenge page counts as blocked.
  - Any other HTML page means there are no rules.
- **Turned off** (`ENABLED = False`): concerts_romainmotier, wiener_staatsoper and
  teatro_comunale_bologna (AI blocks), sommets_musicaux (since 14 Nov 2026: its robots.txt names
  ClaudeBot), gaertnerplatztheater (no answer to GitHub's servers), and
  berliner_philharmoniker (since 13 Nov 2026: every request, robots.txt included, gets a
  bot-protection challenge; turn it on again if that goes away).
- **No reader at all**:
  - robots.txt AI blocks: Elbphilharmonie, BR/SWR, Salzburger Landestheater.
  - Terms: Theater an der Wien, Innsbruck Alte Musik.
  - Bot protection: Bayerische Staatsoper, San Carlo, Lille.
  - Calendar only behind blocked addresses or a login: Kölner Philharmonie, Salzburger Festspiele.
- **Accepted limitations:**
  - Alte Oper Frankfurt is about 75–80% complete.
  - Sinfonica di Milano lists about 2 weeks ahead.
  - Bregenz lists opera premieres only.
  - Opera singers are sometimes credited as 'Performer'.
  - Several summer festivals list 0 events between seasons. That is a warning, not an error.

## 6. App architecture (essentials)

| File | Role |
|---|---|
| `js/main.js` | Router (hash routes), tab bar, dock, mini player |
| `js/feed.js` | Loads `data/concerts.json`. Keeps a compact localStorage copy (`klang.feed.v1`, format `v: 3`) for instant starts: the marked concerts, as many coming days as fit (`TIERS`), and the past days in the countries of the user's place. The copy is read at the END of the module (see section 7). |
| `js/repo.js` | Concerts, cities, venues, works; `query()`; `programItems(c)` |
| `js/store.js` | All personal data (localStorage `klang.v1`), preferences, library, playlists |
| `js/i18n.js` + `js/i18n/zh-*.js` | `t('English text')` looks up the Chinese by the English key; untranslated strings stay English |
| `js/music.js`, `js/applemusic.js` | iTunes Search, previews, Apple Music links, Now listening |
| `js/ui/*.js` | Shared components: sheet, preview buttons, Listen, Save, `rednote.js` |
| `js/views/*.js` | One module per screen |
| `sw.js` | Service worker with an explicit shell file list and a `CACHE` version |

Rules and gotchas:

- **Place (Location).** `prefs.placeCityIds` keeps the place last confirmed in the Location sheet or in
  Me › Your region, and Klang opens there (`store.homePlace()`, else `regionCityIds`). The owner asked
  for this on 9 Nov 2026. Other ways of setting `filters.cityIds` (map, city page, Assistant, Your
  region › Other countries) are only for the current visit.
- **Concerts abroad.**
  - Their `cityId` is `country:<id>|<City>`, and they carry `country`.
  - `repo.query()` with no place filter shows **Switzerland only**. `cityIds: ['country:austria']`
    means the whole country.
  - Cities abroad are `{abroad: true, country}`, and `allCities()` leaves them out.
  - English and Chinese aliases for those cities are in `repo.js` (`ABROAD_ALIASES`) and in
    `assistant-engine.js`.
- **Service worker.** When you add a JS or CSS file, add it to the list in `sw.js`. When you change
  shell files, bump `CACHE` (currently `klang-shell-v15`). Otherwise installed Home Screen apps
  keep the old version.
- **Translations.**
  - Put new Chinese strings inside the file's **`export default { … }`** object.
  - Some zh files have a second export after it (for example `ZH_ROLES_MORE` in `zh-concert.js`).
    Appending at the end of the file puts strings in the wrong table; this happened once.
  - In Chinese, `t()` removes stray spaces between Chinese characters.
- **Style.**
  - Match the surrounding code: a header comment per module explaining the screen and how it
    maps to Sheng, plain DOM through `h()` from `util.js`, and icons from `util.js` ICONS.
  - CSS goes in the matching `css/area-*.css` or `css/shell.css`.
- **Dev server.** `tools/serve.py` redirects LAN clients to the public site, because an old Home
  Screen icon pointed at the Mac.
- **iTunes API.** Never send `media=music`: from an iPhone user agent it answers with a 301 to `musics://`.

## 7. Recent features (Nov 2026)

- **Review of 14 Nov 2026** (the owner: "the code repo is now yours, see what you can improve").
  Two read-only reviews (app code, feed pipeline) plus a scan of the live feed. Fixed:
  - **App: the saved copy of the listings was never read.** `let feed = readCache()` ran at the top
    of `js/feed.js`, before the helpers it calls existed; the error was swallowed. So every start
    waited for the 2 MB download, and past concerts (Look back, marks on past concerts) were lost the
    next day. Now read at the end of the module. The copy also stores `country` (without it concerts
    abroad counted as Swiss) and is trimmed by `TIERS`.
  - **App: storage.** The Apple lookup cache (`klang.itunes.v1`) is capped at 700 K characters and
    purged; `store.persist()` drops both caches before it gives up on saving the user's data.
  - **App: New Year mode** exports Strauss concerts of the user's place only, not of all five countries.
  - **Feed: wrong merges abroad.** Two venue names that share only the town ("Philharmonie Berlin" /
    "Deutsche Oper Berlin") merged, because only Swiss town names were ignored. Now `city_words()`
    takes the events' own town (also "Wien" for Vienna) out of the evidence; "Oper" is not "Alte
    Oper"; a main hall is not a named hall of the same building; ties go to the listing with the
    same performers. Tests: `MatchRules` in `selftest.py`.
  - **Feed: stable ids.** At equal priority a merge keeps the id the previous feed had
    (`build.STABLE_IDS`), so a saved concert does not lose its mark when the richer listing changes.
  - **Feed: titles all in capitals** become headlines (`build.calm_capitals`, also series and venue).
  - **Feed: notes as performers** fixed in `theatre_champs_elysees` and `capitole_toulouse`.
  - **Feed: robots.txt.** Loading one site's robots.txt no longer blocks every other site; a 429 on
    robots.txt is "unreachable", not "no rules"; a 429 on a page slows the whole host down.
  - **check.py:** a second failure on the same day (a push after the daily run) is a warning
    (`failedSince` in the feed's source entry); concerts that are over do not count as lost.
  - **build.py** stops (exit 2, nothing deployed) when the published feed cannot be loaded after
    three tries, instead of publishing a feed without yesterday's details.

- **Programme booklets** (owner's request, 13 Nov 2026): the concert page shows a "Programme booklet"
  row under the programme when the organiser's own concert page links one (Programmheft, programme
  de salle). Link only, never the text (rule 4).
  - `tools/feeds/booklets.py` runs after each source in `build.py`: for concerts in the next 14 days it
    reads the concert's page (at most 15 per source and run) and keeps the link as `bookletUrl`.
    Only the 25 sources in `booklets.RULES` are looked at, chosen from a survey of one or two pages
    per source. Two of them (Dresdner Philharmonie, Stiftung Mozarteum) keep all booklets on one
    page: that page is read once per run and a booklet is matched to a concert by day and name. Details and how to add a source: `tools/feeds/README.md`, "Programme booklets".
  - The app carries it through `js/feed.js` (compact copy), `js/repo.js` and `bookletLink()` in
    `js/views/concert.js`. It is separate from the "Program book" section, which is Klang's own notes.
  - Not covered: booklets behind a login (Gewandhaus shows them to card holders only, with a
    password; never work around it), booklets that are only sold (Opernhaus Zürich), and sites
    Klang doesn't read.
  - Most other organisers publish no booklet online. Booklets appear only close to the date, so a
    concert months away never has one yet.
- **iPhone widget** (`tools/widget/`, added 9 Nov 2026): tomorrow's concerts on the Home Screen and
  Lock Screen.
  - A PWA can't provide iOS widgets (still true in iOS 26), so it runs in the free **Scriptable** app.
    The owner compared six options on 9 Nov 2026 and chose this one.
  - `klang-loader.js` is what people paste, once. On every run it downloads `klang-widget.js` (a
    module: `module.exports = { main }`, must contain the `KLANG-WIDGET` marker), saves it as
    `klang-widget-latest.js` in Scriptable's local folder, runs it, and keeps `klang-widget-good.js`
    as the last working copy. **So a push to `klang-widget.js` updates every phone**; test it first.
  - `index.html` is the setup page (Copy button and steps), live at `/klang/tools/widget/`.
  - It reads `data/widget.json` (today plus 3 days, ~20 KB; the full feed is too big for a widget),
    written by `widget-feed.mjs` with Klang's own concert ids (`feed-…`) and city ids, so rows open
    `#/concert/<id>` and filter exactly like `repo.query`.
  - **Same place as Klang:** Me › "Show my cities in the widget" opens
    `scriptable:///run/Klang?place={"ids":[…],"label":"…"}` (the script must be named Klang). The
    widget saves it in Scriptable's Keychain and in a file, and uses it until sent again. A widget's
    own Parameter (a country, or All) wins over it.
  - **Automatic** (owner's request, 10 Nov 2026): Me › "Update the widget automatically"
    (`prefs.widgetAutoSync`, off by default) makes Klang open that link with `&auto=1` whenever the
    place changes, in the confirming tap (Location sheet's Show button; in Your region, the tap that
    leaves the page), since iOS only opens another app from a tap. The widget then saves quietly
    (no message, no preview) and the owner taps ◀ Klang to come back. `prefs.widgetSentKey` stops
    re-sends of an unchanged place. Code: `js/ui/widget.js`. A silent sync with no app switch would
    need a server, and Klang has none.
  - Sizes: small, medium, large, and Lock Screen accessoryRectangular / Inline / Circular.
  - To test without an iPhone, run the loader under a small stand-in for Scriptable's API (ListWidget,
    Request, FileManager, importModule, Font, Color, Size, Device, config, args, Script) with bun or node.
- **Share to RedNote** (`js/ui/rednote.js`, opened from the concert page: Share › 分享到小红书).
  - It draws a 1080×1440 picture card on a canvas from the listing's facts, with the organiser credited.
  - It writes an editable post title (at most 20 characters, RedNote's limit) and text with emoji
    lines and hashtags, in the interface language.
  - The text contains no links (RedNote hides posts with them); it names the organiser's site instead.
  - "Share picture" copies the text and calls `navigator.share({files})`. The copy is started
    synchronously inside the tap so iOS keeps the gesture.
  - There are also Save picture, Copy text, and Open RedNote (`xhsdiscover://`).
- **Library ↔ Apple Music** (`js/views/library.js`):
  - The "My Apple Music library ↗" row opens `LIBRARY_URL` in `applemusic.js`.
  - Each album sheet has "Add to Apple Music ↗" (the album page, where ＋ adds it), and playlists
    show a hint. A real sync would need MusicKit; see rule 2.
- **Concerts in Austria, Germany, France and Italy** (late Oct 2026): 65 readers abroad. Me ›
  Your region and the Location sheet's "Other countries" show the real counts.

## 8. Open items

- **Courtesy emails** (the owner hasn't decided). These venues' terms ask for consent:
  - Switzerland: Opernhaus Zürich, Casino Bern, Concorde Vernier, Kammerorchester Basel, OCL.
  - Abroad: Musikverein Wien, Konzerthaus Wien, styriarte, Mozarteum, Alte Oper Frankfurt, La Seine Musicale.
  - Draft emails only if the owner asks. Never send anything yourself.
- **Tiroler Landestheater** once blocked the Mac's IP after heavy local testing; CI still reads it.
  Don't hammer sites while testing: use `--only` and `--previous` with the live feed.
- **Before a public launch**, add Apple's "Listen on Apple Music" badge and trademark credit.
- **Left from the review of 14 Nov 2026** (not fixed, in order of use to the owner):
  - Composer, work and artist pages say "in Switzerland" but count the concerts of all five
    countries (`js/views/entity.js`, about 15 strings and their Chinese). Decide: count the user's
    place only, or reword.
  - Going Back to a long Concerts list lands near card 40, because the list renders in chunks of 40
    (`concerts.js`, `CHUNK`).
  - **Radio France:** its robots.txt blocks GPTBot, ChatGPT-User and Amazonbot by name, not ClaudeBot.
    Rule 5 can be read either way; the reader is still on. Ask the owner.
  - The previous feed holds only merged records, so a reader cannot reuse the details of a listing
    that another source absorbed (it re-reads those pages daily), and disabling a winning reader on a
    push drops the absorbed concerts until the next full run.
  - `check.py` compares counts after merging, so a source's count can fall when another reader starts
    listing the same concerts.
  - A listings refresh repaints the open page (a sheet open on a concert page closes).
  - An offline start counts as a fresh fetch (`fetchedAt`), so stale listings can show for up to 6 h.
