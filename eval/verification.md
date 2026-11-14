# Verification checklist: data/dataset.json 1.1.0

Cross-check rule: whoever collected a value never verifies it. Every value below was collected by someone else;
Juvana checks each one against the cited source page and ticks the box. Nothing here has been verified yet.

How to use this file:

1. Open the source URL, go to the page given, and compare the value. Tick `[x]` when it matches.
2. At the end of each run, mark the decision: **confirmed** or **flagged**, and write the reason for any flag.
3. Only runs marked confirmed get `status: "verified"` and `verifiedBy: "Juvana"` in the dataset. Flagged runs stay `imported`.

Things to watch while checking:

- **INFERRED** values were not read directly off the page (for example cabin pressure taken as 101.3 kPa). Decide whether the source supports the inference.
- **COMPUTED** O2 partial pressure is not in the source. The note column recomputes it from the oxygen and pressure in the same run.
- The page reference belongs to the source as a whole, not to each value, so a value may sit on a neighbouring page or slide.

## Sources

| Source id | Title | Reference | Page | URL |
|---|---|---|---|---|
| S-BASS-SR | Thickness and Fuel Preheating Effects on Material Flammability in Microgravity from the BASS Experiment | NTRS 20140011099 | Thin Fuel Flame Spread slide | https://ntrs.nasa.gov/citations/20140011099 |
| S-BASS2 | Concurrent flame growth, spread and extinction over composite cotton-fiberglass fabric blend in microgravity | NTRS 20150008962 | Abstract (p.1), Sec.2 (p.2-3) | https://ntrs.nasa.gov/citations/20150008962 |
| S-SAF-IIII | Saffire: A Novel Approach to Study of Spacecraft Fire Safety Using Un-manned Spacecraft | NTRS 20180005168 | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |
| S-SAF-IVVI | Preliminary Results from the Saffire VI Experiment | NTRS 20240002981 | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |

## Summary

| Run | Investigation | Values | Decision | Verified by |
|---|---|---|---|---|
| SAF-I-1 | PSI-98 | 14 | pending | |
| SAF-I-2 | PSI-98 | 14 | pending | |
| SAF-II-1 | PSI-99 | 14 | pending | |
| SAF-II-9 | PSI-99 | 14 | pending | |
| SAF-III-1 | PSI-100 | 14 | pending | |
| SAF-III-2 | PSI-100 | 14 | pending | |
| SAF-IV-1 | SAFFIRE-IVVI | 14 | pending | |
| SAF-V-2 | SAFFIRE-IVVI | 14 | pending | |
| SAF-VI-2 | SAFFIRE-IVVI | 14 | pending | |
| SAF-VI-3 | SAFFIRE-IVVI | 14 | pending | |
| SAF-VI-4 | SAFFIRE-IVVI | 14 | pending | |
| BASS2-CF-conc | PSI-25 | 15 | pending | |
| BASS2-CF-opp | PSI-25 | 15 | pending | |

## SAF-I-1 (PSI-98)

Current status: `imported`. Fuel phase: solid. Sensors: cameras, thermocouples.

| OK | Field | Value in dataset | Type | Collected by | Source id | Page | Source URL | Note |
|---|---|---|---|---|---|---|---|---|
| [ ] | Material | Cotton-fiberglass fabric (SIBAL) | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Geometry | sheet, 40.6 cm wide | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Size | 940 mm | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Thickness | 0.37 mm | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Oxygen | 21.7 mol% | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Pressure | 101.3 kPa | INFERRED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 | Inferred, not read off the page |
| [ ] | O2 partial pressure | 21.98 kPa | COMPUTED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 | 21.7 / 100 x 101.3 = 21.98 kPa |
| [ ] | Flow speed | 20 cm/s | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Flow direction | concurrent | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Gravity | 0.0 g | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Duct size | Saffire large flow duct | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Diluent | nitrogen | INFERRED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 | Inferred, not read off the page |
| [ ] | Apparatus | Cygnus Saffire module | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Method | cameras / video | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |

No outcome values are recorded for this run.

- Decision: [ ] confirmed  [ ] flagged
- Reason if flagged:
- Checked on:

## SAF-I-2 (PSI-98)

Current status: `imported`. Fuel phase: solid. Sensors: cameras, thermocouples.

