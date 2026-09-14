"""HTTP surface for the sandbox: bearer auth, validation, concurrency cap."""

import base64
import os
import re
import threading

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field, field_validator

from app.executor import run_code

MAX_CODE_BYTES = 64 * 1024
MAX_TIMEOUT_MS = 60000
MIN_TIMEOUT_MS = 1000
DEFAULT_TIMEOUT_MS = 30000
# Every execution runs as the same uid, so a concurrent run could read the
# other run's workdir through /proc/<pid>/cwd. Keep one execution at a time
# until each run gets its own uid.
MAX_CONCURRENCY = 1
FILENAME_RE = re.compile(r"^[A-Za-z0-9._-]+$")
# Names the executor and the runner write into the workdir themselves.
RESERVED_NAMES = {"charts.json", "__user_code__.py", "stdout", "stderr"}

API_TOKEN = os.environ.get("SANDBOX_API_TOKEN", "")
_semaphore = threading.BoundedSemaphore(MAX_CONCURRENCY)

app = FastAPI()


class FileInput(BaseModel):
    """One input file written into the execution workdir."""

    name: str
    content_b64: str

    @field_validator("name")
    @classmethod
    def name_is_safe(cls, v):
        """Blocks path traversal, dotfiles, and the names the sandbox writes."""
        if not FILENAME_RE.match(v) or v.startswith(".") or v in RESERVED_NAMES:
            raise ValueError("file name is not allowed")
        return v


class ExecuteRequest(BaseModel):
    """Body of POST /execute."""

    code: str = Field(max_length=MAX_CODE_BYTES)
    files: list[FileInput] = []
    timeout_ms: int = DEFAULT_TIMEOUT_MS


def _check_auth(authorization):
    """Raises 401 when the bearer token does not match SANDBOX_API_TOKEN."""
    if not API_TOKEN or authorization != f"Bearer {API_TOKEN}":
        raise HTTPException(status_code=401, detail="invalid token")


@app.get("/health")
def health():
    """Returns the liveness payload. No auth, so Docker can call it."""
    return {"status": "ok"}


@app.post("/execute")
def execute(req: ExecuteRequest, authorization: str = Header(default="")):
    """Runs the code with the posted files and returns the capped result."""
    _check_auth(authorization)
    if not _semaphore.acquire(blocking=False):
        raise HTTPException(status_code=429, detail="sandbox busy")
    try:
        files = [
            {"name": f.name, "content": base64.b64decode(f.content_b64)}
            for f in req.files
        ]
        timeout_ms = min(max(req.timeout_ms, MIN_TIMEOUT_MS), MAX_TIMEOUT_MS)
        return run_code(req.code, files, timeout_ms)
    finally:
        _semaphore.release()
