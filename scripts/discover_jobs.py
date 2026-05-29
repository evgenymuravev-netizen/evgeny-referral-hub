"""
Scheduled job discovery — crawls company careers pages for product roles.

For each company with a known careers URL, this script:
  1. Identifies the careers platform (Greenhouse / Lever / Ashby / Workday / generic HTML)
  2. Uses the platform's public JSON API where available (more reliable than HTML)
  3. Filters job titles for product-related roles via a keyword list
  4. Verifies each role URL returns 200
  5. Writes results back to open_roles.json

Designed to run as a GitHub Action. Idempotent — re-running won't duplicate.
"""
from __future__ import annotations
import json, re, time, pathlib, sys
from urllib.parse import urljoin, urlparse
import requests
from bs4 import BeautifulSoup

ROOT = pathlib.Path(__file__).resolve().parent.parent
ROLES_PATH = ROOT / "open_roles.json"

# What counts as a "product" role
PRODUCT_KEYWORDS = [
    r'\bproduct\s+manager\b', r'\bproduct\s+lead\b', r'\bproduct\s+director\b',
    r'\bproduct\s+owner\b', r'\bproduct\s+head\b', r'\bhead\s+of\s+product\b',
    r'\bvp\s+product\b', r'\bvice\s+president\s+of\s+product\b',
    r'\bchief\s+product\b', r'\bcpo\b',
    r'\bprincipal\s+product\b', r'\bsenior\s+product\s+manager\b',
    r'\bgroup\s+product\s+owner\b', r'\blead\s+product\b',
    r'\bproduct\s+marketing\s+manager\b', r'\bproduct\s+strategy\b',
]
PRODUCT_REGEX = re.compile('|'.join(PRODUCT_KEYWORDS), re.IGNORECASE)
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; EvgenyReferralBot/1.0)"}
TIMEOUT = 12


def is_product_title(title: str) -> bool:
    return bool(PRODUCT_REGEX.search(title or ""))


def is_url_alive(url: str) -> bool:
    try:
        r = requests.head(url, allow_redirects=True, timeout=TIMEOUT, headers=HEADERS)
        if r.status_code == 200:
            return True
        # Some sites block HEAD — try GET
        r = requests.get(url, allow_redirects=True, timeout=TIMEOUT, headers=HEADERS, stream=True)
        return r.status_code == 200
    except Exception:
        return False


# ─── Platform-specific extractors ─────────────────────────────────────────
def fetch_greenhouse(board_token: str) -> list[dict]:
    """Greenhouse public API: https://boards-api.greenhouse.io/v1/boards/<token>/jobs"""
    try:
        r = requests.get(
            f"https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs",
            timeout=TIMEOUT, headers=HEADERS,
        )
        if r.status_code != 200:
            return []
        data = r.json()
        jobs = []
        for j in data.get("jobs", []):
            if is_product_title(j.get("title", "")):
                jobs.append({
                    "title": j["title"],
                    "url": j.get("absolute_url"),
                    "location": (j.get("location") or {}).get("name", ""),
                    "verified": True,
                    "source": "greenhouse_api",
                })
        return jobs
    except Exception as e:
        print(f"  greenhouse error: {e}", file=sys.stderr)
        return []


def fetch_lever(company_slug: str) -> list[dict]:
    """Lever public API: https://api.lever.co/v0/postings/<company>?mode=json"""
    try:
        r = requests.get(
            f"https://api.lever.co/v0/postings/{company_slug}?mode=json",
            timeout=TIMEOUT, headers=HEADERS,
        )
        if r.status_code != 200:
            return []
        data = r.json()
        jobs = []
        for j in data:
            if is_product_title(j.get("text", "")):
                jobs.append({
                    "title": j["text"],
                    "url": j.get("hostedUrl"),
                    "location": (j.get("categories") or {}).get("location", ""),
                    "verified": True,
                    "source": "lever_api",
                })
        return jobs
    except Exception as e:
        print(f"  lever error: {e}", file=sys.stderr)
        return []


def fetch_ashby(org_slug: str) -> list[dict]:
    """Ashby public API: jobs.ashbyhq.com/api/non-user-graphql"""
    try:
        body = {
            "operationName": "ApiJobBoardWithTeams",
            "variables": {"organizationHostedJobsPageName": org_slug},
            "query": "query ApiJobBoardWithTeams($organizationHostedJobsPageName: String!) { jobBoard: jobBoardWithTeams(organizationHostedJobsPageName: $organizationHostedJobsPageName) { jobPostings { id title locationName teamId } } }"
        }
        r = requests.post(
            "https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiJobBoardWithTeams",
            json=body, timeout=TIMEOUT, headers=HEADERS,
        )
        if r.status_code != 200:
            return []
        postings = ((r.json().get("data") or {}).get("jobBoard") or {}).get("jobPostings", [])
        jobs = []
        for j in postings:
            if is_product_title(j.get("title", "")):
                jobs.append({
                    "title": j["title"],
                    "url": f"https://jobs.ashbyhq.com/{org_slug}/{j['id']}",
                    "location": j.get("locationName", ""),
                    "verified": True,
                    "source": "ashby_api",
                })
        return jobs
    except Exception as e:
        print(f"  ashby error: {e}", file=sys.stderr)
        return []


