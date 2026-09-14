import pytest

from app.chart_schema import validate_chart_spec


def valid_spec():
    return {"type": "bar", "data": {"labels": ["a"], "datasets": [{"label": "s", "data": [1]}]}}


def test_valid_spec_passes():
    validate_chart_spec(valid_spec())


def test_missing_type_raises():
    spec = valid_spec()
    del spec["type"]
    with pytest.raises(ValueError):
        validate_chart_spec(spec)


def test_bad_type_raises():
    spec = valid_spec()
    spec["type"] = "hologram"
    with pytest.raises(ValueError):
        validate_chart_spec(spec)


def test_datasets_not_list_raises():
    spec = valid_spec()
    spec["data"]["datasets"] = "nope"
    with pytest.raises(ValueError):
        validate_chart_spec(spec)
