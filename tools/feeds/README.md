# Concert feeds

Klang's real listings come from the venues' and orchestras' own websites. A small Python job reads them once a day and writes `data/concerts.json`, which is published next to the app. It uses the Python standard library only, with no pip packages.

Sheng's data is never used. The research behind the source list is in `spec/CONCERT-FEEDS.md`.

## How it works

1. **Schedule.** `.github/workflows/pages.yml` runs at 04:23 UTC (early morning in Switzerland), on every push to `main`, and on demand.
2. **Fetch.** `build.py` finds every reader in `sources/` and runs up to 8 of them at once (`--jobs`). Each reader fetches its site through `common.get()`, which is polite by construction (see [Politeness](#politeness)). The previously published feed is handed to the readers, so a reader that reads one detail page per concert can reuse what it learnt on earlier runs (see [Incremental details](#incremental-details)).
3. **Normalise.** Each reader returns a list of events made by `common.make_event()`. Every event has Swiss local time with the correct offset (the same as Austria, Germany, France and Italy). A reader outside Switzerland sets `COUNTRY` (`'austria'`, `'germany'`, `'france'` or `'italy'`), names the city in English as Klang lists it (`'Vienna'`, `'Munich'`, `'Milan'` …), and `build.py` adds `"country"` to its events. Events in different countries are never merged.
4. **Combine.** `build.py` then:
   - keeps events from today to today + 450 days (Swiss time);
   - merges the same performance listed by two sources (see [De-duplication](#de-duplication));
   - fills in or corrects the type where the facts make it clear (see [Types](#types));
   - sorts the events by start time;
   - writes `{"generatedAt", "sources", "concerts"}`.
5. **Recover.** If a reader fails, its events from the previously published feed are reused. One broken site therefore doesn't empty a city. This also happens when a reader times out, or returns nothing when it had at least 5 events last time.
6. **Deploy.** The workflow uploads the whole app folder, including the fresh `data/concerts.json`, to GitHub Pages.

Pushes reuse any source that was fetched successfully in the last 20 hours with the same reader code (`--fresh-hours 20`). Developing the app therefore doesn't make extra requests to the venues. Scheduled and manual runs always fetch. The code compared (`codeHash`) is the reader's file, the `sources/` modules it imports (helpers such as `_east.py`, also indirectly, or another reader it borrows from) and `common.py`, so editing a helper invalidates the reuse too.

> **Pages setting.** The workflow deploys with `actions/deploy-pages`. The repository's **Settings → Pages → Build and deployment → Source** must be **GitHub Actions**, not "Deploy from a branch".

## Run locally

From the app folder:

```bash
python3 tools/feeds/selftest.py                    # offline tests of the framework
python3 tools/feeds/build.py --list                # readers, their kind and attribution
python3 tools/feeds/build.py --only zko --out /tmp/zko.json --previous none --show 3 -v
python3 tools/feeds/build.py --out /tmp/concerts.json   # everything, like the daily job
```

| Option | What it does |
|---|---|
| `--only k1,k2` | Runs only these readers. The output then contains only their events, so don't write it over the real feed. |
| `--out PATH` | Output file. The default is `data/concerts.json` in the app. |
| `--previous URL_OR_PATH` | The last feed: readers reuse details from it, and it is the fallback when a source fails. The default is the published `https://lyl0316.github.io/klang/data/concerts.json`; `none` disables it. A local copy at `--out` is the second choice. |
| `--fresh-hours H` | Reuses sources fetched OK less than H hours ago with the same code (`codeHash`). |
| `--timeout S` | Per-source time limit. The default is the reader's `TIME_LIMIT`, or 600 s. |
| `--show N` | Prints N sample events per source. |
| `--strict` | Exits 1 when a source failed and had nothing to fall back on (useful while developing). |
| `-v` | Logs every request. |

Exit status is 0 even when sources fail. It is 1 only for a bug in `build.py` itself, or with `--strict`. It is 2 for bad arguments.

To try a single reader's output in the app, start `python3 tools/serve.py`. Then import the JSON in **Me → Data & imports**, or write it to `data/concerts.json` locally (don't commit that file: the workflow builds it).

## Output

The output follows the JSON feed format that Klang already imports (`js/ics.js`, `parseFeed`):

```json
{
  "generatedAt": "2026-10-27T05:24:10+01:00",
  "window": { "from": "2026-10-27", "to": "2028-01-20" },
  "sources": [
    { "key": "zko", "name": "Zürcher Kammerorchester", "site": "https://www.zko.ch/",
      "attribution": "Source: Zürcher Kammerorchester (zko.ch)", "count": 54,
      "ok": true, "error": null, "reused": false, "fetchedAt": "2026-10-27T05:21:02+01:00", "codeHash": "…" }
  ],
  "concerts": [
    { "id": "zko-4711", "source": "zko", "title": "Saisoneröffnung",
      "start": "2026-11-20T19:30:00+01:00", "durationMin": 110,
      "city": "Zürich", "venueName": "Tonhalle Zürich, Grosser Saal", "type": "orchestral",
      "series": "Abo-Konzerte",
      "credits": [{ "role": "Conductor", "name": "…" }, { "role": "Orchestra", "name": "Zürcher Kammerorchester" }],
      "program": [{ "composer": "Mozart", "title": "Symphonie Nr. 40 g-Moll KV 550" }],
      "ticketUrl": "https://…", "url": "https://www.zko.ch/…", "status": "scheduled" }
  ],
  "merges": [
    { "id": "zko-4711", "absorbed": "tonhalle-2056001", "source": "tonhalle", "strength": 3, "minutes": 0 }
  ]
}
```

- **Empty fields are left out.**
- **`merges`** lists the listings that were merged into another source's record of the same performance (see [De-duplication](#de-duplication)); Klang ignores it, it is there for audits.
- **`type`** is one of `orchestral`, `chamber`, `recital`, `vocal-opera` or `mixed`. Leave it out when unsure: Klang guesses it on import.
- **`ok: false` with `reused: true`** means the source failed this time, and its `count` events are from `fetchedAt`.

## Adding a source

Create `sources/<key>.py`. That's all: the registry finds it automatically, so don't edit `sources/__init__.py`. The key is lower-case letters, digits and `_`, and it is also the module name.

```python
"""Example Hall, Bern: concerts from the hall's season calendar (.ics)."""
from common import get, parse_ics, make_event, to_zurich_iso, guess_type, looks_cancelled, FetchError, log

KEY = 'example_hall'
NAME = 'Example Hall Bern'
SITE = 'https://www.example-hall.ch/'
ATTRIBUTION = 'Source: Example Hall Bern (example-hall.ch)'
KIND = 'venue'            # orchestra | ensemble | venue | festival | aggregator (for de-duplication)


def fetch():
    events = []
    for e in parse_ics(get('https://www.example-hall.ch/programm.ics', accept='text/calendar')):
        if e['all_day'] or e['status'] == 'tentative':
            continue
        try:
            events.append(make_event(
                KEY, e['uid'], e['summary'], to_zurich_iso(e['start']),
                end=e['end'], city='Bern', venueName=e['location'] or 'Example Hall',
                type=guess_type(e['summary']), url=e['url'], ticketUrl=e['url'],
                status='cancelled' if e['status'] == 'cancelled' or looks_cancelled(e['summary']) else None))
        except ValueError as err:          # one bad listing must not lose the rest
            log.warning('%s: skipped %s: %s', KEY, e['uid'], err)
    return events
```

Reader checklist:

- **Raise on total failure.** Let `FetchError` from the main listing propagate, so the build reuses yesterday's events. Catch errors per event and per detail page, and return what you have.
- **Use stable ids.** Use the site's own event id, or its event URL, never a list index. Klang stores the user's Saved, Going and Attended marks by `id`.
- **Check the time zone.** Make sure `start` is in Swiss time. Read the source's quirks in `spec/CONCERT-FEEDS.md`, and compare a few events with the time shown on the event page:
  - When a site labels UTC as `+02:00` (ZKO), strip the label and use `to_zurich_iso(naive, assume='UTC')`.
  - When JSON-LD looks like UTC without a `Z` (Lucerne Festival), use `assume='UTC'`.
  - Naive local times use the default `assume='Europe/Zurich'`.
- **Keep only concerts.** Keep classical concerts, opera and recitals in the reader's country. Skip:
  - tours abroad;
  - guided tours, workshops, school projects and talks;
  - galas and balls;
  - family-only events that aren't clearly a concert.
- **Name roles consistently:**
  - `Conductor`;
  - instruments and voices: `Piano`, `Violin`, `Soprano` …;
  - `Orchestra`, `Ensemble` or `Choir` for groups;
  - `Performer` when the site gives no role and the name isn't obviously a group.
- **Stay within your request cap.** One run may send at most 60 requests (`common.MAX_REQUESTS`) unless the reader sets its own `MAX_REQUESTS`: lower, or up to 150 (`common.MAX_REQUESTS_CAP`) for a reader that needs one detail page per concert. The delay between requests and `Crawl-delay` still apply, so set `TIME_LIMIT` (seconds, at most 1200) to fit. Check `requests_left()` before fetching detail pages, or read a listing or .ics instead.
- **Read detail pages incrementally.** A reader that reads one page per concert reuses the previous feed's details and spends its requests on the concerts still missing them, nearest first. See [Incremental details](#incremental-details).
- **Test it** with `build.py --only <key> --previous none --show 5 -v`, then run `selftest.py`.
- **Add a row** to the [Sources](#sources) table below.

## Politeness

`common.get()` enforces these rules. Readers must not use `urllib` directly.

- **It identifies itself** as `KlangConcertBot/1.0 (+https://lyl0316.github.io/klang/; personal, non-commercial)`.
- **It obeys robots.txt,** fetched once per host per run:
  - it follows RFC 9309 (wildcards, longest match), with `urllib.robotparser` as a second check;
  - redirect targets are checked too;
  - when robots.txt is unreachable (5xx, network), the host is skipped;
  - when it answers 401 or 403, the host is skipped.
- **It waits between requests** to the same host, at least 1.5 s, or longer when `Crawl-delay` or `Request-rate` asks for it.
- **One request at a time per website.** Up to 8 sources run at once, but every request to a host waits for that host's turn, so a site never gets parallel requests from us, even when two readers share it.
- **It retries twice** on 429, 5xx and network errors, honouring `Retry-After` up to 120 s.
- **It caps each source** at 60 requests per run by default (at most 150 for a reader that sets `MAX_REQUESTS` to read detail pages), with a time limit. The daily schedule means each site is read about once a day, and detail pages already read are reused rather than fetched again every day.
- **It never logs in, sends forms, or sets cookies or credentials.**
- **Only Tier 1 and Tier 2 sources** from `spec/CONCERT-FEEDS.md` are read. Tier 3 sites ask for written consent before reproduction, so they are not fetched until that consent exists:
  - Opernhaus Zürich;
  - Casino Bern;
  - Kammerorchester Basel;
  - Orchestre de Chambre de Lausanne;
  - Reformierte Kirche Zürich;
  - Sion Violon Musique.

  The "Not usable" sources (guidle, Eventfrog, Bachtrack, Ticketcorner …) and Sheng are never read.

## Facts only

Only these facts are republished:

- date and time;
- title;
- venue and city;
- performers with their roles;
- works (composer and title);
- the event or ticket link;
- cancelled status.

Descriptions, programme notes, essays and images are never copied. `make_event` has no field for them. Each source's credit is in `sources[].attribution` of the feed.

## Incremental details

Some sites list a concert's performers and composers but keep the hall, the works' titles or the full cast on a page per concert. Reading every page every day would exceed the request cap (and be impolite), so such readers work incrementally:

1. `build.py` hands the previous feed to `common` before the readers run.
2. For each concert in today's listing the reader asks for the previous record: `common.previous_event(common.event_id(KEY, sid), start, title=title)`. It is returned only when it is clearly the same performance: the same id, the same start (same instant) and, when `title` is given, the same title (apart from case, accents, punctuation or a typo, never a different number).
3. The reader also checks that its listing still says what that record says (Tonhalle: every listed performer is in the cast, every listed composer in the programme). Then it reuses the record's details instead of reading the page.
4. The requests left after the listing go to the concerts still missing details, nearest first; then to concerts due for a re-read (`common.refresh_due(key, start, near_days=…, every_days=…)`: always for concerts in the next days, the others on a fixed rotation), so changes are picked up. On the first run after the reader's code changed (its `codeHash` differs from the previous feed's), every reused concert is due, so a parser fix reaches all of them as far as the cap allows.

Within a few daily runs every concert has its full details. Readers doing this: `tonhalle` (event pages; cap 120), `opernhaus_zurich` (production pages; cap 120). `common.previous_events(KEY)` returns all of a source's previous events, for a reader that matches by something else (e.g. event URL and day). The previous record may contain fields that `build.py` merged in from another source listing the same performance; they describe the same performance, so they are safe to keep.

## De-duplication

The same performance often appears twice, for example the OSR's own calendar and the Ville de Genève dataset for Victoria Hall, or an orchestra's own listing and the hall's. Two events from different sources that start within 20 minutes of each other are treated as one when:

- **City:** they are in the same city (aliases are matched: Zürich/Zurich, Genève/Geneva/Genf …), or a city is missing and the venues are similar; and
- **Venue:** the venues are similar. "Tonhalle Zürich" ≈ "Tonhalle Zürich, Grosser Saal", but Grosser ≠ Kleiner Saal (never merged). Or, in the same city with venues named differently ("Theater Casino Zug" / "…, Theatersaal", "Stadthaus" / "Stadtsaal Winterthur"), at least one of:
  - **two or more of the same performers** (by name);
  - **one venue name contains the other**, and the shorter one names a place, not just "Kirche" or "Theater";
  - **very similar titles**: at least two telling words, mostly the same ("Musiques sérieuses").
- When a venue is missing, the same city plus a similar title or two shared performers is enough.

Halls of one building are kept apart even when the venue names look alike:

- **A building vs one of its halls:** "Tonhalle Zürich" and "Tonhalle Zürich – Kleiner Saal" are merged only when something else ties them together: a shared performer, a similar title, or one listing without a cast.
- **Two named halls:** "KKL Luzern, Konzertsaal" and "KKL Luzern, Luzerner Saal" (or "Musiksaal" and "Hans Huber-Saal") are merged only with two or more shared performers.
- **A similar title in two places:** "Bach Weihnachtsoratorium" at the Fraumünster and at the Grossmünster is not merged on the title alone.

Every merge is logged (`merged <absorbed id> into <kept id>`) and listed in the output's `merges` array: `{"id", "absorbed", "source", "strength", "minutes"}` (strength 3 = similar venue, 2 = the same performers, 1 = venue name or title; minutes between the two starts).

The record kept (its id, title and links) comes from the source with the higher priority, so a performance keeps its id from day to day:

| `KIND` | Priority |
|---|---|
| `orchestra` / `ensemble` | 30 |
| `venue` / `festival` | 20 (the default) |
| `aggregator` | 10 |

A module's `PRIORITY` overrides its kind. Between equal priorities, the richer record wins. It then takes the richer facts of the two:

- the longer cast, if it names every person the kept listing names (a listing that was not updated after a change of conductor never brings the old conductor back); a bare `Performer` role gets the other listing's instrument ("Clarinet");
- the programme with more work titles, if it names every composer of the kept one. The interval and the end time ("- Pause -", "Konzertende ca. 21.30 Uhr") are not works: `common.make_event` drops them, and so does the build for events reused from the previous feed;
- the more specific venue ("Casino Bern, Grosser Saal" over "Casino Bern");
- the ticket link on the venue's or the organiser's own domain (theirs or a ticket shop / Swiss site before an unrelated foreign site, which is usually a slip on the source site);
- any field it lacks (duration, series, type …).

## Types

After merging, `build.py` checks each concert's `type` against its facts (`common.fix_type`, also usable in a reader as `common.infer_type(title, credits, program, series)`):

- **Missing type:** inferred from the facts. One or two players with no orchestra, ensemble, choir or conductor are a `recital` (a duo whose title says chamber music: `chamber`); otherwise the title's words, then the groups credited (orchestra → `orchestral`, choir → `vocal-opera`, an ensemble or 3–12 players → `chamber`).
- **Clearly wrong:** `orchestral` for one or two players with no orchestra, ensemble, choir or conductor becomes `recital` (Sokolov, Schiff, Kopatchinskaja & Say …), and so does `chamber` for a single player. Not when the title or a work needs an orchestra or choir (a concerto, a symphony, a mass …), and not for an orchestra's or ensemble's own listing (the group plays even when not credited) unless its title says recital ("Klavierabend").
- **Ballet with live music** (a choreographer plus an orchestra or conductor, no singers): stays `orchestral` and gets the series `Ballett` when it has none.

## common.py reference

| Function | Returns |
|---|---|
| `get(url, *, accept=None, timeout=30, headers=None)` | Body text (charset from the header, `<meta>`, or UTF-8/cp1252). Raises `FetchError` (`.url`, `.reason`, `.status`) or `BudgetExceeded`, a subclass sent when the cap or time limit is used up. `headers` may add e.g. `Accept-Language`. |
| `get_json(url, **kw)` | Parsed JSON. A JSON error raises `FetchError`. |
| `jsonld_events(html)` | Raw schema.org `*Event` dicts from `<script type="application/ld+json">`. Lists, `@graph`, ItemLists and `subEvent` are flattened, and sloppy JSON is tolerated. |
| `parse_ics(text)` | One dict per VEVENT: `{uid, summary, start, end, location, url, description, status, all_day, categories, rrule}`. `start` and `end` are aware Europe/Zurich datetimes. See the notes below the table. |
| `to_zurich_iso(value, *, assume='Europe/Zurich')` | `'YYYY-MM-DDTHH:MM:00+01:00'`. Accepts a datetime, an ISO string or an epoch (s or ms). Naive values are read in `assume` (`'Europe/Zurich'`, `'UTC'` or any IANA zone). A bare date raises `ValueError`. |
| `to_zurich_datetime(value, *, assume=...)` | The same, as an aware datetime. |
| `make_event(source, sid, title, start, **fields)` | A validated event dict. See the notes below the table. |
| `clean(text)` | Text without tags, entities (`&shy;` too), nbsp or zero-width characters, with whitespace collapsed. |
| `guess_type(text)` | `'vocal-opera'`, `'recital'`, `'chamber'`, `'orchestral'` or `None`. |
| `looks_cancelled(text)` | True for "abgesagt", "annulé", "cancelled", "verschoben" … |
| `as_list(value)` | `None` → `[]`, a scalar → `[value]`. Handy for JSON-LD. |
| `today_zurich()` | Today's date in Switzerland. `KLANG_FEEDS_TODAY=YYYY-MM-DD` overrides it. |
| `requests_left()` | Requests the running source may still send. |
| `event_id(source, sid)` | The id `make_event` gives (`'tonhalle-2055696'`). |
| `previous_event(event_id, start, *, title=None)` | A copy of the previous feed's record of this concert, or `None`. Only for the same id and start instant (and title, if given). See [Incremental details](#incremental-details). |
| `previous_events(source_key)` | Copies of the source's events in the previous feed. |
| `refresh_due(key, start=None, *, near_days=7, every_days=7)` | Whether to read a reusable detail page again: always within `near_days` or after a change to the reader's code, else once every `every_days` days on a rotation by `key`. |
| `same_title(a, b)` | Titles equal apart from case, accents, punctuation or a typo (never a different number). |
| `infer_type(title, credits=None, program=None, series=None)` | Type from the facts (see [Types](#types)), or `None`. |
| `fix_type(event, kind=None)` | A copy of the event with its type filled in or corrected, as `build.py`'s last pass. |
| `log` | `logging.getLogger('feeds')`. |

**`parse_ics` details:**

- It handles TZID (IANA, Windows and prefixed names), UTC `Z`, floating times, `VALUE=DATE` (`all_day=True`), `DURATION` and line folding.
- `status` is lower-case or `None`.
- RRULEs are not expanded.

**`make_event` details:**

- **Fields:** `durationMin`, `city`, `venueName`, `type`, `series`, `credits` (`[{'role','name'}]` or `(role, name)` pairs), `program` (`[{'composer','title'}]` or pairs), `ticketUrl`, `url`, `status`, and `end`, which computes `durationMin`.
- **Normalisation:**
  - the id becomes `<source>-<sid>`;
  - the start is converted to Swiss time;
  - text is cleaned;
  - credits and programme entries are de-duplicated;
  - URLs must be http(s);
  - type aliases are mapped (`opera` → `vocal-opera`);
  - `status`: schema.org `EventCancelled`, "canceled" and `True` become `cancelled`.
- **`ValueError`** for a missing id or title, or a start without both a time and an offset.
- **`TypeError`** for an unknown field name.

## Sources

`python3 tools/feeds/build.py --list` prints the readers that exist. The published feed's `sources[]` shows how each one did on the last run. Only the sources below may have readers. Add the key when a reader lands.

| Reader key | Source | Tier | Attribution |
|---|---|---|---|
| | Victoria Hall and Grand Théâtre de Genève (Ville de Genève on opendata.swiss / OpenAgenda) | 1 | Source: Ville de Genève (opendata.swiss). Licence: open use, source must be given. |
| | Zürcher Kammerorchester (zko.ch JSON) | 2 | Source: Zürcher Kammerorchester (zko.ch) |
| | Luzerner Sinfonieorchester (events API / JSON-LD / iCal) | 2 | Source: Luzerner Sinfonieorchester (sinfonieorchester.ch) |
| | Musikkollegium Winterthur (MusicEvent JSON-LD / .ics per concert) | 2 | Source: Musikkollegium Winterthur (musikkollegium.ch) |
| | Orchestre de la Suisse Romande (calendar JSON) | 2 | Source: Orchestre de la Suisse Romande (osr.ch) |
| | Lucerne Festival (JSON-LD per event) | 2 | Source: Lucerne Festival (lucernefestival.ch) |
| | Collegium Novum Zürich (HTML) | 2 | Source: Collegium Novum Zürich (cnz.ch) |
| | Tonhalle Zürich (HTML; robots.txt forbids the filter query) | 2 | Source: Tonhalle-Gesellschaft Zürich (tonhalle-orchester.ch / tonhalle.ch) |
| | Stadtcasino Basel, Bühnen Bern, OCG Geneva, Opéra de Lausanne, Verbier Festival, OSI Lugano (HTML) | 2 | Source: each venue's or orchestra's own site |

### Outside Switzerland

Added on 30 October 2026: the main venues of Austria, Germany, France and Italy (`COUNTRY` in each reader). Each reader's docstring says how its site is read, what is skipped and when it was checked. Sites left out on purpose:

- **robots.txt blocks ClaudeBot or AI crawlers:** Elbphilharmonie Hamburg, BR Symphonieorchester (brso.de) and SWR (ARD robots.txt), Salzburger Landestheater, Wiener Staatsoper and Teatro Comunale di Bologna (readers kept, `ENABLED = False`).
- **Terms forbid storing or republishing the programme:** Theater an der Wien, Innsbrucker Festwochen der Alten Musik.
- **Bot protection or captcha:** Bayerische Staatsoper, Teatro di San Carlo, Orchestre national de Lille. Staatstheater am Gärtnerplatz does not answer GitHub's servers at all (reader kept, `ENABLED = False`).
- **Calendar only behind robots-forbidden addresses or a login:** Kölner Philharmonie, Salzburger Festspiele.

| Reader key | Country | Source | Site | Note |
|---|---|---|---|---|
| `bregenzer_festspiele` | Austria | Bregenzer Festspiele | https://bregenzerfestspiele.com/de |  |
| `brucknerhaus_linz` | Austria | Brucknerhaus Linz | https://www.brucknerhaus.at/ |  |
| `esterhazy_eisenstadt` | Austria | Esterházy – Haydn in Eisenstadt | https://esterhazy.at/veranstaltungen |  |
| `grafenegg` | Austria | Grafenegg | https://www.grafenegg.com/ |  |
| `landestheater_linz` | Austria | Landestheater Linz | https://www.landestheater-linz.at/ |  |
| `mozarteum_salzburg` | Austria | Stiftung Mozarteum Salzburg | https://mozarteum.at/konzerte |  |
| `mozarteumorchester` | Austria | Mozarteumorchester Salzburg | https://www.mozarteumorchester.at/de/konzerte |  |
| `musikverein_graz` | Austria | Musikverein für Steiermark | https://musikverein-graz.at/ |  |
| `musikverein_wien` | Austria | Musikverein Wien | https://musikverein.at/ |  |
| `muth_wien` | Austria | MuTh – Konzertsaal der Wiener Sängerknaben | https://muth.at/ |  |
| `oper_graz` | Austria | Oper Graz | https://oper-graz.buehnen-graz.com/ |  |
| `styriarte` | Austria | styriarte | https://styriarte.com/ |  |
| `tiroler_landestheater` | Austria | Tiroler Landestheater & Tiroler Symphonieorchester Innsbruck | https://www.landestheater.at/spielplan |  |
| `volksoper_wien` | Austria | Volksoper Wien | https://www.volksoper.at/ |  |
| `wiener_konzerthaus` | Austria | Wiener Konzerthaus | https://konzerthaus.at/ |  |
| `wiener_staatsoper` | Austria | Wiener Staatsoper | https://www.wiener-staatsoper.at/ | off: robots.txt blocks ClaudeBot |
| `auditorium_lyon` | France | Auditorium – Orchestre national de Lyon | https://www.auditorium-lyon.com/ |  |
| `capitole_toulouse` | France | Orchestre national & Opéra national du Capitole, Toulouse | https://onct.toulouse.fr/ |  |
| `opera_bordeaux` | France | Opéra national de Bordeaux | https://www.opera-bordeaux.com/ |  |
| `opera_comique` | France | Opéra Comique | https://www.opera-comique.com/ |  |
| `opera_de_paris` | France | Opéra national de Paris | https://www.operadeparis.fr/ |  |
| `opera_du_rhin` | France | Opéra national du Rhin | https://www.operanationaldurhin.eu/ |  |
| `opera_lyon` | France | Opéra de Lyon | https://www.opera-lyon.com/ |  |
| `opera_marseille` | France | Opéra de Marseille – Théâtre de l’Odéon | https://opera-odeon.marseille.fr/ |  |
| `ops_strasbourg` | France | Orchestre philharmonique de Strasbourg | https://philharmonique.strasbourg.eu/ |  |
| `philharmonie_paris` | France | Philharmonie de Paris | https://philharmoniedeparis.fr/ |  |
| `radio_france` | France | Radio France | https://www.maisondelaradioetdelamusique.fr/ |  |
| `salle_gaveau` | France | Salle Gaveau | https://www.sallegaveau.com/ |  |
| `seine_musicale` | France | La Seine Musicale | https://www.laseinemusicale.com/ |  |
| `theatre_champs_elysees` | France | Théâtre des Champs-Élysées | https://www.theatrechampselysees.fr/ |  |
| `alte_oper_frankfurt` | Germany | Alte Oper Frankfurt | https://www.alteoper.de/ |  |
| `berliner_philharmoniker` | Germany | Berliner Philharmoniker / Philharmonie Berlin | https://www.berliner-philharmoniker.de/ |  |
| `boulez_saal` | Germany | Pierre Boulez Saal | https://www.boulezsaal.de/ |  |
| `deutsche_oper_berlin` | Germany | Deutsche Oper Berlin | https://deutscheoperberlin.de/ |  |
| `dresdner_philharmonie` | Germany | Dresdner Philharmonie | https://www.dresdnerphilharmonie.de/ |  |
| `frauenkirche_dresden` | Germany | Frauenkirche Dresden | https://www.frauenkirche-dresden.de/ |  |
| `gaertnerplatztheater` | Germany | Staatstheater am Gärtnerplatz | https://www.gaertnerplatztheater.de/ | off: no answer to GitHub's servers |
| `gewandhaus_leipzig` | Germany | Gewandhaus zu Leipzig | https://www.gewandhausorchester.de/ |  |
| `komische_oper_berlin` | Germany | Komische Oper Berlin | https://www.komische-oper-berlin.de/ |  |
| `konzerthaus_berlin` | Germany | Konzerthaus Berlin | https://www.konzerthaus.de/ |  |
| `muenchener_kammerorchester` | Germany | Münchener Kammerorchester | https://www.m-k-o.eu/ |  |
| `muenchner_philharmoniker` | Germany | Münchner Philharmoniker | https://www.mphil.de/ |  |
| `oper_frankfurt` | Germany | Oper Frankfurt | https://oper-frankfurt.de/ |  |
| `oper_koeln` | Germany | Oper Köln | https://www.oper.koeln/ |  |
| `oper_leipzig` | Germany | Oper Leipzig | https://www.oper-leipzig.de/ |  |
| `roc_berlin` | Germany | Rundfunk Orchester und Chöre Berlin (RSB, DSO, Rundfunkchor, RIAS Kammerchor) | https://www.roc-berlin.de/ |  |
| `semperoper` | Germany | Semperoper Dresden | https://www.semperoper.de/ |  |
| `staatskapelle_dresden` | Germany | Sächsische Staatskapelle Dresden | https://www.staatskapelle-dresden.de/ |  |
| `staatsoper_berlin` | Germany | Staatsoper Unter den Linden | https://www.staatsoper-berlin.de/ |  |
| `staatsoper_hamburg` | Germany | Staatsoper Hamburg | https://www.die-hamburgische-staatsoper.de/ |  |
| `staatsoper_stuttgart` | Germany | Staatsoper Stuttgart | https://www.staatsoper-stuttgart.de/ |  |
| `stuttgarter_philharmoniker` | Germany | Stuttgarter Philharmoniker | https://www.stuttgarter-philharmoniker.de/ |  |
| `thomaskirche_leipzig` | Germany | Thomaskirche Leipzig | https://www.thomaskirche.org/ |  |
| `tonhalle_duesseldorf` | Germany | Tonhalle Düsseldorf | https://www.tonhalle.de/ |  |
| `arena_di_verona` | Italy | Fondazione Arena di Verona | https://www.arena.it/ |  |
| `carlo_felice_genova` | Italy | Teatro Carlo Felice | https://carlofelice.it/ |  |
| `maggio_fiorentino` | Italy | Maggio Musicale Fiorentino | https://www.maggiofiorentino.com/ |  |
| `opera_di_roma` | Italy | Teatro dell'Opera di Roma | https://www.operaroma.it/ |  |
| `osn_rai` | Italy | Orchestra Sinfonica Nazionale della Rai | https://www.raicultura.it/orchestrarai |  |
| `quartetto_milano` | Italy | Società del Quartetto di Milano | https://www.quartettomilano.it/ |  |
| `santa_cecilia` | Italy | Accademia Nazionale di Santa Cecilia | https://santacecilia.it/ |  |
| `sinfonica_milano` | Italy | Orchestra Sinfonica di Milano | https://sinfonicadimilano.org/ |  |
| `teatro_alla_scala` | Italy | Teatro alla Scala | https://www.teatroallascala.org/ |  |
| `teatro_comunale_bologna` | Italy | Teatro Comunale di Bologna | https://www.tcbo.it/ | off: robots.txt blocks ClaudeBot |
| `teatro_la_fenice` | Italy | Teatro La Fenice | https://www.teatrolafenice.it/ |  |
| `teatro_regio_parma` | Italy | Teatro Regio di Parma | https://teatroregioparma.it/ |  |
| `teatro_regio_torino` | Italy | Teatro Regio Torino | https://www.teatroregio.torino.it/ |  |
