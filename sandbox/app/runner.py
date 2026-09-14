"""Executes user code inside the sandbox child process.

Runs with -I (isolated) and an empty environment. Injects show_chart into the
code's globals; specs append to charts.json in the cwd after validation.
"""

import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))  # -I strips the script dir

from chart_schema import MAX_CHART_BYTES, MAX_CHARTS, validate_chart_spec  # noqa: E402

_charts = []


def show_chart(spec):
    """Validates the spec, then appends it to charts.json in the cwd."""
    validate_chart_spec(spec)
    if len(_charts) >= MAX_CHARTS:
        raise ValueError(f"at most {MAX_CHARTS} charts per execution")
    encoded = json.dumps(spec)
    if len(encoded) > MAX_CHART_BYTES:
        raise ValueError(
            f"chart spec is too large: {len(encoded)} bytes, the limit is {MAX_CHART_BYTES}"
        )
    _charts.append(spec)
    Path("charts.json").write_text(json.dumps(_charts))


def main():
    """Compiles and executes the code file named by the first argument."""
    code = Path(sys.argv[1]).read_text()
    # CPython adds LC_CTYPE to the child even when the parent passes env={}.
    # Clear the environment so user code sees no variable at all.
    os.environ.clear()
    exec(
        compile(code, "user_code.py", "exec"),
        {"show_chart": show_chart, "__name__": "__main__"},
    )


if __name__ == "__main__":
    main()
