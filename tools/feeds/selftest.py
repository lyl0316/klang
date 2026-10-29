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

    def test_html_instead_of_robots_txt_is_unreachable(self):
        class Resp:
            headers = {'Content-Type': 'text/html'}
            def read(self, n): return b'<!DOCTYPE html><html><title>Security check required</title>'
            def __enter__(self): return self
            def __exit__(self, *a): return False
        saved = common._plain_opener
        common._plain_opener = type('O', (), {'open': lambda self, req, timeout=20: Resp()})()
        try:
            r = common._load_robots('https://captcha.example')
        finally:
            common._plain_opener = saved
        self.assertFalse(r.allowed('https://captcha.example/programme'))


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
            self.assertLessEqual(s.max_requests, common.MAX_REQUESTS_CAP)


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
        self.assertEqual(set(doc), {'generatedAt', 'generator', 'notice', 'window', 'sources', 'concerts', 'merges'})
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

    def test_tour_dates_in_another_country(self):
        self.assertEqual(build.in_other_country({'city': 'Düsseldorf'}, 'france'), 'germany')
        self.assertEqual(build.in_other_country({'city': 'Zürich'}, 'austria'), 'switzerland')
        for city, country in (('Paris', 'france'), ('Bondy', 'france'), ('Baden', 'austria'), ('Freiburg', 'germany')):
            self.assertIsNone(build.in_other_country({'city': city}, country), city)

    def test_never_across_countries(self):
        a = ev('x', 1, '2026-11-07T19:30:00+01:00', 'Sinfoniekonzert', city='Freiburg', venueName='Konzerthaus',
               credits=[('Conductor', 'A B'), ('Orchestra', 'Philharmonisches Orchester')])
        b = dict(ev('y', 1, '2026-11-07T19:30:00+01:00', 'Sinfoniekonzert', city='Freiburg', venueName='Konzerthaus',
                    credits=[('Conductor', 'A B'), ('Orchestra', 'Philharmonisches Orchester')]), country='germany')
        self.assertFalse(build.same_concert(a, b))           # Fribourg (Switzerland) is not Freiburg im Breisgau
        self.assertTrue(build.same_concert(dict(a, country='germany'), b))

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
               credits=[('Tito Vespasiano\n', 'Mauro Peter'), (r'Vitellia\n', 'Marina Rebeka')],
               program=[('Darius Milhaud', 'La Création du Monde (Kammerfas- sung)'),
                        ('Anton Bruckner', 'Sommer- und Herbstlieder'), ('Gabriel Faure\u0301', 'Requiem'),
                        ('Johann Strauss', '«Im Feuerstrom der Reben» («Champagner- Lied»)')])
        t = build.tidy_event(e)
        self.assertEqual(t['title'], 'Ein Sommernachtstraum')
        self.assertEqual(t['venueName'], 'Opernhaus Zürich')
        self.assertEqual(t['credits'][0]['role'], 'Tito Vespasiano')
        self.assertEqual(t['credits'][1]['role'], 'Vitellia')              # backslash + n as the site sends it
        self.assertEqual([p['title'] for p in t['program']][:2], ['La Création du Monde (Kammerfassung)', 'Sommer- und Herbstlieder'])
        self.assertEqual(t['program'][2]['composer'], 'Gabriel Fauré')            # composed accent (NFC)
        self.assertEqual(t['program'][3]['title'], '«Im Feuerstrom der Reben» («Champagner-Lied»)')
        # an event reused from the previous feed (not made by make_event) loses its interval lines too
        old = dict(e, program=[{'composer': 'Ethel Smyth', 'title': '- Pause -'}, {'composer': 'X', 'title': 'Y *'},
                               {'composer': 'Rimski-Korsakow', 'title': 'Konzertende ca. 21.30 Uhr'}])
        self.assertEqual(build.tidy_event(old)['program'], [{'composer': 'X', 'title': 'Y'}])
        self.assertNotIn('program', build.tidy_event(dict(e, program=[{'composer': 'A', 'title': 'Pause'}])))


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