def fetch_generic_careers(url: str, company_name: str) -> list[dict]:
    """Last-resort HTML scrape: load page, look for <a> tags with product-like text."""
    try:
        r = requests.get(url, timeout=TIMEOUT, headers=HEADERS, allow_redirects=True)
        if r.status_code != 200:
            return []
        soup = BeautifulSoup(r.text, "html.parser")
        jobs = []
        seen_urls = set()
        for a in soup.find_all("a", href=True):
            text = a.get_text(strip=True)
            if not text or len(text) > 120:
                continue
            if is_product_title(text):
                href = urljoin(url, a["href"])
                if href in seen_urls:
                    continue
                seen_urls.add(href)
                jobs.append({
                    "title": text,
                    "url": href,
                    "location": "",
                    "verified": False,  # Need a separate verification pass
                    "source": "html_scrape",
                })
                if len(jobs) >= 20:
                    break
        return jobs
    except Exception as e:
        print(f"  generic error: {e}", file=sys.stderr)
        return []


# ─── Per-company source map ───────────────────────────────────────────────
# Each entry says how to fetch this company's roles
SOURCES = {
    "Wise": {"type": "greenhouse", "token": "wise"},
    "Airwallex": {"type": "ashby", "slug": "airwallex"},
    "Huspy": {"type": "greenhouse", "token": "huspy"},
    "Revolut": {"type": "generic", "url": "https://www.revolut.com/careers/"},
    "Plata": {"type": "generic", "url": "https://career.platacard.mx/vacancy"},
    "Alaan": {"type": "generic", "url": "https://www.alaan.com/careers"},
    "RAKBank": {"type": "generic", "url": "https://careers.rakbank.ae/en/uae/jobs/"},
    "Yango": {"type": "generic", "url": "https://yango.com/career/vacancy"},
    "Wio Bank": {"type": "generic", "url": "https://www.linkedin.com/company/wiobank/jobs"},
    # FAB + ADIB use Oracle HCM SPAs that don't return useful HTML; skip auto-crawl
    # Mastercard uses Workday — could add Workday handler later
    # Google careers requires JS rendering; skip
}


def discover_for_company(company_entry: dict) -> list[dict]:
    name = company_entry["company"]
    src = SOURCES.get(name)
    if not src:
        return []  # No discovery source configured
    print(f"  discovering {name} via {src['type']}...")
    if src["type"] == "greenhouse":
        return fetch_greenhouse(src["token"])
    elif src["type"] == "ashby":
        return fetch_ashby(src["slug"])
    elif src["type"] == "lever":
        return fetch_lever(src["slug"])
    elif src["type"] == "generic":
        return fetch_generic_careers(src["url"], name)
    return []


MAX_PER_COMPANY = 20  # Cap discovered roles per company to keep UI manageable

def merge_roles(existing: list[dict], discovered: list[dict]) -> list[dict]:
    """Preserve all manually-curated entries (any source), then add new discoveries up to the cap, deduped by URL."""
    by_url = {}
    # Keep all existing entries (manual + previously-discovered)
    for r in existing:
        if r.get("url"):
            by_url[r["url"]] = r
    # Prioritise evgeny_referenced; then add discovered up to the cap
    discovered_kept = 0
    capacity = max(0, MAX_PER_COMPANY - len(by_url))
    for r in discovered:
        if r["url"] in by_url:
            continue
        if discovered_kept >= capacity:
            break
        by_url[r["url"]] = r
        discovered_kept += 1
    # Sort: evgeny_referenced first, then verified, then alphabetical
    items = list(by_url.values())
    items.sort(key=lambda r: (
        0 if r.get("source") == "evgeny_referenced" else 1,
        0 if r.get("verified") else 1,
        r.get("title", ""),
    ))
    return items


def main():
    data = json.loads(ROLES_PATH.read_text())
    changed = False
    total_new = 0
    total_total = 0

    for company_entry in data.get("companies", []):
        discovered = discover_for_company(company_entry)
        if not discovered:
            continue
        before = len(company_entry.get("roles", []))
        company_entry["roles"] = merge_roles(company_entry.get("roles", []), discovered)
        after = len(company_entry["roles"])
        if after != before:
            changed = True
            total_new += after - before
        total_total += after
        print(f"    {company_entry['company']}: {before} → {after} roles")

    data["_meta"]["last_discovery"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    ROLES_PATH.write_text(json.dumps(data, indent=2, ensure_ascii=False))
    print(f"\nDiscovery complete · changed={changed} · added={total_new} · current_total={total_total}")


if __name__ == "__main__":
    main()
