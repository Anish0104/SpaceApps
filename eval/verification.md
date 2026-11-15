# Verification record: data/dataset.json 1.1.0

This file has two parts: the first check (2026-11-14) as it was made, then the collector's corrections and the checklist for re-verifying the 10 flagged runs.

Checked on 2026-11-14 by Juvana against the cited NASA sources. Values were collected by Navneet; the collector never verifies.
**3 of 13 runs confirmed, 10 flagged.** 15 individual values are not supported by their cited source.

What this changed in the data:

- Confirmed runs (SAF-V-2, SAF-VI-3, SAF-VI-4) are `status: "verified"`, with `verifiedBy: "Juvana"` on every value that was checked. `collectedBy` is unchanged.
- Flagged runs stay `status: "imported"`. No value was edited: corrections belong to the collector.
- The COMPUTED O2 partial pressure was not checked against a source and carries no `verifiedBy`. Its arithmetic is shown in the note column.
- `data/dataset-v1.0.json` (the curated runs `ingest/release.py` reads), `data/coverage.json` and `data/modeling.csv` carry the same statuses.
- `ingest/make_dataset.py` now keeps a verified status when it regenerates the file, and drops a run back to `imported` if one of its values changes.

How to read the marks: `[x]` supported by the cited source (possibly approximate or inferred, as noted); `[ ]` contradicted, not
tied to this run, or wrongly recorded as unknown; `skipped` is the computed field.

Qualifiers that apply to every run:

- A nominal `0.0 g` is a microgravity label, not literally zero gravitational acceleration.
- Nitrogen is the principal diluent of cabin air, not a claim of a pure O2/N2 mixture.
- Oxygen fractions are initial measurements; several runs report a lower value at the end of the burn.
- Page numbers are physical PDF pages unless stated.

## Summary

| Run | Investigation | Decision | Verified by | Reason |
|---|---|---|---|---|
| SAF-I-1 | PSI-98 | **flagged** |  | Unsubstantiated 101.3 kPa pressure; later source gives I-1 as 102 kPa. |
| SAF-I-2 | PSI-98 | **flagged** |  | Unsubstantiated 101.3 kPa pressure; length is only ~10 cm. |
| SAF-II-1 | PSI-99 | **flagged** |  | Unsubstantiated 101.3 kPa pressure; table reports no pressure. |
| SAF-II-9 | PSI-99 | **flagged** |  | Unsubstantiated 101.3 kPa pressure; table reports no pressure. |
| SAF-III-1 | PSI-100 | **flagged** |  | Unsubstantiated 101.3 kPa pressure; later source gives III-1 as 99 kPa. |
| SAF-III-2 | PSI-100 | **flagged** |  | Unsubstantiated 101.3 kPa pressure; length is only ~10 cm. |
| SAF-IV-1 | SAFFIRE-IVVI | **flagged** |  | 0.37 mm thickness lacks run-specific support in cited paper. |
| SAF-V-2 | SAFFIRE-IVVI | confirmed | Juvana | No unsupported applicable fields identified in cited report. |
| SAF-VI-2 | SAFFIRE-IVVI | **flagged** |  | 0.37 mm thickness lacks run-specific support in cited paper. |
| SAF-VI-3 | SAFFIRE-IVVI | confirmed | Juvana | No unsupported applicable fields identified in cited report. |
| SAF-VI-4 | SAFFIRE-IVVI | confirmed | Juvana | No unsupported applicable fields identified in cited report. |
| BASS2-CF-conc | PSI-25 | **flagged** |  | Source explicitly gives ~0.32 mm thickness; 2.55 mm/s belongs to BASS material and is not tied to a BASS-II run. |
| BASS2-CF-opp | PSI-25 | **flagged** |  | Source explicitly gives ~0.32 mm thickness; opposed flow/1.21 mm/s is not tied to a BASS-II run. |

## What the collector needs to fix before the flagged runs can be verified

1. **Saffire I-III pressure (6 runs).** 101.3 kPa is not in the cited table. A later paper reports 102 kPa for I-1 and 99 kPa for III-1. Source run-specific pressures, or record pressure as unknown, then recompute the O2 partial pressures.
2. **SIBAL thickness on SAF-IV-1 and SAF-VI-2.** 0.37 mm is not given for these runs in the cited 2024 paper. Source it or mark it not documented.
3. **The two BASS-II runs.** The cited paper gives the thickness (about 0.32 mm) that the dataset records as not documented. The 2.55 and 1.21 mm/s spread rates come from a BASS presentation and are not tied to a BASS-II run; the paper's appendix classes the 21% O2, 10 cm/s case as BASS; and the paper analyses concurrent tests, not an opposed BASS-II run.
4. **Sample length on SAF-I-2 and SAF-III-2.** The table says approximately 10 cm, not an exact 100 mm.

Flagged runs must not be promoted to verified without these changes and a fresh check.

## Sources used for the check

- Saffire I-III, Table 1 (slide 30): https://ntrs.nasa.gov/api/citations/20180005168/downloads/20180005168.pdf#page=30
- Saffire IV-VI, Table 1 (PDF p. 3) and PMMA thickness (PDF p. 4): https://ntrs.nasa.gov/api/citations/20240002981/downloads/Saffire-ICES-2024-ICES-365-accepted%20final.pdf#page=3
- BASS / BASS-II 2015 paper, sections 2-3 and appendix: https://ntrs.nasa.gov/api/citations/20150008962/downloads/20150008962.pdf#page=3
- BASS 2014 presentation, PDF p. 20 (2.55 and 1.21 mm/s): https://ntrs.nasa.gov/api/citations/20140011099/downloads/20140011099.pdf#page=20
- Not in the dataset's sources, used to test the pressure inference: independent Saffire I / III flight pressures (Table 1, manuscript p. 8): https://dirros.openscience.si/Dokument.php?id=23986&lang=slv

## SAF-I-1 (PSI-98): flagged

Status in dataset: `imported`. Checked against: https://ntrs.nasa.gov/api/citations/20180005168/downloads/20180005168.pdf#page=30

