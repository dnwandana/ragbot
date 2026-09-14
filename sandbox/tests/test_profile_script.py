import json
from pathlib import Path

from app.executor import run_code

SCRIPT = (
    Path(__file__).resolve().parents[2] / "apps/api/src/services/tabular/profile-script.py"
).read_text()


def profile(name, content):
    r = run_code(SCRIPT, [{"name": name, "content": content}], 30000)
    assert r["ok"], r["stderr"]
    return json.loads(r["stdout"])


def test_csv_profile():
    p = profile("data.csv", b"city,pop\nOslo,700000\nBergen,290000\n")
    sheet = p["sheets"][0]
    assert p["format"] == "csv" and sheet["rows"] == 2
    names = [c["name"] for c in sheet["columns"]]
    assert names == ["city", "pop"]
    pop = sheet["columns"][1]
    assert pop["min"] == "290000" and pop["max"] == "700000"


def test_tsv_profile():
    p = profile("data.tsv", b"a\tb\n1\t2\n")
    assert p["format"] == "tsv" and p["sheets"][0]["rows"] == 1


def test_json_records_profile():
    p = profile("data.json", b'[{"a": 1, "b": "x"}, {"a": 2, "b": "y"}]')
    assert p["format"] == "json" and p["sheets"][0]["rows"] == 2


def test_xlsx_profile(tmp_path):
    import pandas as pd

    f = tmp_path / "data.xlsx"
    pd.DataFrame({"a": [1, 2]}).to_excel(f, index=False, sheet_name="S1")
    p = profile("data.xlsx", f.read_bytes())
    assert p["format"] == "xlsx" and p["sheets"][0]["name"] == "S1"


def test_output_stays_under_cap():
    header = ",".join(f"col{i}" for i in range(400))
    row = ",".join("value" * 8 for _ in range(400))
    p = profile("data.csv", (header + "\n" + row + "\n").encode())
    assert len(json.dumps(p)) <= 32 * 1024 and p["truncated"] is True
