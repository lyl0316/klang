#!/usr/bin/env python3
"""Offline smoke test of the feed framework: python3 tools/feeds/selftest.py

Covers common.py (ICS incl. DST, to_zurich_iso, make_event, jsonld_events, clean,
guess_type, robots.txt rules, the polite GET against a throwaway server on 127.0.0.1,
the previous feed for incremental details, and the type rules), the source registry,
build.py (checks, de-duplication and the merge rule, the type pass, codeHash, request
caps, fallback to the previous feed) and the incremental details of the Tonhalle and
Opernhaus readers. Nothing leaves this machine.
"""
from __future__ import annotations

import gzip
import http.server
import json
import os
import sys
import tempfile
import threading
import time
import types
import unittest
from datetime import date, datetime, timedelta, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import common  # noqa: E402
import sources as registry  # noqa: E402
import build  # noqa: E402

Z = common.ZURICH


class Clean(unittest.TestCase):
    def test_clean(self):
        self.assertEqual(common.clean('<p>Sinfonie&shy;konzert&nbsp;<b>Nr.&#160;1</b></p>\n  <br>Zürich'),
                         'Sinfoniekonzert Nr. 1 Zürich')
        self.assertEqual(common.clean('Rachmaninow &amp;shy;Abend'), 'Rachmaninow Abend')
        self.assertEqual(common.clean(None), '')
        self.assertEqual(common.clean('a​ b  c'), 'a b c')
        self.assertEqual(common.clean('<script>var x=1;</script>Titel'), 'Titel')

    def test_guess_type(self):
        g = common.guess_type
        self.assertEqual(g('La Traviata – Oper in drei Akten'), 'vocal-opera')
        self.assertEqual(g('Mozart: Requiem'), 'vocal-opera')
        self.assertEqual(g('Zürcher Sing-Akademie & Kammerchor'), 'vocal-opera')
        self.assertEqual(g('Klavierrezital Igor Levit'), 'recital')
        self.assertEqual(g('Quatuor Ébène'), 'chamber')
        self.assertEqual(g('Zürcher Kammerorchester – Saisoneröffnung'), 'orchestral')
        self.assertEqual(g('Orchestre de Chambre de Genève'), 'orchestral')
        self.assertEqual(g('5. Sinfoniekonzert'), 'orchestral')
        self.assertEqual(g('Ballett: Choreografie von X'), None)
        self.assertEqual(g(''), None)

    def test_looks_cancelled(self):
        self.assertTrue(common.looks_cancelled('ABGESAGT: Liederabend'))
        self.assertTrue(common.looks_cancelled('Concert annulé'))
        self.assertFalse(common.looks_cancelled('Sinfoniekonzert'))


class Times(unittest.TestCase):
    def test_to_zurich_iso(self):
        f = common.to_zurich_iso
        self.assertEqual(f('2026-11-20T18:30:00Z'), '2026-11-20T19:30:00+01:00')
        self.assertEqual(f('2026-07-10T17:30:00Z'), '2026-07-10T19:30:00+02:00')
        self.assertEqual(f('2026-11-20T20:30:00+02:00'), '2026-11-20T19:30:00+01:00')
        self.assertEqual(f('2026-11-20T19:30:00+0100'), '2026-11-20T19:30:00+01:00')
        self.assertEqual(f('2026-11-20 19:30'), '2026-11-20T19:30:00+01:00')            # naive = Swiss
        self.assertEqual(f('2026-08-15T17:00:00', assume='UTC'), '2026-08-15T19:00:00+02:00')  # Lucerne Festival style
        self.assertEqual(f('2026-11-20T19:30:45.123+01:00'), '2026-11-20T19:30:00+01:00')
        self.assertEqual(f('20261120T183000Z'), '2026-11-20T19:30:00+01:00')
        self.assertEqual(f(datetime(2026, 12, 31, 18, 0, tzinfo=timezone.utc)), '2026-12-31T19:00:00+01:00')
        self.assertEqual(f(datetime(2027, 6, 1, 19, 30)), '2027-06-01T19:30:00+02:00')
        self.assertEqual(f(datetime(2026, 11, 20, 18, 30, tzinfo=timezone.utc).timestamp()), '2026-11-20T19:30:00+01:00')
        self.assertEqual(f(int(datetime(2026, 11, 20, 18, 30, tzinfo=timezone.utc).timestamp() * 1000)),
                         '2026-11-20T19:30:00+01:00')
        # ZKO labels UTC as +02:00 all year: a reader strips the label and assumes UTC.
        self.assertEqual(f('2026-12-05T18:30:00', assume='UTC'), '2026-12-05T19:30:00+01:00')
        for bad in ('2026-11-20', date(2026, 11, 20), 'next Friday', None):
            with self.assertRaises(ValueError):
                f(bad)

    def test_dst_edges(self):
        f = common.to_zurich_iso
        # 2027-03-28: clocks go 02:00 -> 03:00; 2026-10-25: 03:00 -> 02:00
        self.assertEqual(f('2027-03-28T00:30:00Z'), '2027-03-28T01:30:00+01:00')
        self.assertEqual(f('2027-03-28T01:30:00Z'), '2027-03-28T03:30:00+02:00')
        self.assertEqual(f('2026-10-25T00:30:00Z'), '2026-10-25T02:30:00+02:00')
        self.assertEqual(f('2026-10-25T01:30:00Z'), '2026-10-25T02:30:00+01:00')
        self.assertEqual(f('2026-10-24T19:30'), '2026-10-24T19:30:00+02:00')
        self.assertEqual(f('2026-10-25T19:30'), '2026-10-25T19:30:00+01:00')

    def test_today(self):
        self.assertIsInstance(common.today_zurich(), date)
        os.environ['KLANG_FEEDS_TODAY'] = '2026-11-01'
        try:
            self.assertEqual(common.today_zurich(), date(2026, 11, 1))
        finally:
            del os.environ['KLANG_FEEDS_TODAY']


ICS = (
    'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Test//EN\r\nX-WR-TIMEZONE:Europe/Zurich\r\n'
    'BEGIN:VTIMEZONE\r\nTZID:Europe/Zurich\r\nBEGIN:STANDARD\r\nDTSTART:19701025T030000\r\n'
    'TZOFFSETFROM:+0200\r\nTZOFFSETTO:+0100\r\nEND:STANDARD\r\nEND:VTIMEZONE\r\n'
    # summer, TZID local time, folded summary and escaped text, alarm inside
    'BEGIN:VEVENT\r\nUID:evt-1@example.ch\r\nDTSTART;TZID=Europe/Zurich:20270612T193000\r\n'
    'DTEND;TZID=Europe/Zurich:20270612T213000\r\nSUMMARY:Sinfoniekonzert: Mahler\\, Symphonie Nr. 2 \r\n'
    ' «Auferstehung»\r\nLOCATION:Tonhalle Zürich\\, Grosser Saal\r\nDESCRIPTION:Line 1\\nLine 2\r\n'
    'URL;VALUE=URI:https://example.ch/e/1\r\nCATEGORIES:Konzert,Orchester\r\n'
    'BEGIN:VALARM\r\nACTION:DISPLAY\r\nDESCRIPTION:Reminder text\r\nTRIGGER:-PT1H\r\nEND:VALARM\r\n'
    'END:VEVENT\r\n'
    # winter, UTC time, duration, cancelled
    'BEGIN:VEVENT\r\nUID:evt-2\r\nDTSTART:20261203T183000Z\r\nDURATION:PT1H45M\r\nSUMMARY:Liederabend\r\n'
    'STATUS:CANCELLED\r\nEND:VEVENT\r\n'
    # all-day
    'BEGIN:VEVENT\r\nUID:evt-3\r\nDTSTART;VALUE=DATE:20261224\r\nSUMMARY:Festtage\r\nEND:VEVENT\r\n'
    # quoted / prefixed TZID, floating time, Windows zone name
    'BEGIN:VEVENT\r\nUID:evt-4\r\nDTSTART;TZID="/freeassociation.sourceforge.net/Tzfile/Europe/Zurich":20270110T170000\r\n'
    'SUMMARY:Matinee\r\nEND:VEVENT\r\n'
    'BEGIN:VEVENT\r\nUID:evt-5\r\nDTSTART:20270320T200000\r\nSUMMARY:Floating\r\nEND:VEVENT\r\n'
    'BEGIN:VEVENT\r\nUID:evt-6\r\nDTSTART;TZID=W. Europe Standard Time:20270801T110000\r\nSUMMARY:Outlook\r\nEND:VEVENT\r\n'
    'BEGIN:VEVENT\r\nUID:no-start\r\nSUMMARY:Broken\r\nEND:VEVENT\r\n'
    'END:VCALENDAR\r\n'
)