| OK | Field | Value in dataset | Type | Collected by | Source id | Page | Source URL | Note |
|---|---|---|---|---|---|---|---|---|
| [ ] | Material | Cotton-fiberglass fabric (SIBAL) | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Geometry | sheet, 40.6 cm wide | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Size | 100 mm | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Thickness | 0.37 mm | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Oxygen | 21.5 mol% | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Pressure | 101.3 kPa | INFERRED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 | Inferred, not read off the page |
| [ ] | O2 partial pressure | 21.78 kPa | COMPUTED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 | 21.5 / 100 x 101.3 = 21.78 kPa |
| [ ] | Flow speed | 20 cm/s | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Flow direction | opposed | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Gravity | 0.0 g | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Duct size | Saffire large flow duct | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Diluent | nitrogen | INFERRED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 | Inferred, not read off the page |
| [ ] | Apparatus | Cygnus Saffire module | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Method | cameras / video | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |

No outcome values are recorded for this run.

- Decision: [ ] confirmed  [ ] flagged
- Reason if flagged:
- Checked on:

## SAF-II-1 (PSI-99)

Current status: `imported`. Fuel phase: solid. Sensors: cameras, thermocouples.

| OK | Field | Value in dataset | Type | Collected by | Source id | Page | Source URL | Note |
|---|---|---|---|---|---|---|---|---|
| [ ] | Material | Silicone | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Geometry | sheet, 5 cm wide | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Size | 290 mm | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Thickness | 0.27 mm | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Oxygen | 22.1 mol% | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Pressure | 101.3 kPa | INFERRED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 | Inferred, not read off the page |
| [ ] | O2 partial pressure | 22.39 kPa | COMPUTED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 | 22.1 / 100 x 101.3 = 22.39 kPa |
| [ ] | Flow speed | 20 cm/s | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Flow direction | concurrent | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Gravity | 0.0 g | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Duct size | Saffire flow duct | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Diluent | nitrogen | INFERRED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 | Inferred, not read off the page |
| [ ] | Apparatus | Cygnus Saffire module | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Method | cameras / video | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |

No outcome values are recorded for this run.

- Decision: [ ] confirmed  [ ] flagged
- Reason if flagged:
- Checked on:

## SAF-II-9 (PSI-99)

Current status: `imported`. Fuel phase: solid. Sensors: cameras, thermocouples.

| OK | Field | Value in dataset | Type | Collected by | Source id | Page | Source URL | Note |
|---|---|---|---|---|---|---|---|---|
| [ ] | Material | PMMA (acrylic) | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Geometry | flat slab, 5 cm wide | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Size | 290 mm | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Thickness | 10.0 mm | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Oxygen | 22.0 mol% | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Pressure | 101.3 kPa | INFERRED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 | Inferred, not read off the page |
| [ ] | O2 partial pressure | 22.29 kPa | COMPUTED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 | 22.0 / 100 x 101.3 = 22.29 kPa |
| [ ] | Flow speed | 20 cm/s | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Flow direction | concurrent | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Gravity | 0.0 g | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Duct size | Saffire flow duct | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Diluent | nitrogen | INFERRED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 | Inferred, not read off the page |
| [ ] | Apparatus | Cygnus Saffire module | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Method | cameras / video | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |

No outcome values are recorded for this run.

- Decision: [ ] confirmed  [ ] flagged
- Reason if flagged:
- Checked on:

## SAF-III-1 (PSI-100)

Current status: `imported`. Fuel phase: solid. Sensors: cameras, thermocouples.

| OK | Field | Value in dataset | Type | Collected by | Source id | Page | Source URL | Note |
|---|---|---|---|---|---|---|---|---|
| [ ] | Material | Cotton-fiberglass fabric (SIBAL) | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Geometry | sheet, 40.6 cm wide | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Size | 940 mm | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Thickness | 0.37 mm | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Oxygen | 21.2 mol% | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Pressure | 101.3 kPa | INFERRED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 | Inferred, not read off the page |
| [ ] | O2 partial pressure | 21.48 kPa | COMPUTED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 | 21.2 / 100 x 101.3 = 21.48 kPa |
| [ ] | Flow speed | 25 cm/s | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Flow direction | concurrent | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Gravity | 0.0 g | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Duct size | Saffire large flow duct | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Diluent | nitrogen | INFERRED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 | Inferred, not read off the page |
| [ ] | Apparatus | Cygnus Saffire module | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Method | cameras / video | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |

No outcome values are recorded for this run.

