#!/usr/bin/env python3
"""Offline smoke test of the feed framework: python3 tools/feeds/selftest.py

Covers common.py (ICS incl. DST, to_zurich_iso, make_event, jsonld_events, clean,
guess_type, robots.txt rules, and the polite GET against a throwaway server on
127.0.0.1), the source registry, and build.py (checks, de-duplication, fallback to the
previous feed). Nothing leaves this machine.
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
        self.assertGreaterEqual(min(gaps), 0.29, gaps)   # Crawl-delay: 0.3 honoured

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


if __name__ == '__main__':
    unittest.main(verbosity=1)
