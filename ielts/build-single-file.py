#!/usr/bin/env python3
"""Bundle the practice suite into one self-contained HTML file.

    python3 ielts/build-single-file.py

Reads ielts/index.html, inlines the stylesheet and every <script src="...">,
and writes ielts/ielts-ukvi-practice-suite.html. No dependencies.
"""

import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
SRC = HERE / "index.html"
OUT = HERE / "ielts-ukvi-practice-suite.html"

BANNER = """<!--
  IELTS for UKVI — practice suite (offline single-file build)

  Three complete practice tests: Listening, Reading (Academic and General Training),
  Writing and Speaking. Everything is inside this one file — no network, no downloads,
  no tracking. Open it in any modern browser.

  Listening audio is spoken by the browser's own speech engine, so it needs a browser
  with voices installed: Chrome or Edge on Windows, Safari on macOS/iOS, Chrome on
  Android. Where there are none, the section still runs to time and shows each line.

  Source: https://github.com/evgenymuravev-netizen/evgeny-referral-hub/tree/main/ielts
  Original material, built to the official IELTS format. Not produced by, endorsed by
  or affiliated with the IELTS partners.
-->
"""


def read(rel: str) -> str:
    p = (HERE / rel).resolve()
    if HERE not in p.parents and p != HERE:
        raise SystemExit(f"refusing to inline outside the app directory: {rel}")
    return p.read_text(encoding="utf-8")


def guard(js: str) -> str:
    """A literal </script> inside inlined JS would end the block early."""
    return js.replace("</script", "<\\/script")


def main() -> int:
    html = read(SRC.name)

    # stylesheet -> <style>
    def css_sub(m):
        return "<style>\n" + read(m.group(1)).strip() + "\n</style>"

    html, n_css = re.subn(
        r'<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>', css_sub, html
    )

    # <script src> -> inline <script>
    def js_sub(m):
        src = m.group(1)
        return "<script>\n/* ==== " + src + " ==== */\n" + guard(read(src).strip()) + "\n</script>"

    html, n_js = re.subn(r'<script src="([^"]+)"></script>', js_sub, html)

    if not n_css or not n_js:
        raise SystemExit("nothing was inlined — has index.html changed shape?")

    html = html.replace("<!DOCTYPE html>", "<!DOCTYPE html>\n" + BANNER, 1)
    html = html.replace(
        "<title>",
        '<meta name="generator" content="build-single-file.py">\n<title>',
        1,
    )

    OUT.write_text(html, encoding="utf-8")
    kb = OUT.stat().st_size / 1024
    print(f"{OUT.name}: {kb:.0f} KB  ({n_css} stylesheet, {n_js} scripts inlined)")

    for leftover in re.findall(r'(?:src|href)="(?!data:|#|https?:)([^"]+)"', html):
        print(f"  warning: still references an external file: {leftover}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
