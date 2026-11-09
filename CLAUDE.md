# Klang: handoff notes for Claude agents

Read this first. It records how Klang is built, the owner's standing rules, the decisions already
made, and how to keep the daily concert feed healthy. The user-facing overview is `README.md`;
the feed collectors are documented in `tools/feeds/README.md`; the original screen-by-screen
spec is in `../spec/` (outside this repo).

State as of 9 Nov 2026: last commit `45c993d`, all CI runs green, the live feed has about 8,500
upcoming concerts from 121/121 active sources.

## 1. What Klang is

- A mobile web app (PWA) for classical concerts, modelled screen by screen on the iOS app
  **Sheng (响声)**. It covers Switzerland, plus the main cities of Austria, Germany, France and Italy.
- **Live:** <https://lyl0316.github.io/klang/>. **Repo:** `lyl0316/klang` (public), branch `main`.
  - Locally the repo is `/Users/yinistliu/xiang/app`. `/Users/yinistliu/xiang/spec` holds Sheng
    screenshots and the spec, and `/Users/yinistliu/xiang/klang-logo` holds logo drafts. Neither is in git.
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
  (config: `/Users/yinistliu/xiang/.claude/launch.json`).
- **App tests:** open <http://localhost:8765/tests/test.html>. Currently "All 60 tests passed".
- **Feed tests:** `python3 tools/feeds/selftest.py` (69 tests, offline).
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
  3. The site deploys, then the run is marked **failed** if the check failed. GitHub then emails
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
  - Examples: Tonhalle, Opernhaus, Volksoper, Musikverein, Konzerthaus Wien, Berliner Philharmoniker.
- **robots.txt handling** is in `common._load_robots`:
  - An HTML "robots.txt" that is a bot-challenge page counts as blocked.
  - Any other HTML page means there are no rules.
- **Turned off** (`ENABLED = False`): concerts_romainmotier, wiener_staatsoper and
  teatro_comunale_bologna (AI blocks), and gaertnerplatztheater (no answer to GitHub's servers).
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
| `js/feed.js` | Loads `data/concerts.json`. Keeps a compact localStorage copy for instant starts, in size tiers `[null, 240, 120, 60, 30, 14]` days. |
| `js/repo.js` | Concerts, cities, venues, works; `query()`; `programItems(c)` |
| `js/store.js` | All personal data (localStorage `klang.v1`), preferences, library, playlists |
| `js/i18n.js` + `js/i18n/zh-*.js` | `t('English text')` looks up the Chinese by the English key; untranslated strings stay English |
| `js/music.js`, `js/applemusic.js` | iTunes Search, previews, Apple Music links, Now listening |
| `js/ui/*.js` | Shared components: sheet, preview buttons, Listen, Save, `rednote.js` |
| `js/views/*.js` | One module per screen |
| `sw.js` | Service worker with an explicit shell file list and a `CACHE` version |

Rules and gotchas:

- **Concerts abroad.**
  - Their `cityId` is `country:<id>|<City>`, and they carry `country`.
  - `repo.query()` with no place filter shows **Switzerland only**. `cityIds: ['country:austria']`
    means the whole country.
  - Cities abroad are `{abroad: true, country}`, and `allCities()` leaves them out.
  - English and Chinese aliases for those cities are in `repo.js` (`ABROAD_ALIASES`) and in
    `assistant-engine.js`.
- **Service worker.** When you add a JS or CSS file, add it to the list in `sw.js`. When you change
  shell files, bump `CACHE` (currently `klang-shell-v11`). Otherwise installed Home Screen apps
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