class Ics(unittest.TestCase):
    def setUp(self):
        self.events = {e['uid']: e for e in common.parse_ics(ICS)}

    def test_count_and_keys(self):
        self.assertEqual(sorted(self.events), ['evt-1@example.ch', 'evt-2', 'evt-3', 'evt-4', 'evt-5', 'evt-6'])
        for key in ('uid', 'summary', 'start', 'end', 'location', 'url', 'description', 'status'):
            self.assertIn(key, self.events['evt-1@example.ch'])

    def test_summer_tzid_and_folding(self):
        e = self.events['evt-1@example.ch']
        self.assertEqual(e['summary'], 'Sinfoniekonzert: Mahler, Symphonie Nr. 2 «Auferstehung»')
        self.assertEqual(e['location'], 'Tonhalle Zürich, Grosser Saal')
        self.assertEqual(e['description'], 'Line 1\nLine 2')       # VALARM text did not leak in
        self.assertEqual(e['url'], 'https://example.ch/e/1')
        self.assertEqual(e['categories'], ['Konzert', 'Orchester'])
        self.assertEqual(common.to_zurich_iso(e['start']), '2027-06-12T19:30:00+02:00')
        self.assertEqual((e['end'] - e['start']), timedelta(hours=2))
        self.assertIsNotNone(e['start'].tzinfo)

    def test_winter_utc_duration_cancelled(self):
        e = self.events['evt-2']
        self.assertEqual(common.to_zurich_iso(e['start']), '2026-12-03T19:30:00+01:00')
        self.assertEqual(e['end'] - e['start'], timedelta(minutes=105))
        self.assertEqual(e['status'], 'cancelled')

    def test_all_day_and_zones(self):
        e = self.events['evt-3']
        self.assertTrue(e['all_day'])
        self.assertEqual(e['start'].date(), date(2026, 12, 24))
        self.assertEqual(common.to_zurich_iso(self.events['evt-4']['start']), '2027-01-10T17:00:00+01:00')
        self.assertEqual(common.to_zurich_iso(self.events['evt-5']['start']), '2027-03-20T20:00:00+01:00')
        self.assertEqual(common.to_zurich_iso(self.events['evt-6']['start']), '2027-08-01T11:00:00+02:00')

    def test_lf_only_and_bytes(self):
        out = common.parse_ics(ICS.replace('\r\n', '\n').encode('utf-8'))
        self.assertEqual(len(out), 6)


class MakeEvent(unittest.TestCase):
    def test_full(self):
        ev = common.make_event(
            'zko', 4711, ' Saisoneröffnung&shy; ', '2026-11-20T18:30:00Z',
            end='2026-11-20T20:30:00+01:00', city='Zürich', venueName='Tonhalle Zürich, Grosser Saal',
            type='opera', series='', credits=[{'role': 'conductor', 'name': 'Daniel Hope'}, ('Violin', 'Daniel Hope'),
                                              {'role': 'Conductor', 'name': 'Daniel Hope'}, {'name': 'Zürcher Kammerorchester', 'role': 'Orchestra'},
                                              {'role': 'Piano', 'name': ''}, 'Someone'],
            program=[('Mozart', 'Symphonie Nr. 40'), {'composer': 'Haydn', 'title': ''}, {'composer': '', 'title': ''}],
            ticketUrl='javascript:alert(1)', url='https://www.zko.ch/konzert/4711', status='EventScheduled')
        self.assertEqual(ev['id'], 'zko-4711')
        self.assertEqual(ev['title'], 'Saisoneröffnung')
        self.assertEqual(ev['start'], '2026-11-20T19:30:00+01:00')
        self.assertEqual(ev['durationMin'], 60)
        self.assertEqual(ev['type'], 'vocal-opera')
        self.assertNotIn('series', ev)
        self.assertNotIn('ticketUrl', ev)
        self.assertEqual(ev['credits'], [{'role': 'Conductor', 'name': 'Daniel Hope'}, {'role': 'Violin', 'name': 'Daniel Hope'},
                                         {'role': 'Orchestra', 'name': 'Zürcher Kammerorchester'},
                                         {'role': 'Performer', 'name': 'Someone'}])
        self.assertEqual(ev['program'], [{'composer': 'Mozart', 'title': 'Symphonie Nr. 40'}, {'composer': 'Haydn', 'title': ''}])
        self.assertEqual(ev['status'], 'scheduled')
        self.assertEqual(list(ev)[:4], ['id', 'source', 'title', 'start'])

    def test_minimal_and_ids(self):
        ev = common.make_event('geneve_opendata', 'geneve_opendata-abc', 'Récital', datetime(2027, 1, 5, 20, tzinfo=Z))
        self.assertEqual(ev, {'id': 'geneve_opendata-abc', 'source': 'geneve_opendata', 'title': 'Récital',
                              'start': '2027-01-05T20:00:00+01:00', 'status': 'scheduled'})
        self.assertEqual(common.make_event('x', 'Konzert Zürich/1', 'T', '2027-01-05T20:00:00+01:00')['id'], 'x-Konzert-Zurich-1')
        long_id = common.make_event('x', 'https://example.ch/' + 'a' * 100, 'T', '2027-01-05T20:00:00+01:00')['id']
        self.assertLessEqual(len(long_id), 2 + 64)
        self.assertEqual(long_id, common.make_event('x', 'https://example.ch/' + 'a' * 100, 'T', '2027-01-05T20:00:00+01:00')['id'])

    def test_status(self):
        mk = lambda s: common.make_event('x', 1, 'T', '2027-01-05T20:00:00+01:00', status=s)['status']
        self.assertEqual(mk('https://schema.org/EventCancelled'), 'cancelled')
        self.assertEqual(mk('canceled'), 'cancelled')
        self.assertEqual(mk(True), 'cancelled')
        self.assertEqual(mk('EventPostponed'), 'cancelled')
        self.assertEqual(mk(None), 'scheduled')

    def test_invalid(self):
        good = '2027-01-05T20:00:00+01:00'
        for args in (('x', 1, '', good), ('x', 1, '<b></b>', good), ('x', '', 'T', good), ('x', None, 'T', good),
                     ('x', 1, 'T', '2027-01-05T20:00:00'), ('x', 1, 'T', '2027-01-05'), ('x', 1, 'T', datetime(2027, 1, 5, 20)),
                     ('x', 1, 'T', 'soon'), ('X Y', 1, 'T', good), ('x', 1, 'T', '1890-01-05T20:00:00+01:00')):
            with self.assertRaises(ValueError, msg=repr(args)):
                common.make_event(*args)
        with self.assertRaises(TypeError):
            common.make_event('x', 1, 'T', good, venue='Tonhalle')
        ev = common.make_event('x', 1, 'T', good, type='ballet', durationMin=5000)
        self.assertNotIn('type', ev)
        self.assertNotIn('durationMin', ev)


