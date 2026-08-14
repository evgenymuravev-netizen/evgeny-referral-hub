#!/usr/bin/env python3
"""Bundle the practice suite into self-contained HTML files.

    python3 ielts/build-single-file.py              # build both editions
    python3 ielts/build-single-file.py --edition free
    python3 ielts/build-single-file.py --buy-url https://…

Reads ielts/index.html, inlines the stylesheet and every <script src="...">,
and writes:

    ielts-ukvi-practice-suite.html   full edition, all three tests
    ielts-ukvi-sample-test.html      free edition, Test 1 only

No dependencies.
"""

import argparse
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
SRC = HERE / "index.html"

EDITIONS = {
    "full": {
        "out": "ielts-ukvi-practice-suite.html",
        "skip": (),
        "label": "all three tests",
    },
    "free": {
        "out": "ielts-ukvi-sample-test.html",
        "skip": ("data/test2/", "data/test3/"),
        "label": "Test 1 only",
    },
}

DEFAULT_BUY_URL = "https://evgenymuravev-netizen.github.io/evgeny-referral-hub/ielts/buy.html"

BANNER = """<!--
  IELTS for UKVI — practice suite ({label}, offline single-file build)

  Listening, Reading (Academic and General Training), Writing and Speaking.
  Everything is inside this one file — no network, no downloads, no tracking.
  Open it in any modern browser.

  Listening audio is spoken by the browser's own speech engine, so it needs a
  browser with voices installed: Chrome or Edge on Windows, Safari on macOS and
  iOS, Chrome on Android. Where there are none, the section still runs to time
  and shows each line as it plays.

  Original material, built to the official IELTS format. Not produced by,
  endorsed by or affiliated with the IELTS partners.
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


def build(edition: str, buy_url: str) -> Path:
    cfg = EDITIONS[edition]
    html = read(SRC.name)
    skipped = []

    def css_sub(m):
        return "<style>\n" + read(m.group(1)).strip() + "\n</style>"

    html, n_css = re.subn(
        r'<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>', css_sub, html
    )

    def js_sub(m):
        src = m.group(1)
        if any(part in src for part in cfg["skip"]):
            skipped.append(src)
            return ""
        return (
            "<script>\n/* ==== " + src + " ==== */\n"
            + guard(read(src).strip())
            + "\n</script>"
        )

    html, n_js = re.subn(r'<script src="([^"]+)"></script>\n?', js_sub, html)

    if not n_css or not n_js:
        raise SystemExit("nothing was inlined — has index.html changed shape?")

    # Edition flag must run before app.js reads it; registry.js is the first script.
    flag = (
        "<script>window.IELTS_EDITION=%r;window.IELTS_BUY_URL=%r;</script>\n"
        % (edition, buy_url)
    ).replace("'", '"')
    html = html.replace("<script>\n/* ==== ./data/registry.js", flag + "<script>\n/* ==== ./data/registry.js", 1)

    html = html.replace("<!DOCTYPE html>", "<!DOCTYPE html>\n" + BANNER.format(label=cfg["label"]), 1)
    html = html.replace(
        "<title>", '<meta name="generator" content="build-single-file.py">\n<title>', 1
    )

    out = HERE / cfg["out"]
    out.write_text(html, encoding="utf-8")
    kb = out.stat().st_size / 1024
    print(f"{out.name:<34} {kb:>6.0f} KB   {cfg['label']}"
          + (f"   (skipped {len(skipped)} data files)" if skipped else ""))

    leftovers = re.findall(r'(?:src|href)="(?!data:|#|https?:)([^"]+)"', html)
    for l in leftovers:
        if l.endswith(".html"):
            continue  # a link to the sales page is meant to be external
        print(f"  warning: still references an external file: {l}")
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--edition", choices=["free", "full", "both"], default="both")
    ap.add_argument("--buy-url", default=DEFAULT_BUY_URL)
    args = ap.parse_args()

    todo = ["free", "full"] if args.edition == "both" else [args.edition]
    for e in todo:
        build(e, args.buy_url)
    return 0


if __name__ == "__main__":
    sys.exit(main())
