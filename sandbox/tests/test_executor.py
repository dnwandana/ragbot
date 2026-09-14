import time
from pathlib import Path

from app.executor import STDOUT_CAP, run_code


def test_success_returns_stdout():
    r = run_code("print('hi')", [], 10000)
    assert r["ok"] and "hi" in r["stdout"] and r["error"] is None


def test_input_file_readable():
    r = run_code(
        "print(open('data.csv').read())",
        [{"name": "data.csv", "content": b"a,b\n1,2"}],
        10000,
    )
    assert r["ok"] and "1,2" in r["stdout"]


def test_exception_maps_to_error():
    r = run_code("raise ValueError('x')", [], 10000)
    assert not r["ok"] and r["error"] == "exception" and "ValueError" in r["stderr"]


def test_timeout_kills_child():
    r = run_code("import time; time.sleep(30)", [], 1000)
    assert not r["ok"] and r["error"] == "timeout"


def test_stdout_truncated():
    r = run_code("print('x' * 200000)", [], 10000)
    assert len(r["stdout"]) <= STDOUT_CAP + 100 and "[truncated]" in r["stdout"]


def test_charts_returned():
    r = run_code("show_chart({'type':'bar','data':{'datasets':[{'data':[1]}]}})", [], 10000)
    assert r["charts"][0]["type"] == "bar"


def test_env_is_empty():
    r = run_code("import os; print(len(os.environ))", [], 10000)
    assert r["stdout"].strip() == "0"


def test_workdir_cleaned(tmp_path, monkeypatch):
    monkeypatch.setattr("tempfile.tempdir", str(tmp_path))
    run_code("print(1)", [], 10000)
    assert list(tmp_path.iterdir()) == []


VALID_SPEC = "{'type':'bar','data':{'datasets':[{'data':[1]}]}}"


def test_malformed_charts_file_yields_no_charts():
    r = run_code("open('charts.json','w').write('{not json')", [], 10000)
    assert r["ok"] and r["charts"] == []


def test_invalid_chart_in_charts_file_dropped():
    code = f"import json; json.dump([{{'type':'bad'}}, {VALID_SPEC}], open('charts.json','w'))"
    r = run_code(code, [], 10000)
    assert r["charts"] == [{"type": "bar", "data": {"datasets": [{"data": [1]}]}}]


def test_oversized_chart_in_charts_file_dropped():
    code = (
        "import json; big={'type':'bar','data':{'datasets':[{'data':list(range(100000))}]}}\n"
        f"json.dump([big, {VALID_SPEC}], open('charts.json','w'))"
    )
    r = run_code(code, [], 10000)
    assert len(r["charts"]) == 1 and r["charts"][0]["data"]["datasets"][0]["data"] == [1]


def test_charts_file_capped_at_max_charts():
    from app.chart_schema import MAX_CHARTS

    code = f"import json; json.dump([{VALID_SPEC}] * 7, open('charts.json','w'))"
    r = run_code(code, [], 10000)
    assert len(r["charts"]) == MAX_CHARTS


def _process_is_gone(pid):
    stat = Path(f"/proc/{pid}/stat")
    if not stat.exists():
        return True
    state = stat.read_text().rsplit(")", 1)[1].split()[0]
    return state == "Z"


def _wait_gone(pid):
    for _ in range(50):
        if _process_is_gone(pid):
            return True
        time.sleep(0.1)
    return _process_is_gone(pid)


def test_grandchild_killed_after_normal_exit():
    code = "import subprocess; p=subprocess.Popen(['sleep','60']); print(p.pid, flush=True)"
    r = run_code(code, [], 10000)
    assert r["ok"]
    assert _wait_gone(int(r["stdout"].split()[0]))


def test_grandchild_killed_after_timeout():
    code = (
        "import subprocess, time; p=subprocess.Popen(['sleep','60']); "
        "print(p.pid, flush=True); time.sleep(30)"
    )
    r = run_code(code, [], 1000)
    assert r["error"] == "timeout"
    assert _wait_gone(int(r["stdout"].split()[0]))


def test_large_stdout_stays_capped():
    code = "import sys\nfor _ in range(20): sys.stdout.write('y' * (1024 * 1024))"
    r = run_code(code, [], 20000)
    assert len(r["stdout"]) <= STDOUT_CAP + 100 and "[truncated]" in r["stdout"]
