import json
import subprocess
import sys
from pathlib import Path

RUNNER = Path(__file__).resolve().parents[1] / "app" / "runner.py"


def run(code, tmp_path):
    code_file = tmp_path / "code.py"
    code_file.write_text(code)
    return subprocess.run(
        [sys.executable, "-I", str(RUNNER), str(code_file)],
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=30,
    )


def test_stdout_captured(tmp_path):
    assert "hello" in run("print('hello')", tmp_path).stdout


def test_exception_prints_traceback_and_exits_nonzero(tmp_path):
    r = run("raise RuntimeError('boom')", tmp_path)
    assert r.returncode != 0 and "boom" in r.stderr


def test_show_chart_writes_charts_json(tmp_path):
    r = run("show_chart({'type':'bar','data':{'datasets':[{'data':[1]}]}})", tmp_path)
    assert r.returncode == 0
    charts = json.loads((tmp_path / "charts.json").read_text())
    assert charts[0]["type"] == "bar"


def test_invalid_chart_raises(tmp_path):
    assert run("show_chart({'type':'bad'})", tmp_path).returncode != 0


def test_sixth_chart_raises(tmp_path):
    code = "spec={'type':'bar','data':{'datasets':[{'data':[1]}]}}\n" + "\n".join(
        "show_chart(spec)" for _ in range(6)
    )
    r = run(code, tmp_path)
    assert r.returncode != 0 and "at most 5" in r.stderr


def test_oversized_chart_raises(tmp_path):
    code = (
        "spec={'type':'bar','data':{'datasets':[{'data':list(range(100000))}]}}\n"
        "show_chart(spec)"
    )
    r = run(code, tmp_path)
    assert r.returncode != 0 and "too large" in r.stderr
    assert not (tmp_path / "charts.json").exists()