class NotWorkLines(unittest.TestCase):
    def test_interval_and_end_time(self):
        for c, t in [('Ethel Smyth', '- Pause -'), ('X', 'PAUSE'), ('X', 'Konzertende ca. 21h.20 Uhr'),
                     ('X', 'Konzertende ca. 21.30 Uhr'), ('- Pause -', ''), ('X', 'Ende ca. 21.30 Uhr'), ('X', 'Ohne Pause'),
                     ('X', 'Fin du concert vers 22h'), ('X', 'Entracte'), ('X', '19.30 Uhr Konzerteinführung')]:
            self.assertTrue(common.is_not_work_line(c, t), (c, t))
        for c, t in [('X', 'Pausa'), ('Caroline Shaw', "Entr'acte"), ('Messiaen', 'Quatuor pour la fin du temps'),
                     ('X', 'Das Ende der Zeit'), ('Milhaud', 'La Création du monde'), ('Beethoven', 'Für Elise'),
                     ('Haydn', 'Sinfonie Nr. 45 «Abschied»'), ('X', 'Ende'), ('Cage', '4′33')]:
            self.assertFalse(common.is_not_work_line(c, t), (c, t))
        e = ev('x', 1, '2026-12-01T19:30:00+01:00', program=[
            ('Ethel Smyth', 'Konzert für Violine, Horn und Orchester'), ('Ethel Smyth', '- Pause -'),
            ('Juan Arroyo', 'Création, pour quatuor à cordes et orchestre*'),
            ('Johannes Brahms', 'Fantaisies, op. 116, Intermezzi nos 2, 4 et 5,'), ('Rimski-Korsakow', 'Konzertende ca. 21.30 Uhr')])
        self.assertEqual([p['title'] for p in e['program']],
                         ['Konzert für Violine, Horn und Orchester', 'Création, pour quatuor à cordes et orchestre',
                          'Fantaisies, op. 116, Intermezzi nos 2, 4 et 5'])

    def test_sob_reader(self):
        from sources import sob
        c = {'works': [{'description_short': 'Ethel Smyth', 'name': 'Konzert für Violine, Horn und Orchester'},
                       {'description_short': 'Ethel Smyth', 'name': '- Pause -'}, {'is_break': True, 'name': 'Pause'},
                       {'description_short': 'Nikolai Rimski-Korsakow', 'name': 'Konzertende ca. 21.30 Uhr'},
                       {'description_short': '- Pause -', 'name': 'x'}]}
        self.assertEqual(sob._program(c), [('Ethel Smyth', 'Konzert für Violine, Horn und Orchester')])


def _cast(*names, role='Performer'):
    return [(role, n) for n in names]


class MatchRules(unittest.TestCase):
    T = '2027-02-02T19:30:00+01:00'

    def test_building_vs_one_of_its_halls(self):
        a = ev('zko', 1, self.T, 'Alena Baeva', city='Zürich', venueName='Tonhalle Zürich',
               credits=_cast('Alena Baeva', 'Zürcher Kammerorchester'))
        b = ev('tonhalle', 2, self.T, 'Kammermusik-Matinee', city='Zürich', venueName='Tonhalle Zürich – Kleiner Saal',
               credits=_cast('Peter McGuire'))
        self.assertFalse(build.same_concert(a, b))         # other cast, other title
        c = ev('osr', 3, self.T, 'Cycle Beethoven', city='Basel', venueName='Stadtcasino Basel', credits=_cast('OSR'))
        d = ev('stadtcasino_basel', 4, self.T, 'Quatuor Modigliani', city='Basel',
               venueName='Stadtcasino Basel, Hans Huber-Saal', credits=_cast('Quatuor Modigliani'))
        self.assertFalse(build.same_concert(c, d))
        # still merged: one shared performer, or the hall-less listing has no cast
        b2 = dict(b, credits=[{'role': 'Violin', 'name': 'Alena Baeva'}])
        self.assertTrue(build.same_concert(a, b2))
        grosser = dict(b, venueName='Tonhalle Zürich, Grosser Saal')
        self.assertTrue(build.same_concert(dict(a, credits=None), grosser))   # no cast: the main hall
        self.assertFalse(build.same_concert(dict(a, credits=None), b))        # … not the Kleiner Saal
        # an orchestra's listing read from a summary only (no hall, no cast) vs a recital in the small hall
        titan = ev('sob', 12177, self.T, 'Titan', city='Basel', venueName='Stadtcasino Basel')
        guitar = ev('stadtcasino_basel', '24022027_virgile_barthe', self.T, 'Virgile Barthe', city='Basel',
                    venueName='Stadtcasino Basel, Hans Huber-Saal', credits=[('Guitar', 'Virgile Barthe')])
        self.assertFalse(build.same_concert(titan, guitar))
        self.assertTrue(build.same_concert(titan, dict(guitar, venueName='Stadtcasino Basel, Musiksaal')))

    def test_two_named_halls(self):
        a = ev('lso_luzern', 1, self.T, 'Sinfoniekonzert', city='Luzern', venueName='KKL Luzern, Konzertsaal')
        b = ev('lucerne_festival', 2, self.T, 'Forward', city='Luzern', venueName='KKL Luzern, Luzerner Saal')
        self.assertFalse(build.same_concert(a, b))
        m = ev('sob', 3, self.T, '1001 Nacht', city='Basel', venueName='Stadtcasino Basel, Musiksaal',
               credits=_cast('Sinfonieorchester Basel', 'Ivor Bolton'))
        h = ev('stadtcasino_basel', 4, self.T, 'Kammermusik', city='Basel', venueName='Stadtcasino Basel, Hans Huber-Saal',
               credits=_cast('Sinfonieorchester Basel'))
        self.assertFalse(build.same_concert(m, h))         # one shared name across two halls
        w = ev('lucerne_festival', 5, self.T, 'Mahler 3', city='Luzern', venueName='KKL Luzern, Salle blanche',
               credits=_cast('Riccardo Chailly', 'Lucerne Festival Orchestra'))
        k = ev('lso_luzern', 6, self.T, 'LFO', city='Luzern', venueName='KKL Luzern, Konzertsaal',
               credits=_cast('Riccardo Chailly', 'Lucerne Festival Orchestra', 'Anna Muster'))
        self.assertTrue(build.same_concert(w, k))          # one hall, two names, the same cast

    def test_similar_title_in_two_churches(self):
        a = ev('zko', 1, self.T, 'Bach Weihnachtsoratorium', city='Zürich', venueName='Fraumünster')
        b = ev('reformiert_zuerich', 2, self.T, 'Bach Weihnachtsoratorium', city='Zürich', venueName='Grossmünster')
        self.assertFalse(build.same_concert(a, b))
        c = ev('x', 3, self.T, 'Bach Johannespassion', city='Zürich', venueName='Kirche St. Peter')
        d = ev('y', 4, self.T, 'Johannespassion Bach', city='Zürich', venueName='Kirche St. Jakob')
        self.assertFalse(build.same_concert(c, d))
        self.assertTrue(build.same_concert(dict(b, venueName='Fraumünster'), a))
        self.assertFalse(build.venue_similar({'kirche'}, {'kirche'}, same_city=False))    # no town: too vague
        self.assertTrue(build.venue_similar({'kirche'}, {'kirche'}))

    def test_merge_log_names_the_kept_record(self):
        ocg = ev('ocg', 'semi', '2026-11-07T14:30:00+01:00', '80e Concours de Genève – Demi-Finale 1', city='Vernier',
                 venueName='Concorde espace culture', credits=[('Orchestra', "L'Orchestre de Chambre de Genève")])
        cv = ev('concorde_vernier', 'semi', '2026-11-07T14:30:00+01:00', '80e Concours de Genève – Demi-finales',
                city='Vernier', venueName='Concorde, Grande Salle', credits=[('Orchestra', 'Orchestre de Chambre de Genève')])
        merges = []
        out, merged = build.dedupe([cv, ocg], {'ocg': 30, 'concorde_vernier': 20}, None, merges)
        self.assertEqual((merged, out[0]['id']), (1, 'ocg-semi'))
        self.assertEqual(merges, [{'id': 'ocg-semi', 'absorbed': 'concorde_vernier-semi', 'source': 'concorde_vernier',
                                   'strength': 2, 'minutes': 0}])


