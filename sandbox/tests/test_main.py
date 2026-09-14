import base64, importlib
import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.setenv("SANDBOX_API_TOKEN", "test-token")
    from app import main

    importlib.reload(main)
    return TestClient(main.app)


AUTH = {"Authorization": "Bearer test-token"}


def b64(s):
    return base64.b64encode(s.encode()).decode()


def test_health_needs_no_auth(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_execute_rejects_missing_token(client):
    assert client.post("/execute", json={"code": "print(1)"}).status_code == 401


def test_execute_rejects_wrong_token(client):
    r = client.post(
        "/execute", json={"code": "print(1)"}, headers={"Authorization": "Bearer nope"}
    )
    assert r.status_code == 401


def test_execute_runs_code(client):
    r = client.post("/execute", json={"code": "print('ok')"}, headers=AUTH)
    assert r.status_code == 200 and r.json()["ok"] and "ok" in r.json()["stdout"]


def test_execute_decodes_files(client):
    body = {
        "code": "print(open('a.csv').read())",
        "files": [{"name": "a.csv", "content_b64": b64("x,y\n1,2")}],
    }
    r = client.post("/execute", json=body, headers=AUTH)
    assert "1,2" in r.json()["stdout"]


def test_bad_filename_rejected(client):
    for name in ["../etc/passwd", ".hidden", "a b.csv", "a/b.csv"]:
        body = {"code": "print(1)", "files": [{"name": name, "content_b64": b64("x")}]}
        assert client.post("/execute", json=body, headers=AUTH).status_code == 422


def test_code_size_capped(client):
    r = client.post("/execute", json={"code": "#" + "x" * (64 * 1024)}, headers=AUTH)
    assert r.status_code == 422


def test_timeout_clamped_to_hard_max(client, monkeypatch):
    from app import main

    seen = {}

    def fake_run(code, files, timeout_ms):
        seen["t"] = timeout_ms
        return {"ok": True, "stdout": "", "stderr": "", "charts": [], "error": None}

    monkeypatch.setattr(main, "run_code", fake_run)
    client.post("/execute", json={"code": "1", "timeout_ms": 999999}, headers=AUTH)
    assert seen["t"] == 60000


def test_busy_returns_429(client, monkeypatch):
    from app import main

    monkeypatch.setattr(
        main, "_semaphore", __import__("threading").BoundedSemaphore(0)
    )
    r = client.post("/execute", json={"code": "1"}, headers=AUTH)
    assert r.status_code == 429


def test_reserved_filenames_rejected(client):
    for name in ["charts.json", "__user_code__.py", "stdout", "stderr"]:
        body = {"code": "print(1)", "files": [{"name": name, "content_b64": b64("x")}]}
        assert client.post("/execute", json=body, headers=AUTH).status_code == 422, name


def test_second_concurrent_execute_returns_429(client, monkeypatch):
    import threading

    from app import main

    started = threading.Event()
    release = threading.Event()

    def blocking_run(code, files, timeout_ms):
        started.set()
        release.wait(timeout=10)
        return {"ok": True, "stdout": "", "stderr": "", "charts": [], "error": None}

    monkeypatch.setattr(main, "run_code", blocking_run)
    first = {}

    def post_first():
        first["r"] = client.post("/execute", json={"code": "1"}, headers=AUTH)

    t = threading.Thread(target=post_first)
    t.start()
    assert started.wait(timeout=5)
    second = client.post("/execute", json={"code": "1"}, headers=AUTH)
    release.set()
    t.join(timeout=10)
    assert second.status_code == 429
    assert first["r"].status_code == 200
