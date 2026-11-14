"""Extract text and tables from NASA PDFs (NTRS reports, PSI documents) with page numbers.

Output: data/staging/docs/<doc-id>.json = {"docId", "title", "url", "pages": [{"page", "text", "tables"}]}
Page numbers are 1-based PDF pages; record the printed page too if it differs.

Usage: python parse_docs.py path/to/report.pdf --doc-id NTRS-20180005168 --url https://ntrs.nasa.gov/... --title "..."
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import fitz  # PyMuPDF
import pdfplumber

OUT = Path(__file__).resolve().parent.parent / "data" / "staging" / "docs"


def parse(pdf_path: Path, doc_id: str, url: str, title: str) -> Path:
    pages = []
    with fitz.open(pdf_path) as doc, pdfplumber.open(pdf_path) as plumb:
        for i, page in enumerate(doc):
            tables = []
            try:
                tables = plumb.pages[i].extract_tables() or []
            except Exception:
                pass
            pages.append({"page": i + 1, "text": page.get_text("text"), "tables": tables})
    OUT.mkdir(parents=True, exist_ok=True)
    out = OUT / f"{doc_id}.json"
    out.write_text(json.dumps({"docId": doc_id, "title": title, "url": url, "pages": pages}, indent=2))
    return out


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf", type=Path)
    ap.add_argument("--doc-id", required=True)
    ap.add_argument("--url", required=True)
    ap.add_argument("--title", required=True)
    a = ap.parse_args()
    print(parse(a.pdf, a.doc_id, a.url, a.title))
