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

# Documented operating ranges for run-less, demo-critical cards, so the ranking
# engine can place them instead of showing "cannot assess applicability".
# Values come from each investigation's PSI Approach text (sourceId "PSI").
RANGES = {
    "PSI-68": {"o2MolPct": [10.0, 40.0], "pressureKPa": [50.7, 304.0], "gravityG": [0.0, 0.0]},   # FLEX-2: O2 0.1-0.4, 0.5-3 atm
    "PSI-69": {"pressureKPa": [50.7, 304.0], "gravityG": [0.0, 0.0]},                              # FLEX: droplet series, 0.5-3 atm
    "PSI-39": {"pressureKPa": [25.3, 506.6], "gravityG": [0.0, 0.0]},                              # CFI: 0.25-5 atm
    "PSI-102": {"o2MolPct": [21.0, 21.0], "pressureKPa": [101.3, 101.3], "gravityG": [0.0, 0.0]},  # SAME: cabin air
    "PSI-101": {"o2MolPct": [21.0, 21.0], "pressureKPa": [101.3, 101.3], "gravityG": [0.0, 0.0]},  # SAME-R: cabin air
    "PSI-47": {"pressureKPa": [101.3, 101.3], "gravityG": [0.0, 0.0]},                             # DAFT: cabin, aerosol sensor
    "PSI-159": {"gravityG": [0.0, 0.0]},  # CFI-G: documented 85% O2 is BURNER gas, not cabin -> no O2 range (honest)
}


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


# Readable names for detail-built cards whose PSI projectTitle is blank.
NAME_OVERRIDES = {
    "PSI-47": "Dust and Aerosol Measurement Feasibility Test",
}


def build_from_detail(psi: str, d: dict) -> dict:
    """Build a card from a per-investigation investigation.json (detail format).

    Used for investigations PSI search doesn't return (e.g. PSI-47 / DAFT), whose
    only source is data/raw/psi/<id>/investigation.json. Field names differ from
    the _search format, so they are mapped explicitly here.
    """
    role_phase = INVESTIGATIONS.get(psi)
    role = role_phase[1] if role_phase else "physics"
    phase = role_phase[2] if role_phase else None
    acr = (d.get("investigationAcronym") or "").strip() or (psi or "")
    name = (d.get("projectTitle") or "").strip() or NAME_OVERRIDES.get(psi) or acr
    inv = {
        "psiId": psi,
        "name": name,
        "acronym": acr,
        "projectType": project_type(d.get("projectType")),
        "safetyRole": role,
        "objectives": (d.get("objective") or "").strip() or "(not documented)",
        "url": PSI_URL.format(psi),
        "relatedIds": [],          # detail record carries no PSI "Related Investigations"
        "publications": [],
        "runIds": [],
        "sensors": [],
    }
    if phase:
        inv["fuelPhase"] = phase
    hw = hardware_name(d.get("experimentHardware"))
    if hw:
        inv["hardware"] = hw
    if (d.get("flightProgram") or "").strip():
        inv["platform"] = d["flightProgram"].strip()
    if (d.get("approach") or "").strip():
        inv["approach"] = d["approach"].strip()
    if (d.get("investigationStartDate") or "").strip():
        inv["startDate"] = d["investigationStartDate"].strip()
    if (d.get("investigationEndDate") or "").strip():
        inv["endDate"] = d["investigationEndDate"].strip()
    return inv


def main() -> None:
    search = json.loads((RAW / "_search.json").read_text())
    curated = json.loads((ROOT / "data" / "dataset-v1.0.json").read_text())

    # Layer A: one card per curated PSI investigation (the 24 ids in psi_ids.py).
    # Filtering to that roster drops non-combustion search hits (PSI-108 surface-tension
    # fluid physics, PSI-181 lead-tin solders) and pulls in PSI-47 (DAFT), which PSI's
    # search endpoint does not return, from its per-investigation detail file.
    search_by_id = {r["Accession"]: r for r in search if r.get("Accession")}
    investigations = []
    for psi in INVESTIGATIONS:
        rec = search_by_id.get(psi)
        if rec:
            investigations.append(build_investigation(rec))
            continue
        detail_path = RAW / psi / "investigation.json"
        if detail_path.exists():
            investigations.append(build_from_detail(psi, json.loads(detail_path.read_text())))
        else:
            print(f"WARN: {psi} not in search and has no investigation.json - skipped")
    have = {i["psiId"] for i in investigations}

    # Attach documented operating ranges to run-less, demo-critical cards.
    for inv in investigations:
        rng = RANGES.get(inv["psiId"])
        if rng:
            inv["ranges"] = {**rng, "sourceId": "PSI"}

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

    # Edges from "Related Investigations" - both endpoints must be cards we actually have,
    # so excluded investigations (PSI-108/181) never leave a dangling edge.
    seen, edges = set(), []
    for rec in search:
        a = rec.get("Accession")
        if a not in have:
            continue
        for b in split_ids(rec.get("Related Investigations")):
            if b in have and a != b:
                key = tuple(sorted((a, b)))
                if key not in seen:
                    seen.add(key)
                    edges.append({"from": a, "to": b, "kind": "nasa_related", "sourceId": "PSI"})
    for ce in curated.get("edges", []):  # keep curated edges, filtered to existing cards
        if ce["from"] not in have or ce["to"] not in have:
            continue
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