| OK | Field | Value in dataset | Type | Collected by | Source id | Page | Note |
|---|---|---|---|---|---|---|---|
| [x] | Material | Cotton-fiberglass fabric (SIBAL) | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) |  |
| [x] | Geometry | sheet, 40.6 cm wide | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) |  |
| [x] | Size | 940 mm | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) |  |
| [x] | Thickness | 0.37 mm | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) |  |
| [x] | Oxygen | 21.7 mol% | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | Table reports starting 21.7%, ending 21.5%. |
| [ ] | Pressure | 101.3 kPa | INFERRED | Navneet | S-SAF-IIII | Table 1 (p.31) | 101.3 kPa not stated in cited table; independent later research gives 102 kPa for I-1. |
| skipped | O2 partial pressure | 21.98 kPa | COMPUTED | Navneet | S-SAF-IIII | Table 1 (p.31) | COMPUTED — skipped by request |
| [x] | Flow speed | 20 cm/s | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) |  |
| [x] | Flow direction | concurrent | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) |  |
| [x] | Gravity | 0.0 g | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) |  |
| [x] | Duct size | Saffire large flow duct | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) |  |
| [x] | Diluent | nitrogen | INFERRED | Navneet | S-SAF-IIII | Table 1 (p.31) | Inferred, not read off the page |
| [x] | Apparatus | Cygnus Saffire module | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) |  |
| [x] | Method | cameras / video | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) |  |

- Decision: flagged
- Reason: Unsubstantiated 101.3 kPa pressure; later source gives I-1 as 102 kPa.
- Checked on: 2026-11-14

## SAF-I-2 (PSI-98): flagged

Status in dataset: `imported`. Checked against: https://ntrs.nasa.gov/api/citations/20180005168/downloads/20180005168.pdf#page=30

| OK | Field | Value in dataset | Type | Collected by | Source id | Page | Note |
|---|---|---|---|---|---|---|---|
| [x] | Material | Cotton-fiberglass fabric (SIBAL) | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) |  |
| [x] | Geometry | sheet, 40.6 cm wide | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) |  |
| [x] | Size | 100 mm | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | Table says approximately 10 cm, not an exact 100 mm. |
| [x] | Thickness | 0.37 mm | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) |  |
| [x] | Oxygen | 21.5 mol% | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) |  |
| [ ] | Pressure | 101.3 kPa | INFERRED | Navneet | S-SAF-IIII | Table 1 (p.31) | 101.3 kPa not established for this run. |
| skipped | O2 partial pressure | 21.78 kPa | COMPUTED | Navneet | S-SAF-IIII | Table 1 (p.31) | COMPUTED — skipped by request |
| [x] | Flow speed | 20 cm/s | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) |  |
| [x] | Flow direction | opposed | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) |  |
| [x] | Gravity | 0.0 g | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) |  |
| [x] | Duct size | Saffire large flow duct | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) |  |
| [x] | Diluent | nitrogen | INFERRED | Navneet | S-SAF-IIII | Table 1 (p.31) | Inferred, not read off the page |
| [x] | Apparatus | Cygnus Saffire module | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) |  |
| [x] | Method | cameras / video | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) |  |

- Decision: flagged
- Reason: Unsubstantiated 101.3 kPa pressure; length is only ~10 cm.
- Checked on: 2026-11-14

## SAF-II-1 (PSI-99): flagged

Status in dataset: `imported`. Checked against: https://ntrs.nasa.gov/api/citations/20180005168/downloads/20180005168.pdf#page=30

| OK | Field | Value in dataset | Type | Collected by | Source id | Page | Note |
|---|---|---|---|---|---|---|---|
| [x] | Material | Silicone | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) |  |
| [x] | Geometry | sheet, 5 cm wide | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) |  |
| [x] | Size | 290 mm | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) |  |
| [x] | Thickness | 0.27 mm | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) |  |
| [x] | Oxygen | 22.1 mol% | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | Table says approximately 22.1%. |
| [ ] | Pressure | 101.3 kPa | INFERRED | Navneet | S-SAF-IIII | Table 1 (p.31) | 101.3 kPa not established; later Saffire II values around 103 kPa cannot automatically be assigned to this sample. |
| skipped | O2 partial pressure | 22.39 kPa | COMPUTED | Navneet | S-SAF-IIII | Table 1 (p.31) | COMPUTED — skipped by request |
| [x] | Flow speed | 20 cm/s | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) |  |
| [x] | Flow direction | concurrent | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) |  |
| [x] | Gravity | 0.0 g | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) |  |
| [x] | Duct size | Saffire flow duct | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) |  |
| [x] | Diluent | nitrogen | INFERRED | Navneet | S-SAF-IIII | Table 1 (p.31) | Inferred, not read off the page |
| [x] | Apparatus | Cygnus Saffire module | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) |  |
| [x] | Method | cameras / video | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) |  |

- Decision: flagged
- Reason: Unsubstantiated 101.3 kPa pressure; table reports no pressure.
- Checked on: 2026-11-14

## SAF-II-9 (PSI-99): flagged

Status in dataset: `imported`. Checked against: https://ntrs.nasa.gov/api/citations/20180005168/downloads/20180005168.pdf#page=30

| OK | Field | Value in dataset | Type | Collected by | Source id | Page | Note |
|---|---|---|---|---|---|---|---|
| [x] | Material | PMMA (acrylic) | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) |  |
| [x] | Geometry | flat slab, 5 cm wide | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) |  |
| [x] | Size | 290 mm | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) |  |
| [x] | Thickness | 10.0 mm | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) |  |
| [x] | Oxygen | 22.0 mol% | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | Table reports 22.0% initially, 21.9% finally. |
| [ ] | Pressure | 101.3 kPa | INFERRED | Navneet | S-SAF-IIII | Table 1 (p.31) | 101.3 kPa not established for this sample. |
| skipped | O2 partial pressure | 22.29 kPa | COMPUTED | Navneet | S-SAF-IIII | Table 1 (p.31) | COMPUTED — skipped by request |
| [x] | Flow speed | 20 cm/s | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) |  |
| [x] | Flow direction | concurrent | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) |  |
| [x] | Gravity | 0.0 g | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) |  |
| [x] | Duct size | Saffire flow duct | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) |  |
| [x] | Diluent | nitrogen | INFERRED | Navneet | S-SAF-IIII | Table 1 (p.31) | Inferred, not read off the page |
| [x] | Apparatus | Cygnus Saffire module | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) |  |
| [x] | Method | cameras / video | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) |  |

- Decision: flagged
- Reason: Unsubstantiated 101.3 kPa pressure; table reports no pressure.
- Checked on: 2026-11-14

