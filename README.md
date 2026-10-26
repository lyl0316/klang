# Klang: Swiss classical concerts

A mobile web app for following classical concerts across Switzerland, modelled screen by screen on the iOS app **Sheng (响声)**. Every concert in it is real: the listings are read each morning from the venues' and orchestras' own websites (see [Data](#data)). It covers the 47 Swiss cities in Sheng's Switzerland filter and every other Swiss town those listings name.

The interface is in **English or Simplified Chinese (简体中文)** (see [Interface language](#interface-language)).

It's personal only: no social features. You save concerts, mark them Going or Attended, keep private reviews, and follow cities, venues, composers, performers and works.

## Run it

**Online:** <https://lyl0316.github.io/klang/>. On an iPhone, open it in Safari and choose **Share → Add to Home Screen**. It then opens full screen like an app, works away from home, and keeps working offline after the first visit.

**Locally**, from this folder:

```bash
python3 tools/serve.py
```

Then open <http://localhost:8765>. The server turns caching off, so edits show up on reload.

To run the tests, open `tests/test.html` (locally <http://localhost:8765/tests/test.html>). There are 41, covering:
- cities, venues and repertoire, and a fixed-seed test generator (synthetic concerts for these tests only: a test checks that the app never shows them);
- Swiss time handling, and matching listings to towns, venues, composers and works (German, French and Italian spellings);
- the real listings: feed entries becoming concerts, Featured, the 120-day Look back window, and Sheng's countries;
- the interface languages (English and 简体中文);
- calendar import/export and JSON feed import;
- the local assistant;
- favourites, library, hidden concerts, reminders, marks, and backup and restore;
- listening: Apple Music Classical / Apple Music links, Now listening, your own playlists, and listens on the timeline.

The feed collectors have their own offline tests: `python3 tools/feeds/selftest.py`.

There's no build step and no dependencies: plain HTML, CSS and JavaScript modules.

## What's in it

Klang follows Sheng's layout: five tabs, plus a dock with the mini player, which shows the 30-second preview playing (with time left, ▶/❚❚ and ⏭) or what you last opened in Apple Music Classical. As you scroll, the dock collapses into one pill: [current tab] [mini player] [search]. The colours are Sheng's dark palette, measured from its screenshots; there's also a light mode.

| Tab | What it does |
|---|---|
| **Discover** | Album collage from Apple's Swiss classical chart, an editorial hero, **Concerts** and **Assistant** buttons, **Today's Pick** (a daily masonry of works and programmes), **Widely Loved** (good for newcomers: Solo, Symphonic, Chamber, Vocal) and **New on Record**. The profile button opens **Me**. |
| **Concerts** | Sheng's Concerts tab for Switzerland. See below. |
| **Activity** | Personal only: My concerts (Attended, Saved, Going), My Favorites (composers, artists, works), Following (venues and cities) and a timeline of your own activity, including the pieces you open in Apple Music Classical. A bell opens in-app notifications. |
| **Library** | **Albums** you save, **your own playlists of pieces** (New playlist…, add from any Save button, reorder, rename, delete), concert and article playlists ("Add playlist to my Library"), and Recently added. ▶ and Play all preview 30 seconds of each piece in Klang; ↗ and Apple Music Classical open them in full. |
| **Search** | A local **Assistant** ("Just say what you're after"). Type "Mahler in Zurich in November", "chamber music in Geneva this weekend" or "a slower Goldbergs" and it answers with concerts, works, people or recordings. It also takes Chinese questions ("本周末 日内瓦 室内乐", "苏黎世 马勒") and answers in Chinese. It runs on the device, with no AI service and no quota. |

The **Concerts** tab has:
- **Filter chips at the top:** Date · Switzerland · All types · ✓ Featured only (on by default). A Favourites chip appears once you have favourites.
- **A flat list** like Sheng's, of real concerts. Each card shows "Tomorrow Oct 27 · Venue · City", then a bold centred title, series, performers and the programme, as the organiser published them. The list ends with "That's all the venues have published so far", the number of sources and when they were updated.
- **Pull to refresh:** reloads the day's listings (and your own feed URL, if you saved one), then says "Up to date" or "N new concerts".
- **Date sheet:** shows relative event density as 1–3 dots. "Jump to Oct 30 · Fri" scrolls the list to that day. Picking a past day asks you to **pick one city to look back**.
- **Location sheet:** "Current country: Switzerland", with every city selected to start and its real count. Tap a city to exclude it, and the button changes from "Confirm" to "Show N events". You can search cities, cantons and countries, and a Map link opens the city map.
  - **Other countries ›** lists Sheng's 47 countries, with each country's regions and cities. Klang has no listings outside Switzerland yet, so they show 0 events and a short note; **Back to Switzerland** returns.
- **Type sheet:** works the same way.
- **Month rail:** tap a month, press and slide to pick a week, or slide left to pick a day.

**Concert page**, in Sheng's order:
1. Back and Share. The share sheet also has Copy link, Add to calendar (an .ics file with reminders) and Hide.
2. Header, then the action tiles: Listen, Program, Notes, Podcasts, Ticket.
3. Save + Going, or Save + Attended (with a private review) once the concert has started.
4. A **Listen** carousel with one recording per work, also for works Klang's repertoire doesn't know (found by composer and title as listed). **▶ Preview** plays Apple's 30-second previews of the work's movements inside Klang (tap again to pause), and **Apple Music Classical ↗** opens the same recording at that piece, where it plays in full. **Versions** picks another recording, and **Save** adds the album to your Library or the piece to one of your playlists. **▶ Play all** previews the whole programme in order; **Open in Apple Music Classical** opens the first work with the rest queued (⏭ in the mini player opens the next one). "Add playlist to my Library" keeps the whole programme.
5. **Program** (performers and works exactly as listed), then a **Program book**: an original note for each work Klang knows (104 in the repertoire), with a "Listen for" line and a full-screen reader.
6. **Podcasts** (Apple Podcasts episodes), **Featured artists**, "**Listing from** <organiser> · **Details & tickets ›**" with the source's credit, and Report a problem.

**Other pages:**
- **Work:** Listening guide, Recordings (tap a cover for the 30-second preview, "Classical ↗" to play it in full in Apple Music Classical; + saves it) and Concerts.
- **Composer:** Read Bio, Latest releases, Popular among listeners, Explore by period, genre or related composers, Editorials and Swiss concerts.
- **Artist:** the performer's roles in the listings, an "On tour" route when the dates are in two or more Swiss cities, plus a Full Itinerary page.
- **Venue and city pages.**
- **Editorials:** original articles with a Swiss angle, including recording and concert embeds.
- **Me:** **Language · 语言**, Push preferences (in-app notifications and calendar alarms), Your region (with Sheng's other countries), Hidden concerts, New Year mode, appearance, **Play in** (Apple Music Classical or Apple Music), and Data & imports.
- **Now listening:** tap the mini player for a full-height view in Sheng's player style (artwork-tinted background). While a preview plays it has a progress bar, ▶/❚❚, ⏭, Up next, "Play in full in Apple Music Classical", Save and Stop preview. Otherwise it shows the piece you last opened, with Play in Apple Music Classical, Save, Whole album, the Work, Album and Composer, and Up next for the rest of a Play-all run.

Community features are intentionally left out: other users, following people, comments and reactions. Everything personal stays on this device.

## Data

**Real concerts only.** Klang shows no invented concerts and never uses Sheng's data. Its listings come from the venues', orchestras' and festivals' own websites (and the City of Geneva's open data), read by the collectors in `tools/feeds/` (see [its README](tools/feeds/README.md)).
- **Daily refresh.** The GitHub workflow (`.github/workflows/pages.yml`) runs every morning at 04:23 UTC (early morning in Switzerland), writes `data/concerts.json` and publishes it with the app. A source that fails keeps its events from the day before, so one broken site doesn't empty a city.
- **In the app** (`js/feed.js`), the listings load at start, again when the app comes back after more than 6 hours, and on pull to refresh. A copy on the device makes the next start instant and works offline.
- **Facts only.** Date and time, title, venue and city, performers and their roles, works, cancellations, and the link to the organiser's page. Details and tickets stay on the organiser's site: every concert page links back to it.
- **Credits.** Each source's credit line (for example "Source: Zürcher Kammerorchester (zko.ch)") is shown on its concerts' pages, and every source is listed with its credit under **Me → Legal & Privacy → Concert listings**. **Me → Data & imports** shows when the listings were last updated and how many concerts came from how many sources.
- **Featured** means the listing names at least one performer or piece, so Sheng's default "Featured only" filter keeps most concerts.
- **Look back:** past concerts stay for 120 days.

The sources (`python3 tools/feeds/build.py --list`), by region. ★ = the organiser allows the basic facts only, each concert linked back to its site.

| Region | Sources |
|---|---|
| Zurich | Tonhalle Zürich (Tonhalle-Gesellschaft), Opernhaus Zürich ★, Zürcher Kammerorchester, Collegium Novum Zürich, Reformierte Kirche Zürich ★, Musikkollegium Winterthur, KulturDietikon |
| Basel, Aargau, Solothurn | Sinfonieorchester Basel, Kammerorchester Basel ★, Stadtcasino Basel, argovia philharmonic, Stadttheater Olten |
| Bern | Bühnen Bern (Berner Symphonieorchester), Casino Bern ★, Berner Kammerorchester, CAMERATA BERN, Gstaad Menuhin Festival, Sommets Musicaux de Gstaad |
| Central Switzerland | Luzerner Sinfonieorchester, Luzerner Theater, Lucerne Festival, Theater Casino Zug, Zuger Sinfonietta, Kloster Einsiedeln |
| Eastern Switzerland | Konzert und Theater St.Gallen, J. S. Bach-Stiftung St. Gallen, DomMusik St.Gallen, Casino-Gesellschaft Herisau, Konzertgemeinde Frauenfeld, Schaffhausen Klassik, Kammerphilharmonie Graubünden, Theater Chur |
| Geneva | Victoria Hall and Grand Théâtre de Genève (Ville de Genève open data, via OpenAgenda; licence: open use, source must be given), Orchestre de la Suisse Romande, L'Orchestre de Chambre de Genève, La Cité Bleue, Geneva Camerata, Concorde Vernier |
| Vaud | Orchestre de Chambre de Lausanne ★, Opéra de Lausanne, Sinfonietta de Lausanne, Pour l'Art (Pully), Concerts J.S. Bach de Lutry |
| Fribourg, Neuchâtel | Société des Concerts de Fribourg, Orchestre de chambre fribourgeois, Kultur im Podium Düdingen, Ensemble Symphonique Neuchâtel, Théâtre du Passage, Société de Musique de La Chaux-de-Fonds |
| Valais | Verbier Festival, Sion Violon Musique ★, Abbaye de Saint-Maurice, Théâtre du Martolet |
| Ticino | Orchestra della Svizzera italiana, Conservatorio della Svizzera italiana, classicAscona |

Some festivals publish nothing between seasons, so a source can show 0 concerts for months.

**Other countries.** The Location sheet and Me → Your region list Sheng's 47 countries, with their regions and cities (names only, from `spec/sheng-locations.json`; Sheng's counts are not shown). There are no feeds for them yet, so each shows 0 events and a short note.

**Your own concerts.** In **Me → Data & imports** you can also add:
- an **.ics calendar** (many venues publish season calendars);
- a **JSON feed**;
- a feed URL, which pull to refresh reloads.

These stay on your device and are marked "Imported". Venues and cities are recognised automatically (Zürich/Zurich, Genève/Geneva, Luzern/Lucerne …), and so are composers and works named in the title or programme.

JSON feed format, either an array or `{ "concerts": [...] }`:

```json
{ "concerts": [
  { "title": "Sinfoniekonzert", "start": "2026-11-20T19:30:00+01:00", "city": "Zürich", "venueName": "Tonhalle Zürich",
    "type": "orchestral", "durationMin": 120,
    "credits": [{ "role": "Conductor", "name": "…" }],
    "program": [{ "composer": "Brahms", "title": "Violin Concerto in D major, Op. 77" }],
    "ticketUrl": "https://…" }
] }
```

Your marks, follows, imports, Library (albums and playlists) and listening history are stored only in this browser (localStorage). **Me → Back up & import data** makes a backup file and restores it.

## Interface language

**English or Simplified Chinese (简体中文)**, in **Me → Language · 语言**: Automatic (follows the phone), English or 简体中文.
- The whole interface is translated: tabs, sheets, buttons, empty states, the assistant's answers, and dates and counts ("10月27日 周二 19:30", "3 场音乐会"). City, canton, country, composer and role names have their Chinese forms.
- What stays as published: concert titles, venue, orchestra and performer names, and work titles from the listings, and Apple's album and track names.
- Long-form writing (programme notes, listening guides, composer bios and editorials) is in English for now, and Chinese pages say so.
- The strings are in `js/i18n/zh-*.js`, one file per area, keyed by the English text; `js/i18n.js` has `t()`, plurals, dates and names. Chinese text uses PingFang SC and Songti SC (Noto on other systems), set in `css/zh.css`.

## Composer portraits

35 of the 36 composers have portraits from **Wikimedia Commons** (`js/content/portraits.js`). A portrait is used only when the Commons API marks the file "Public domain" or "No restrictions"; the licences were checked on 26 Oct 2026. Arvo Pärt's photo is CC BY-SA, so he keeps his initials. The images load from Wikimedia at run time. When one can't load, the initials show instead. Credits with links to each file page are under **Me → Legal & Privacy**.

## Written content

The programme notes, composer bios, Widely Loved hooks and editorials are original prose written for Klang (in English for now), and each was fact-checked against reliable sources. None of it is copied from Sheng. Sheng's own texts are AI-assisted and its listings come from its own database. Klang reuses neither.

## Apple Music / Apple Music Classical

These are the access options that were checked (October 2026):

| Option | Cost | Used here? |
|---|---|---|
| iTunes Search / Lookup API (`itunes.apple.com/search`, `/lookup`, `country=CH`) | Free, no key, ~20 requests/min | **Yes.** Recordings ("Versions"), track lists (the track ids for exact links), podcast episodes, the Swiss classical chart (RSS), and each track's **30-second preview**. |
| Apple Music Classical and Apple Music links (`classical.music.apple.com/ch/album/<album>?i=<track>`, `music.apple.com/ch/...`) | Free | **Yes.** Every "Apple Music Classical ↗", Listen and Play is one of these links. On an iPhone it opens the exact piece, or the whole album, in the Apple Music Classical app (or Apple Music, chosen in **Me → Play in**), which plays it in full with your own subscription. Elsewhere it opens Apple's web player. |
| Apple Music API / MusicKit on the Web (classical fields like `workName` and `movementName`; full playback in the page and library access for subscribers) | Requires the Apple Developer Program, **US$99/year** | No |
| A public Apple Music Classical API | Doesn't exist | — |

How listening works, the free way:
- **▶ Preview** plays Apple's 30-second preview clips inside Klang: tap again to pause; the mini player shows the time left and ⏭. Play all previews a whole programme, album or playlist in order. The clips stream from Apple and are never downloaded or cached.
- **Apple Music Classical ↗** opens the same recording at that piece in Apple Music Classical (or Apple Music), which plays it in full with your own subscription. **Open in Apple Music Classical** opens the first piece and keeps the rest as "Now listening" on this device: the mini player's ⏭ opens the next piece. (Apple's links can't hand a whole queue to the app.)
- **Save** keeps albums and pieces in Klang's own Library on this device. Adding to your Apple Music library would need MusicKit (paid), so it isn't done.

Apple's terms are followed:
- Recording details and previews appear with links to Apple Music Classical and Apple Music, with the credit "30-second previews provided courtesy of iTunes".
- Only search metadata is cached, for 7 days.

**Before a public launch,** add Apple's official "Listen on Apple Music" badge from Apple's marketing tools, and the trademark credit.

## Files

```
index.html, manifest.webmanifest, sw.js, icon.svg, icon-180.png
css/app.css, theme.css, shell.css   base styles, typography, app shell
css/parity-*.css                    per-area Sheng parity styles; parity-palette.css is the dark palette
css/area-*.css                      concerts list, concert page, pages, personal screens
css/listening.css                   mini player and the Now-listening view (the Save sheet is in shell.css)
css/zh.css                          Chinese fonts and typography
js/main.js            router, tab bar, collapsing dock, mini player (preview / Now listening)
js/feed.js            the real listings: load, refresh, keep a copy on the device
js/i18n.js            interface language: t(), plurals, dates, names; js/i18n/zh-*.js has the Chinese
js/time.js            Swiss time helpers (Europe/Zurich, DST)
js/util.js            DOM helper, icons, storage, toast
js/store.js           marks, follows, preferences, library and playlists, imports, backup (localStorage)
js/repo.js            concerts from the feed and your imports; queries and counts
js/music.js           iTunes Search/Lookup, chart, podcasts, 30-second previews
js/applemusic.js      Apple Music Classical / Apple Music links, pieces, Now listening
js/ics.js             calendar export/import, JSON feeds, matching towns, venues, composers and works
js/assistant-engine.js  the local Assistant's parser and answers (English and Chinese)
js/data/              cities (47 + other towns), venues, repertoire (104 works), Sheng's countries, test generator
js/content/           programme notes (guides*.js), composer bios, editorials, portraits
js/ui/                shared components, bottom sheet, Preview / Apple Music Classical buttons, Listen section
                      and Versions, Save sheet, Now-listening view
js/views/             discover, concerts, concert, entity (work/composer/artist/venue/city),
                      editorial, activity, library, assistant, me, settings (Data & imports), map
data/concerts.json    the listings, built daily by the workflow (not committed)
tools/feeds/          the collectors (Python, standard library only) and their tests
tools/serve.py        no-cache local server
tests/test.html       unit tests (run in a browser)
.github/workflows/pages.yml   daily build of the listings and deploy to GitHub Pages
```
