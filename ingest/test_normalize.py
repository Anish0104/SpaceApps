import json
from pathlib import Path

from normalize import to_kpa, o2_partial_kpa
from schema import Dataset


def test_units():
    assert abs(to_kpa(10.2, "psi") - 70.33) < 0.01
    assert abs(to_kpa(0.5, "atm") - 50.66) < 0.01
    assert abs(o2_partial_kpa(0.34, 56.5) - 19.21) < 0.01


def test_fixtures_match_contract():
    data = json.loads((Path(__file__).parent.parent / "data" / "fixtures.json").read_text())
    ds = Dataset.model_validate(data)
    assert ds.fixture is True