## SAF-III-1 (PSI-100): flagged

Status in dataset: `imported`. Checked against: https://ntrs.nasa.gov/api/citations/20180005168/downloads/20180005168.pdf#page=30

| OK | Field | Value in dataset | Type | Collected by | Source id | Page | Note |
|---|---|---|---|---|---|---|---|
| [x] | Material | Cotton-fiberglass fabric (SIBAL) | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) |  |
| [x] | Geometry | sheet, 40.6 cm wide | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) |  |
| [x] | Size | 940 mm | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) |  |
| [x] | Thickness | 0.37 mm | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) |  |
| [x] | Oxygen | 21.2 mol% | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | 21.2% initial, 21.0% final. |
| [ ] | Pressure | 101.3 kPa | INFERRED | Navneet | S-SAF-IIII | Table 1 (p.31) | 101.3 kPa not established; later research reports 99 kPa for III-1. |
| skipped | O2 partial pressure | 21.48 kPa | COMPUTED | Navneet | S-SAF-IIII | Table 1 (p.31) | COMPUTED — skipped by request |
| [x] | Flow speed | 25 cm/s | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) |  |
| [x] | Flow direction | concurrent | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) |  |
| [x] | Gravity | 0.0 g | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) |  |
| [x] | Duct size | Saffire large flow duct | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) |  |
| [x] | Diluent | nitrogen | INFERRED | Navneet | S-SAF-IIII | Table 1 (p.31) | Inferred, not read off the page |
| [x] | Apparatus | Cygnus Saffire module | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) |  |
| [x] | Method | cameras / video | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) |  |

- Decision: flagged
- Reason: Unsubstantiated 101.3 kPa pressure; later source gives III-1 as 99 kPa.
- Checked on: 2026-11-14

## SAF-III-2 (PSI-100): flagged

Status in dataset: `imported`. Checked against: https://ntrs.nasa.gov/api/citations/20180005168/downloads/20180005168.pdf#page=30

| OK | Field | Value in dataset | Type | Collected by | Source id | Page | Note |
|---|---|---|---|---|---|---|---|
| [x] | Material | Cotton-fiberglass fabric (SIBAL) | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) |  |
| [x] | Geometry | sheet, 40.6 cm wide | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) |  |
| [x] | Size | 100 mm | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | Table says approximately 10 cm, not an exact 100 mm. |
| [x] | Thickness | 0.37 mm | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) |  |
| [x] | Oxygen | 21.2 mol% | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | 21.2% initial, 21.0% final. |
| [ ] | Pressure | 101.3 kPa | INFERRED | Navneet | S-SAF-IIII | Table 1 (p.31) | 101.3 kPa not established. |
| skipped | O2 partial pressure | 21.48 kPa | COMPUTED | Navneet | S-SAF-IIII | Table 1 (p.31) | COMPUTED — skipped by request |
| [x] | Flow speed | 25 cm/s | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) |  |
| [x] | Flow direction | opposed | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) |  |
| [x] | Gravity | 0.0 g | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) |  |
| [x] | Duct size | Saffire large flow duct | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) |  |
| [x] | Diluent | nitrogen | INFERRED | Navneet | S-SAF-IIII | Table 1 (p.31) | Inferred, not read off the page |
| [x] | Apparatus | Cygnus Saffire module | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) |  |
| [x] | Method | cameras / video | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) |  |

- Decision: flagged
- Reason: Unsubstantiated 101.3 kPa pressure; length is only ~10 cm.
- Checked on: 2026-11-14

## SAF-IV-1 (SAFFIRE-IVVI): flagged

Status in dataset: `imported`. Checked against: https://ntrs.nasa.gov/api/citations/20240002981/downloads/Saffire-ICES-2024-ICES-365-accepted%20final.pdf#page=3

| OK | Field | Value in dataset | Type | Collected by | Source id | Page | Note |
|---|---|---|---|---|---|---|---|
| [x] | Material | Cotton-fiberglass fabric (SIBAL) | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) |  |
| [x] | Geometry | cloth | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) |  |
| [x] | Size | 500 mm | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) |  |
| [ ] | Thickness | 0.37 mm | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | 0.37 mm not specified for this run in cited 2024 paper; material composition/areal density alone is insufficient. |
| [x] | Oxygen | 22.0 mol% | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) |  |
| [x] | Pressure | 100.0 kPa | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) |  |
| skipped | O2 partial pressure | 22.0 kPa | COMPUTED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | COMPUTED — skipped by request |
| [x] | Flow speed | 20 cm/s | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) |  |
| [x] | Flow direction | concurrent | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) |  |
| [x] | Gravity | 0.0 g | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) |  |
| [x] | Duct size | Saffire flow duct | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) |  |
| [x] | Diluent | nitrogen | INFERRED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | Inferred, not read off the page |
| [x] | Apparatus | Cygnus Saffire module | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) |  |
| [x] | Method | cameras / video | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) |  |

- Decision: flagged
- Reason: 0.37 mm thickness lacks run-specific support in cited paper.
- Checked on: 2026-11-14

## SAF-V-2 (SAFFIRE-IVVI): confirmed

Status in dataset: `verified`. Checked against: https://ntrs.nasa.gov/api/citations/20240002981/downloads/Saffire-ICES-2024-ICES-365-accepted%20final.pdf#page=3

| OK | Field | Value in dataset | Type | Collected by | Source id | Page | Note |
|---|---|---|---|---|---|---|---|
| [x] | Material | Cotton jersey fabric | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) |  |
| [x] | Geometry | cloth | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) |  |
| [x] | Size | 500 mm | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) |  |
| [x] | Thickness | not documented (not_documented) | UNKNOWN | Navneet | none | no page recorded | Not documented in cited source; acceptable as UNKNOWN. |
| [x] | Oxygen | 26.2 mol% | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) |  |
| [x] | Pressure | 70.7 kPa | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) |  |
| skipped | O2 partial pressure | 18.52 kPa | COMPUTED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | COMPUTED — skipped by request |
| [x] | Flow speed | 20 cm/s | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) |  |
| [x] | Flow direction | concurrent | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) |  |
| [x] | Gravity | 0.0 g | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) |  |
| [x] | Duct size | Saffire flow duct | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) |  |
| [x] | Diluent | nitrogen | INFERRED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | Inferred, not read off the page |
| [x] | Apparatus | Cygnus Saffire module | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) |  |
| [x] | Method | cameras / video | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) |  |

