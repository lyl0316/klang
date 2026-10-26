#!/usr/bin/env python3
"""Local dev server for Klang: serves the app folder with caching disabled.

Usage: python3 tools/serve.py [port]   (default 8765)
"""
import http.server
import os
import sys
from functools import partial

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC_URL = 'https://lyl0316.github.io/klang/'


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
                      '.js': 'text/javascript', '.mjs': 'text/javascript',
                      '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml'}

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    # Only this Mac uses the dev server. A phone on the home network (e.g. an old Home Screen icon
    # added from http://<mac>.local:8765) is sent to the published app, which is always up to date.
    def _from_elsewhere(self):
        return self.client_address[0] not in ('127.0.0.1', '::1', '::ffff:127.0.0.1')

    def do_GET(self):
        if self._from_elsewhere():
            self.send_response(302)
            self.send_header('Location', PUBLIC_URL)
            self.end_headers()
            return
        super().do_GET()

    def do_HEAD(self):
        if self._from_elsewhere():
            self.send_response(302)
            self.send_header('Location', PUBLIC_URL)
            self.end_headers()
            return
        super().do_HEAD()


class Server(http.server.ThreadingHTTPServer):
    # The default backlog (5) makes macOS reset connections when a page load and the service
    # worker's precache arrive together ("Failed to fetch dynamically imported module").
    request_queue_size = 128
    daemon_threads = True


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    handler = partial(NoCacheHandler, directory=ROOT)
    with Server(('', port), handler) as httpd:
        print(f'Klang running at http://localhost:{port}')
        httpd.serve_forever()
