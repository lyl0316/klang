# Concert feeds

Klang's real listings come from the venues' and orchestras' own websites. A small Python job reads them once a day and writes `data/concerts.json`, which is published next to the app. It uses the Python standard library only, with no pip packages.

Sheng's data is never used. The research behind the source list is in `spec/CONCERT-FEEDS.md`.

## How it works

1. **Schedule.** `.github/workflows/pages.yml` runs at 04:23 UTC (early morning in Switzerland), on every push to `main`, and on demand.
2. **Fetch.** `build.py` finds every reader in `sources/` and runs them one after another. Each reader fetches its site through `common.get()`, which is polite by construction (see [Politeness](#politeness)).
3. **Normalise.** Each reader returns a list of events made by `common.make_event()`. Every event has Swiss local time with the correct offset.
4. **Combine.** `build.py` then:
   - keeps events from today to today + 450 days (Swiss time);
   - merges the same performance listed by two sources;
   - sorts the events by start time;
   - writes `{"generatedAt", "sources", "concerts"}`.
5. **Recover.** If a reader fails, its events from the previously published feed are reused. One broken site therefore doesn't empty a city. This also happens when a reader times out, or returns nothing when it had at least 5 events last time.
6. **Deploy.** The workflow uploads the whole app folder, including the fresh `data/concerts.json`, to GitHub Pages.

Pushes reuse any source that was fetched successfully in the last 20 hours with the same reader code (`--fresh-hours 20`). Developing the app therefore doesn't make extra requests to the venues. Scheduled and manual runs always fetch.

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
| `--previous URL_OR_PATH` | Feed to fall back on when a source fails. The default is the published `https://lyl0316.github.io/klang/data/concerts.json`; `none` disables it. A local copy at `--out` is the second choice. |
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
  ]
}
```

- **Empty fields are left out.**
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
- **Keep only concerts.** Keep classical concerts, opera and recitals in Switzerland. Skip:
  - tours abroad;
  - guided tours, workshops, school projects and talks;
  - galas and balls;
  - family-only events that aren't clearly a concert.
- **Name roles consistently:**
  - `Conductor`;
  - instruments and voices: `Piano`, `Violin`, `Soprano` …;
  - `Orchestra`, `Ensemble` or `Choir` for groups;
  - `Performer` when the site gives no role and the name isn't obviously a group.
- **Stay within 60 requests.** One run may send at most 60 requests (`common.MAX_REQUESTS`). When a site needs one request per concert, check `requests_left()` before fetching detail pages, or read a listing or .ics instead. A reader can lower its own cap with `MAX_REQUESTS`, or set `TIME_LIMIT` (seconds, at most 1200).
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
- **Sources run one at a time,** with no parallel requests.
- **It retries twice** on 429, 5xx and network errors, honouring `Retry-After` up to 120 s.
- **It caps each source** at 60 requests per run, with a time limit. The daily schedule means each site is read about once a day.
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

## De-duplication

The same performance often appears twice, for example the OSR's own calendar and the Ville de Genève dataset for Victoria Hall. Two events from different sources are treated as one when all of these hold:

- **City:** the same city (aliases are matched: Zürich/Zurich, Genève/Geneva/Genf …).
- **Venue:** a similar venue. "Tonhalle Zürich" ≈ "Tonhalle Zürich, Grosser Saal", but Grosser ≠ Kleiner Saal. When a venue is missing, the titles must be similar instead.
- **Time:** starts within 20 minutes of each other.

The record kept comes from the source with the higher priority:

| `KIND` | Priority |
|---|---|
| `orchestra` / `ensemble` | 30 |
| `venue` / `festival` | 20 (the default) |
| `aggregator` | 10 |

A module's `PRIORITY` overrides its kind. Between equal priorities, the richer record wins. Its empty fields (ticket link, duration, programme …) are then filled from the other record.

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