- Decision: confirmed
- Reason: No unsupported applicable fields identified in cited report.
- Checked on: 2026-11-14

## SAF-VI-2 (SAFFIRE-IVVI): flagged

Status in dataset: `imported`. Checked against: https://ntrs.nasa.gov/api/citations/20240002981/downloads/Saffire-ICES-2024-ICES-365-accepted%20final.pdf#page=3

| OK | Field | Value in dataset | Type | Collected by | Source id | Page | Note |
|---|---|---|---|---|---|---|---|
| [x] | Material | Cotton-fiberglass fabric (SIBAL) | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) |  |
| [x] | Geometry | cloth | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) |  |
| [x] | Size | 500 mm | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) |  |
| [ ] | Thickness | 0.37 mm | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | 0.37 mm not specified for this run in cited 2024 paper; material composition/areal density alone is insufficient. |
| [x] | Oxygen | 31.0 mol% | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) |  |
| [x] | Pressure | 54.1 kPa | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) |  |
| skipped | O2 partial pressure | 16.77 kPa | COMPUTED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | COMPUTED — skipped by request |
| [x] | Flow speed | 20 cm/s | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) |  |
| [x] | Flow direction | concurrent | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) |  |
| [x] | Gravity | 0.0 g | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) |  |
| [x] | Duct size | Saffire flow duct | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) |  |
| [x] | Diluent | nitrogen | INFERRED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | Inferred, not read off the page |
| [x] | Apparatus | Cygnus Saffire module | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) |  |
| [x] | Method | cameras / video | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) |  |

- Decision: flagged
- Reason: 0.37 mm thickness lacks run-specific support in cited paper.
- Checked on: 2026-11-14

## SAF-VI-3 (SAFFIRE-IVVI): confirmed

Status in dataset: `verified`. Checked against: https://ntrs.nasa.gov/api/citations/20240002981/downloads/Saffire-ICES-2024-ICES-365-accepted%20final.pdf#page=3

| OK | Field | Value in dataset | Type | Collected by | Source id | Page | Note |
|---|---|---|---|---|---|---|---|
| [x] | Material | PMMA (acrylic), two-sided | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) |  |
| [x] | Geometry | slab | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) |  |
| [x] | Size | 180 mm | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) |  |
| [x] | Thickness | 10.0 mm | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | 10 mm corroborated by the 2024 paper text. |
| [x] | Oxygen | 30.3 mol% | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) |  |
| [x] | Pressure | 54.6 kPa | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) |  |
| skipped | O2 partial pressure | 16.54 kPa | COMPUTED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | COMPUTED — skipped by request |
| [x] | Flow speed | 20 cm/s | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) |  |
| [x] | Flow direction | concurrent | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) |  |
| [x] | Gravity | 0.0 g | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) |  |
| [x] | Duct size | Saffire flow duct | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) |  |
| [x] | Diluent | nitrogen | INFERRED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | Inferred, not read off the page |
| [x] | Apparatus | Cygnus Saffire module | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) |  |
| [x] | Method | cameras / video | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) |  |

- Decision: confirmed
- Reason: No unsupported applicable fields identified in cited report.
- Checked on: 2026-11-14

## SAF-VI-4 (SAFFIRE-IVVI): confirmed

Status in dataset: `verified`. Checked against: https://ntrs.nasa.gov/api/citations/20240002981/downloads/Saffire-ICES-2024-ICES-365-accepted%20final.pdf#page=3

| OK | Field | Value in dataset | Type | Collected by | Source id | Page | Note |
|---|---|---|---|---|---|---|---|
| [x] | Material | PMMA (acrylic), one-sided | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) |  |
| [x] | Geometry | slab | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) |  |
| [x] | Size | 180 mm | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) |  |
| [x] | Thickness | 5.0 mm | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | 5 mm corroborated by the 2024 paper text. |
| [x] | Oxygen | 28.8 mol% | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) |  |
| [x] | Pressure | 55.2 kPa | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) |  |
| skipped | O2 partial pressure | 15.9 kPa | COMPUTED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | COMPUTED — skipped by request |
| [x] | Flow speed | 20 cm/s | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) |  |
| [x] | Flow direction | concurrent | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) |  |
| [x] | Gravity | 0.0 g | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) |  |
| [x] | Duct size | Saffire flow duct | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) |  |
| [x] | Diluent | nitrogen | INFERRED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | Inferred, not read off the page |
| [x] | Apparatus | Cygnus Saffire module | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) |  |
| [x] | Method | cameras / video | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) |  |

- Decision: confirmed
- Reason: No unsupported applicable fields identified in cited report.
- Checked on: 2026-11-14

## BASS2-CF-conc (PSI-25): flagged

Status in dataset: `imported`. Checked against: https://ntrs.nasa.gov/api/citations/20150008962/downloads/20150008962.pdf#page=3

| OK | Field | Value in dataset | Type | Collected by | Source id | Page | Note |
|---|---|---|---|---|---|---|---|
| [x] | Material | Cotton-fiberglass fabric (SIBAL) | MEASURED | Navneet | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) |  |
| [x] | Geometry | sheet, 2.2 cm wide | MEASURED | Navneet | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) |  |
| [x] | Size | 100 mm | MEASURED | Navneet | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) |  |
| [ ] | Thickness | not documented (not_documented) | UNKNOWN | Navneet | none | no page recorded | Paper explicitly specifies ~0.32 mm; dataset incorrectly says not documented. |
| [x] | Oxygen | 21.0 mol% | INFERRED | Navneet | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | Paper has a 10 cm/s, 21% example but its appendix classifies 21% 10 cm/s as BASS, not BASS-II; missing run-level attribution. |
| [x] | Pressure | 101.3 kPa | INFERRED | Navneet | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | Inferred, not read off the page |
| skipped | O2 partial pressure | 21.27 kPa | COMPUTED | Navneet | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | COMPUTED — skipped by request |
| [ ] | Flow speed | 10 cm/s | MEASURED | Navneet | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | 10 cm/s is demonstrated in study but not established for this named BASS-II record. |
| [x] | Flow direction | concurrent | MEASURED | Navneet | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) |  |
| [x] | Gravity | 0.0 g | MEASURED | Navneet | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) |  |
| [x] | Duct size | 76 x 76 mm | MEASURED | Navneet | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) |  |
| [x] | Diluent | nitrogen | INFERRED | Navneet | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | Inferred, not read off the page |
| [x] | Apparatus | Microgravity Science Glovebox (BASS-II duct) | MEASURED | Navneet | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) |  |
| [x] | Method | cameras / video | MEASURED | Navneet | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) |  |
| [ ] | Outcome: flame spread rate | 2.55 mm/s | MEASURED | Navneet | S-BASS-SR | Thin Fuel Flame Spread slide | 2.55 mm/s printed in older BASS presentation, not linked to specific BASS-II run. |

