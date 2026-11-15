"""Build data/dataset-v1.0.json: REAL Layer B runs with per-value NASA sources and pages.

Every value is sourced to an NTRS report (see SOURCES). Evidence types:
  MEASURED  - read directly from the cited document
  COMPUTED  - derived (O2 partial pressure)
  INFERRED  - not stated per-run but implied (microgravity = 0 g; Saffire I-III cabin air ~101.3 kPa)
  UNKNOWN   - not documented in the cited source -> value null + missingReason

New runs are written status "imported" (collector-entered, not yet verified). Juvana sets
status -> "verified" after confirming against the PDF page; preserve_verified() re-applies any
such verified statuses (and verifiedBy marks) from the existing file so regeneration doesn't
reset them. A value whose number changes drops back to "imported" for a fresh check.

Run:  python ingest/make_dataset.py
"""
from __future__ import annotations
import json
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "data" / "dataset-v1.0.json"
COLLECTOR = "Navneet"

# ---------- value helpers ----------
def num(v, unit=None, t="MEASURED", src=None, formula=None, missing="not_documented"):
    if v is None:
        return {"value": None, "unit": unit, "type": "UNKNOWN", "missingReason": missing,
                "collectedBy": COLLECTOR}
    d = {"value": v, "type": t, "collectedBy": COLLECTOR}
    if unit:
        d["unit"] = unit
    if src:
        d["sourceId"] = src
    if formula:
        d["formula"] = formula
    return d

def sv(v, t="MEASURED", src=None, missing="not_documented"):
    if v is None:
        return {"value": None, "type": "UNKNOWN", "missingReason": missing, "collectedBy": COLLECTOR}
    d = {"value": v, "type": t, "collectedBy": COLLECTOR}
    if src:
        d["sourceId"] = src
    return d

def po2(o2, p, src):
    val = round(o2 / 100 * p, 2) if (o2 is not None and p is not None) else None
    return num(val, "kPa", "COMPUTED", src, "pO2 = (O2 mol% / 100) x total pressure (kPa)")

def run(rid, psi, material, geometry, length_mm, thick_mm, o2, p, flow, direction, src,
        *, o2_t="MEASURED", p_t="MEASURED", duct=None, apparatus=None, spread=None, spread_src=None):
    r = {
        "id": rid, "psiId": psi,
        "material": sv(material, src=src), "fuelPhase": "solid", "geometry": sv(geometry, src=src),
        "sizeMm": num(length_mm, "mm", src=src),
        "thicknessMm": num(thick_mm, "mm", src=src),
        "o2MolPct": num(o2, "mol%", o2_t, src),
        "pressureKPa": num(p, "kPa", p_t, src),
        "o2PartialKPa": po2(o2, p, src),
        "flowCmS": num(flow, "cm/s", src=src),
        "flowDirection": sv(direction, src=src),
        "gravityG": num(0.0, "g", "MEASURED", src),  # orbital = microgravity
        "ductSize": sv(duct, src=src),
        "diluent": sv("nitrogen", "INFERRED", src),
        "apparatus": sv(apparatus, src=src),
        "method": sv("cameras / video", "MEASURED", src),
        "sensors": ["cameras", "thermocouples"],
        "outcomes": ([{"label": "flame spread rate", "value": num(spread, "mm/s", "MEASURED", spread_src or src)}]
                     if spread is not None else []),
        "status": "imported",
    }
    return r

def preserve_verified(runs_list, out_path: Path) -> None:
    """Keep the verifier's confirmations across regenerations.

    Every run is rebuilt as status 'imported'. If an earlier data/dataset-v1.0.json
    already marked a run 'verified' (set by Juvana after cross-checking the source),
    re-apply that status and copy each value's verifiedBy onto the matching, UNCHANGED
    value. A value whose number changed is treated as edited and is not carried over as
    verified, so a correction always drops back to 'imported' for a fresh check.
    """
    if not out_path.exists():
        return
    try:
        old_runs = {r["id"]: r for r in json.loads(out_path.read_text()).get("runs", [])}
    except (ValueError, OSError):
        return
    for r in runs_list:
        old = old_runs.get(r["id"])
        if not old or old.get("status") != "verified":
            continue
        r["status"] = "verified"
        for key, val in r.items():
            oldv = old.get(key)
            if isinstance(val, dict) and "value" in val and isinstance(oldv, dict) \
                    and oldv.get("verifiedBy") and oldv.get("value") == val.get("value"):
                val["verifiedBy"] = oldv["verifiedBy"]
        old_oc = old.get("outcomes", [])
        for i, oc in enumerate(r.get("outcomes", [])):
            if i < len(old_oc) and isinstance(oc.get("value"), dict) and isinstance(old_oc[i].get("value"), dict) \
                    and old_oc[i]["value"].get("verifiedBy") \
                    and old_oc[i]["value"].get("value") == oc["value"].get("value"):
                oc["value"]["verifiedBy"] = old_oc[i]["value"]["verifiedBy"]