LD_HTML = '''<html><head>
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[
  {"@type":"WebPage","name":"Konzerte"},
  {"@type":"MusicEvent","name":"Sinfoniekonzert","startDate":"2026-11-20T19:30:00+01:00",
   "location":{"@type":"Place","name":"Stadthaus Winterthur"},
   "performer":[{"@type":"Person","name":"A"}]}]}</script>
<script type='application/ld+json; charset=utf-8'>[{"@type":"ItemList","itemListElement":[
  {"@type":"ListItem","item":{"@type":["Event","TheaterEvent"],"name":"Tosca","startDate":"2027-02-01T19:00"}}]}]</script>
<script type="application/ld+json">{"@type":"Festival","name":"Sommer","subEvent":[
  {"@type":"schema:MusicEvent","name":"Eröffnung
mit Zeilenumbruch","startDate":"2027-08-10T18:30:00"},]}</script>
<script type="application/ld+json">{ this is not json }</script>
<script type="text/javascript">var x = {"@type":"MusicEvent"};</script>
<script type="application/ld+json">{&quot;@type&quot;:&quot;Event&quot;,&quot;name&quot;:&quot;Escaped&quot;}</script>
</head><body></body></html>'''


class JsonLd(unittest.TestCase):
    def test_events(self):
        names = [e['name'] for e in common.jsonld_events(LD_HTML)]
        self.assertEqual(names, ['Sinfoniekonzert', 'Tosca', 'Eröffnung\nmit Zeilenumbruch', 'Escaped'])
        self.assertEqual(common.jsonld_events(''), [])
        self.assertEqual(common.as_list(None), [])
        self.assertEqual(common.as_list('a'), ['a'])


class Robots(unittest.TestCase):
    TEXT = ('User-agent: *\nDisallow: /private\nAllow: /private/ok\nDisallow: /*?filter=\nDisallow: /*.pdf$\n'
            'Crawl-delay: 2.5\n\nUser-agent: GreedyBot\nDisallow: /\n')

    def test_rules(self):
        r = common._Robots(self.TEXT)
        self.assertTrue(r.allowed('https://x.ch/konzerte'))
        self.assertFalse(r.allowed('https://x.ch/private/a'))
        self.assertTrue(r.allowed('https://x.ch/private/ok/page'))
        self.assertFalse(r.allowed('https://x.ch/kalender?filter=orchester'))
        self.assertTrue(r.allowed('https://x.ch/kalender?page=2'))
        self.assertFalse(r.allowed('https://x.ch/a/b.pdf'))
        self.assertTrue(r.allowed('https://x.ch/a/b.pdf?x=1'))
        self.assertTrue(r.allowed('https://x.ch/robots.txt'))
        self.assertEqual(r.delay, 2.5)

    def test_own_group_wins(self):
        r = common._Robots('User-agent: *\nDisallow: /\n\nUser-agent: KlangConcertBot\nDisallow: /intern\n')
        self.assertTrue(r.allowed('https://x.ch/konzerte'))
        self.assertFalse(r.allowed('https://x.ch/intern/x'))
        self.assertFalse(common._Robots(disallow_all=True).allowed('https://x.ch/'))
        self.assertTrue(common._Robots(allow_all=True).allowed('https://x.ch/'))


class _Handler(http.server.BaseHTTPRequestHandler):
    log = []
    flaky = {'n': 0}

    def log_message(self, *a):
        pass

    def _send(self, code, body=b'', ctype='text/html; charset=utf-8', headers=None):
        self.send_response(code)
        self.send_header('Content-Type', ctype)
        for k, v in (headers or {}).items():
            self.send_header(k, v)
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        _Handler.log.append((time.monotonic(), self.path, self.headers.get('User-Agent')))
        p = self.path
        if p == '/robots.txt':
            return self._send(200, b'User-agent: *\nDisallow: /private\nDisallow: /*?filter=\nCrawl-delay: 0.3\n', 'text/plain')
        if p == '/page':
            return self._send(200, '<p>Zürich&shy;</p>'.encode('utf-8'))
        if p == '/latin':
            return self._send(200, 'Genève'.encode('latin-1'), 'text/html; charset=iso-8859-1')
        if p == '/nocharset':
            return self._send(200, 'Genève'.encode('cp1252'), 'text/html')
        if p == '/gz':
            return self._send(200, gzip.compress('{"a": "Zürich"}'.encode('utf-8')), 'application/json',
                              {'Content-Encoding': 'gzip'})
        if p == '/json':
            return self._send(200, b'\xef\xbb\xbf{"ok": true}', 'application/json')
        if p == '/badjson':
            return self._send(200, b'<html>oops</html>')
        if p == '/flaky':
            _Handler.flaky['n'] += 1
            if _Handler.flaky['n'] == 1:
                return self._send(503, b'busy', headers={'Retry-After': '0'})
            return self._send(200, b'finally')
        if p == '/k%20onzert/z%C3%BCrich?x=a%20b':
            return self._send(200, 'Konzert zürich'.encode('utf-8'))
        if p == '/redirect':
            return self._send(302, b'', headers={'Location': '/private/x'})
        return self._send(404, b'nope')


class PoliteGet(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.saved = (common.MIN_DELAY, common.BACKOFF)
        common.MIN_DELAY, common.BACKOFF = 0.05, (0.05, 0.05)
        cls.server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), _Handler)
        threading.Thread(target=cls.server.serve_forever, daemon=True).start()
        cls.base = f'http://127.0.0.1:{cls.server.server_address[1]}'

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        common.MIN_DELAY, common.BACKOFF = cls.saved

    def test_get(self):
        b = self.base
        with common.source_budget('test', max_requests=20) as budget:
            self.assertEqual(common.clean(common.get(b + '/page')), 'Zürich')
            self.assertEqual(common.get(b + '/latin'), 'Genève')
            self.assertEqual(common.get(b + '/nocharset'), 'Genève')
            self.assertEqual(common.get_json(b + '/gz'), {'a': 'Zürich'})
            self.assertEqual(common.get_json(b + '/json'), {'ok': True})
            with self.assertRaises(common.FetchError):
                common.get_json(b + '/badjson')
            with self.assertRaises(common.FetchError) as cm:
                common.get(b + '/missing')
            self.assertEqual(cm.exception.status, 404)
            with self.assertRaises(common.FetchError) as cm:
                common.get(b + '/private/secret')
            self.assertIn('robots', cm.exception.reason)
            with self.assertRaises(common.FetchError):
                common.get(b + '/list?filter=a')
            with self.assertRaises(common.FetchError) as cm:
                common.get(b + '/redirect')
            self.assertIn('robots', cm.exception.reason)
            self.assertEqual(common.get(b + '/flaky'), 'finally')
            self.assertEqual(common.get(b + '/k onzert/zürich?x=a b#frag', accept='text/html'), 'Konzert zürich')
            self.assertEqual(budget.used, 11)    # robots-blocked URLs cost nothing; the retry costs one
            with self.assertRaises(common.FetchError):
                common.get('ftp://example.ch/x')
        paths = [p for _, p, _ in _Handler.log]
        self.assertEqual(paths.count('/robots.txt'), 1)
        self.assertNotIn('/private/secret', paths)
        self.assertNotIn('/private/x', paths)
        self.assertTrue(all(ua == common.USER_AGENT for _, _, ua in _Handler.log))
        times = [t for t, _, _ in _Handler.log]
        gaps = [b - a for a, b in zip(times, times[1:])]
        self.assertGreaterEqual(min(gaps), 0.27, gaps)   # Crawl-delay: 0.3 honoured (arrival times jitter a little)

    def test_budget(self):
        with common.source_budget('cap', max_requests=2) as budget:
            common.get(self.base + '/page')
            self.assertEqual(common.requests_left(), 1)
            common.get(self.base + '/page')
            with self.assertRaises(common.BudgetExceeded):
                common.get(self.base + '/page')
            self.assertIn('cap', budget.exhausted)
        with common.source_budget('slow', seconds=0.01) as budget:
            time.sleep(0.02)
            with self.assertRaises(common.BudgetExceeded):
                common.get(self.base + '/page')
            self.assertEqual(budget.used, 0)
        with common.source_budget('big', max_requests=500) as budget:
            self.assertEqual(budget.max_requests, common.MAX_REQUESTS_CAP)
        with common.source_budget('default') as budget:
            self.assertEqual(budget.max_requests, common.MAX_REQUESTS)