- Decision: flagged
- Reason: Source explicitly gives ~0.32 mm thickness; 2.55 mm/s belongs to BASS material and is not tied to a BASS-II run.
- Checked on: 2026-11-14

## BASS2-CF-opp (PSI-25): flagged

Status in dataset: `imported`. Checked against: https://ntrs.nasa.gov/api/citations/20150008962/downloads/20150008962.pdf#page=3

| OK | Field | Value in dataset | Type | Collected by | Source id | Page | Note |
|---|---|---|---|---|---|---|---|
| [x] | Material | Cotton-fiberglass fabric (SIBAL) | MEASURED | Navneet | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) |  |
| [x] | Geometry | sheet, 2.2 cm wide | MEASURED | Navneet | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) |  |
| [x] | Size | 100 mm | MEASURED | Navneet | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) |  |
| [ ] | Thickness | not documented (not_documented) | UNKNOWN | Navneet | none | no page recorded | Paper explicitly specifies ~0.32 mm; dataset incorrectly says not documented. |
| [x] | Oxygen | 21.0 mol% | INFERRED | Navneet | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | 21% at 10 cm/s not established for an opposed BASS-II run. |
| [x] | Pressure | 101.3 kPa | INFERRED | Navneet | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | Inferred, not read off the page |
| skipped | O2 partial pressure | 21.27 kPa | COMPUTED | Navneet | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | COMPUTED — skipped by request |
| [ ] | Flow speed | 10 cm/s | MEASURED | Navneet | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | 10 cm/s example in 2014 BASS presentation is not linked to a BASS-II run. |
| [ ] | Flow direction | opposed | MEASURED | Navneet | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | 2015 BASS-II paper analyzes concurrent tests, not the asserted opposed BASS-II run. |
| [x] | Gravity | 0.0 g | MEASURED | Navneet | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) |  |
| [x] | Duct size | 76 x 76 mm | MEASURED | Navneet | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) |  |
| [x] | Diluent | nitrogen | INFERRED | Navneet | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | Inferred, not read off the page |
| [x] | Apparatus | Microgravity Science Glovebox (BASS-II duct) | MEASURED | Navneet | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) |  |
| [x] | Method | cameras / video | MEASURED | Navneet | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) |  |
| [ ] | Outcome: flame spread rate | 1.21 mm/s | MEASURED | Navneet | S-BASS-SR | Thin Fuel Flame Spread slide | 1.21 mm/s is shown in BASS presentation, not linked to a specific BASS-II run. |

- Decision: flagged
- Reason: Source explicitly gives ~0.32 mm thickness; opposed flow/1.21 mm/s is not tied to a BASS-II run.
- Checked on: 2026-11-14

---

# After the check: the collector's corrections

Navneet corrected the flagged values (branch `navneet`, merged here). A changed value is a new value, so every flagged run
is still `imported` and needs a fresh check. The three verified runs were not touched and keep their status.

## What changed

| Run | Field | At the check | Now |
|---|---|---|---|
| SAF-I-1 | Pressure | 101.3 kPa | not documented (not_documented) (UNKNOWN) |
| SAF-I-1 | O2 partial pressure | 21.98 kPa | not documented (not_documented) (UNKNOWN) |
| SAF-I-2 | Pressure | 101.3 kPa | not documented (not_documented) (UNKNOWN) |
| SAF-I-2 | O2 partial pressure | 21.78 kPa | not documented (not_documented) (UNKNOWN) |
| SAF-II-1 | Pressure | 101.3 kPa | not documented (not_documented) (UNKNOWN) |
| SAF-II-1 | O2 partial pressure | 22.39 kPa | not documented (not_documented) (UNKNOWN) |
| SAF-II-9 | Pressure | 101.3 kPa | not documented (not_documented) (UNKNOWN) |
| SAF-II-9 | O2 partial pressure | 22.29 kPa | not documented (not_documented) (UNKNOWN) |
| SAF-III-1 | Pressure | 101.3 kPa | not documented (not_documented) (UNKNOWN) |
| SAF-III-1 | O2 partial pressure | 21.48 kPa | not documented (not_documented) (UNKNOWN) |
| SAF-III-2 | Pressure | 101.3 kPa | not documented (not_documented) (UNKNOWN) |
| SAF-III-2 | O2 partial pressure | 21.48 kPa | not documented (not_documented) (UNKNOWN) |
| SAF-IV-1 | Thickness | 0.37 mm | not documented (not_documented) (UNKNOWN) |
| SAF-VI-2 | Thickness | 0.37 mm | not documented (not_documented) (UNKNOWN) |
| BASS2-CF-conc | Thickness | not documented (not_documented) | 0.32 mm (MEASURED) |
| BASS2-CF-conc | Outcome: flame spread rate | 2.55 mm/s | removed |
| BASS2-CF-opp | Thickness | not documented (not_documented) | 0.32 mm (MEASURED) |
| BASS2-CF-opp | Outcome: flame spread rate | 1.21 mm/s | removed |

Still open from the first check, not changed by the corrections:

- **SAF-I-2 and SAF-III-2 sample length.** The table says approximately 10 cm; the dataset still records an exact 100 mm.
- **Both BASS-II runs.** Oxygen 21% and flow 10 cm/s were not tied to a named BASS-II run, and the cited paper analyses concurrent tests, so the opposed run (BASS2-CF-opp) still lacks a source for its flow direction.
- **Demo pair B** (SAF-I-1 vs SAF-III-1 on flow) now returns Can't confirm, because pressure is not documented on either run.

## Re-verification checklist (10 runs)

Same method as before. **Changed** marks the values the collector edited; check those first, then confirm the rest still holds.
Tick `[x]`, mark the decision, and only then is the run set to `verified`.

### SAF-I-1 (PSI-98)

