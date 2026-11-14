"""Scrape PSI investigation pages.

PSI is a JavaScript app, so this script opens each page in a headless browser and saves:
  data/raw/psi/<PSI-ID>/page.txt        rendered page text (description, metadata, publications)
  data/raw/psi/<PSI-ID>/network/*.json  every JSON response the page loaded

Step 1 is discovery: run it on PSI-26 and open network/. The investigation record and the
experimental table (BASS: 123 rows) are almost certainly in one of those JSON files. Once you
know the endpoint, write a direct httpx fetcher (fast, no browser) and parse into ingest/schema.py.

Usage:
  python scrape_psi.py --ids PSI-26
  python scrape_psi.py --all
"""
from __future__ import annotations

import argparse
import asyncio
import json
import re
from pathlib import Path

from playwright.async_api import async_playwright

from psi_ids import INVESTIGATIONS, PAGE_URL

RAW = Path(__file__).resolve().parent.parent / "data" / "raw" / "psi"


async def scrape_one(browser, psi_id: str) -> dict:
    out = RAW / psi_id
    (out / "network").mkdir(parents=True, exist_ok=True)
    page = await browser.new_page()
    captured: list[dict] = []

    async def on_response(resp):
        ctype = resp.headers.get("content-type", "")
        if "json" not in ctype:
            return
        try:
            body = await resp.json()
        except Exception:
            return
        idx = len(captured)
        name = re.sub(r"[^A-Za-z0-9]+", "_", resp.url.split("?")[0])[-80:]
        path = out / "network" / f"{idx:03d}_{name}.json"
        path.write_text(json.dumps({"url": resp.url, "status": resp.status, "body": body}, indent=2))
        captured.append({"url": resp.url, "file": path.name})

    page.on("response", on_response)
    await page.goto(PAGE_URL.format(psi_id=psi_id), wait_until="networkidle", timeout=90_000)
    await page.wait_for_timeout(2_000)
    text = await page.inner_text("body")
    (out / "page.txt").write_text(text)
    await page.close()

    summary = {"psiId": psi_id, "chars": len(text), "jsonResponses": captured}
    (out / "summary.json").write_text(json.dumps(summary, indent=2))
    return summary


async def main(ids: list[str]) -> None:
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        for psi_id in ids:
            try:
                s = await scrape_one(browser, psi_id)
                print(f"{psi_id}: {s['chars']} chars, {len(s['jsonResponses'])} JSON responses")
            except Exception as e:  # keep going; report at the end
                print(f"{psi_id}: FAILED {e}")
        await browser.close()


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--ids", nargs="+")
    g.add_argument("--all", action="store_true")
    a = ap.parse_args()
    asyncio.run(main(list(INVESTIGATIONS) if a.all else a.ids))
