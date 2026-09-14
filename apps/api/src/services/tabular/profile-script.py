"""Profiles the tabular file named data.* in the cwd and prints profile JSON.

The API owns this script and runs it in the sandbox. Keep it dependency-light:
pandas + openpyxl only, stdout only, one JSON document.
"""

import glob
import json
import sys

import pandas as pd

MAX_PROFILE_BYTES = 32 * 1024
MAX_SAMPLES = 5
MAX_SAMPLE_CHARS = 40


def load_sheets(path, ext):
    """Returns a name to DataFrame map for the file at the path."""
    if ext == "csv":
        return {"Sheet1": pd.read_csv(path)}
    if ext == "tsv":
        return {"Sheet1": pd.read_csv(path, sep="\t")}
    if ext in ("xlsx", "xls"):
        return pd.read_excel(path, sheet_name=None)
    if ext == "json":
        return {"Sheet1": pd.read_json(path)}
    raise ValueError(f"unsupported extension: {ext}")


def profile_column(series):
    """Returns the profile of one column as JSON-serializable values."""
    sample = [str(v)[:MAX_SAMPLE_CHARS] for v in series.dropna().unique()[:MAX_SAMPLES]]
    col = {
        "name": str(series.name),
        "dtype": str(series.dtype),
        "non_null": int(series.notna().sum()),
        "unique": int(series.nunique()),
        "sample_values": sample,
        "min": None,
        "max": None,
    }
    if pd.api.types.is_numeric_dtype(series) or pd.api.types.is_datetime64_any_dtype(series):
        if series.notna().any():
            col["min"], col["max"] = str(series.min()), str(series.max())
    return col


def main():
    """Profiles the data file in the cwd and writes the JSON to stdout."""
    path = glob.glob("data.*")[0]
    ext = path.rsplit(".", 1)[1].lower()
    sheets = []
    for name, df in load_sheets(path, ext).items():
        sheets.append(
            {
                "name": str(name),
                "rows": int(len(df)),
                "columns": [profile_column(df[c]) for c in df.columns],
            }
        )
    result = {"format": ext, "sheets": sheets, "truncated": False}
    while len(json.dumps(result)) > MAX_PROFILE_BYTES:
        result["truncated"] = True
        widest = max(result["sheets"], key=lambda s: len(s["columns"]))
        if not widest["columns"]:
            break
        widest["columns"].pop()
    sys.stdout.write(json.dumps(result))


main()