| OK | Field | Value in dataset | Type | Source id | Page | Source URL | Note |
|---|---|---|---|---|---|---|---|
| [ ] | Material | Cotton-fiberglass fabric (SIBAL) | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Geometry | sheet, 40.6 cm wide | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Size | 940 mm | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Thickness | 0.37 mm | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Oxygen | 21.7 mol% | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Pressure | not documented (not_documented) | UNKNOWN | none | no page recorded | no URL | **Changed** |
| [ ] | O2 partial pressure | not documented (not_documented) | UNKNOWN | none | no page recorded | no URL | **Changed** Unknown because pressure is not documented |
| [ ] | Flow speed | 20 cm/s | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Flow direction | concurrent | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Gravity | 0.0 g | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Duct size | Saffire large flow duct | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Diluent | nitrogen | INFERRED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Apparatus | Cygnus Saffire module | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Method | cameras / video | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |

No outcome values are recorded for this run.

- Decision: [ ] confirmed  [ ] flagged
- Reason if flagged:
- Checked on:

### SAF-I-2 (PSI-98)

| OK | Field | Value in dataset | Type | Source id | Page | Source URL | Note |
|---|---|---|---|---|---|---|---|
| [ ] | Material | Cotton-fiberglass fabric (SIBAL) | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Geometry | sheet, 40.6 cm wide | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Size | 100 mm | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Thickness | 0.37 mm | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Oxygen | 21.5 mol% | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Pressure | not documented (not_documented) | UNKNOWN | none | no page recorded | no URL | **Changed** |
| [ ] | O2 partial pressure | not documented (not_documented) | UNKNOWN | none | no page recorded | no URL | **Changed** Unknown because pressure is not documented |
| [ ] | Flow speed | 20 cm/s | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Flow direction | opposed | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Gravity | 0.0 g | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Duct size | Saffire large flow duct | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Diluent | nitrogen | INFERRED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Apparatus | Cygnus Saffire module | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Method | cameras / video | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |

No outcome values are recorded for this run.

- Decision: [ ] confirmed  [ ] flagged
- Reason if flagged:
- Checked on:

### SAF-II-1 (PSI-99)

| OK | Field | Value in dataset | Type | Source id | Page | Source URL | Note |
|---|---|---|---|---|---|---|---|
| [ ] | Material | Silicone | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Geometry | sheet, 5 cm wide | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Size | 290 mm | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Thickness | 0.27 mm | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Oxygen | 22.1 mol% | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Pressure | not documented (not_documented) | UNKNOWN | none | no page recorded | no URL | **Changed** |
| [ ] | O2 partial pressure | not documented (not_documented) | UNKNOWN | none | no page recorded | no URL | **Changed** Unknown because pressure is not documented |
| [ ] | Flow speed | 20 cm/s | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Flow direction | concurrent | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Gravity | 0.0 g | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Duct size | Saffire flow duct | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Diluent | nitrogen | INFERRED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Apparatus | Cygnus Saffire module | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Method | cameras / video | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |

No outcome values are recorded for this run.

- Decision: [ ] confirmed  [ ] flagged
- Reason if flagged:
- Checked on:

### SAF-II-9 (PSI-99)

| OK | Field | Value in dataset | Type | Source id | Page | Source URL | Note |
|---|---|---|---|---|---|---|---|
| [ ] | Material | PMMA (acrylic) | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Geometry | flat slab, 5 cm wide | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Size | 290 mm | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Thickness | 10.0 mm | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Oxygen | 22.0 mol% | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Pressure | not documented (not_documented) | UNKNOWN | none | no page recorded | no URL | **Changed** |
| [ ] | O2 partial pressure | not documented (not_documented) | UNKNOWN | none | no page recorded | no URL | **Changed** Unknown because pressure is not documented |
| [ ] | Flow speed | 20 cm/s | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Flow direction | concurrent | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Gravity | 0.0 g | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Duct size | Saffire flow duct | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Diluent | nitrogen | INFERRED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Apparatus | Cygnus Saffire module | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Method | cameras / video | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |

No outcome values are recorded for this run.

- Decision: [ ] confirmed  [ ] flagged
- Reason if flagged:
- Checked on:

### SAF-III-1 (PSI-100)

| OK | Field | Value in dataset | Type | Source id | Page | Source URL | Note |
|---|---|---|---|---|---|---|---|
| [ ] | Material | Cotton-fiberglass fabric (SIBAL) | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Geometry | sheet, 40.6 cm wide | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Size | 940 mm | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Thickness | 0.37 mm | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Oxygen | 21.2 mol% | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Pressure | not documented (not_documented) | UNKNOWN | none | no page recorded | no URL | **Changed** |
| [ ] | O2 partial pressure | not documented (not_documented) | UNKNOWN | none | no page recorded | no URL | **Changed** Unknown because pressure is not documented |
| [ ] | Flow speed | 25 cm/s | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Flow direction | concurrent | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Gravity | 0.0 g | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Duct size | Saffire large flow duct | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Diluent | nitrogen | INFERRED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Apparatus | Cygnus Saffire module | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Method | cameras / video | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |

No outcome values are recorded for this run.

- Decision: [ ] confirmed  [ ] flagged
- Reason if flagged:
- Checked on:

### SAF-III-2 (PSI-100)

| OK | Field | Value in dataset | Type | Source id | Page | Source URL | Note |
|---|---|---|---|---|---|---|---|
| [ ] | Material | Cotton-fiberglass fabric (SIBAL) | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Geometry | sheet, 40.6 cm wide | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Size | 100 mm | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Thickness | 0.37 mm | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Oxygen | 21.2 mol% | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Pressure | not documented (not_documented) | UNKNOWN | none | no page recorded | no URL | **Changed** |
| [ ] | O2 partial pressure | not documented (not_documented) | UNKNOWN | none | no page recorded | no URL | **Changed** Unknown because pressure is not documented |
| [ ] | Flow speed | 25 cm/s | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Flow direction | opposed | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Gravity | 0.0 g | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Duct size | Saffire large flow duct | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Diluent | nitrogen | INFERRED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Apparatus | Cygnus Saffire module | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Method | cameras / video | MEASURED | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |

No outcome values are recorded for this run.

- Decision: [ ] confirmed  [ ] flagged
- Reason if flagged:
- Checked on:

### SAF-IV-1 (SAFFIRE-IVVI)