- Decision: [ ] confirmed  [ ] flagged
- Reason if flagged:
- Checked on:

## SAF-III-2 (PSI-100)

Current status: `imported`. Fuel phase: solid. Sensors: cameras, thermocouples.

| OK | Field | Value in dataset | Type | Collected by | Source id | Page | Source URL | Note |
|---|---|---|---|---|---|---|---|---|
| [ ] | Material | Cotton-fiberglass fabric (SIBAL) | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Geometry | sheet, 40.6 cm wide | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Size | 100 mm | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Thickness | 0.37 mm | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Oxygen | 21.2 mol% | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Pressure | 101.3 kPa | INFERRED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 | Inferred, not read off the page |
| [ ] | O2 partial pressure | 21.48 kPa | COMPUTED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 | 21.2 / 100 x 101.3 = 21.48 kPa |
| [ ] | Flow speed | 25 cm/s | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Flow direction | opposed | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Gravity | 0.0 g | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Duct size | Saffire large flow duct | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Diluent | nitrogen | INFERRED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 | Inferred, not read off the page |
| [ ] | Apparatus | Cygnus Saffire module | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |
| [ ] | Method | cameras / video | MEASURED | Navneet | S-SAF-IIII | Table 1 (p.31) | https://ntrs.nasa.gov/citations/20180005168 |  |

No outcome values are recorded for this run.

- Decision: [ ] confirmed  [ ] flagged
- Reason if flagged:
- Checked on:

## SAF-IV-1 (SAFFIRE-IVVI)

Current status: `imported`. Fuel phase: solid. Sensors: cameras, thermocouples.

| OK | Field | Value in dataset | Type | Collected by | Source id | Page | Source URL | Note |
|---|---|---|---|---|---|---|---|---|
| [ ] | Material | Cotton-fiberglass fabric (SIBAL) | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Geometry | cloth | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Size | 500 mm | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Thickness | 0.37 mm | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Oxygen | 22.0 mol% | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Pressure | 100.0 kPa | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | O2 partial pressure | 22.0 kPa | COMPUTED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 | 22.0 / 100 x 100.0 = 22.00 kPa |
| [ ] | Flow speed | 20 cm/s | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Flow direction | concurrent | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Gravity | 0.0 g | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Duct size | Saffire flow duct | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Diluent | nitrogen | INFERRED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 | Inferred, not read off the page |
| [ ] | Apparatus | Cygnus Saffire module | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Method | cameras / video | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |

No outcome values are recorded for this run.

- Decision: [ ] confirmed  [ ] flagged
- Reason if flagged:
- Checked on:

## SAF-V-2 (SAFFIRE-IVVI)

Current status: `imported`. Fuel phase: solid. Sensors: cameras, thermocouples.

| OK | Field | Value in dataset | Type | Collected by | Source id | Page | Source URL | Note |
|---|---|---|---|---|---|---|---|---|
| [ ] | Material | Cotton jersey fabric | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Geometry | cloth | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Size | 500 mm | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Thickness | not documented (not_documented) | UNKNOWN | Navneet | none | no page recorded | no URL | Confirm the source really does not give it |
| [ ] | Oxygen | 26.2 mol% | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Pressure | 70.7 kPa | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | O2 partial pressure | 18.52 kPa | COMPUTED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 | 26.2 / 100 x 70.7 = 18.52 kPa |
| [ ] | Flow speed | 20 cm/s | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Flow direction | concurrent | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Gravity | 0.0 g | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Duct size | Saffire flow duct | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Diluent | nitrogen | INFERRED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 | Inferred, not read off the page |
| [ ] | Apparatus | Cygnus Saffire module | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Method | cameras / video | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |

No outcome values are recorded for this run.

- Decision: [ ] confirmed  [ ] flagged
- Reason if flagged:
- Checked on:

## SAF-VI-2 (SAFFIRE-IVVI)

Current status: `imported`. Fuel phase: solid. Sensors: cameras, thermocouples.

