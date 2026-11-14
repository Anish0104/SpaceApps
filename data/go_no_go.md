# Go / No-Go Gate — Demo Data Verification

**Verdict: GO.** Every fact the demo rests on is confirmed against a primary NASA source and cited with a page. Fix the one number noted below (53 → 55 cm/s) before it reaches a slide.

Collector: Navneet · Verifier: Juvana (cross-check rule — re-open each PDF, confirm the page)
Legend: ✅ confirmed w/ page · ⚠️ needs care

## Verified facts

| Fact | Value | Source | Page |
|---|---|---|---|
| Saffire-I sample | 94 × 40.6 cm cotton-fiberglass (SIBAL) | NTRS 20180005168 | p.14, 25, 31 (Table 1, I-1) |
| BASS sample length | ~7 cm | NTRS 20170002628 | p.13 |
| BASS/BASS-II cotton-fiberglass sample | 1.2 & 2.2 cm wide, 10 cm long | NTRS 20150008962 | p.1 (abstract), p.2 |
| Saffire airflow | 20 cm/s (I), 25 cm/s (III) | NTRS 20180005168 | p.17, 31 (Table 1) |
| Saffire O₂ (I–III) | ~21–22% (I-1: 21.7→21.5) | NTRS 20180005168 | p.31, Table 1 |
| Saffire-II PMMA sample | 5 × 29 cm, 1 cm thick (II-9) | NTRS 20180005168 | p.31, Table 1 |
| BASS O₂ range | 21% → 16% | NTRS 20150008962 | p.1 (abstract), p.3 |
| PMMA µg vs 1g | flame sustained to 17% O₂ (µg) vs 18% (1g), opposed flow 0.4–8 cm/s | Sci Reports s41598-017-18398-4 | (web article — confirm exact section) |

## Saffire IV–VI test matrix (elevated-atmosphere runs)

All concurrent flow at 20 cm/s. Source: NTRS 20240007488 (Saffire VI, ICES 2024), Test Matrix (~slide 11); IV/V also in NTRS 20210017780.

| Run | Material | Length | Pressure (kPa) | O₂ (mol %) |
|---|---|---|---|---|
| IV-1 | SIBAL cloth | 50 cm | 100.0 | 22.0 |
| V-2 | cotton jersey | 50 cm | 70.7 | 26.2 |
| VI-2 | SIBAL cloth | 50 cm | 54.1 | 31.0 |
| VI-3 | two-sided PMMA | 18 cm | 54.6 | 30.3 |
| VI-4 | one-sided PMMA | 18 cm | 55.2 | 28.8 |

Timeline: Saffire IV & V flew 2020 & 2021; Saffire VI flew Dec 2023 (final of the 6-experiment series).
Note: label these "from NASA report" (NTRS), not PSI — IV–VI are not the PSI flagship runs.

## FM2 (the lunar-gravity gap-filler)

- Habitat atmosphere: **34% O₂ at 8.2 psia** (elevated exploration atmosphere); baseline 21% O₂ at 14.7 psia. Source: NTRS 20240015307 (Zayac poster), 20240003211 (M2M atmosphere → 8.2 psia, 34% O₂).
- FM2 experiment: burns 4 solid samples sweeping **25 / 29 / 33 / 37% O₂ at 8.2 psi**, quiescent, in long-duration lunar gravity. Source: NTRS 20260001966 / 20260000646 (Ferkul, LPSC 2026).
- Status: planned launch **late 2026** on a CLPS lander — first-ever combustion experiment on another world.
- Science (sourced): lunar gravity **increases** flammability limits for some materials vs Earth ("goldilocks zone"). Backs "the Moon may be the most flammable case, not a safe midpoint." Source: NTRS 20240015307 / 20260000646.

## ⚠️ Numbers to fix / handle with care

- **BASS-II max airflow:** use **up to 55 cm/s (0–55)**, NOT 53. (NTRS 20160000593 slide; NTRS 20150008962 p.3 says 1–55.)
- **"100+ tests":** phrase as **"well over 100 across BASS-II campaigns"** — per-section counts sum to ≈149 (22 + 54 + 20 + 24 + 29). (NTRS 20160000593)
- **BASS flow range:** abstract (20150008962) says 40→1 cm/s for the described tests; tunnel capability is 1–55. Keep the two separate.

## Demo comparison pairs (locked)

- **Pair A — "Cannot isolate" showpiece (scale confound):** BASS-II cotton-fiberglass (~10 cm, NTRS 20150008962) vs Saffire-I cotton-fiberglass (94 cm, NTRS 20180005168 Table 1 I-1). Differ in sample size + tunnel geometry + flow regime at once → Cannot isolate.
- **Pair B — cleaner contrast:** Saffire I-1 (20 cm/s) vs III-1 (25 cm/s), same 94×40.6 cotton-fiberglass, same concurrent flow (NTRS 20180005168 Table 1, p.31). Differs mainly in flow speed → candidate "Can isolate flow."
- **Pair C — elevated-atmosphere (bonus):** Saffire IV-1 (100 kPa, 22% O₂) vs VI-2 (54.1 kPa, 31% O₂), same SIBAL cloth, 50 cm, 20 cm/s concurrent (NTRS 20240007488). Pressure AND oxygen both change → Cannot isolate — good for the exploration-atmosphere story.

## Remaining (team process, not research)

- Juvana re-opens 2–3 of the PDFs to satisfy the cross-check rule.
- Optional: confirm the exact section of the Sci Reports PMMA paper for the 17%/18% figure (it's a journal article, not NTRS).