class Registry(unittest.TestCase):
    def test_discover(self):
        found = registry.discover()
        self.assertEqual([s.key for s in found], registry.module_names())
        for s in found:
            self.assertTrue(s.key)
            self.assertLessEqual(s.max_requests, common.MAX_REQUESTS)


def ev(source, sid, start, title='Konzert', **kw):
    return common.make_event(source, sid, title, start, **kw)


class Build(unittest.TestCase):
    def test_check_events(self):
        today = date(2026, 11, 1)
        good = ev('a', 1, '2026-11-01T10:00:00+01:00')
        past = ev('a', 2, '2026-10-31T23:00:00+01:00')
        far = ev('a', 3, '2028-03-01T19:00:00+01:00')
        wrong = ev('b', 4, '2026-11-02T19:00:00+01:00')
        kept, invalid, outside, problems = build.check_events([good, past, far, wrong, 'x', {}], 'a', today,
                                                              today + timedelta(days=450))
        self.assertEqual([e['id'] for e in kept], ['a-1'])
        self.assertEqual((invalid, outside), (3, 2))

    def test_dedupe(self):
        orch = ev('zko', 1, '2026-12-01T19:30:00+01:00', 'Daniel Hope & ZKO', city='Zürich',
                  venueName='Tonhalle Zürich, Grosser Saal', credits=[('Violin', 'Daniel Hope')])
        hall = ev('tonhalle', 'x9', '2026-12-01T19:45:00+01:00', 'Zürcher Kammerorchester', city='Zurich',
                  venueName='Tonhalle Zürich', ticketUrl='https://tickets.example.ch/1', durationMin=110)
        small = ev('tonhalle', 'x10', '2026-12-01T19:30:00+01:00', 'Kammermusik', city='Zürich',
                   venueName='Tonhalle Zürich, Kleiner Saal')
        geneva = ev('osr', 7, '2026-12-01T19:30:00+01:00', 'OSR', city='Genève', venueName='Victoria Hall')
        geneva2 = ev('geneve_opendata', 'vh-1', '2026-12-01T19:30:00+01:00', 'Orchestre de la Suisse Romande',
                     city='Geneva', venueName='Victoria Hall, Genève', program=[('Ravel', 'Boléro')])
        later = ev('geneve_opendata', 'vh-2', '2026-12-01T21:00:00+01:00', 'Late', city='Genève', venueName='Victoria Hall')
        nov = ev('osr', 8, '2026-11-15T20:00:00+01:00', 'Bruckner 8', city='Genève')
        nov2 = ev('geneve_opendata', 'x', '2026-11-15T20:10:00+01:00', 'Bruckner 8 – OSR', city='Genf')
        prio = {'zko': 30, 'osr': 30, 'tonhalle': 20, 'geneve_opendata': 10}
        out, merged = build.dedupe([hall, small, orch, geneva2, geneva, later, nov, nov2, dict(orch)], prio)
        ids = [e['id'] for e in out]
        self.assertEqual(merged, 4)       # one repeated id + three cross-source duplicates
        self.assertEqual(ids, ['osr-8', 'zko-1', 'tonhalle-x10', 'osr-7', 'geneve_opendata-vh-2'])  # by start, then title
        z = next(e for e in out if e['id'] == 'zko-1')
        self.assertEqual(z['ticketUrl'], 'https://tickets.example.ch/1')   # gap filled from the hall
        self.assertEqual(z['durationMin'], 110)
        self.assertEqual(z['venueName'], 'Tonhalle Zürich, Grosser Saal')
        o = next(e for e in out if e['id'] == 'osr-7')
        self.assertEqual(o['program'], [{'composer': 'Ravel', 'title': 'Boléro'}])
        self.assertFalse(build.same_concert(ev('a', 1, '2026-12-01T19:30:00+01:00', city='Basel', venueName='Stadtcasino'),
                                            ev('b', 1, '2026-12-01T19:30:00+01:00', city='Bern', venueName='Stadtcasino')))
        self.assertFalse(build.same_concert(ev('a', 1, '2026-12-01T19:30:00+01:00', city='Zürich', venueName='Kirche St. Peter'),
                                            ev('b', 1, '2026-12-01T19:30:00+01:00', city='Zürich', venueName='Kirche')))

    def _fake(self, key, fetch, kind='venue'):
        mod = types.SimpleNamespace(KEY=key, NAME=key.upper(), SITE=f'https://{key}.example.ch/',
                                    ATTRIBUTION=f'Source: {key}', fetch=fetch, __file__=__file__)
        return registry.Source(key=key, name=mod.NAME, site=mod.SITE, attribution=mod.ATTRIBUTION, module=mod,
                               kind=kind, priority=registry.KIND_PRIORITY[kind], time_limit=30)

    def test_main_with_fallback(self):
        today = common.today_zurich()
        soon = lambda d, h=19: datetime.combine(today + timedelta(days=d), datetime.min.time()).replace(hour=h, tzinfo=Z)

        def ok_fetch():
            return [ev('good', 1, soon(3), 'Recital', city='Basel', venueName='Stadtcasino Basel'),
                    ev('good', 2, soon(-3), 'Past'), ev('good', 3, soon(600), 'Too far')]

        def broken_fetch():
            raise RuntimeError('site redesign')

        def empty_fetch():
            return []

        with tempfile.TemporaryDirectory() as tmp:
            prev_path = os.path.join(tmp, 'previous.json')
            out_path = os.path.join(tmp, 'out', 'concerts.json')
            previous = {'concerts': [ev('broken', 'p1', soon(5), 'Old but valid'), ev('broken', 'p0', soon(-1), 'Old past')]
                        + [ev('empty', f'e{i}', soon(i + 1), f'E{i}') for i in range(6)]
                        + [ev('fresh', 'f1', soon(2), 'From last run')],
                        'sources': [{'key': 'fresh', 'ok': True, 'fetchedAt': common.to_zurich_iso(datetime.now(Z)) ,
                                     'codeHash': None}]}
            fresh_src = self._fake('fresh', lambda: self.fail('fresh source must not be fetched'))
            previous['sources'][0]['codeHash'] = build._code_hash(fresh_src)
            with open(prev_path, 'w', encoding='utf-8') as f:
                json.dump(previous, f)
            fakes = [self._fake('good', ok_fetch), self._fake('broken', broken_fetch), self._fake('empty', empty_fetch),
                     fresh_src]
            saved = registry.discover
            registry.discover = lambda only=None: fakes
            try:
                from contextlib import redirect_stdout, redirect_stderr
                import io
                buf = io.StringIO()
                with redirect_stdout(buf), redirect_stderr(io.StringIO()):
                    code = build.main(['--out', out_path, '--previous', prev_path, '--fresh-hours', '20'])
                    strict = build.main(['--out', out_path + '2', '--previous', 'none', '--strict'])
            finally:
                registry.discover = saved
            self.assertEqual(code, 0)
            self.assertEqual(strict, 1)
            with open(out_path, encoding='utf-8') as f:
                doc = json.load(f)
        self.assertEqual(set(doc), {'generatedAt', 'generator', 'notice', 'window', 'sources', 'concerts'})
        src = {s['key']: s for s in doc['sources']}
        self.assertEqual((src['good']['ok'], src['good']['count'], src['good']['reused']), (True, 1, False))
        self.assertEqual((src['broken']['ok'], src['broken']['count'], src['broken']['reused']), (False, 1, True))
        self.assertIn('site redesign', src['broken']['error'])
        self.assertEqual((src['empty']['ok'], src['empty']['count']), (False, 6))
        self.assertEqual((src['fresh']['ok'], src['fresh']['reused'], src['fresh']['count']), (True, True, 1))
        for s in doc['sources']:
            self.assertTrue({'key', 'name', 'site', 'attribution', 'count', 'ok', 'error'} <= set(s))
        titles = [c['title'] for c in doc['concerts']]
        self.assertIn('Recital', titles)
        self.assertIn('Old but valid', titles)
        self.assertNotIn('Old past', titles)
        self.assertNotIn('Past', titles)
        self.assertNotIn('Too far', titles)
        starts = [common.to_zurich_datetime(c['start']) for c in doc['concerts']]
        self.assertEqual(starts, sorted(starts))


