"""Scrape PSI investigation records + experiment tables via the repo's JSON API (no browser).

PSI is an Angular app, but it is backed by a clean JSON web service at /geode-py/ws/.
Endpoints (discovered from the network tab):

  1. Search (all combustion investigations, full metadata in one call):
     GET /geode-py/ws/repo/search?term=combustion&source=psi&type=investigation
     -> { hits: { hits: [ { _source: {Accession, Title, Acronym, Objectives, Approach,
          Hypothesis, "Research Impacts/Earth Benefits", Experiment Hardware, ...} } ] } }

  2. Single investigation (full record + file lists):
     GET /geode-py/ws/repo/investigations/<PSI-ID>        (NOTE the /repo/ - without it = 404)
     -> { accession, objective, approach, hypothesis, experimentHardware,
          experimentalTable: [ { file_name: "PSI-26_Experimental table_BASS.csv", ... } ], ... }

  3. Experiment-table CSV (the run-level conditions, e.g. BASS = 123 rows):
     GET /geode-py/ws/studies/<PSI-ID>/download?file=<file_name>&version=1
     -> 302 redirect to a signed S3 URL that serves the CSV (follow redirects).

Output:
  data/raw/psi/_search.json                     full search dump (all investigations)
  data/raw/psi/<PSI-ID>/investigation.json      full detail record
  data/raw/psi/<PSI-ID>/experimental_table.csv  run conditions (when the investigation has one)

Next step after this: parse these into ingest/schema.py (normalize.py / release.py).

Usage:
  python scrape_psi.py --ids PSI-26 PSI-25
  python scrape_psi.py --all
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import httpx

from psi_ids import INVESTIGATIONS

BASE = "https://psi.nasa.gov/geode-py/ws"
RAW = Path(__file__).resolve().parent.parent / "data" / "raw" / "psi"
HEADERS = {"User-Agent": "FlameAtlas/1.0 (NASA Space Apps; data ingest)"}


def fetch_search(client: httpx.Client, term: str = "combustion") -> list[dict]:
    """All combustion investigations with full metadata, in one call."""
    r = client.get(f"{BASE}/repo/search", params={
        "term": term, "source": "psi", "type": "investigation",
        "sort": "Public Release Date", "order": "desc",
    })
    r.raise_for_status()
    hits = r.json().get("hits", {}).get("hits", [])
    return [h.get("_source", {}) for h in hits]


def fetch_detail(client: httpx.Client, psi_id: str) -> dict:
    """Full single-investigation record (richer than the search hit; lists files)."""
    r = client.get(f"{BASE}/repo/investigations/{psi_id}")
    r.raise_for_status()
    return r.json()


def download_table(client: httpx.Client, psi_id: str, file_name: str, out_dir: Path) -> bool:
    """Download one experiment-table CSV (follows the 302 to signed S3)."""
    r = client.get(f"{BASE}/studies/{psi_id}/download",
                   params={"file": file_name, "version": "1"}, follow_redirects=True)
    if r.status_code != 200 or not r.content:
        print(f"  {psi_id}: table download failed ({r.status_code})")
        return False
    (out_dir / "experimental_table.csv").write_bytes(r.content)
    print(f"  {psi_id}: saved {file_name} ({len(r.content)} bytes)")
    return True


def scrape_one(client: httpx.Client, psi_id: str) -> None:
    out = RAW / psi_id
    out.mkdir(parents=True, exist_ok=True)
    detail = fetch_detail(client, psi_id)
    (out / "investigation.json").write_text(json.dumps(detail, indent=2, ensure_ascii=False))

    tables = detail.get("experimentalTable") or []
    names = [t.get("file_name") for t in tables if isinstance(t, dict) and t.get("file_name")]
    print(f"{psi_id}: {detail.get('investigationAcronym') or detail.get('accession')} "
          f"- {len(names)} experiment table(s)")
    for fn in names:
        download_table(client, psi_id, fn, out)


def main(ids: list[str]) -> None:
    RAW.mkdir(parents=True, exist_ok=True)
    with httpx.Client(headers=HEADERS, timeout=60.0) as client:
        # Always snapshot the full search result (covers Layer A metadata for every investigation).
        search = fetch_search(client)
        (RAW / "_search.json").write_text(json.dumps(search, indent=2, ensure_ascii=False))
        print(f"search: {len(search)} combustion investigations -> data/raw/psi/_search.json")

        for psi_id in ids:
            try:
                scrape_one(client, psi_id)
            except Exception as e:  # keep going; report at the end
                print(f"{psi_id}: FAILED {e}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--ids", nargs="+")
    g.add_argument("--all", action="store_true")
    a = ap.parse_args()
    main(list(INVESTIGATIONS) if a.all else a.ids)
