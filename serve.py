"""Local development server: always deliver the current workspace files."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class FreshFilesHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, max-age=0")
        super().end_headers()


if __name__ == "__main__":
    root = Path(__file__).resolve().parent
    handler = partial(FreshFilesHandler, directory=str(root))
    with ThreadingHTTPServer(("127.0.0.1", 5173), handler) as server:
        print("Puzzle: http://127.0.0.1:5173/", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