| OK | Field | Value in dataset | Type | Source id | Page | Source URL | Note |
|---|---|---|---|---|---|---|---|
| [ ] | Material | Cotton-fiberglass fabric (SIBAL) | MEASURED | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Geometry | cloth | MEASURED | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Size | 500 mm | MEASURED | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Thickness | not documented (not_documented) | UNKNOWN | none | no page recorded | no URL | **Changed** |
| [ ] | Oxygen | 22.0 mol% | MEASURED | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Pressure | 100.0 kPa | MEASURED | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | O2 partial pressure | 22.0 kPa | COMPUTED | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 | Computed: 22.0 / 100 x 100.0 = 22.00 kPa |
| [ ] | Flow speed | 20 cm/s | MEASURED | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Flow direction | concurrent | MEASURED | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Gravity | 0.0 g | MEASURED | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Duct size | Saffire flow duct | MEASURED | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Diluent | nitrogen | INFERRED | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Apparatus | Cygnus Saffire module | MEASURED | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Method | cameras / video | MEASURED | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |

No outcome values are recorded for this run.

- Decision: [ ] confirmed  [ ] flagged
- Reason if flagged:
- Checked on:

### SAF-VI-2 (SAFFIRE-IVVI)

| OK | Field | Value in dataset | Type | Source id | Page | Source URL | Note |
|---|---|---|---|---|---|---|---|
| [ ] | Material | Cotton-fiberglass fabric (SIBAL) | MEASURED | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Geometry | cloth | MEASURED | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Size | 500 mm | MEASURED | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Thickness | not documented (not_documented) | UNKNOWN | none | no page recorded | no URL | **Changed** |
| [ ] | Oxygen | 31.0 mol% | MEASURED | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Pressure | 54.1 kPa | MEASURED | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | O2 partial pressure | 16.77 kPa | COMPUTED | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 | Computed: 31.0 / 100 x 54.1 = 16.77 kPa |
| [ ] | Flow speed | 20 cm/s | MEASURED | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Flow direction | concurrent | MEASURED | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Gravity | 0.0 g | MEASURED | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Duct size | Saffire flow duct | MEASURED | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Diluent | nitrogen | INFERRED | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Apparatus | Cygnus Saffire module | MEASURED | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Method | cameras / video | MEASURED | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |

No outcome values are recorded for this run.

- Decision: [ ] confirmed  [ ] flagged
- Reason if flagged:
- Checked on:

### BASS2-CF-conc (PSI-25)

| OK | Field | Value in dataset | Type | Source id | Page | Source URL | Note |
|---|---|---|---|---|---|---|---|
| [ ] | Material | Cotton-fiberglass fabric (SIBAL) | MEASURED | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | https://ntrs.nasa.gov/citations/20150008962 |  |
| [ ] | Geometry | sheet, 2.2 cm wide | MEASURED | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | https://ntrs.nasa.gov/citations/20150008962 |  |
| [ ] | Size | 100 mm | MEASURED | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | https://ntrs.nasa.gov/citations/20150008962 |  |
| [ ] | Thickness | 0.32 mm | MEASURED | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | https://ntrs.nasa.gov/citations/20150008962 | **Changed** |
| [ ] | Oxygen | 21.0 mol% | INFERRED | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | https://ntrs.nasa.gov/citations/20150008962 |  |
| [ ] | Pressure | 101.3 kPa | INFERRED | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | https://ntrs.nasa.gov/citations/20150008962 |  |
| [ ] | O2 partial pressure | 21.27 kPa | COMPUTED | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | https://ntrs.nasa.gov/citations/20150008962 | Computed: 21.0 / 100 x 101.3 = 21.27 kPa |
| [ ] | Flow speed | 10 cm/s | MEASURED | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | https://ntrs.nasa.gov/citations/20150008962 |  |
| [ ] | Flow direction | concurrent | MEASURED | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | https://ntrs.nasa.gov/citations/20150008962 |  |
| [ ] | Gravity | 0.0 g | MEASURED | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | https://ntrs.nasa.gov/citations/20150008962 |  |
| [ ] | Duct size | 76 x 76 mm | MEASURED | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | https://ntrs.nasa.gov/citations/20150008962 |  |
| [ ] | Diluent | nitrogen | INFERRED | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | https://ntrs.nasa.gov/citations/20150008962 |  |
| [ ] | Apparatus | Microgravity Science Glovebox (BASS-II duct) | MEASURED | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | https://ntrs.nasa.gov/citations/20150008962 |  |
| [ ] | Method | cameras / video | MEASURED | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | https://ntrs.nasa.gov/citations/20150008962 |  |

No outcome values are recorded for this run.

- Decision: [ ] confirmed  [ ] flagged
- Reason if flagged:
- Checked on:

### BASS2-CF-opp (PSI-25)

| OK | Field | Value in dataset | Type | Source id | Page | Source URL | Note |
|---|---|---|---|---|---|---|---|
| [ ] | Material | Cotton-fiberglass fabric (SIBAL) | MEASURED | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | https://ntrs.nasa.gov/citations/20150008962 |  |
| [ ] | Geometry | sheet, 2.2 cm wide | MEASURED | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | https://ntrs.nasa.gov/citations/20150008962 |  |
| [ ] | Size | 100 mm | MEASURED | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | https://ntrs.nasa.gov/citations/20150008962 |  |
| [ ] | Thickness | 0.32 mm | MEASURED | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | https://ntrs.nasa.gov/citations/20150008962 | **Changed** |
| [ ] | Oxygen | 21.0 mol% | INFERRED | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | https://ntrs.nasa.gov/citations/20150008962 |  |
| [ ] | Pressure | 101.3 kPa | INFERRED | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | https://ntrs.nasa.gov/citations/20150008962 |  |
| [ ] | O2 partial pressure | 21.27 kPa | COMPUTED | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | https://ntrs.nasa.gov/citations/20150008962 | Computed: 21.0 / 100 x 101.3 = 21.27 kPa |
| [ ] | Flow speed | 10 cm/s | MEASURED | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | https://ntrs.nasa.gov/citations/20150008962 |  |
| [ ] | Flow direction | opposed | MEASURED | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | https://ntrs.nasa.gov/citations/20150008962 |  |
| [ ] | Gravity | 0.0 g | MEASURED | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | https://ntrs.nasa.gov/citations/20150008962 |  |
| [ ] | Duct size | 76 x 76 mm | MEASURED | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | https://ntrs.nasa.gov/citations/20150008962 |  |
| [ ] | Diluent | nitrogen | INFERRED | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | https://ntrs.nasa.gov/citations/20150008962 |  |
| [ ] | Apparatus | Microgravity Science Glovebox (BASS-II duct) | MEASURED | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | https://ntrs.nasa.gov/citations/20150008962 |  |
| [ ] | Method | cameras / video | MEASURED | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | https://ntrs.nasa.gov/citations/20150008962 |  |

