# Verification record: data/dataset.json 1.1.0

Checked on 2026-11-14 by Juvana against the cited NASA sources. Values were collected by Navneet; the collector never verifies.
**3 of 13 runs confirmed, 10 flagged.** 15 individual values are not supported by their cited source.

What this changed in the data:

- Confirmed runs (SAF-V-2, SAF-VI-3, SAF-VI-4) are `status: "verified"`, with `verifiedBy: "Juvana"` on every value that was checked. `collectedBy` is unchanged.
- Flagged runs stay `status: "imported"`. No value was edited: corrections belong to the collector.
- The COMPUTED O2 partial pressure was not checked against a source and carries no `verifiedBy`. Its arithmetic is shown in the note column.
- `data/dataset-v1.0.json` (the curated runs `ingest/release.py` reads), `data/coverage.json` and `data/modeling.csv` carry the same statuses.
- `ingest/make_dataset.py` still writes every run as `imported`. Re-running it will drop these statuses until it reads them from a verification log.

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