class MergeFacts(unittest.TestCase):
    PRIO = {'buehnen_bern': 30, 'casino_bern': 20, 'sob': 30, 'stadtcasino_basel': 20, 'musikkollegium': 30,
            'opernhaus_zurich': 20}

    def test_out_of_date_cast_does_not_win(self):
        t = '2027-03-18T19:30:00+01:00'
        bb = ev('buehnen_bern', 'la-valse', t, 'La Valse', city='Bern', venueName='Casino Bern, Grosser Saal',
                credits=[('Conductor', 'Eva Ollikainen'), ('Violin', 'Gil Shaham'), ('Orchestra', 'Berner Symphonieorchester')],
                program=[('Samuel Barber', 'Violinkonzert op. 14'), ('Maurice Ravel', 'La Valse')])
        cb = ev('casino_bern', 'fantastique', t, 'Fantastique', city='Bern', venueName='Casino Bern, Grosser Saal',
                credits=[('Conductor', 'Han-Na Chang'), ('Violin', 'Gil Shaham'), ('Orchestra', 'Berner Symphonieorchester'),
                         ('Concertmaster', 'Anna Muster')],
                program=[('Samuel Barber', 'Violinkonzert op. 14'), ('Hector Berlioz', 'Symphonie fantastique op. 14'),
                         ('Hector Berlioz', 'Le Corsaire'), ('Hector Berlioz', 'Rob Roy')])
        out, merged = build.dedupe([cb, bb], self.PRIO)
        self.assertEqual((merged, out[0]['id']), (1, 'buehnen_bern-la-valse'))
        self.assertIn({'role': 'Conductor', 'name': 'Eva Ollikainen'}, out[0]['credits'])
        self.assertNotIn('Han-Na Chang', [c['name'] for c in out[0]['credits']])
        self.assertEqual([p['title'] for p in out[0]['program']], ['Violinkonzert op. 14', 'La Valse'])

    def test_richer_cast_and_programme_still_taken(self):
        t = '2026-11-05T19:30:00+01:00'
        mk = ev('musikkollegium', 9463, t, 'Angels in America', city='Winterthur', venueName='Stadthaus Winterthur',
                credits=[('Orchestra', 'Musikkollegium Winterthur'), ('Ensemble', 'Internationales Opernstudio IOS'),
                         ('Conductor', 'Oscar Jockel'), ('Soprano', 'Angela Denoke')],
                program=[('Peter Eötvös', '')])
        oz = ev('opernhaus_zurich', 200011, t, 'Angels in America', city='Winterthur', venueName='Stadthaus Winterthur',
                credits=[('Conductor', 'Oscar Jockel'), ('The Angel', 'Angela Denoke'), ('Harper', 'Thalia Cook-Hansen'),
                         ('Prior', 'Evan Gray'), ('Orchestra', 'Musikkollegium Winterthur')],
                program=[('Peter Eötvös', 'Angels in America')])
        out, merged = build.dedupe([oz, mk], self.PRIO)
        self.assertEqual(out[0]['id'], 'musikkollegium-9463')
        self.assertIn('Evan Gray', [c['name'] for c in out[0]['credits']])     # every person of the kept listing is there
        self.assertEqual(out[0]['program'], [{'composer': 'Peter Eötvös', 'title': 'Angels in America'}])

    def test_sob_keeps_its_programme_over_the_halls_free_text(self):
        from sources import stadtcasino_basel as scb
        t = '2027-02-24T19:30:00+01:00'
        sob = ev('sob', 12177, t, 'Titan', city='Basel', venueName='Stadtcasino Basel, Musiksaal',
                 credits=[('Conductor', 'Markus Poschner'), ('Orchestra', 'Sinfonieorchester Basel')],
                 program=[('Geoffrey Gordon', 'Salt'), ('Geoffrey Gordon', 'Icarus'),
                          ('Gustav Mahler', 'Sinfonie Nr. 1 D-Dur «Titan»')])
        # what an earlier version of the hall's reader made of its page: the same composer for every line
        hall = ev('stadtcasino_basel', '240227_sob', t, 'Sinfonieorchester Basel', city='Basel',
                  venueName='Stadtcasino Basel, Musiksaal',
                  credits=[('Clarinet', 'Rossana Rossignoli'), ('Conductor', 'Markus Poschner'),
                           ('Orchestra', 'Sinfonieorchester Basel')],
                  program=[('Geoffrey Gordon', 'Bonus Track "Salt" (Auftragskomposition)'),
                           ('Geoffrey Gordon', '"Icarus" für Klarinette und Orchester'), ('Geoffrey Gordon', '- Pause -'),
                           ('Geoffrey Gordon', 'Gustav Mahler'), ('Geoffrey Gordon', 'Sinfonie Nr. 1 D-Dur "Titan"'),
                           ('Geoffrey Gordon', 'Konzertende ca. 21.30 Uhr')])
        out, _ = build.dedupe([build.tidy_event(hall), build.tidy_event(sob)], self.PRIO)
        self.assertEqual(out[0]['id'], 'sob-12177')
        self.assertEqual([p['composer'] for p in out[0]['program']], ['Geoffrey Gordon', 'Geoffrey Gordon', 'Gustav Mahler'])
        self.assertIn('Rossana Rossignoli', [c['name'] for c in out[0]['credits']])   # the richer cast still comes along
        # and today's reader reads that page right
        page = ('<div class="searchable"><p><strong>Rossana Rossignoli,</strong> Klarinette</p>'
                '<p><strong>Markus Poschner, </strong>Leitung</p><p><strong>Sinfonieorchester Basel </strong></p>'
                '<p><strong>18.30 Uhr Konzerteinführung </strong><strong>mit Benjamin Herzog</strong></p>'
                '<p><strong><br>Geoffrey Gordon</strong></p><p>Bonus Track "Salt" (Auftragskomposition)</p>'
                '<p><strong><br>Geoffrey Gordon</strong></p><p>"Icarus" für Klarinette und Orchester</p>'
                '<p><br>- Pause -</p><p><br>Gustav Mahler</p><p>Sinfonie Nr. 1 D-Dur "Titan"</p>'
                '<p><br>Konzertende ca. 21.30 Uhr</p></div>')
        credits, program = scb._lineup(page)
        self.assertEqual(program, [('Geoffrey Gordon', 'Bonus Track "Salt" (Auftragskomposition)'),
                                   ('Geoffrey Gordon', '"Icarus" für Klarinette und Orchester'),
                                   ('Gustav Mahler', 'Sinfonie Nr. 1 D-Dur "Titan"')])
        self.assertEqual(credits, [('Clarinet', 'Rossana Rossignoli'), ('Conductor', 'Markus Poschner'),
                                   ('Orchestra', 'Sinfonieorchester Basel')])