| OK | Field | Value in dataset | Type | Collected by | Source id | Page | Source URL | Note |
|---|---|---|---|---|---|---|---|---|
| [ ] | Material | Cotton-fiberglass fabric (SIBAL) | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Geometry | cloth | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Size | 500 mm | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Thickness | 0.37 mm | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Oxygen | 31.0 mol% | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Pressure | 54.1 kPa | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | O2 partial pressure | 16.77 kPa | COMPUTED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 | 31.0 / 100 x 54.1 = 16.77 kPa |
| [ ] | Flow speed | 20 cm/s | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Flow direction | concurrent | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Gravity | 0.0 g | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Duct size | Saffire flow duct | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Diluent | nitrogen | INFERRED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 | Inferred, not read off the page |
| [ ] | Apparatus | Cygnus Saffire module | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Method | cameras / video | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |

No outcome values are recorded for this run.

- Decision: [ ] confirmed  [ ] flagged
- Reason if flagged:
- Checked on:

## SAF-VI-3 (SAFFIRE-IVVI)

Current status: `imported`. Fuel phase: solid. Sensors: cameras, thermocouples.

| OK | Field | Value in dataset | Type | Collected by | Source id | Page | Source URL | Note |
|---|---|---|---|---|---|---|---|---|
| [ ] | Material | PMMA (acrylic), two-sided | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Geometry | slab | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Size | 180 mm | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Thickness | 10.0 mm | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Oxygen | 30.3 mol% | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Pressure | 54.6 kPa | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | O2 partial pressure | 16.54 kPa | COMPUTED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 | 30.3 / 100 x 54.6 = 16.54 kPa |
| [ ] | Flow speed | 20 cm/s | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Flow direction | concurrent | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Gravity | 0.0 g | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Duct size | Saffire flow duct | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Diluent | nitrogen | INFERRED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 | Inferred, not read off the page |
| [ ] | Apparatus | Cygnus Saffire module | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Method | cameras / video | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |

No outcome values are recorded for this run.

- Decision: [ ] confirmed  [ ] flagged
- Reason if flagged:
- Checked on:

## SAF-VI-4 (SAFFIRE-IVVI)

Current status: `imported`. Fuel phase: solid. Sensors: cameras, thermocouples.

| OK | Field | Value in dataset | Type | Collected by | Source id | Page | Source URL | Note |
|---|---|---|---|---|---|---|---|---|
| [ ] | Material | PMMA (acrylic), one-sided | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Geometry | slab | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Size | 180 mm | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Thickness | 5.0 mm | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Oxygen | 28.8 mol% | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Pressure | 55.2 kPa | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | O2 partial pressure | 15.9 kPa | COMPUTED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 | 28.8 / 100 x 55.2 = 15.90 kPa |
| [ ] | Flow speed | 20 cm/s | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Flow direction | concurrent | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Gravity | 0.0 g | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Duct size | Saffire flow duct | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Diluent | nitrogen | INFERRED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 | Inferred, not read off the page |
| [ ] | Apparatus | Cygnus Saffire module | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |
| [ ] | Method | cameras / video | MEASURED | Navneet | S-SAF-IVVI | Test Matrix (slide ~11) | https://ntrs.nasa.gov/citations/20240002981 |  |

No outcome values are recorded for this run.

- Decision: [ ] confirmed  [ ] flagged
- Reason if flagged:
- Checked on:

## BASS2-CF-conc (PSI-25)

Current status: `imported`. Fuel phase: solid. Sensors: cameras, thermocouples.

