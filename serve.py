#!/usr/bin/env python3
"""Local dev server with persistent progress.

Usage:
    python3 serve.py            # serve on http://localhost:8000
    python3 serve.py 5173       # serve on http://localhost:5173

Adds a single endpoint that the static site uses to round-trip progress
state through `progress.json` next to this script:

    GET  /api/progress  -> 200 with the JSON file (or `{}` if missing)
    POST /api/progress  -> body is JSON, writes it back

Everything else falls through to SimpleHTTPRequestHandler so the rest of
the static site behaves exactly like `python3 -m http.server`.
"""
from __future__ import annotations

import json
import socket
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT          = Path(__file__).resolve().parent
PROGRESS_FILE = ROOT / "progress.json"


class Handler(SimpleHTTPRequestHandler):
    # Serve files relative to the script's directory regardless of cwd.
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    # ---- progress endpoint --------------------------------------------------
    def _read_progress(self) -> dict:
        if not PROGRESS_FILE.exists():
            return {}
        try:
            data = json.loads(PROGRESS_FILE.read_text(encoding="utf-8"))
            return data if isinstance(data, dict) else {}
        except Exception:
            return {}

    def _write_progress(self, data: dict) -> None:
        PROGRESS_FILE.write_text(
            json.dumps(data, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    def _json(self, status: int, payload) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        # Don't cache progress.
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/api/progress":
            self._json(200, self._read_progress())
            return
        super().do_GET()

    def do_POST(self):
        if self.path == "/api/progress":
            length = int(self.headers.get("Content-Length", "0") or 0)
            raw = self.rfile.read(length) if length > 0 else b"{}"
            try:
                data = json.loads(raw)
            except json.JSONDecodeError as e:
                self._json(400, {"error": f"invalid json: {e}"})
                return
            if not isinstance(data, dict):
                self._json(400, {"error": "expected an object"})
                return
            self._write_progress(data)
            self.send_response(204)
            self.end_headers()
            return
        self.send_error(404)

    # Quieter logging — drop the verbose default access log line.
    def log_message(self, fmt, *args):
        if "/api/progress" in (args[0] if args else ""):
            return
        return super().log_message(fmt, *args)


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    try:
        srv = ThreadingHTTPServer(("", port), Handler)
    except OSError as e:
        print(f"can't bind to :{port} — {e}", file=sys.stderr)
        sys.exit(1)
    host = socket.gethostname()
    print(f"  serving       http://localhost:{port}")
    print(f"  also at       http://{host}:{port}")
    print(f"  progress file {PROGRESS_FILE}")
    print(f"  ctrl-c to stop")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\nbye.")


if __name__ == "__main__":
    main()