class StadtcasinoLineup(unittest.TestCase):
    def lineup(self, *paras):
        from sources import stadtcasino_basel as scb
        return scb._lineup('<div class="searchable">' + ''.join(f'<p>{p}</p>' for p in paras) + '</div>')

    def test_people_and_roles_are_not_works(self):
        self.assertEqual(self.lineup('<strong>Arcadi Volodos,</strong> Kalvier',
                                     'Das Programm wird zu einem späteren Zeitpunkt bekannt gegeben.'),
                         ([('Piano', 'Arcadi Volodos')], []))
        credits, program = self.lineup('<strong>Ensemble Symphonique de Genève</strong>',
                                       '<strong>Sergey Ostrovsky</strong>, Chefdirigent',
                                       '<strong>Béla Bartók </strong>', '<em>Divertimento für Streichorchester</em>')
        self.assertEqual(credits[1], ('Conductor', 'Sergey Ostrovsky'))
        self.assertEqual(program, [('Béla Bartók', 'Divertimento für Streichorchester')])
        credits, program = self.lineup('<strong>Julia Lopuszynska, </strong>Harfe', '<strong><br>Jana Ozolina, </strong>Diana Adamyan,',
                                       '<strong>Lora Markova, Wojciech Niedziółka, </strong>Violinen',
                                       '<strong>Maurice Ravel</strong>', 'Introduction et Allegro')
        self.assertEqual(credits, [('Harp', 'Julia Lopuszynska'), ('Performer', 'Jana Ozolina'), ('Performer', 'Diana Adamyan'),
                                   ('Violin', 'Lora Markova'), ('Violin', 'Wojciech Niedziółka')])
        self.assertEqual(program, [('Maurice Ravel', 'Introduction et Allegro')])
        # a real one-line work stays a work
        self.assertEqual(self.lineup('<b>Charles Ives</b> Unanswered Question')[1], [('Charles Ives', 'Unanswered Question')])

    def test_arrangers_split_names_and_movements(self):
        credits, program = self.lineup(
            '<strong>Franz Schubert </strong>',
            '<em>Moments musicaux, D 780<br>— Nr. 1 in C-dur, Moderato<br>— Nr. 2 in As-dur, Andantino</em>',
            '<strong>Franz Schubert / Irina Lankova</strong>', '<em>An die Musik in D-dur, D 547</em>',
            '<strong>Sergei Rachmaninow / Zoltán Kocsis</strong> ', '<em>Vocalise in cis-moll, op. 34 Nr. 14</em>',
            '<strong>Franz Schuber</strong>t ', '<em>Sonate in a-moll, D 784</em>')
        self.assertEqual(program, [
            ('Franz Schubert', 'Moments musicaux, D 780: Nr. 1 in C-dur, Moderato; Nr. 2 in As-dur, Andantino'),
            ('Franz Schubert / Irina Lankova', 'An die Musik in D-dur, D 547'),
            ('Sergei Rachmaninow / Zoltán Kocsis', 'Vocalise in cis-moll, op. 34 Nr. 14'),
            ('Franz Schubert', 'Sonate in a-moll, D 784')])

    def test_headings_and_typos_in_titles(self):
        _, program = self.lineup(
            '<strong>Frédéric Chopin</strong>', 'Mazurkas op. 41:', 'Nr. 1 cis-Moll, Nr. 2 e-Moll',
            'Variationen B-Durüber “Là ci darem la mano” op. 2', '<br><strong>Ludwig van Beethoven</strong>',
            'Sinfonie Nr. 9 d-Moll op. 125LE', '<strong>Felix Mendelssohn Bartholdy</strong>', 'Aus den «Liedern ohne Worte»:',
            'Allegretto tranquillo op. 30 Nr. 6', 'Sinfonie Nr. 4«Italienische»', '<strong>Kristine Tjøgersen</strong>',
            '«Between Trees» | CH', '<strong>Thomas Nidecker</strong>', '«Tableaux 16» für Orchester | Uraufführung')
        self.assertEqual(program, [
            ('Frédéric Chopin', 'Mazurkas op. 41: Nr. 1 cis-Moll, Nr. 2 e-Moll'),
            ('Frédéric Chopin', 'Variationen B-Dur über “Là ci darem la mano” op. 2'),
            ('Ludwig van Beethoven', 'Sinfonie Nr. 9 d-Moll op. 125'),
            ('Felix Mendelssohn Bartholdy', 'Allegretto tranquillo op. 30 Nr. 6'),
            ('Felix Mendelssohn Bartholdy', 'Sinfonie Nr. 4 «Italienische»'),
            ('Kristine Tjøgersen', '«Between Trees»'), ('Thomas Nidecker', '«Tableaux 16» für Orchester')])
        # a plain line after the interval is a composer only when it is a name followed by a work
        _, program = self.lineup('<strong>Richard Strauss</strong>', 'Don Juan op. 20', '<br>Die Zauberflöte', 'Ouvertüre')
        self.assertEqual(program, [('Richard Strauss', 'Don Juan op. 20'), ('Richard Strauss', 'Die Zauberflöte'),
                                   ('Richard Strauss', 'Ouvertüre')])

    def test_reused_programme(self):
        from sources import stadtcasino_basel as scb
        old = {'program': [{'composer': 'Arcadi Volodos', 'title': 'Kalvier'},
                           {'composer': 'Ludwig van Beethoven', 'title': 'Sinfonie Nr. 9 d-Moll op. 125LE'}]}
        self.assertTrue(scb._suspect(old))
        self.assertEqual(scb._reused_program(old), [('Ludwig van Beethoven', 'Sinfonie Nr. 9 d-Moll op. 125')])
        self.assertFalse(scb._suspect({'program': [{'composer': 'Beethoven', 'title': 'Für Elise'}]}))