class Merge(unittest.TestCase):
    PRIO = {'zko': 30, 'camerata_bern': 30, 'zuger_sinfonietta': 30, 'osr': 30, 'musikkollegium': 30,
            'argovia_philharmonic': 30, 'theater_casino_zug': 20, 'casino_bern': 20, 'tonhalle': 20, 'x': 20, 'y': 20}

    def test_zug_duplicates(self):
        start = '2027-03-04T19:30:00+01:00'
        hall = ev('theater_casino_zug', 'a38c', start, 'INSGEHEIM', city='Zug', venueName='Theater Casino Zug, Theatersaal',
                  credits=[('Performer', 'Reto Bieri'), ('Orchestra', 'CAMERATA BERN')],
                  ticketUrl='https://kartenverkauf.theatercasino.ch/selection/1', url='https://www.theatercasino.ch/programm/insgeheim')
        orch = ev('camerata_bern', 31225, start, '«Insgeheim» in Zug', city='Zug', venueName='Theater Casino Zug',
                  credits=[('Clarinet', 'Reto Bieri'), ('Orchestra', 'Camerata Bern')],
                  url='https://www.cameratabern.ch/konzerte/insgeheim-in-zug-1')
        self.assertTrue(build.same_concert(hall, orch))
        out, merged = build.dedupe([hall, orch], self.PRIO)
        self.assertEqual((merged, len(out)), (1, 1))
        m = out[0]
        self.assertEqual(m['id'], 'camerata_bern-31225')                      # the orchestra's record (stable id)
        self.assertEqual(m['venueName'], 'Theater Casino Zug, Theatersaal')    # the more specific venue
        self.assertEqual(m['ticketUrl'], 'https://kartenverkauf.theatercasino.ch/selection/1')
        self.assertEqual(m['credits'][0], {'role': 'Clarinet', 'name': 'Reto Bieri'})

    def test_ticket_on_the_venues_domain(self):
        start = '2027-01-21T19:30:00+01:00'
        zko = ev('zko', 19808, start, 'ZKO on Tour — Gabriela Montero & Simon Höfele', city='Zug',
                 venueName='Theater Casino Zug', credits=[('Piano', 'Gabriela Montero'), ('Trumpet', 'Simon Höfele'),
                                                          ('Orchestra', 'Zürcher Kammerorchester')],
                 program=[('Leoš Janáček', 'Idylle für Streichorchester')],
                 ticketUrl='https://festspiele-mv.de/alle-konzerte/vivaldi-recomposed', url='https://zko.ch/events/zko-on-tour/')
        hall = ev('theater_casino_zug', '78a3', start, 'Idyllen und Visionen', city='Zug',
                  venueName='Theater Casino Zug, Theatersaal',
                  credits=[('Piano', 'Gabriela Montero'), ('Trumpet', 'Simon Höfele'), ('Orchestra', 'Zürcher Kammerorchester')],
                  ticketUrl='https://kartenverkauf.theatercasino.ch/selection/event/date?productId=1',
                  url='https://www.theatercasino.ch/programm/idyllen-und-visionen')
        out, merged = build.dedupe([zko, hall], self.PRIO, {'zko': 'https://zko.ch/', 'theater_casino_zug': 'https://www.theatercasino.ch/'})
        self.assertEqual(merged, 1)
        self.assertEqual(out[0]['id'], 'zko-19808')
        self.assertEqual(out[0]['ticketUrl'], 'https://kartenverkauf.theatercasino.ch/selection/event/date?productId=1')
        self.assertEqual(out[0]['program'], [{'composer': 'Leoš Janáček', 'title': 'Idylle für Streichorchester'}])
        home = {'zko.ch', 'theatercasino.ch'}
        self.assertEqual(build.ticket_rank('https://festspiele-mv.de/x', home), 1)
        self.assertEqual(build.ticket_rank('https://kartenverkauf.theatercasino.ch/x', home), 3)
        self.assertEqual(build.ticket_rank('https://www.ticketcorner.ch/x', home), 2)
        self.assertEqual(build.ticket_rank(None, home), 0)

    def test_orchestra_on_tour_and_guest_orchestra(self):
        cast = [('Conductor', 'Tugan Sokhiev'), ('Piano', 'Yefim Bronfman'), ('Orchestra', 'Orchestre de la Suisse Romande')]
        osr = ev('osr', 'rach', '2027-04-30T19:30:00+02:00', '100% Rachmaninoff', city='Bern', venueName='Casino Bern',
                 credits=cast, ticketUrl='https://www.osr.ch/fr/concert/rachmaninoff', url='https://www.osr.ch/fr/concert/rachmaninoff')
        cb = ev('casino_bern', 'rv', '2027-04-30T19:30:00+02:00', 'Rendezvous mit Rachmaninow', city='Bern',
                venueName='Casino Bern, Grosser Saal', credits=cast, ticketUrl='https://buehnenbern.ch/spielplan/genf/',
                url='https://www.casinobern.ch/programm/rendezvous-mit-rachmaninow/')
        mk = ev('musikkollegium', 9399, '2026-11-24T19:00:00+01:00', 'Eroica', city='Winterthur', venueName='Stadthaus Winterthur',
                credits=[('Orchestra', 'argovia philharmonic'), ('Conductor', 'Josep Vicent'), ('Voice', 'Ginesa Ortega')])
        ar = ev('argovia_philharmonic', 268491, '2026-11-24T19:00:00+01:00', 'Gastspiel Winterthur', city='Winterthur',
                venueName='Stadtsaal Winterthur', credits=[('Voice', 'Ginesa Ortega'), ('Conductor', 'Josep Vicent'),
                                                           ('Orchestra', 'Argovia Philharmonic')])
        out, merged = build.dedupe([osr, cb, mk, ar], self.PRIO)
        self.assertEqual(merged, 2)
        b = next(e for e in out if e['id'] == 'osr-rach')
        self.assertEqual(b['venueName'], 'Casino Bern, Grosser Saal')
        self.assertEqual(b['ticketUrl'], 'https://www.osr.ch/fr/concert/rachmaninoff')   # the organiser's own shop
        self.assertEqual(sorted(e['id'] for e in out), ['argovia_philharmonic-268491', 'osr-rach'])

    def test_not_the_same_concert(self):
        t = '2026-12-01T19:30:00+01:00'
        a = ev('x', 1, t, 'Adventskonzert', city='Zürich', venueName='Fraumünster', credits=[('Organ', 'A B'), ('Choir', 'Chor X')])
        b = ev('y', 1, t, 'Adventskonzert', city='Zürich', venueName='Grossmünster', credits=[('Organ', 'A B'), ('Choir', 'Chor Y')])
        self.assertFalse(build.same_concert(a, b))          # one shared name, a one-word title
        c = ev('y', 2, t, 'Konzert', city='Basel', venueName='Stadtcasino', credits=[('Organ', 'A B'), ('Choir', 'Chor X')])
        self.assertFalse(build.same_concert(a, c))          # the same performers, but another city
        g = ev('x', 3, t, 'Kammermusik', city='Zürich', venueName='Tonhalle Zürich, Grosser Saal',
               credits=[('Violin', 'Anna Muster'), ('Piano', 'Ben Beispiel')])
        k = ev('y', 3, t, 'Kammermusik', city='Zürich', venueName='Tonhalle Zürich, Kleiner Saal',
               credits=[('Violin', 'Anna Muster'), ('Piano', 'Ben Beispiel')])
        self.assertFalse(build.same_concert(g, k))          # Grosser vs Kleiner Saal
        self.assertFalse(build.venue_contains({'venueName': 'Kirche'}, {'venueName': 'Kirche St. Peter'}))
        self.assertFalse(build.venue_contains({'venueName': 'Kirche Zug'}, {'venueName': 'Reformierte Kirche Zug'}))
        self.assertTrue(build.venue_contains({'venueName': 'Theater Casino Zug'}, {'venueName': 'Theater Casino Zug, Theatersaal'}))
        self.assertTrue(build.title_very_similar('Musiques sérieuses', '2. Abo-Konzert: Musiques sérieuses'))
        self.assertFalse(build.title_very_similar('Weihnachtskonzert', 'Weihnachtskonzert'))
        p = ev('x', 4, t, 'Musiques sérieuses', city='Zug', venueName='Theater Casino Zug, Theatersaal')
        q = ev('y', 4, '2026-12-01T19:40:00+01:00', 'Musiques sérieuses', city='Zug', venueName='Casino')
        self.assertTrue(build.same_concert(p, q))           # very similar titles in the same city

    def test_one_listing_per_source(self):
        t = '2027-01-21T19:30:00+01:00'
        cast = [('Piano', 'Gabriela Montero'), ('Trumpet', 'Simon Höfele')]
        a = ev('zko', 1, t, 'A', city='Zug', venueName='Theater Casino Zug', credits=cast)
        b1 = ev('theater_casino_zug', 1, t, 'B', city='Zug', venueName='Theater Casino Zug, Theatersaal', credits=cast)
        b2 = ev('theater_casino_zug', 2, t, 'B (Zusatzvorstellung)', city='Zug', venueName='Theater Casino Zug, Theatersaal',
                credits=cast)
        out, merged = build.dedupe([a, b1, b2], self.PRIO)
        self.assertEqual((merged, len(out)), (1, 2))        # a source's second listing is not absorbed too

    def test_one_shared_performer_in_the_same_building(self):
        ocg = ev('ocg', 'semi', '2026-11-07T14:30:00+01:00', '80e Concours de Genève – Demi-Finale 1', city='Vernier',
                 venueName='Concorde espace culture', credits=[('Orchestra', "L'Orchestre de Chambre de Genève")],
                 ticketUrl='https://www.infomaniak.events/shop/abc', url='https://locg.ch/concours')
        cv = ev('concorde_vernier', 'semi', '2026-11-07T14:30:00+01:00',
                '80e Concours de Genève – Demi-finales du Concours de Direction d’orchestre', city='Vernier',
                venueName='Concorde, Grande Salle', credits=[('Orchestra', 'Orchestre de Chambre de Genève'),
                                                             ('Ensemble', 'Ensemble Contrechamps')],
                url='https://www.concorde.ch/evenement/concours')
        self.assertTrue(build.same_concert(ocg, cv))        # the article doesn't count; one hall, one orchestra
        other = ev('y', 1, '2026-11-07T14:30:00+01:00', 'Konzert', city='Vernier', venueName='Salle des fêtes du Lignon',
                   credits=[('Orchestra', 'Orchestre de Chambre de Genève')])
        self.assertFalse(build.same_concert(ocg, other))    # another building: not merged on one name
        prio = {'ocg': 30, 'concorde_vernier': 20}
        out, merged = build.dedupe([ocg, cv], prio, {'ocg': 'https://locg.ch/', 'concorde_vernier': 'https://www.concorde.ch/'})
        self.assertEqual((merged, out[0]['id']), (1, 'ocg-semi'))
        self.assertEqual(out[0]['ticketUrl'], 'https://www.infomaniak.events/shop/abc')   # the shop link is kept

    def test_tidy_text(self):
        e = ev('x', 1, '2026-12-01T19:30:00+01:00', 'Ein Sommer- nachtstraum', venueName='Opernhaus\n Zürich',
               credits=[('Tito Vespasiano\n', 'Mauro Peter')],
               program=[('Darius Milhaud', 'La Création du Monde (Kammerfas- sung)'),
                        ('Anton Bruckner', 'Sommer- und Herbstlieder'), ('Gabriel Faure\u0301', 'Requiem')])
        t = build.tidy_event(e)
        self.assertEqual(t['title'], 'Ein Sommernachtstraum')
        self.assertEqual(t['venueName'], 'Opernhaus Zürich')
        self.assertEqual(t['credits'][0]['role'], 'Tito Vespasiano')
        self.assertEqual([p['title'] for p in t['program']][:2], ['La Création du Monde (Kammerfassung)', 'Sommer- und Herbstlieder'])
        self.assertEqual(t['program'][2]['composer'], 'Gabriel Fauré')            # composed accent (NFC)