No outcome values are recorded for this run.

- Decision: [ ] confirmed  [ ] flagged
- Reason if flagged:
- Checked on:

---

# Independent NASA source audit (2026-11-14, Juvana)

A second pass that re-opened the primary NASA PDFs (not AI summaries) and checked every curated run
against the cited page. The three previously verified runs were rechecked for regressions; the ten
flagged runs and the collector's corrections were checked against the source.

**Rule followed:** this audit records what the sources support. It does not promote any run to
`verified` on its own — a status change is a human sign-off the collector and verifier make. Where the
audit confirms a value, that is recorded as a finding, not a status change.

## Documents read

| Source id | NTRS | Used for | Key location |
|---|---|---|---|
| S-SAF-IIII | 20180005168 | Saffire I-III run conditions | Table 1, PDF p.30-31 |
| S-SAF-IVVI | 20240002981 | Saffire IV-VI run conditions | Table 1, PDF p.2 |
| S-BASS2 | 20150008962 | BASS-II fabric, thickness, pressure, appendix run list | Sec.2 p.2-3, Appendix |
| S-BASS-SR | 20140011099 | BASS spread rates (2.55 / 1.21 mm/s) | "Concurrent and Opposed Spread" slide, PDF p.20 |

## Findings

**Saffire IV-VI (the three verified runs, rechecked):** Table 1 of 20240002981 confirms SAF-V-2
(Cotton Jersey, 50 cm, 20 cm/s concurrent, 70.7 kPa, 26.2% O2), SAF-VI-3 (two-sided PMMA, 18 cm,
54.6 kPa, 30.3%, 10 mm) and SAF-VI-4 (one-sided PMMA, 18 cm, 55.2 kPa, 28.8%, 5 mm) exactly as
recorded. No regression. The same table confirms the flagged SAF-IV-1 (22.0%, 100.0 kPa) and
SAF-VI-2 (31.0%, 54.1 kPa) values; those two stay flagged only because the SIBAL **thickness** is
not given per-run in this paper (it reports an areal density of 18.05 mg/cm2, not a thickness), so the
collector's choice to mark SAF-IV-1 and SAF-VI-2 thickness "not documented" is correct — the 0.37 mm
from the Saffire I-III paper must not be transferred.

**Saffire I-III:** Table 1 of 20180005168 has **no pressure column**, so the six runs' pressure is
correctly "not documented" and their O2 partial pressure correctly UNKNOWN. The table *does* document
0.37 mm SIBAL thickness for I-1, I-2, III-1, III-2 and the other listed conditions. Two points remain:
I-2 and III-2 lengths are printed as "~ 10 cm" (approximate), while the dataset stores an exact 100 mm;
and the same Table 1 (continued, p.31) reports microgravity **spread rates** (I-1 1.8, I-2 1.3,
III-1 2.3, III-2 0.98 mm/s) that the dataset does not carry — a gap, not an error.

**BASS-II:** 20150008962 supports the 0.32 mm thickness ("about 0.32 mm", Sec.2) and states "Ambient
pressure was 1 atm", so the collector's 0.32 mm is sourced and the 101.3 kPa is actually documented,
not merely inferred. **However**, the Appendix classifies the 21% O2, 10 cm/s concurrent case as a
**BASS** run (GMT96-T7), not BASS-II, and lists no opposed BASS-II run at these conditions. So the two
records attributed to BASS-II (PSI-25) at 21% / 10 cm/s do not have a confirmed BASS-II run identity,
and BASS2-CF-opp's opposed flow direction is not tied to a documented BASS-II run. The collector
correctly removed the 2.55 / 1.21 mm/s spread rates (those are from the 2014 BASS presentation, p.20,
and are BASS, not BASS-II). These two runs must stay unverified and should not be cited as BASS-II
evidence until the run identity is resolved.

## Scientific validation report

1. **Records audited:** 13 of 13.
2. **Verified (human sign-off, rechecked, no regression):** 3 — SAF-V-2, SAF-VI-3, SAF-VI-4.
3. **Flagged / imported:** 10.
4. **Corrected since the first check (by the collector, audit-confirmed):** Saffire I-III pressure and
   partial pressure → not documented / UNKNOWN; SAF-IV-1 and SAF-VI-2 thickness → not documented;
   BASS-II thickness → 0.32 mm (sourced); BASS spread rates removed.
5. **Unresolved source problems:** BASS-II run identity (21% / 10 cm/s traces to a BASS appendix row;
   opposed direction unsourced); I-2 / III-2 "~10 cm" stored as exact 100 mm; Saffire I-III documented
   spread rates not yet ingested.
6. **Referee evaluation:** verdicts 10/10, named confounders 5/5 on the hand-built pairs (self-authored).
7. **Planner evaluation:** control checks, duplicate detection and scoring tested; proposals carry
   provenance badges and never claim a scientist approved them.
8. **Ranking benchmark:** FlameAtlas Top-1 8/18, Top-3 16/18; keyword 8/18, 12/18 (18 labelled of 24).
9. **Citation validation:** run identifiers (e.g. "SAF-IV-1", "Saffire VI-2") are no longer misread as
   numbers; real measurements are still checked. Grounded-answer metrics vs plain RAG not recorded (no
   AI calls made).
10. **Adversarial tests:** 5/5 traps caught, plus regression tests for run-name citations, computed-value
    classification, and false-duplicate detection.
11. **Known limitations:** no AI-answer recording; the eval question set is a development set, tuned
    against (not an independent holdout); several Referee pairs and all traps are author-written.
12. **Conclusions that must not be drawn:** no material is called safe or unsafe; "not in our curated
    data" is never "NASA never studied it"; the two BASS-II records are not confirmed BASS-II evidence;
    verified status covers 3 runs only and is not a claim about the other 10.