class CasinoBernProgramme(unittest.TestCase):
    def test_headings_without_life_dates(self):
        from sources import casino_bern as cb
        frag = ('<p><strong>Frédéric Chopin (1810-1849)<br></strong>Klaviersonate Nr. 2 b-Moll op. 35 (ca. 20′)<br><br>'
                '<strong>Frédéric Chopin / Hayato Sumino<br></strong>«Raindrop» – Postludium (nach dem Prélude Des-Dur op. 28 Nr. 15)'
                '<br><br><strong>Hayato Sumino (1995)<br></strong>Lydian Harp (ca. 4′) <br>White Keys (Auswahl)<br><br>'
                'Weitere Werke von Camille Saint-Saëns, Thomas Adès und Igor Strawinsky</p>')
        self.assertEqual(cb.parse_program(frag), [
            ('Frédéric Chopin', 'Klaviersonate Nr. 2 b-Moll op. 35'),
            ('Frédéric Chopin / Hayato Sumino', '«Raindrop» – Postludium (nach dem Prélude Des-Dur op. 28 Nr. 15)'),
            ('Hayato Sumino', 'Lydian Harp'), ('Hayato Sumino', 'White Keys (Auswahl)')])
        frag = ('<p><strong>Karol Szymanowski (1882-1937)<br></strong>Mythen für Violine und Klavier op. 30 (ca. 21′)<br><br>'
                '<strong>PatKop (1977)<br></strong>UniSolo für Violine und Klavier (ca. 15′)<br><br>'
                '<strong>Fazıl Say (1970)<br></strong>Sonate für Violine und Klavier Nr. 3 op. 119 (ca. 10′)</p>')
        self.assertEqual([c for c, _ in cb.parse_program(frag)], ['Karol Szymanowski', 'PatKop', 'Fazıl Say'])

    def test_work_years_are_not_headings(self):
        from sources import casino_bern as cb
        frag = ('<p><strong>Arnold Schönberg (1874–1951)<br></strong>Verklärte Nacht (1899)<br>Pierrot Lunaire<br><br>'
                'Ein Überlebender aus Warschau</p><p>Carmina Burana (1937)<br>O Fortuna</p>')
        self.assertEqual(cb.parse_program(frag), [('Arnold Schönberg', 'Verklärte Nacht'), ('Arnold Schönberg', 'Pierrot Lunaire'),
                                                  ('Arnold Schönberg', 'Ein Überlebender aus Warschau')])
        frag = ('<p><strong>Traditional</strong><br>Christmas Carols</p><p><strong>Alan Silvestri (1950-heute)</strong><br>'
                'God Bless Us Everyone</p><p><strong>Spectacular Christmas</strong><br>Hark! The Herald Angels Sing</p>'
                '<p><strong>Antonio Vivaldi</strong><br>Die vier Jahreszeiten</p>')
        self.assertEqual(cb.parse_program(frag), [('Alan Silvestri', 'God Bless Us Everyone')])     # no unknown headings
        self.assertEqual(cb.parse_program(frag, ['Antonio Vivaldi'])[-1], ('Antonio Vivaldi', 'Die vier Jahreszeiten'))
        self.assertFalse(cb.is_composer_head('Verklärte Nacht (1899)'))
        self.assertTrue(cb.is_composer_head('Hayato Sumino (1995)', bold=True))
        self.assertFalse(cb.is_composer_head('Sinfonie Nr. 5 (1937)', bold=True))


