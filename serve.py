#!/usr/bin/env python3
"""Local preview for the LOGR site.

`python3 -m http.server` is not enough on its own: every link on this site is
written without the .html (/privacy, /terms), because Netlify resolves those
automatically. A plain static server 404s on all of them, so the whole site
looks broken locally while being fine in production.

This adds the two Netlify behaviours that matter for previewing:
  /privacy      -> privacy.html
  anything else -> 404.html, with a real 404 status

It does NOT apply the headers in netlify.toml. `npx netlify-cli dev` does, and
is worth running before a deploy that touches the CSP. See README.md.

    python3 serve.py [port]
"""

import http.server
import os
import socketserver
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
ROOT = os.path.dirname(os.path.abspath(__file__))


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def translate_path(self, path):
        local = super().translate_path(path)
        # Clean URL: /privacy is served by privacy.html.
        if not os.path.exists(local) and not path.rstrip('/').endswith('.html'):
            html = local.rstrip('/') + '.html'
            if os.path.isfile(html):
                return html
        return local

    def send_error(self, code, message=None, explain=None):
        if code == 404 and os.path.isfile(os.path.join(ROOT, '404.html')):
            self.error_message_format = open(
                os.path.join(ROOT, '404.html'), encoding='utf-8'
            ).read().replace('%', '%%')
        super().send_error(code, message, explain)

    def log_message(self, fmt, *args):
        sys.stderr.write('%s %s\n' % (self.address_string(), fmt % args))


class Server(socketserver.TCPServer):
    allow_reuse_address = True


if __name__ == '__main__':
    with Server(('', PORT), Handler) as httpd:
        print(f'LOGR site  ->  http://localhost:{PORT}   (ctrl-c to stop)')
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('\nstopped')
