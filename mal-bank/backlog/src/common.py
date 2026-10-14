"""Shared row helper for the Noor x Mizan backlog."""

COLUMNS = [
    ("ID", 9), ("Title", 32), ("Epic", 20), ("Type", 13), ("Actor", 18), ("Built by", 14),
    ("Release", 10), ("User story / description", 52), ("Acceptance criteria", 62),
    ("Business rules / calculation", 56), ("Inputs and dependencies", 38), ("Output and consumers", 34),
    ("Components", 15), ("PM size", 9), ("Prototype reference", 24), ("Open questions / compliance", 38),
    ("Tech estimate (person-days)", 13), ("Team / skills", 20), ("Owner", 15), ("Status", 13),
]
TECH_COLS = 4  # the last four columns are filled by the tech team


def bullets(items):
    if isinstance(items, str):
        return items
    return "\n".join("• " + x for x in items)


def row(rid, title, epic, typ, actor, built, rel, story, ac, rule, inp, out, comp, size, ref, oq=""):
    return [rid, title, epic, typ, actor, built, rel, story, bullets(ac), bullets(rule), bullets(inp),
            bullets(out), comp, size, ref, bullets(oq), None, None, None, None]
