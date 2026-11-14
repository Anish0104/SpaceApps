"""release.py - assemble the full dataset from scraped raw data + curated runs.

Reads:
  data/raw/psi/_search.json                  all investigation metadata (from scrape_psi.py)
  data/dataset-v1.0.json                     curated, NTRS-verified Layer B runs + sources
  ingest/psi_ids.py                          safety role + fuel phase per investigation

Writes:
  data/dataset.json      full dataset: Layer A cards (every scraped investigation) + Layer B runs
  data/graph.json        relationship edges (from each record's "Related Investigations")
  data/modeling.csv      flat, modeling-ready run table (units, sources, nulls)
  data/coverage.json     counts for the Home screen

Validates the assembled dataset against ingest/schema.py before writing.
Run:  python ingest/release.py
"""
from __future__ import annotations
import csv
import json
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw" / "psi"
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from psi_ids import INVESTIGATIONS  # {psiId: (acronym, safetyRole, fuelPhase)}

VERSION = "1.1.0"
PSI_URL = "https://psi.nasa.gov/physci/repo/data/investigations/{}"


def project_type(raw: str | None) -> str:
    return "Ground" if (raw or "").lower().startswith("ground") else "Microgravity"


def split_ids(s: str | None) -> list[str]:
    return [tok for tok in (s or "").replace(",", " ").split() if tok.startswith("PSI-")]


def publications(titles: str | None, authors: str | None) -> list[dict]:
    t = [x.strip() for x in (titles or "").split("     ") if x.strip()]
    a = [x.strip() for x in (authors or "").split("     ") if x.strip()]
    out = []
    for i, title in enumerate(t[:15]):
        pub = {"title": title}
        if i < len(a):
            pub["authors"] = a[i]
        out.append(pub)
    return out


def hardware_name(hw) -> str | None:
    if isinstance(hw, dict):
        return (hw.get("Name") or "").strip() or None
    if isinstance(hw, str):
        return hw.strip() or None
    return None


def build_investigation(rec: dict) -> dict:
    psi = rec.get("Accession")
    role_phase = INVESTIGATIONS.get(psi)
    role = role_phase[1] if role_phase else "physics"           # schema requires a role
    phase = role_phase[2] if role_phase else None
    acr = (rec.get("Acronym") or "").strip() or (psi or "")
    inv = {
        "psiId": psi,
        "name": rec.get("Title") or psi,
        "acronym": acr,
        "projectType": project_type(rec.get("Project Type")),
        "safetyRole": role,
        "objectives": (rec.get("Objectives") or "").strip() or "(not documented)",
        "url": PSI_URL.format(psi),
        "relatedIds": split_ids(rec.get("Related Investigations")),
        "publications": publications(rec.get("Publication Title"), rec.get("Publication Author List")),
        "runIds": [],
        "sensors": [],
    }
    if phase:
        inv["fuelPhase"] = phase
    hw = hardware_name(rec.get("Experiment Hardware"))
    if hw:
        inv["hardware"] = hw
    if rec.get("Flight Platform"):
        inv["platform"] = rec["Flight Platform"]
    if (rec.get("Approach") or "").strip():
        inv["approach"] = rec["Approach"].strip()
    if (rec.get("Research Impacts/Earth Benefits") or "").strip():
        inv["earthBenefits"] = rec["Research Impacts/Earth Benefits"].strip()
    if rec.get("Investigation Start Date"):
        inv["startDate"] = rec["Investigation Start Date"]
    if rec.get("Investigation End Date"):
        inv["endDate"] = rec["Investigation End Date"]
    return inv


