"""Validates that a chart spec has the minimal Chart.js shape."""

MAX_CHARTS = 5
MAX_CHART_BYTES = 256 * 1024

ALLOWED_TYPES = {
    "bar",
    "line",
    "pie",
    "doughnut",
    "scatter",
    "radar",
    "bubble",
    "polarArea",
}


def validate_chart_spec(spec):
    """Raises ValueError if the spec is not a minimal Chart.js configuration."""
    if not isinstance(spec, dict):
        raise ValueError("chart spec must be a dict")
    if spec.get("type") not in ALLOWED_TYPES:
        raise ValueError(f"chart type must be one of {sorted(ALLOWED_TYPES)}")
    data = spec.get("data")
    if not isinstance(data, dict) or not isinstance(data.get("datasets"), list):
        raise ValueError("chart spec needs data.datasets as a list")
    for dataset in data["datasets"]:
        if not isinstance(dataset, dict) or "data" not in dataset:
            raise ValueError("each dataset needs a data field")
