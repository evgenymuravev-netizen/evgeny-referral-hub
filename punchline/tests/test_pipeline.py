"""Tests for punchline_pipeline.py — parsers, sync with the arena, build splice, retry.

Run from the repo root:  python3 -m unittest discover -s tests -v
No network: provider calls are never exercised, only mocked.
"""
import argparse
import json
import os
import sys
import tempfile
import unittest
from unittest import mock

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

import punchline_pipeline as pp


def brief(bid):
    return next(b for b in pp.BRIEFS if b["id"] == bid)


class TestBriefs(unittest.TestCase):
    def test_twelve_unique_ids(self):
        ids = [b["id"] for b in pp.BRIEFS]
        self.assertEqual(len(ids), 12)
        self.assertEqual(len(set(ids)), 12)

    def test_five_formats_covered(self):
        self.assertEqual({b["fmt"] for b in pp.BRIEFS},
                         {"pun", "anecdote", "meme", "song", "sketch"})


class TestScaffold(unittest.TestCase):
    def test_brief_text_and_no_leakage(self):
        for b in pp.BRIEFS:
            s = pp.scaffold(b)
            self.assertIn(b["brief"], s)
            self.assertIn("FORMAT:", s)
            # the prompt must not hint at which model is being tested
            self.assertNotIn("model", s.lower().replace("blind comedy benchmark", ""))

    def test_meme_briefs_get_distinct_json_schemas(self):
        self.assertIn('"b1"', pp.scaffold(brief("m1")))
        self.assertIn('"fire"', pp.scaffold(brief("m2")))


class TestParseItem(unittest.TestCase):
    def test_pun_strips_wrapping_quotes(self):
        self.assertEqual(pp.parse_item(brief("p1"), '"A grounded pun."'),
                         {"t": "A grounded pun."})

    def test_song_splits_lines(self):
        text = "\n".join(f"line {i}" for i in range(8))
        self.assertEqual(len(pp.parse_item(brief("s1"), text)["song"]), 8)

    def test_song_caps_at_ten_lines(self):
        text = "\n".join(f"line {i}" for i in range(14))
        self.assertEqual(len(pp.parse_item(brief("s1"), text)["song"]), 10)

    def test_song_too_short_raises(self):
        with self.assertRaises(ValueError):
            pp.parse_item(brief("s1"), "one\ntwo")

    def test_sketch_parses_speakers(self):
        text = "FRIDGE: hello\nOWNER: no\nFRIDGE: yes\nOWNER: fine"
        sk = pp.parse_item(brief("k1"), text)["sk"]
        self.assertEqual(sk[0], ["FRIDGE", "hello"])
        self.assertEqual(len(sk), 4)

    def test_sketch_ignores_stage_directions(self):
        text = "(lights up)\nA: one\nB: two\nA: three\nB: four"
        sk = pp.parse_item(brief("k1"), text)["sk"]
        self.assertEqual(len(sk), 4)

    def test_sketch_without_speakers_raises(self):
        with self.assertRaises(ValueError):
            pp.parse_item(brief("k1"), "just prose with no dialogue")

    def test_meme_strips_code_fences(self):
        raw = '```json\n{"b1":"a","b2":"b","sub":"c"}\n```'
        self.assertEqual(pp.parse_item(brief("m1"), raw)["meme"]["tpl"], "buttons")

    def test_meme_missing_field_raises(self):
        with self.assertRaises(ValueError):
            pp.parse_item(brief("m2"), '{"fire":"only half"}')


class TestArenaSync(unittest.TestCase):
    """The arena and the pipeline must agree on brief ids and pool markers."""

    @classmethod
    def setUpClass(cls):
        with open(os.path.join(ROOT, "index.html")) as f:
            cls.html = f.read()

    def test_brief_ids_match(self):
        self.assertEqual(pp.html_brief_ids(self.html),
                         {b["id"] for b in pp.BRIEFS})

    def test_pool_markers_present(self):
        self.assertIn("/*__POOL_START__*/", self.html)
        self.assertIn("/*__POOL_END__*/", self.html)

    def test_scaffold_matches_arena_scaffold(self):
        # The JS scaffold must issue the same base instruction as the Python one,
        # or live and pipeline entries answer different prompts.
        self.assertIn("blind comedy benchmark called Punchline", self.html)
        for b in pp.BRIEFS:
            py = pp.scaffold(b)
            fmt_line = py.split("FORMAT:")[1].strip()
            self.assertIn(fmt_line[:40], self.html,
                          msg=f"arena FORMAT text drifted for {b['id']}")


class TestBuild(unittest.TestCase):
    def test_build_injects_clean_pool(self):
        with tempfile.TemporaryDirectory() as td:
            cwd = os.getcwd()
            os.chdir(td)
            try:
                pool = {"p1": {"gpt-5.5": {"t": "a pun", "prov": "test"},
                               "glm-5.2": {"error": "boom", "prov": "test"}}}
                with open(pp.POOL_FILE, "w") as f:
                    json.dump(pool, f)
                with open("arena.html", "w") as f:
                    f.write("<script>/*__POOL_START__*/const POOL={};/*__POOL_END__*/</script>")
                pp.cmd_build(argparse.Namespace(html="arena.html"))
                with open("arena.built.html") as f:
                    built = f.read()
                self.assertIn("PIPELINE_POOL", built)
                self.assertIn("a pun", built)
                # errored entries must not ship
                self.assertNotIn("boom", built)
            finally:
                os.chdir(cwd)

    def test_build_refuses_html_without_markers(self):
        with tempfile.TemporaryDirectory() as td:
            cwd = os.getcwd()
            os.chdir(td)
            try:
                with open(pp.POOL_FILE, "w") as f:
                    json.dump({"p1": {"gpt-5.5": {"t": "x"}}}, f)
                with open("arena.html", "w") as f:
                    f.write("<script>no markers here</script>")
                with self.assertRaises(SystemExit):
                    pp.cmd_build(argparse.Namespace(html="arena.html"))
            finally:
                os.chdir(cwd)


class TestCoverage(unittest.TestCase):
    def test_empty_pool_does_not_crash(self):
        pp.print_coverage({})

    def test_flags_unbalanced_briefs(self):
        import io
        from contextlib import redirect_stdout
        pool = {"p1": {"gpt-5.5": {"t": "ok"}, "glm-5.2": {"error": "refused"}}}
        buf = io.StringIO()
        with redirect_stdout(buf):
            pp.print_coverage(pool)
        self.assertIn("Unbalanced briefs", buf.getvalue())
        self.assertIn("p1", buf.getvalue())


class TestRetry(unittest.TestCase):
    def test_transient_errors_are_retried_then_succeed(self):
        calls = {"n": 0}
        def flaky(url, headers, body):
            calls["n"] += 1
            if calls["n"] < 3:
                raise pp.TransientError("HTTP 429")
            return {"ok": True}
        with mock.patch.object(pp, "_post", side_effect=flaky), \
             mock.patch.object(pp.time, "sleep"):
            self.assertEqual(pp._post_retry("u", {}, {}), {"ok": True})
        self.assertEqual(calls["n"], 3)

    def test_gives_up_after_max_retries(self):
        with mock.patch.object(pp, "_post", side_effect=pp.TransientError("HTTP 503")), \
             mock.patch.object(pp.time, "sleep"):
            with self.assertRaises(pp.TransientError):
                pp._post_retry("u", {}, {})


if __name__ == "__main__":
    unittest.main()