def main() -> None:
    search = json.loads((RAW / "_search.json").read_text())
    curated = json.loads((ROOT / "data" / "dataset-v1.0.json").read_text())

    # Layer A: one card per scraped investigation.
    investigations = [build_investigation(r) for r in search if r.get("Accession")]
    have = {i["psiId"] for i in investigations}

    # Keep curated investigations that aren't in PSI (e.g. Saffire IV-VI from NTRS reports).
    for ci in curated["investigations"]:
        if ci["psiId"] not in have:
            investigations.append(ci)
            have.add(ci["psiId"])

    runs = curated["runs"]
    sources = curated["sources"]

    # Attach curated runs to their investigation cards.
    by_psi: dict[str, list[str]] = {}
    for r in runs:
        by_psi.setdefault(r["psiId"], []).append(r["id"])
    for inv in investigations:
        if inv["psiId"] in by_psi:
            inv["runIds"] = by_psi[inv["psiId"]]

    # Edges from "Related Investigations" (only to investigations we actually have).
    seen, edges = set(), []
    for rec in search:
        a = rec.get("Accession")
        for b in split_ids(rec.get("Related Investigations")):
            if b in have and a != b:
                key = tuple(sorted((a, b)))
                if key not in seen:
                    seen.add(key)
                    edges.append({"from": a, "to": b, "kind": "nasa_related", "sourceId": "PSI"})
    for ce in curated.get("edges", []):  # keep curated edges (e.g. Saffire IV-VI -> III)
        key = tuple(sorted((ce["from"], ce["to"])))
        if key not in seen:
            seen.add(key)
            edges.append(ce)

    if not any(s["id"] == "PSI" for s in sources):
        sources.append({"id": "PSI", "title": "NASA Physical Sciences Informatics (PSI) repository",
                        "url": "https://psi.nasa.gov/"})

    dataset = {
        "version": VERSION,
        "generatedAt": date.today().isoformat(),
        "fixture": False,
        "investigations": investigations,
        "runs": runs,
        "edges": edges,
        "sources": sources,
    }

    # Validate against the contract.
    try:
        from schema import Dataset  # type: ignore
        Dataset.model_validate(dataset)
        print("schema OK: validated against ingest/schema.py")
    except ImportError:
        print("WARN: pydantic/schema not importable - wrote without strict validation")

    out = ROOT / "data"
    (out / "dataset.json").write_text(json.dumps(dataset, indent=2, ensure_ascii=False) + "\n")
    (out / "graph.json").write_text(json.dumps({"edges": edges}, indent=2) + "\n")

    # modeling-ready flat CSV
    cols = ["runId", "psiId", "material", "fuelPhase", "o2MolPct", "pressureKPa",
            "o2PartialKPa", "flowCmS", "flowDirection", "gravityG", "sizeMm", "thicknessMm",
            "spreadRate_mmps", "sourceId", "status"]
    with (out / "modeling.csv").open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(cols)
        for r in runs:
            def val(k):
                v = r.get(k, {})
                return v.get("value") if isinstance(v, dict) else v
            spread = next((o["value"].get("value") for o in r.get("outcomes", [])
                           if "spread" in o["label"].lower()), None)
            w.writerow([r["id"], r["psiId"], val("material"), r.get("fuelPhase"),
                        val("o2MolPct"), val("pressureKPa"), val("o2PartialKPa"), val("flowCmS"),
                        val("flowDirection"), val("gravityG"), val("sizeMm"), val("thicknessMm"),
                        spread, r["o2MolPct"].get("sourceId"), r["status"]])

    # coverage counters for the Home screen
    tables = sum(1 for d in RAW.iterdir() if d.is_dir() and (d / "experimental_table.csv").exists()) if RAW.exists() else 0
    coverage = {
        "investigationsIndexed": len(investigations),
        "runsImported": len(runs),
        "runsVerified": sum(1 for r in runs if r["status"] == "verified"),
        "relationshipsMapped": len(edges),
        "investigationsWithTables": tables,
        "dataVersion": VERSION,
    }
    (out / "coverage.json").write_text(json.dumps(coverage, indent=2) + "\n")

    print(f"dataset.json: {len(investigations)} investigations, {len(runs)} runs, "
          f"{len(edges)} edges, {len(sources)} sources")
    print(f"coverage: {coverage}")


if __name__ == "__main__":
    main()