class Types(unittest.TestCase):
    def test_orchestra_members_are_chamber_music(self):
        e = ev('ocg', 'esp', '2027-01-14T20:00:00+01:00', 'Espagne intime', type='orchestral',
               credits=[('Harpsichord', 'Benjamin Alard'), ('Choreographer', 'Israel Galván'),
                        ('Orchestra', "Solistes de l'Orchestre de Chambre de Genève")])
        out = common.fix_type(e, 'orchestra')
        self.assertNotEqual(out.get('series'), 'Ballett')      # a dancer with a chamber group is no ballet

    def test_recitals(self):
        sokolov = ev('casino_bern', 1, '2026-11-05T19:30:00+01:00', 'Grigory Sokolov', type='orchestral',
                     series='Abonnementskonzert', credits=[('Piano', 'Grigory Sokolov')],
                     program=[('Franz Schubert', 'Klaviersonate Nr. 21 in B-Dur D 960')])
        self.assertEqual(common.fix_type(sokolov, 'venue')['type'], 'recital')
        duo = ev('casino_bern', 2, '2026-12-09T19:30:00+01:00', 'Kopatchinskaja & Say', type='orchestral',
                 credits=[('Violin', 'Patricia Kopatchinskaja'), ('Piano', 'Fazil Say')],
                 program=[('Ludwig van Beethoven', 'Violinsonate Nr. 9 A-Dur op. 47 «Kreutzersonate»')])
        self.assertEqual(common.fix_type(duo, 'venue')['type'], 'recital')
        schiff = ev('casino_bern', 3, '2026-12-19T18:00:00+01:00', 'Sir András Schiff', type='orchestral',
                    credits=[('Piano', 'Sir András Schiff')], program=[('J. S. Bach', 'Italienisches Konzert BWV 971')])
        self.assertEqual(common.fix_type(schiff, 'venue')['type'], 'recital')
        self.assertEqual(common.infer_type('Grigory Sokolov', [('Piano', 'Grigory Sokolov')]), 'recital')
        self.assertEqual(common.infer_type('Duo-Abend Kammermusik', [('Violin', 'A B'), ('Piano', 'C D')]), 'chamber')

    def test_not_recitals(self):
        concerto = ev('casino_bern', 4, '2026-11-05T19:30:00+01:00', 'Lang Lang', type='orchestral',
                      credits=[('Piano', 'Lang Lang')], program=[('Chopin', 'Klavierkonzert Nr. 2 f-Moll op. 21')])
        self.assertEqual(common.fix_type(concerto, 'venue')['type'], 'orchestral')     # a concerto needs an orchestra
        own = ev('osr', 5, '2026-11-05T19:30:00+01:00', 'Concert de Noël', type='orchestral', credits=[('Soprano', 'A B')])
        self.assertEqual(common.fix_type(own, 'orchestra')['type'], 'orchestral')      # the orchestra plays uncredited
        rez = ev('osr', 6, '2026-11-05T19:30:00+01:00', 'Klavierabend Yuja Wang', type='orchestral', credits=[('Piano', 'Yuja Wang')])
        self.assertEqual(common.fix_type(rez, 'orchestra')['type'], 'recital')         # unless the title says recital
        led = ev('x', 7, '2026-11-05T19:30:00+01:00', 'Daniel Hope', type='orchestral',
                 credits=[('Violin & direction', 'Daniel Hope')])
        self.assertEqual(common.fix_type(led, 'venue')['type'], 'orchestral')
        self.assertEqual(common.fix_type(ev('x', 8, '2026-11-05T19:30:00+01:00', 'T', type='chamber',
                                            credits=[('Violin', 'A B'), ('Piano', 'C D')]))['type'], 'chamber')
        self.assertEqual(common.fix_type(ev('x', 9, '2026-11-05T19:30:00+01:00', 'T', type='chamber',
                                            credits=[('Piano', 'A B')]))['type'], 'recital')

    def test_missing_type_and_ballet(self):
        f = lambda **kw: common.fix_type(ev('x', 1, '2026-11-05T19:30:00+01:00', kw.pop('title', 'Matinee'), **kw))
        self.assertEqual(f(credits=[('Oboe', 'A A'), ('Clarinet', 'B B'), ('Bassoon', 'C C'), ('Horn', 'D D')])['type'], 'chamber')
        self.assertEqual(f(credits=[('Orchestra', 'Orchestra della Svizzera italiana')])['type'], 'orchestral')
        self.assertNotIn('type', f(title='Konzert'))
        ballet = f(title='Ein Sommernachtstraum', type='orchestral',
                   credits=[('Conductor', 'A B'), ('Choreographer', 'Cathy Marston'), ('Orchestra', 'Philharmonia Zürich')])
        self.assertEqual((ballet['type'], ballet['series']), ('orchestral', 'Ballett'))
        self.assertEqual(f(title='Echos', credits=[('Choreographer', 'A B'), ('Conductor', 'C D')])['series'], 'Ballett')
        opera = f(title='La Cenerentola', type='vocal-opera',
                  credits=[('Conductor', 'A B'), ('Director', 'C D'), ('Choreographer', 'E F'), ('Performer', 'G H'),
                           ('Choir', 'Herrenchor'), ('Orchestra', 'Sinfonieorchester St. Gallen')])
        self.assertEqual((opera['type'], opera.get('series')), ('vocal-opera', None))
        series = f(title='Ballettabend', type='orchestral', series='Tanz', credits=[('Choreographer', 'A B'), ('Conductor', 'C D')])
        self.assertEqual(series['series'], 'Tanz')

    def test_build_pass(self):
        events = [ev('casino_bern', 1, '2026-11-05T19:30:00+01:00', 'Grigory Sokolov', type='orchestral',
                     credits=[('Piano', 'Grigory Sokolov')]),
                  ev('zko', 2, '2026-11-05T19:30:00+01:00', 'Daniel Hope', type='orchestral', credits=[('Violin', 'Daniel Hope')])]
        out, changed = build.settle_types(events, {'casino_bern': 'venue', 'zko': 'orchestra'})
        self.assertEqual(changed, 1)
        self.assertEqual([e['type'] for e in out], ['recital', 'orchestral'])