class OpernhausCalendar(unittest.TestCase):
    @staticmethod
    def entry(uid, cls, day_html, hhmm, title, ld_start=None, url='/spielplan/kalendarium/x/'):
        ld = ''
        if ld_start:
            ld = ('<script type="application/ld+json">{"@context":"http://schema.org/","@type":"Event","name":"%s",'
                  '"startDate":"%s","url":"https://www.opernhaus.ch%s"}</script>' % (title, ld_start, url))
        return (f'<div class="el-eventlistitem {cls}" id="uid_{uid}">{ld}<div class="date"><p>{day_html}</p><p>{hhmm}</p></div>'
                f'<div class="details"><div class="inner"><div class="location">Hauptbühne</div><h2 >{title}</h2>'
                f'<a href="{url}" class="link-box" title="x"></a></div></div></div>')

    def test_block_of_the_next_entry_is_not_taken(self):
        from sources import opernhaus_zurich as oz
        day = '<span class="weekday">So</span> <span class="day">06</span> <span class="month">Dez</span>'
        nxt = ('<script type="application/ld+json">{"@type":"Event","name":"Elektra","startDate":"2026-12-06T19:00",'
               '"url":"https://www.opernhaus.ch/spielplan/kalendarium/elektra/"}</script>')
        page = (self.entry(1, 'first', day, '11.15', '3. Kammerkonzert', url='/spielplan/kalendarium/kammerkonzert/') + nxt +
                self.entry(2, 'noday', '', '19.00', 'Elektra', '2026-12-06T19:00', '/spielplan/kalendarium/elektra/') +
                self.entry(3, 'first', '<span class="day">01</span> <span class="month">Jan</span>', '20.00', 'Silvester',
                           '2027-01-01T19:30'))
        rows = oz.parse_listing(page, {'ref': date(2026, 11, 30)})
        self.assertEqual([(r['uid'], r['start'], r['url']) for r in rows], [
            ('1', '2026-12-06T11:15', 'https://www.opernhaus.ch/spielplan/kalendarium/kammerkonzert/'),   # its own time and link
            ('2', '2026-12-06T19:00', 'https://www.opernhaus.ch/spielplan/kalendarium/elektra/'),
            ('3', '2027-01-01T20:00', 'https://www.opernhaus.ch/spielplan/kalendarium/x/')])               # the printed time wins

    def test_production_page_facts(self):
        from sources import opernhaus_zurich as oz
        page = ('<div class="longinfo"><p>Ballett von Cathy Marston<br /> nach William Shakespeares Komödie<br /> <br />'
                ' Musik von Felix Mendelssohn Bartholdy und<br /> Gabriel Prokofiev</p></div>'
                '<script type="application/ld+json">{"@type":"Event","startDate":"2026-12-03T19:00","performer":['
                '{"@type":"Person","name":"Mauro Peter","description":"Tito Vespasiano\\\\n"}]}</script>')
        d = oz.parse_detail(page)
        self.assertEqual(d['music'], ['Felix Mendelssohn Bartholdy', 'Gabriel Prokofiev'])
        self.assertEqual(d['casts']['2026-12-03T19:00'], [('Tito Vespasiano', 'Mauro Peter', False)])
        self.assertEqual(oz._operas_in_note('Rachmaninow – Die drei Opern', 'Aleko, Skupoi Rytsar & Francesca da Rimini'),
                         [('Rachmaninow', 'Aleko'), ('Rachmaninow', 'Skupoi Rytsar'), ('Rachmaninow', 'Francesca da Rimini')])
        self.assertEqual(oz._operas_in_note('Elektra', 'Oper von Richard Strauss'), [])
        self.assertEqual(oz._operas_in_note('Puccini – Die drei Opern', 'Oper von Giacomo Puccini'), [])


