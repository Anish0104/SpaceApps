"""Unit normalization helpers. Same math as packages/engine/src/units.ts (keep in sync)."""
from __future__ import annotations

KPA_PER_PSI = 6.894757
KPA_PER_ATM = 101.325
PO2_FORMULA = "pO2 = (O2 mol% / 100) x total pressure (kPa)"


def to_kpa(value: float, unit: str) -> float:
    u = unit.strip().lower()
    if u == "kpa":
        return value
    if u == "psi" or u == "psia":
        return value * KPA_PER_PSI
    if u == "atm":
        return value * KPA_PER_ATM
    if u == "pa":
        return value / 1000
    raise ValueError(f"unknown pressure unit: {unit}")


def to_mol_pct(value: float) -> float:
    """Mole fraction (0-1) or percent (0-100) -> percent."""
    if value < 0:
        raise ValueError("negative O2")
    return value * 100 if value <= 1 else value


def o2_partial_kpa(o2: float, pressure_kpa: float) -> float:
    return to_mol_pct(o2) / 100 * pressure_kpa


def computed_po2(o2_value: dict, p_value: dict) -> dict:
    """Build the COMPUTED o2PartialKPa value, or null with a reason."""
    if o2_value.get("value") is None or p_value.get("value") is None:
        return {"value": None, "unit": "kPa", "type": "UNKNOWN", "missingReason": "not_documented"}
    return {
        "value": round(o2_partial_kpa(o2_value["value"], p_value["value"]), 2),
        "unit": "kPa", "type": "COMPUTED", "formula": PO2_FORMULA,
    }