class Incremental(unittest.TestCase):
    def tearDown(self):
        common.set_previous(None)

    def test_previous_event(self):
        old = ev('tonhalle', 2055696, '2026-11-20T19:30:00+01:00', 'Järvi dirigiert Mozarts Requiem',
                 venueName='Tonhalle Zürich – Grosser Saal', program=[('Wolfgang Amadeus Mozart', 'Requiem d-Moll KV 626')])
        other = ev('zko', 1, '2026-11-20T19:30:00+01:00', 'ZKO')
        self.assertEqual(common.set_previous({'concerts': [old, other, {'id': 'bad'}, 'x']}), 2)
        eid = common.event_id('tonhalle', 2055696)
        self.assertEqual(eid, old['id'])
        got = common.previous_event(eid, '2026-11-20T18:30:00Z')                 # the same instant
        self.assertEqual(got['program'], old['program'])
        got['program'].append({'composer': 'X', 'title': 'Y'})                  # a copy
        self.assertEqual(len(common.previous_event(eid, old['start'])['program']), 1)
        self.assertIsNone(common.previous_event(eid, '2026-11-21T19:30:00+01:00'))   # another date: not reused
        self.assertIsNone(common.previous_event(eid, old['start'], title='Mahler 6'))
        self.assertIsNotNone(common.previous_event(eid, old['start'], title='JÄRVI dirigiert Mozarts «Requiem»'))
        self.assertIsNone(common.previous_event('tonhalle-1', old['start']))
        self.assertEqual([e['id'] for e in common.previous_events('tonhalle')], [old['id']])
        self.assertTrue(common.same_title('Kinderopernorcherster', 'Kinderopern\xadorchester'))
        self.assertFalse(common.same_title('1. Kammerkonzert', '2. Kammerkonzert'))
        common.set_previous(None)
        self.assertIsNone(common.previous_event(eid, old['start']))

    def test_refresh_due(self):
        os.environ['KLANG_FEEDS_TODAY'] = '2026-11-01'
        try:
            self.assertTrue(common.refresh_due('a', '2026-11-05T19:30:00+01:00', near_days=7))
            days = []
            for d in range(7):
                os.environ['KLANG_FEEDS_TODAY'] = (date(2026, 11, 1) + timedelta(days=d)).isoformat()
                days.append(common.refresh_due('page-42', '2027-05-01T19:30:00+02:00', near_days=7, every_days=7))
            self.assertEqual(days.count(True), 1)                                # once a week
            far = [d for d in range(7) if not days[d]][0]
            os.environ['KLANG_FEEDS_TODAY'] = (date(2026, 11, 1) + timedelta(days=far)).isoformat()
            common.set_previous([], code_changed={'opernhaus_zurich'})
            with common.source_budget('opernhaus_zurich'):
                self.assertTrue(common.refresh_due('page-42', '2027-05-01T19:30:00+02:00'))   # new reader code
            with common.source_budget('tonhalle'):
                self.assertFalse(common.refresh_due('page-42', '2027-05-01T19:30:00+02:00'))
        finally:
            del os.environ['KLANG_FEEDS_TODAY']

    def test_tonhalle_reuses_unchanged_listing(self):
        from sources import tonhalle
        ts = int(datetime(2027, 3, 3, 19, 30, tzinfo=Z).timestamp())
        row = {'href': '/konzerte/kalender/mozart-requiem-2055696/', 'key': '2055696', 'ts': ts,
               'title': 'Järvi dirigiert Mozarts Requiem', 'hour': '19.30 Uhr', 'composers': 'Strawinsky, Mozart',
               'ticket': None, 'labels': [], 'members': [('Paavo Järvi', 'Music Director'), ('Tonhalle-Orchester Zürich', '')],
               'calendars': {'toz', 'tz'}, 'url': 'https://www.tonhalle-orchester.ch/konzerte/kalender/mozart-requiem-2055696/'}
        start = common.to_zurich_iso(ts)
        old = ev('tonhalle', '2055696', start, row['title'], city='Zürich', venueName='Tonhalle Zürich – Grosser Saal',
                 type='vocal-opera', credits=[('Conductor', 'Paavo Järvi'), ('Soprano', 'Katharina Konradi'),
                                              ('Orchestra', 'Tonhalle-Orchester Zürich')],
                 program=[('Igor Strawinsky', '«Symphonie de psaumes»'), ('Wolfgang Amadeus Mozart', 'Requiem d-Moll KV 626')])
        common.set_previous([old])
        cands = tonhalle._prepare({'2055696': dict(row)})
        self.assertEqual(tonhalle._reuse(cands), 1)
        c = cands[0]
        self.assertTrue(c['complete'])
        self.assertEqual(c['venue'], 'Tonhalle Zürich – Grosser Saal')
        self.assertEqual(c['works'][1], ('Wolfgang Amadeus Mozart', 'Requiem d-Moll KV 626'))
        self.assertEqual(len(c['credits']), 3)
        os.environ['KLANG_FEEDS_TODAY'] = '2027-03-01'
        try:
            self.assertEqual(tonhalle._fetch_tier(c), 2)                        # in two days: read it again
        finally:
            del os.environ['KLANG_FEEDS_TODAY']
        changed = dict(row, members=row['members'] + [('Lisa Batiashvili', 'Violine')])
        cands = tonhalle._prepare({'2055696': changed})
        self.assertEqual(tonhalle._reuse(cands), 0)                             # a new name in the listing
        self.assertEqual(tonhalle._fetch_tier(cands[0]), 1)

    def test_opernhaus_heading_and_programme(self):
        from sources import opernhaus_zurich as oz
        d = oz.parse_detail('<h1 class="title">Kinderopern&shy;orchester</h1>')
        self.assertEqual(d['heading'], 'Kinderopernorchester')
        self.assertEqual(oz._typo_fixed('Kinderopernorcherster', d['heading']), 'Kinderopernorchester')
        self.assertIsNone(oz._typo_fixed('Ein Sommernachtstraum', 'Ein Sommer- nachtstraum'))   # just a line break
        self.assertIsNone(oz._typo_fixed('3. Kammerkonzert', '4. Kammerkonzert'))
        program, players = oz.parse_program_info(
            '<p>Bass-Bariton <em>Bryn Terfel</em><br>Sänger:innen des Internationalen Opernstudios</p>'
            '<p>Franz Schubert: Ständchen</p><p>Viola <em>Alexander Tatarinov, Valentyna Pryshlyak</em></p>')
        self.assertEqual(program, [('Franz Schubert', 'Ständchen')])          # "Sänger:innen" is not a composer
        self.assertEqual(players, [('Bass-baritone', 'Bryn Terfel'), ('Ensemble', 'Sänger:innen des Internationalen Opernstudios'),
                                   ('Viola', 'Alexander Tatarinov'), ('Viola', 'Valentyna Pryshlyak')])
        cast = oz.credits_for('concert', [('Musikalische Leitung', 'Harry Bicket', False), ('Sopran I', 'Rosa Feola', False),
                                          ('Sopran II', 'Thalia Cook-Hansen', False)], [])
        self.assertEqual(cast, [('Conductor', 'Harry Bicket'), ('Soprano', 'Rosa Feola'), ('Soprano', 'Thalia Cook-Hansen')])

    def test_build_hands_previous_to_readers(self):
        today = common.today_zurich()
        start = common.to_zurich_iso(datetime.combine(today + timedelta(days=9), datetime.min.time()).replace(hour=19, tzinfo=Z))
        seen = {}

        def fetch():
            seen['left'] = common.requests_left()
            old = common.previous_event(common.event_id('inc', 7), start, title='Liederabend')
            return [ev('inc', 7, start, 'Liederabend', program=(old or {}).get('program'))]

        def big_fetch():
            seen['big'] = common.requests_left()
            return []

        mod = types.SimpleNamespace(KEY='inc', NAME='Inc', SITE='https://inc.example.ch/', ATTRIBUTION='Source: inc',
                                    fetch=fetch, MAX_REQUESTS=120, __file__=__file__)
        big = types.SimpleNamespace(KEY='big', NAME='Big', SITE='https://big.example.ch/', ATTRIBUTION='Source: big',
                                    fetch=big_fetch, MAX_REQUESTS=500, __file__=__file__)
        fakes = [registry.Source(key=m.KEY, name=m.NAME, site=m.SITE, attribution=m.ATTRIBUTION, module=m, time_limit=30)
                 for m in (mod, big)]
        with tempfile.TemporaryDirectory() as tmp:
            prev_path, out_path = os.path.join(tmp, 'prev.json'), os.path.join(tmp, 'out.json')
            with open(prev_path, 'w', encoding='utf-8') as f:
                json.dump({'concerts': [ev('inc', 7, start, 'Liederabend', program=[('Schubert', 'Winterreise D 911')])]}, f)
            saved = registry.discover
            registry.discover = lambda only=None: fakes
            try:
                from contextlib import redirect_stdout, redirect_stderr
                import io
                with redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()):
                    self.assertEqual(build.main(['--out', out_path, '--previous', prev_path]), 0)
            finally:
                registry.discover = saved
            with open(out_path, encoding='utf-8') as f:
                doc = json.load(f)
        self.assertEqual(doc['concerts'][0]['program'], [{'composer': 'Schubert', 'title': 'Winterreise D 911'}])
        self.assertEqual((seen['left'], seen['big']), (120, common.MAX_REQUESTS_CAP))


