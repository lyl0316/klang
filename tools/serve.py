#!/usr/bin/env python3
"""Local dev server for Klang: serves the app folder with caching disabled.

Usage: python3 tools/serve.py [port]   (default 8765)
"""
import http.server
import os
import sys
from functools import partial

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
                      '.js': 'text/javascript', '.mjs': 'text/javascript',
                      '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml'}

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


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
