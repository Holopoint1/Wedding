"""Tiny static dev server with caching disabled.

Plain `python -m http.server` sends no Cache-Control, so browsers keep stale
JS/CSS after edits. This handler forces no-store so every refresh is fresh.
Run:  python dev_server.py   (serves the folder it lives in on :8123)
"""
import http.server
import socketserver

PORT = 8123


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


if __name__ == "__main__":
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", PORT), NoCacheHandler) as httpd:
        print(f"Wedding site (no-cache) at http://127.0.0.1:{PORT}/")
        httpd.serve_forever()