class LucerneWorks(unittest.TestCase):
    def test_pieces_of_a_set_and_headings(self):
        from sources import lso_luzern as lso

        def item(label, *texts):
            return ('<li class="tribe-events-works__item"><p class="tribe-events-works__label">%s</p>%s</li>'
                    % (label, ''.join(f'<p class="tribe-events-works__text">{t}</p>' for t in texts)))
        page = ('<div class="tribe-events-works">' +
                item('Frédéric Chopin (1810–1849)', '24 Préludes, op. 28', 'XV Sostenuto in Des-Dur | 7’', '_',
                     'Scherzo Nr. 4 in E-Dur, op. 54 | 11’', '_', 'Auswahl aus Mazurkas, op. 59 | 11’', 'I Mazurka in a-Moll',
                     'II Mazurka in As-Dur', '_', 'Nocturnes, op. 62 | 7’', 'I Nr. 1 in H-Dur') +
                item('Nach dem Requiem', 'Im Schatten von Beethoven') +
                item('Richard Wagner (1813–1883)', 'Siegfried-Idyll, W W V 103') +
                item('Vincenzo Bellini (1801–1835)', 'Ouvertüre', 'I Capuleti e i Montecchi') +
                '</div>Im Kalender eintragen')
        self.assertEqual(lso._parse_page(page)['program'], [
            ('Frédéric Chopin', '24 Préludes, op. 28: XV Sostenuto in Des-Dur'),
            ('Frédéric Chopin', 'Scherzo Nr. 4 in E-Dur, op. 54'),
            ('Frédéric Chopin', 'Auswahl aus Mazurkas, op. 59: I Mazurka in a-Moll, II Mazurka in As-Dur'),
            ('Frédéric Chopin', 'Nocturnes, op. 62: I Nr. 1 in H-Dur'),
            ('Richard Wagner', 'Siegfried-Idyll, WWV 103'),
            ('Vincenzo Bellini', 'Ouvertüre'), ('Vincenzo Bellini', 'I Capuleti e i Montecchi')])


