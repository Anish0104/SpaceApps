"""The 24 PSI Combustion Science investigations (confirmed on psi.nasa.gov, Nov 13 2026)."""

INVESTIGATIONS = {
    # flight experiments (19)
    "PSI-26": ("BASS", "prevention", "solid"),
    "PSI-25": ("BASS-II", "prevention", "solid"),
    "PSI-98": ("Saffire-I", "prevention", "solid"),
    "PSI-99": ("Saffire-II", "prevention", "solid"),
    "PSI-100": ("Saffire-III", "prevention", "solid"),
    "PSI-20": ("ACME BRE", "prevention", "gas"),
    "PSI-69": ("FLEX", "suppression", "liquid"),
    "PSI-68": ("FLEX-2", "suppression", "liquid"),
    "PSI-39": ("CFI", "suppression", "liquid"),
    "PSI-102": ("SAME", "detection", "aerosol"),
    "PSI-101": ("SAME-R", "detection", "aerosol"),
    "PSI-47": ("DAFT / DAFT-2", "detection", "aerosol"),
    "PSI-107": ("SPICE", "physics", "gas"),
    "PSI-106": ("SLICE", "physics", "gas"),
    "PSI-159": ("ACME CFI-G", "physics", "gas"),
    "PSI-10": ("ACME Flame Design", "physics", "gas"),
    "PSI-21": ("ACME CLD Flame", "physics", "gas"),
    "PSI-22": ("ACME E-FIELD Flames", "physics", "gas"),
    "PSI-23": ("ACME s-Flame", "physics", "gas"),
    # ground studies (5)
    "PSI-62": ("Flame-spread model vs BASS", "prevention", "solid"),
    "PSI-60": ("SPICE data analysis", "physics", "gas"),
    "PSI-117": ("Cool-flame CFD from FLEX", "suppression", "liquid"),
    "PSI-142": ("Cool-flame extinction from FLEX", "suppression", "liquid"),
    "PSI-115": ("Smoke-growth simulation from SAME", "detection", "aerosol"),
}

PAGE_URL = "https://psi.nasa.gov/physci/repo/data/investigations/{psi_id}"
