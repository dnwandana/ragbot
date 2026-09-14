"""Spawns the runner as an isolated child process and collects capped output."""

import json
import os
import shutil
import signal
import subprocess
import sys
import tempfile
from pathlib import Path

from app.chart_schema import MAX_CHART_BYTES, MAX_CHARTS, validate_chart_spec

RUNNER = Path(__file__).resolve().parent / "runner.py"
STDOUT_CAP = 64 * 1024
STDERR_CAP = 16 * 1024


def _read_capped(path, cap):
    """Returns at most cap characters of the file, with a marker when it is longer."""
    with open(path, "rb") as fh:
        data = fh.read(cap + 1)
    text = data.decode("utf-8", "replace")
    return text if len(data) <= cap else text[:cap] + "\n[truncated]"


def _load_charts(charts_file):
    """Returns the valid chart specs from charts.json. User code can write that file."""
    try:
        raw = json.loads(charts_file.read_text())
    except (OSError, ValueError):
        return []
    if not isinstance(raw, list):
        return []
    charts = []
    for spec in raw:
        try:
            validate_chart_spec(spec)
        except ValueError:
            continue
        if len(json.dumps(spec)) > MAX_CHART_BYTES:
            continue
        charts.append(spec)
        if len(charts) == MAX_CHARTS:
            break
    return charts


def _kill_process_group(proc):
    """Kills the runner and every process it started. The group id is the runner pid."""
    try:
        os.killpg(proc.pid, signal.SIGKILL)
    except ProcessLookupError:
        pass
    proc.wait()


def run_code(code, files, timeout_ms):
    """Runs the code in a temporary workdir and returns the capped result."""
    workdir = Path(tempfile.mkdtemp(prefix="exec-"))
    try:
        for f in files:
            (workdir / f["name"]).write_bytes(f["content"])
        code_file = workdir / "__user_code__.py"
        code_file.write_text(code)
        stdout_file = workdir / "stdout"
        stderr_file = workdir / "stderr"
        # Output goes to files on the tmpfs, so the runner cannot grow the server
        # memory with an unbounded print. A new session puts the runner and its
        # children in one process group, so one killpg stops all of them.
        with open(stdout_file, "wb") as out, open(stderr_file, "wb") as err:
            proc = subprocess.Popen(
                [sys.executable, "-I", str(RUNNER), str(code_file)],
                cwd=workdir,
                env={},
                stdin=subprocess.DEVNULL,
                stdout=out,
                stderr=err,
                start_new_session=True,
            )
            try:
                proc.wait(timeout=timeout_ms / 1000)
                timed_out = False
            except subprocess.TimeoutExpired:
                timed_out = True
            finally:
                _kill_process_group(proc)
        stdout = _read_capped(stdout_file, STDOUT_CAP)
        stderr = _read_capped(stderr_file, STDERR_CAP)
        if timed_out:
            return {
                "ok": False,
                "stdout": stdout,
                "stderr": stderr,
                "charts": [],
                "error": "timeout",
            }
        if proc.returncode == 0:
            error = None
        elif proc.returncode < 0:
            error = "memory"  # killed by a signal (OOM or cgroup kill)
        else:
            error = "exception"
        return {
            "ok": proc.returncode == 0,
            "stdout": stdout,
            "stderr": stderr,
            "charts": _load_charts(workdir / "charts.json"),
            "error": error,
        }
    finally:
        shutil.rmtree(workdir, ignore_errors=True)