class TonhalleComposerList(unittest.TestCase):
    def test_composers_named_in_the_line(self):
        import sources.tonhalle as th
        row = lambda name, function: f'<span class="name">{name}</span> <span class="function">{function}</span>'
        works = ''.join([row('Hugo Wolf', '«Italienische Serenade»'),
                         row('', 'H. Purcell, G.F. Händel, A. Vivaldi u.a.: Diverse Arien für Sopran und Orchester'),
                         row('Giuseppe Verdi', 'Streichquartett e-Moll'), row('', 'Rigoletto: Caro nome, Bella figlia')])
        page = f'<div class="info"><div class="artists"></div><div class="artists"></div><div class="artists">{works}</div><div class="price">'
        self.assertEqual(th.parse_detail(page)['works'], [
            ('Hugo Wolf', '«Italienische Serenade»'),
            ('H. Purcell, G.F. Händel, A. Vivaldi u.a.', 'Diverse Arien für Sopran und Orchester'),
            ('Giuseppe Verdi', 'Streichquartett e-Moll'), ('Giuseppe Verdi', 'Rigoletto: Caro nome, Bella figlia')])


class OpernhausRecovery(unittest.TestCase):
    ITEM = ('<div class="el-eventlistitem noday noadjust last" id="uid_{uid}">'
            '<script type="application/ld+json">{{"@context":"http://schema.org/","@type":"Event","name":"L\'elisir d\'amore",'
            '"startDate":"{start}","url":"https://www.opernhaus.ch/spielplan/kalendarium/lelisir-damore/",'
            '"offers":{{"@type":"AggregateOffer","url":"https://tickets.opernhaus.ch/x"}}}}</script>'
            '<div class="date"> {box} </div><div class="details"><div class="inner">'
            '<div class="location">Hauptbühne Opernhaus</div><h2 >L\'elisir d\'amore</h2>'
            '<div class="description">Oper von Gaetano Donizetti<br/></div></div></div></div>')

    def test_json_ld_year_is_kept(self):
        import sources.opernhaus_zurich as oz
        page = self.ITEM.format(uid=199962, start='2027-05-09T19:30',
                                box='<span class="day">09</span><span class="month">Mai</span><p>19.30</p>')
        rows = oz.parse_listing(page, {'ref': date(2026, 10, 26)})    # a production page read in October
        self.assertEqual(rows[0]['start'], '2027-05-09T19:30')
        page = self.ITEM.format(uid=199962, start='2027-05-09T19:30',
                                box='<span class="day">09</span><span class="month">Mai</span><p>20.00</p>')
        self.assertEqual(oz.parse_listing(page, {'ref': date(2027, 5, 1)})[0]['start'], '2027-05-09T20:00')

    def test_missed_performances(self):
        import sources.opernhaus_zurich as oz
        url = 'https://www.opernhaus.ch/spielplan/kalendarium/lelisir-damore/'
        prev = [{'id': 'opernhaus_zurich-199962', 'start': '2027-05-09T19:30:00+02:00', 'url': url},
                {'id': 'opernhaus_zurich-199961', 'start': '2027-05-06T20:00:00+02:00', 'url': url},
                {'id': 'opernhaus_zurich-100', 'start': '2026-10-01T19:00:00+02:00', 'url': url},          # past
                {'id': 'opernhaus_zurich-101', 'start': '2027-01-01T19:00:00+01:00', 'url': url, 'status': 'cancelled'},
                {'id': 'opernhaus_zurich-102', 'start': '2027-01-02T19:00:00+01:00', 'url': 'https://example.org/x'}]
        self.assertEqual(oz.missed_performances(prev, {'199961'}, date(2026, 10, 26)), {url: {'199962'}})
        self.assertEqual(oz.missed_performances([], set(), date(2026, 10, 26)), {})


class Check(unittest.TestCase):
    def test_one_day_outage_is_a_warning(self):
        import check as chk
        now = datetime.now(timezone.utc).isoformat()
        def feed(**src):
            return {'generatedAt': now, 'concerts': [], 'sources': [dict({'key': 'gstaad', 'name': 'Gstaad'}, **src)]}
        down = dict(ok=False, count=0, error='robots.txt unreachable (timed out)')
        p, w, _, _ = chk.check(feed(**down), feed(ok=True, count=0), 30)
        self.assertEqual(p, [])                                     # had no events, nothing lost
        self.assertTrue(any('try again' in x for x in w))
        p, w, _, _ = chk.check(feed(ok=False, count=12, reused=True, error='timeout'), feed(ok=True, count=12), 30)
        self.assertEqual(p, [])                                     # yesterday's events kept
        p, _, _, _ = chk.check(feed(**down), feed(ok=False, count=0), 30)
        self.assertEqual(len(p), 1)                                 # two days in a row
        p, _, _, _ = chk.check(feed(ok=False, count=0, error='timeout'), feed(ok=True, count=12), 30)
        self.assertEqual(len(p), 1)                                 # events lost
        p, _, _, _ = chk.check(feed(**down), None, 30)
        self.assertEqual(len(p), 1)                                 # nothing to compare with
        other = {'generatedAt': now, 'concerts': [], 'sources': [{'key': 'tonhalle', 'ok': True, 'count': 90}]}
        p, w, _, _ = chk.check(feed(**down), other, 30)
        self.assertEqual(p, [])                                     # a new source's first run
        self.assertTrue(any('new source' in x for x in w))


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