class TonhalleProgramme(unittest.TestCase):
    def test_schedule_lines_are_not_works(self):
        import sources.tonhalle as th
        def row(name, function, cls=''):
            return f'<span class="name">{name}</span> <span class="function{cls}">{function}</span>'
        works = ''.join([row('Wolfgang Amadeus Mozart', 'Quintett für Klarinette und Streicher KV 581'),
                         row('', '19.30 Uhr - Set 2'), row('Stefan Szypura', 'Solo Programm'), row('', 'PAUSE'),
                         row('', 'ca. 21.30 Uhr - Ende'), row('Maurice Ravel', 'Klavierkonzert G-Dur'), row('', '–'),
                         row('', 'Anschliessend'), row('', 'Live Act, Visuals und DJ'), row('Emanuel Meshvinski', 'Arrangements')])
        page = ('<div class="info"><div class="artists"></div><div class="artists"></div>'
                f'<div class="artists">{works}</div><div class="price">')
        self.assertEqual(th.parse_detail(page)['works'],
                         [('Wolfgang Amadeus Mozart', 'Quintett für Klarinette und Streicher KV 581'),
                          ('Maurice Ravel', 'Klavierkonzert G-Dur')])


class CodeHash(unittest.TestCase):
    def test_helpers_count(self):
        names = lambda key: [os.path.basename(p) for p in build.code_files(registry.discover([key])[0])]
        self.assertEqual(names('opernhaus_zurich'), ['opernhaus_zurich.py', '_consent.py', 'common.py'])
        self.assertIn('_geneva.py', names('geneva_grand_theatre'))
        self.assertIn('geneva_victoria_hall.py', names('geneva_grand_theatre'))
        with tempfile.TemporaryDirectory() as tmp:
            os.makedirs(os.path.join(tmp, 'sources'))
            reader, helper = os.path.join(tmp, 'sources', 'r.py'), os.path.join(tmp, 'sources', '_h.py')
            with open(reader, 'w') as f:
                f.write('from ._h import x\nfrom common import clean\n')
            with open(helper, 'w') as f:
                f.write('x = 1\n')
            src = types.SimpleNamespace(module=types.SimpleNamespace(__file__=reader))
            saved = build.HERE
            build.HERE = tmp
            try:
                self.assertEqual([os.path.basename(p) for p in build.code_files(src)], ['r.py', '_h.py', 'common.py'])
                before = build._code_hash(src)
                with open(helper, 'w') as f:
                    f.write('x = 2\n')
                self.assertNotEqual(build._code_hash(src), before)              # a helper edit invalidates reuse
            finally:
                build.HERE = saved


if __name__ == '__main__':
    unittest.main(verbosity=1)