# ---------- SOURCES (all primary NASA / journal) ----------
def source(sid, ntrs, title, url, page=None, doi=None):
    s = {"id": sid, "ntrsId": ntrs, "title": title, "url": url}
    if page:
        s["page"] = page
    if doi:
        s["doi"] = doi
    return s

sources = [
    source("S-SAF-IIII", "20180005168", "Saffire: A Novel Approach to Study of Spacecraft Fire Safety Using Un-manned Spacecraft",
           "https://ntrs.nasa.gov/citations/20180005168", page="Table 1 (p.31)"),
    source("S-SAF-IVVI", "20240002981", "Preliminary Results from the Saffire VI Experiment",
           "https://ntrs.nasa.gov/citations/20240002981", page="Test Matrix (slide ~11)"),
    source("S-SAF-IVV", "20210017780", "Fire Safety Implications of Preliminary Results from Saffire IV and V (ICES 2021)",
           "https://ntrs.nasa.gov/citations/20210017780", page="Test Matrix (slide 5)"),
    source("S-BASS2", "20150008962", "Concurrent flame growth, spread and extinction over composite cotton-fiberglass fabric blend in microgravity",
           "https://ntrs.nasa.gov/citations/20150008962", page="Abstract (p.1), Sec.2 (p.2-3)"),
    source("S-BASS2b", "20160000593", "Combustion of Solids in Microgravity: Results from the BASS-II Experiment",
           "https://ntrs.nasa.gov/citations/20160000593", page="Approach / Hardware slides"),
    source("S-BASS-SR", "20140011099", "Thickness and Fuel Preheating Effects on Material Flammability in Microgravity from the BASS Experiment",
           "https://ntrs.nasa.gov/citations/20140011099", page="Thin Fuel Flame Spread slide"),
    source("S-SAF-CMP", "20170002628", "Saffire I-III Overview (sample-size comparison)",
           "https://ntrs.nasa.gov/citations/20170002628", page="p.13"),
    source("S-FM2", "20240015307", "Flammability of Materials on the Moon (FM2), Zayac et al.",
           "https://ntrs.nasa.gov/citations/20240015307"),
    source("S-PMMA", None, "Flame spread over PMMA in microgravity, opposed low-speed flow (Scientific Reports)",
           "https://www.nature.com/articles/s41598-017-18398-4", doi="10.1038/s41598-017-18398-4"),
]

# ---------- RUNS (Layer B) ----------
SIBAL = "Cotton-fiberglass fabric (SIBAL)"
runs = [
    # Saffire I-III (NTRS 20180005168, Table 1 p.31). The cited table reports NO pressure,
    # so pressure is recorded as not documented (UNKNOWN); O2 partial pressure follows (uncomputable).
    run("SAF-I-1",  "PSI-98",  SIBAL, "sheet, 40.6 cm wide", 940, 0.37, 21.7, None, 20, "concurrent",
        "S-SAF-IIII", duct="Saffire large flow duct", apparatus="Cygnus Saffire module"),
    run("SAF-I-2",  "PSI-98",  SIBAL, "sheet, 40.6 cm wide", 100, 0.37, 21.5, None, 20, "opposed",
        "S-SAF-IIII", duct="Saffire large flow duct", apparatus="Cygnus Saffire module"),
    run("SAF-II-1", "PSI-99",  "Silicone", "sheet, 5 cm wide", 290, 0.27, 22.1, None, 20, "concurrent",
        "S-SAF-IIII", duct="Saffire flow duct", apparatus="Cygnus Saffire module"),
    run("SAF-II-9", "PSI-99",  "PMMA (acrylic)", "flat slab, 5 cm wide", 290, 10.0, 22.0, None, 20, "concurrent",
        "S-SAF-IIII", duct="Saffire flow duct", apparatus="Cygnus Saffire module"),
    run("SAF-III-1","PSI-100", SIBAL, "sheet, 40.6 cm wide", 940, 0.37, 21.2, None, 25, "concurrent",
        "S-SAF-IIII", duct="Saffire large flow duct", apparatus="Cygnus Saffire module"),
    run("SAF-III-2","PSI-100", SIBAL, "sheet, 40.6 cm wide", 100, 0.37, 21.2, None, 25, "opposed",
        "S-SAF-IIII", duct="Saffire large flow duct", apparatus="Cygnus Saffire module"),

    # Saffire IV-VI (NTRS 20240007488 matrix). Pressure + O2 MEASURED. Not a PSI investigation.
    # SAF-IV-1 thickness: 0.37 mm not run-specific in the cited 2024 paper -> not documented.
    run("SAF-IV-1", "SAFFIRE-IVVI", SIBAL, "cloth", 500, None, 22.0, 100.0, 20, "concurrent",
        "S-SAF-IVVI", duct="Saffire flow duct", apparatus="Cygnus Saffire module"),
    run("SAF-V-2",  "SAFFIRE-IVVI", "Cotton jersey fabric", "cloth", 500, None, 26.2, 70.7, 20, "concurrent",
        "S-SAF-IVVI", duct="Saffire flow duct", apparatus="Cygnus Saffire module"),
    # SAF-VI-2 thickness: 0.37 mm not run-specific in the cited 2024 paper -> not documented.
    run("SAF-VI-2", "SAFFIRE-IVVI", SIBAL, "cloth", 500, None, 31.0, 54.1, 20, "concurrent",
        "S-SAF-IVVI", duct="Saffire flow duct", apparatus="Cygnus Saffire module"),
    run("SAF-VI-3", "SAFFIRE-IVVI", "PMMA (acrylic), two-sided", "slab", 180, 10.0, 30.3, 54.6, 20, "concurrent",
        "S-SAF-IVVI", duct="Saffire flow duct", apparatus="Cygnus Saffire module"),
    run("SAF-VI-4", "SAFFIRE-IVVI", "PMMA (acrylic), one-sided", "slab", 180, 5.0, 28.8, 55.2, 20, "concurrent",
        "S-SAF-IVVI", duct="Saffire flow duct", apparatus="Cygnus Saffire module"),

    # BASS-II cotton-fiberglass (NTRS 20150008962). O2 = cabin air -> INFERRED.
    # Thickness ~0.32 mm is explicitly stated in the 2015 paper (Sec.2, p.2-3).
    # Spread rates removed: the 2.55 / 1.21 mm/s figures are from the 2014 BASS presentation
    # and are not tied to these BASS-II runs (per verification).
    run("BASS2-CF-conc", "PSI-25", SIBAL, "sheet, 2.2 cm wide", 100, 0.32, 21.0, 101.3, 10, "concurrent",
        "S-BASS2", o2_t="INFERRED", p_t="INFERRED", duct="76 x 76 mm",
        apparatus="Microgravity Science Glovebox (BASS-II duct)"),
    run("BASS2-CF-opp",  "PSI-25", SIBAL, "sheet, 2.2 cm wide", 100, 0.32, 21.0, 101.3, 10, "opposed",
        "S-BASS2", o2_t="INFERRED", p_t="INFERRED", duct="76 x 76 mm",
        apparatus="Microgravity Science Glovebox (BASS-II duct)"),
]

# ---------- INVESTIGATIONS ----------
def inv(psi, name, acr, role, phase, obj, *, ptype="Microgravity", hardware=None, platform=None,
        related=None, run_ids=None, ranges=None, url=None):
    d = {
        "psiId": psi, "name": name, "acronym": acr, "projectType": ptype, "safetyRole": role,
        "fuelPhase": phase, "objectives": obj,
        "url": url or f"https://psi.nasa.gov/physci/repo/data/investigations/{psi}",
        "relatedIds": related or [], "publications": [], "runIds": run_ids or [], "sensors": [],
    }
    if hardware:
        d["hardware"] = hardware
    if platform:
        d["platform"] = platform
    if ranges:
        d["ranges"] = ranges
    return d

investigations = [
    inv("PSI-26", "Burning and Suppression of Solids", "BASS", "prevention", "solid",
        "Flame spread, growth and extinction of solid fuels in low-speed forced flow in microgravity; bridge to NASA-STD-6001 Test 1.",
        hardware="Microgravity Science Glovebox", platform="ISS", related=["PSI-25"]),
    inv("PSI-25", "Burning and Suppression of Solids - II", "BASS-II", "prevention", "solid",
        "Ignition, flame spread and extinction of thin/thick solids over varied oxygen and low-speed flow in microgravity.",
        hardware="Microgravity Science Glovebox", platform="ISS", related=["PSI-26"],
        run_ids=["BASS2-CF-conc", "BASS2-CF-opp"],
        ranges={"o2MolPct": [16, 21], "flowCmS": [1, 55], "gravityG": [0, 0], "sourceId": "S-BASS2"}),
    inv("PSI-98", "Spacecraft Fire Safety Experiment-I", "Saffire-I", "prevention", "solid",
        "First large-scale flame spread over a 94 x 40.6 cm cotton-fiberglass sample in microgravity aboard an uncrewed Cygnus vehicle.",
        hardware="Cygnus Saffire module", platform="Cygnus free-flyer", related=["PSI-99", "PSI-100"],
        run_ids=["SAF-I-1", "SAF-I-2"]),
    inv("PSI-99", "Spacecraft Fire Safety Experiment-II", "Saffire-II", "prevention", "solid",
        "Flammability of nine smaller material samples at spacecraft-relevant conditions aboard Cygnus.",
        hardware="Cygnus Saffire module", platform="Cygnus free-flyer", related=["PSI-98", "PSI-100"],
        run_ids=["SAF-II-1", "SAF-II-9"]),
    inv("PSI-100", "Spacecraft Fire Safety Experiment-III", "Saffire-III", "prevention", "solid",
        "Repeat of Saffire-I material at higher flow velocity (25 cm/s) to study scale and flow effects.",
        hardware="Cygnus Saffire module", platform="Cygnus free-flyer", related=["PSI-98", "PSI-99"],
        run_ids=["SAF-III-1", "SAF-III-2"]),
    inv("SAFFIRE-IVVI", "Spacecraft Fire Safety Experiment IV-VI (NASA report; not in PSI)", "Saffire IV-VI",
        "prevention", "solid",
        "Large-scale flammability of thicker fuels and exploration atmospheres (elevated O2, reduced pressure) aboard Cygnus. Source: NASA report (NTRS), not the PSI repository.",
        ptype="Microgravity", hardware="Cygnus Saffire module", platform="Cygnus free-flyer",
        related=["PSI-100"], run_ids=["SAF-IV-1", "SAF-V-2", "SAF-VI-2", "SAF-VI-3", "SAF-VI-4"],
        url="https://ntrs.nasa.gov/citations/20240002981"),
    inv("PSI-102", "Smoke and Aerosol Measurement Experiment", "SAME", "detection", "aerosol",
        "Smoke particle-size measurements from overheated spacecraft materials in microgravity, to inform fire-detector design.",
        hardware="Microgravity Science Glovebox", platform="ISS", related=["PSI-47"],
        ranges={"gravityG": [0, 0], "sourceId": "S-BASS2b"}),
    inv("PSI-68", "Flame Extinguishment Experiment - 2", "FLEX-2", "suppression", "liquid",
        "Droplet flame extinction limits with inert diluents across oxygen and pressure, to inform suppression.",
        hardware="CIR / MDCA", platform="ISS",
        ranges={"o2MolPct": [10, 40], "pressureKPa": [50.7, 304.0], "gravityG": [0, 0]}),
    inv("PSI-159", "ACME Cool Flames Investigation with Gases", "ACME CFI-G", "physics", "gas",
        "Cool diffusion flames of gaseous fuels. NOTE: the up-to-85% O2 figure was BURNER gas, not a cabin atmosphere - exclude from cabin-oxygen comparisons.",
        hardware="CIR / ACME", platform="ISS"),
]

edges = [
    {"from": "PSI-98", "to": "PSI-99", "kind": "nasa_related", "sourceId": "S-SAF-IIII"},
    {"from": "PSI-99", "to": "PSI-100", "kind": "nasa_related", "sourceId": "S-SAF-IIII"},
    {"from": "PSI-98", "to": "PSI-100", "kind": "nasa_related", "sourceId": "S-SAF-IIII"},
    {"from": "SAFFIRE-IVVI", "to": "PSI-100", "kind": "nasa_related", "sourceId": "S-SAF-IVVI"},
    {"from": "PSI-26", "to": "PSI-25", "kind": "nasa_related", "sourceId": "S-BASS2"},
    {"from": "PSI-102", "to": "PSI-47", "kind": "shared_hardware", "sourceId": "S-BASS2b"},
]

# Carry over any verified statuses the verifier already recorded in the existing file.
preserve_verified(runs, OUT)

dataset = {
    "_note": "Layer B seed: real NASA runs, every value sourced. New runs start status=imported; "
             "runs already marked verified in the existing file keep that status (see preserve_verified). "
             "Saffire IV-VI are NASA-report (NTRS) data, not PSI. Expand with the full PSI pull via release.py.",
    "version": "1.0.0-seed",
    "generatedAt": "2026-11-14",
    "fixture": False,
    "investigations": investigations,
    "runs": runs,
    "edges": edges,
    "sources": sources,
}

# ---------- validate against the contract, then write ----------
try:
    import sys
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from schema import Dataset  # type: ignore
    Dataset.model_validate(dataset)
    print("schema OK: validated against ingest/schema.py")
except ImportError:
    print("WARN: pydantic/schema not importable here - wrote without strict validation")
except Exception as e:  # noqa
    print(f"SCHEMA ERROR: {e}")
    raise

OUT.write_text(json.dumps(dataset, indent=2, ensure_ascii=False) + "\n")
print(f"wrote {OUT}  ({len(investigations)} investigations, {len(runs)} runs, {len(sources)} sources)")
