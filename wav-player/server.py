"""Local launcher for WAV Player. Serves only files beside this script."""

from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
import json
import os
import threading
import webbrowser


ROOT = Path(__file__).resolve().parent


class PlayerHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        if urlsplit(self.path).path == "/list":
            names = sorted(
                (p.name for p in ROOT.iterdir() if p.is_file() and p.suffix.lower() == ".wav"),
                key=str.casefold,
            )
            payload = json.dumps(names).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(payload)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(payload)
            return
        if urlsplit(self.path).path == "/":
            self.path = "/wav-player.html"
        super().do_GET()

    def log_message(self, format, *args):
        pass


if __name__ == "__main__":
    os.chdir(ROOT)
    server = ThreadingHTTPServer(("127.0.0.1", 0), PlayerHandler)
    url = f"http://127.0.0.1:{server.server_port}/"
    threading.Timer(0.5, lambda: webbrowser.open(url)).start()
    print(f"WAV Player is running at {url}")
    print("Leave this window open while using the player. Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
