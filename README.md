# Klang: Swiss classical concerts

A mobile web app for following classical concerts across Switzerland, modelled screen by screen on the iOS app **Sheng (响声)**. It covers the 47 Swiss cities in Sheng's Switzerland filter, from Zurich (355 concerts) to Verbier (0).

It's personal only: no social features. You save concerts, mark them Going or Attended, keep private reviews, and follow cities, venues, composers, performers and works.

## Run it

**Online:** <https://lyl0316.github.io/klang/>. On an iPhone, open it in Safari and choose **Share → Add to Home Screen**. It then opens full screen like an app, works away from home, and keeps working offline after the first visit.

**Locally**, from this folder:

```bash
python3 tools/serve.py
```

Then open <http://localhost:8765>. The server turns caching off, so edits show up on reload.

To run the tests, open `tests/test.html` (locally <http://localhost:8765/tests/test.html>). There are 24, covering:
- the demo data: city counts, and no venue holding two concerts at once;
- Swiss time handling and city matching;
- calendar import/export and JSON feed import;
- the local assistant;
- favourites, library, hidden concerts, reminders, marks, and backup and restore.

There's no build step and no dependencies: plain HTML, CSS and JavaScript modules.

## What's in it

Klang follows Sheng's layout: five tabs, plus a dock with the mini player. As you scroll, the dock collapses into one pill: [current tab] [mini player] [search]. The colours are Sheng's dark palette, measured from its screenshots; there's also a light mode.

| Tab | What it does |
|---|---|
| **Discover** | Album collage from Apple's Swiss classical chart, an editorial hero, **Concerts** and **Assistant** buttons, **Today's Pick** (a daily masonry of works and programmes), **Widely Loved** (good for newcomers: Solo, Symphonic, Chamber, Vocal) and **New on Record**. The profile button opens **Me**. |
| **Concerts** | Sheng's Concerts tab for Switzerland. See below. |
| **Activity** | Personal only: My concerts (Attended, Saved, Going), My Favorites (composers, artists, works), Following (venues and cities) and a timeline of your own activity. A bell opens in-app notifications. |
| **Library** | Albums you add from Listen, concert playlists ("Add playlist to my Library"), and Recently added. |
| **Search** | A local **Assistant** ("Just say what you're after"). Type "Mahler in Zurich in November", "chamber music in Geneva this weekend" or "a slower Goldbergs" and it answers with concerts, works, people or recordings. It runs on the device, with no AI service and no quota. |

The **Concerts** tab has:
- **Filter chips at the top:** Date · Switzerland · All types · ✓ Featured only (on by default). A Favourites chip appears once you have favourites.
- **A flat list** like Sheng's. Each card shows "Tomorrow Oct 27 · Venue · City", then a bold centred title, series, performers and the programme.
- **Pull to refresh:** reloads a saved feed URL, if you have one, and redraws the list.
- **Date sheet:** shows relative event density as 1–3 dots. "Jump to Oct 30 · Fri" scrolls the list to that day. Picking a past day asks you to **pick one city to look back**.
- **Location sheet:** "Current country: Switzerland", with every city selected to start. Tap a city to exclude it, and the button changes from "Confirm" to "Show N events". You can search cities, and a Map link opens the city map.
- **Type sheet:** works the same way.
- **Month rail:** tap a month, press and slide to pick a week, or slide left to pick a day.

**Concert page**, in Sheng's order:
1. Back and Share. The share sheet also has Copy link, Add to calendar (an .ics file with reminders) and Hide.
2. Header, then the action tiles: Listen, Program, Notes, Podcasts, Ticket.
3. Save + Going, or Save + Attended (with a private review) once the concert has started.
4. A **Listen** carousel with one recording per work, Versions, Play all, and "Add playlist to my Library".
5. **Program**, then a **Program book**: an original note for each work, all 104 in the repertoire, with a "Listen for" line and a full-screen reader.
6. **Podcasts** (Apple Podcasts episodes), **Featured artists**, and Report a problem.

**Other pages:**
- **Work:** Listening guide, Recordings and Concerts.
- **Composer:** Read Bio, Latest releases, Popular among listeners, Explore by period, genre or related composers, Editorials and Swiss concerts.
- **Artist:** "On tour" route across Swiss cities, plus a Full Itinerary page.
- **Venue and city pages.**
- **Editorials:** original articles with a Swiss angle, including recording and concert embeds.
- **Me:** Push preferences (in-app notifications and calendar alarms), Your region, Hidden concerts, New Year mode, appearance, and Data & imports.
- **Full-screen player:** artwork-tinted background, info mode (Track, Composer, Performers, Work, Album, Track no.), Up next, "Post to your activity", and AirPlay in Safari.

Community features are intentionally left out: other users, following people, comments and reactions. Everything personal stays on this device.

## Data

- **Demo concerts (on by default).** They're generated with a fixed seed. Venues and repertoire are real; **all performers and ensembles are invented**, and the concert page says so.
  - From 25 Oct 2026 to 30 Jun 2027, each city gets the number of concerts Sheng's Switzerland filter showed on 25 Oct 2026 (Zurich 355, Geneva 130, Basel 123 …, 839 in total).
  - No venue has two concerts at overlapping times.
  - There are also some past concerts for Look back.
  - Switch them off in **Me → Data & imports**.
- **Real listings.** In Data & imports you can import:
  - an **.ics calendar** (many venues publish season calendars);
  - a **JSON feed**;
  - a feed URL, which pull to refresh reloads.

  Venues and cities are recognised automatically (Zürich/Zurich, Genève/Geneva, Luzern/Lucerne …), and so are composers named in the title or description.

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

Your marks, follows, imports and posted listens are stored only in this browser (localStorage). **Me → Back up & import data** makes a backup file and restores it.

## Composer portraits

35 of the 36 composers have portraits from **Wikimedia Commons** (`js/content/portraits.js`). A portrait is used only when the Commons API marks the file "Public domain" or "No restrictions"; the licences were checked on 26 Oct 2026. Arvo Pärt's photo is CC BY-SA, so he keeps his initials. The images load from Wikimedia at run time. When one can't load, the initials show instead. Credits with links to each file page are under **Me → Legal & Privacy**.

## Written content

The programme notes, composer bios, Widely Loved hooks and editorials are original prose written for Klang, and each was fact-checked against reliable sources. None of it is copied from Sheng. Sheng's own texts are AI-assisted and its listings come from its own database. Klang reuses neither.

## Apple Music / Apple Music Classical

These are the access options that were checked (October 2026):

| Option | Cost | Used here? |
|---|---|---|
| iTunes Search / Lookup API (`itunes.apple.com/search`, `/lookup`, `country=CH`) | Free, no key, ~20 requests/min | **Yes.** Recordings ("Versions"), track lists, 30-second previews, podcast episodes, and the Swiss classical chart (RSS). |
| Apple Music Classical web links (`classical.music.apple.com/ch/...`) | Free | **Yes.** "Apple Music Classical" links open the Classical app on iPhone. |
| Apple Music API / MusicKit on the Web (classical fields like `workName` and `movementName`; full playback and library access for subscribers) | Requires the Apple Developer Program, **US$99/year** | No |
| A public Apple Music Classical API | Doesn't exist | — |

Apple's terms are followed:
- Previews are streamed, never downloaded or cached.
- They appear with a link to Apple Music and the credit "provided courtesy of iTunes".
- Only search metadata is cached, for 7 days.

**Before a public launch,** add Apple's official "Listen on Apple Music" badge from Apple's marketing tools, and the trademark credit.

## Files

```
index.html, manifest.webmanifest, sw.js, icon.svg, icon-180.png
css/app.css, theme.css, shell.css   base styles, typography, app shell
css/parity-*.css                    per-area Sheng parity styles; parity-palette.css is the dark palette
js/main.js            router, tab bar, collapsing dock, mini player
js/time.js            Swiss time helpers (Europe/Zurich, DST)
js/util.js            DOM helper, icons, storage, toast
js/store.js           marks, follows, preferences, library, imports, backup (localStorage)
js/repo.js            data access, queries and counts
js/music.js           iTunes Search/Lookup, chart, podcasts, preview player
js/ics.js             calendar export/import, JSON feeds
js/assistant-engine.js  the local Assistant's parser and answers
js/data/              cities (47), venues, repertoire (104 works), invented names, demo generator
js/content/           programme notes (guides*.js), composer bios, editorials, portraits
js/ui/                shared components, bottom sheet, Listen section, full-screen player
js/views/             discover, concerts, concert, entity (work/composer/artist/venue/city),
                      editorial, activity, library, assistant, me, settings (Data & imports), map
tests/test.html       unit tests (run in a browser)
tools/serve.py        no-cache local server
```