| OK | Field | Value in dataset | Type | Collected by | Source id | Page | Source URL | Note |
|---|---|---|---|---|---|---|---|---|
| [ ] | Material | Cotton-fiberglass fabric (SIBAL) | MEASURED | Navneet | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | https://ntrs.nasa.gov/citations/20150008962 |  |
| [ ] | Geometry | sheet, 2.2 cm wide | MEASURED | Navneet | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | https://ntrs.nasa.gov/citations/20150008962 |  |
| [ ] | Size | 100 mm | MEASURED | Navneet | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | https://ntrs.nasa.gov/citations/20150008962 |  |
| [ ] | Thickness | not documented (not_documented) | UNKNOWN | Navneet | none | no page recorded | no URL | Confirm the source really does not give it |
| [ ] | Oxygen | 21.0 mol% | INFERRED | Navneet | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | https://ntrs.nasa.gov/citations/20150008962 | Inferred, not read off the page |
| [ ] | Pressure | 101.3 kPa | INFERRED | Navneet | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | https://ntrs.nasa.gov/citations/20150008962 | Inferred, not read off the page |
| [ ] | O2 partial pressure | 21.27 kPa | COMPUTED | Navneet | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | https://ntrs.nasa.gov/citations/20150008962 | 21.0 / 100 x 101.3 = 21.27 kPa |
| [ ] | Flow speed | 10 cm/s | MEASURED | Navneet | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | https://ntrs.nasa.gov/citations/20150008962 |  |
| [ ] | Flow direction | concurrent | MEASURED | Navneet | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | https://ntrs.nasa.gov/citations/20150008962 |  |
| [ ] | Gravity | 0.0 g | MEASURED | Navneet | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | https://ntrs.nasa.gov/citations/20150008962 |  |
| [ ] | Duct size | 76 x 76 mm | MEASURED | Navneet | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | https://ntrs.nasa.gov/citations/20150008962 |  |
| [ ] | Diluent | nitrogen | INFERRED | Navneet | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | https://ntrs.nasa.gov/citations/20150008962 | Inferred, not read off the page |
| [ ] | Apparatus | Microgravity Science Glovebox (BASS-II duct) | MEASURED | Navneet | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | https://ntrs.nasa.gov/citations/20150008962 |  |
| [ ] | Method | cameras / video | MEASURED | Navneet | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | https://ntrs.nasa.gov/citations/20150008962 |  |
| [ ] | Outcome: flame spread rate | 2.55 mm/s | MEASURED | Navneet | S-BASS-SR | Thin Fuel Flame Spread slide | https://ntrs.nasa.gov/citations/20140011099 |  |

- Decision: [ ] confirmed  [ ] flagged
- Reason if flagged:
- Checked on:

## BASS2-CF-opp (PSI-25)

Current status: `imported`. Fuel phase: solid. Sensors: cameras, thermocouples.

| OK | Field | Value in dataset | Type | Collected by | Source id | Page | Source URL | Note |
|---|---|---|---|---|---|---|---|---|
| [ ] | Material | Cotton-fiberglass fabric (SIBAL) | MEASURED | Navneet | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | https://ntrs.nasa.gov/citations/20150008962 |  |
| [ ] | Geometry | sheet, 2.2 cm wide | MEASURED | Navneet | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | https://ntrs.nasa.gov/citations/20150008962 |  |
| [ ] | Size | 100 mm | MEASURED | Navneet | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | https://ntrs.nasa.gov/citations/20150008962 |  |
| [ ] | Thickness | not documented (not_documented) | UNKNOWN | Navneet | none | no page recorded | no URL | Confirm the source really does not give it |
| [ ] | Oxygen | 21.0 mol% | INFERRED | Navneet | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | https://ntrs.nasa.gov/citations/20150008962 | Inferred, not read off the page |
| [ ] | Pressure | 101.3 kPa | INFERRED | Navneet | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | https://ntrs.nasa.gov/citations/20150008962 | Inferred, not read off the page |
| [ ] | O2 partial pressure | 21.27 kPa | COMPUTED | Navneet | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | https://ntrs.nasa.gov/citations/20150008962 | 21.0 / 100 x 101.3 = 21.27 kPa |
| [ ] | Flow speed | 10 cm/s | MEASURED | Navneet | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | https://ntrs.nasa.gov/citations/20150008962 |  |
| [ ] | Flow direction | opposed | MEASURED | Navneet | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | https://ntrs.nasa.gov/citations/20150008962 |  |
| [ ] | Gravity | 0.0 g | MEASURED | Navneet | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | https://ntrs.nasa.gov/citations/20150008962 |  |
| [ ] | Duct size | 76 x 76 mm | MEASURED | Navneet | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | https://ntrs.nasa.gov/citations/20150008962 |  |
| [ ] | Diluent | nitrogen | INFERRED | Navneet | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | https://ntrs.nasa.gov/citations/20150008962 | Inferred, not read off the page |
| [ ] | Apparatus | Microgravity Science Glovebox (BASS-II duct) | MEASURED | Navneet | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | https://ntrs.nasa.gov/citations/20150008962 |  |
| [ ] | Method | cameras / video | MEASURED | Navneet | S-BASS2 | Abstract (p.1), Sec.2 (p.2-3) | https://ntrs.nasa.gov/citations/20150008962 |  |
| [ ] | Outcome: flame spread rate | 1.21 mm/s | MEASURED | Navneet | S-BASS-SR | Thin Fuel Flame Spread slide | https://ntrs.nasa.gov/citations/20140011099 |  |

- Decision: [ ] confirmed  [ ] flagged
- Reason if flagged:
- Checked on:
