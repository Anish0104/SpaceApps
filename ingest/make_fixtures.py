"""Generate data/fixtures.json: FAKE values for UI and test development only.

Shapes match the real dataset contract (packages/engine/src/schema.ts, ingest/schema.py),
but every run value is invented. Never cite fixtures. Run: python ingest/make_fixtures.py
"""
import json
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "data" / "fixtures.json"
FIX = "FIXTURE"


def num(v, unit=None, t="MEASURED", formula=None):
    if v is None:
        return {"value": None, "unit": unit, "type": "UNKNOWN", "missingReason": "not_documented"}
    d = {"value": v, "unit": unit, "type": t, "sourceId": FIX}
    if formula:
        d["formula"] = formula
    return d


def s(v, t="MEASURED"):
    if v is None:
        return {"value": None, "type": "UNKNOWN", "missingReason": "not_documented"}
    return {"value": v, "type": t, "sourceId": FIX}


def run(rid, psi, material, geometry, phase, o2, p, flow, g=0.0, size=20.0, thick=0.3,
        direction="concurrent", duct="76 x 76 mm", apparatus="MSG flow duct", method="video",
        outcomes=None, status="imported"):
    po2 = round(o2 / 100 * p, 2) if (o2 is not None and p is not None) else None
    return {
        "id": rid, "psiId": psi,
        "material": s(material), "fuelPhase": phase, "geometry": s(geometry),
        "sizeMm": num(size, "mm"), "thicknessMm": num(thick, "mm"),
        "o2MolPct": num(o2, "mol%"), "pressureKPa": num(p, "kPa"),
        "o2PartialKPa": num(po2, "kPa", "COMPUTED", "pO2 = (O2 mol% / 100) x total pressure (kPa)"),
        "flowCmS": num(flow, "cm/s"), "flowDirection": s(direction),
        "gravityG": num(g, "g"), "ductSize": s(duct), "diluent": s("N2"),
        "apparatus": s(apparatus), "method": s(method),
        "sensors": ["video"],
        "outcomes": outcomes or [{"label": "spread rate", "value": num(1.0, "mm/s")}],
        "status": status,
    }


def inv(psi, name, acronym, role, phase, objectives, ptype="Microgravity", hardware=None,
        related=None, runs=None, ranges=None):
    return {
        "psiId": psi, "name": name, "acronym": acronym, "projectType": ptype,
        "safetyRole": role, "fuelPhase": phase, **({"hardware": hardware} if hardware else {}),
        "objectives": objectives,
        "url": f"https://psi.nasa.gov/physci/repo/data/investigations/{psi}",
        "relatedIds": related or [], "publications": [], "runIds": runs or [],
        **({"ranges": {**ranges, "sourceId": FIX}} if ranges else {}),
        "sensors": [],
    }


runs = [
    # Referee test set: 1 vs 2 -> geometry target, material also differs -> CANNOT_ISOLATE
    run("FIX-BASS-1", "PSI-26", "SIBAL", "sheet", "solid", 21, 101.3, 10, status="verified"),
    run("FIX-BASS-2", "PSI-26", "PMMA", "sphere", "solid", 21, 101.3, 10),
    # 1 vs 3 -> flow undocumented -> CANT_CONFIRM
    run("FIX-BASS-3", "PSI-26", "SIBAL", "sheet", "solid", 21, 101.3, None),
    # 1 vs 4 -> only flow differs -> CAN_ISOLATE
    run("FIX-BASS-4", "PSI-26", "SIBAL", "sheet", "solid", 21, 101.3, 20),
    run("FIX-BASS2-1", "PSI-25", "SIBAL", "sheet", "solid", 17, 101.3, 5),
    run("FIX-SAFF1-1", "PSI-98", "SIBAL", "sheet", "solid", 21, 101.3, 20, size=940,
        duct="large flow duct", apparatus="Cygnus Saffire module"),
]

investigations = [
    inv("PSI-26", "Burning and Suppression of Solids", "BASS", "prevention", "solid",
        "Bridge NASA-STD-6001 Test 1 and flammability in microgravity; assess an inert gaseous extinguishing agent.",
        hardware="Microgravity Science Glovebox", related=["PSI-107", "PSI-25"],
        runs=["FIX-BASS-1", "FIX-BASS-2", "FIX-BASS-3", "FIX-BASS-4"]),
    inv("PSI-25", "Burning and Suppression of Solids - II", "BASS-II", "prevention", "solid",
        "Ignition, flame spread and extinction of solids in low-speed flow.",
        hardware="Microgravity Science Glovebox", related=["PSI-26"], runs=["FIX-BASS2-1"]),
    inv("PSI-98", "Spacecraft Fire Safety Experiment-I", "Saffire-I", "prevention", "solid",
        "How rapidly a large-scale fire grows in low gravity; low-g flammability limits.",
        hardware="Cygnus vehicle", related=["PSI-99", "PSI-100", "PSI-26"], runs=["FIX-SAFF1-1"]),
    inv("PSI-68", "Flame Extinguishment Experiment - 2", "FLEX-2", "suppression", "liquid",
        "Extend FLEX-1 to fuels and conditions that mimic real combustors.",
        hardware="CIR / MDCA", ranges={"o2MolPct": [10, 40], "pressureKPa": [50.7, 304.0], "gravityG": [0, 0]}),
    inv("PSI-159", "ACME Cool Flames Investigation with Gases", "ACME CFI-G", "physics", "gas",
        "Conditions for cool diffusion flames of propane, n-butane and n-pentane. NOTE: up to 85% O2 was burner gas, not cabin atmosphere.",
        hardware="CIR / ACME"),
    inv("PSI-102", "Smoke and Aerosol Measurement Experiment", "SAME", "detection", "aerosol",
        "Quantify smoke particle sizes in low gravity for detector design.",
        hardware="Microgravity Science Glovebox", related=["PSI-101"], ranges={"gravityG": [0, 0]}),
    inv("PSI-47", "Dust and Aerosol Measurement Feasibility Test", "DAFT", "detection", "aerosol",
        "Risk reduction for SAME instrumentation (smoke vs dust).", related=["PSI-102"]),
    inv("PSI-62", "Concurrent Flame Spread Modeling vs BASS", "PSI-62", "prevention", "solid",
        "Flamelet-generated-manifold model validated against BASS / BASS-II imagery.",
        ptype="Ground", related=["PSI-25", "PSI-26"]),
]

edges = [
    {"from": "PSI-26", "to": "PSI-25", "kind": "nasa_related", "sourceId": FIX},
    {"from": "PSI-26", "to": "PSI-107", "kind": "nasa_related", "sourceId": FIX},
    {"from": "PSI-62", "to": "PSI-26", "kind": "reuses_data", "sourceId": FIX},
    {"from": "PSI-62", "to": "PSI-25", "kind": "reuses_data", "sourceId": FIX},
    {"from": "PSI-102", "to": "PSI-101", "kind": "nasa_related", "sourceId": FIX},
    {"from": "PSI-47", "to": "PSI-102", "kind": "nasa_related", "sourceId": FIX},
]

dataset = {
    "_note": "FAKE values for UI and test development only. Never cite. Real data comes from ingest/release.py.",
    "version": "fixture-0.1",
    "generatedAt": "2026-11-13",
    "fixture": True,
    "investigations": investigations,
    "runs": runs,
    "edges": edges,
    "sources": [{"id": FIX, "title": "FIXTURE (fake data)", "url": "about:blank"}],
}

OUT.write_text(json.dumps(dataset, indent=2) + "\n")
print(f"wrote {OUT} ({len(investigations)} investigations, {len(runs)} runs)")
