"""Contract 1 in Python. Mirrors packages/engine/src/schema.ts. Change both together."""
from __future__ import annotations

from typing import Literal, Optional
from pydantic import BaseModel, Field

EvidenceType = Literal["MEASURED", "COMPUTED", "ASSUMED", "INFERRED", "UNKNOWN"]
MissingReason = Literal["not_documented", "not_applicable"]
SafetyRole = Literal["prevention", "detection", "suppression", "physics"]
FuelPhase = Literal["solid", "liquid", "gas", "aerosol"]


class Source(BaseModel):
    id: str
    psiId: Optional[str] = None
    ntrsId: Optional[str] = None
    title: str
    url: str
    doi: Optional[str] = None
    version: Optional[str] = None
    page: Optional[str] = None  # page / table / figure


class _ValueBase(BaseModel):
    unit: Optional[str] = None
    type: EvidenceType
    sourceId: Optional[str] = None
    formula: Optional[str] = None
    missingReason: Optional[MissingReason] = None
    collectedBy: Optional[str] = None
    verifiedBy: Optional[str] = None  # must differ from collectedBy


class NumValue(_ValueBase):
    value: Optional[float]


class StrValue(_ValueBase):
    value: Optional[str]


class Publication(BaseModel):
    title: str
    authors: Optional[str] = None
    doi: Optional[str] = None


class Ranges(BaseModel):
    o2MolPct: Optional[tuple[float, float]] = None
    pressureKPa: Optional[tuple[float, float]] = None
    flowCmS: Optional[tuple[float, float]] = None
    gravityG: Optional[tuple[float, float]] = None
    sourceId: Optional[str] = None


class Investigation(BaseModel):
    psiId: str
    name: str
    acronym: str
    projectType: Literal["Microgravity", "Ground"]
    safetyRole: SafetyRole
    fuelPhase: Optional[FuelPhase] = None
    hardware: Optional[str] = None
    platform: Optional[str] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    objectives: str
    approach: Optional[str] = None
    earthBenefits: Optional[str] = None
    doi: Optional[str] = None
    license: Optional[str] = None
    url: str
    relatedIds: list[str] = Field(default_factory=list)
    publications: list[Publication] = Field(default_factory=list)
    runIds: list[str] = Field(default_factory=list)
    ranges: Optional[Ranges] = None
    sensors: list[str] = Field(default_factory=list)


class Outcome(BaseModel):
    label: str
    value: NumValue


class Run(BaseModel):
    id: str
    psiId: str
    testNumber: Optional[str] = None
    date: Optional[str] = None
    material: StrValue
    fuelPhase: FuelPhase
    geometry: StrValue
    sizeMm: NumValue
    thicknessMm: NumValue
    o2MolPct: NumValue
    pressureKPa: NumValue
    o2PartialKPa: NumValue  # COMPUTED
    flowCmS: NumValue
    flowDirection: StrValue
    gravityG: NumValue
    ductSize: StrValue
    diluent: StrValue
    apparatus: StrValue
    method: StrValue
    sensors: list[str] = Field(default_factory=list)
    outcomes: list[Outcome] = Field(default_factory=list)
    status: Literal["imported", "verified"]


class Edge(BaseModel):
    from_: str = Field(alias="from")
    to: str
    kind: Literal["nasa_related", "reuses_data", "shared_hardware"]
    sourceId: Optional[str] = None

    model_config = {"populate_by_name": True}


class Dataset(BaseModel):
    version: str
    generatedAt: str
    fixture: bool = False
    investigations: list[Investigation]
    runs: list[Run]
    edges: list[Edge]
    sources: list[Source]
