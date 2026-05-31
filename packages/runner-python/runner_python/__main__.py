from __future__ import annotations

import runpy
from pathlib import Path


source_main = Path(__file__).resolve().parents[1] / "src" / "runner_python" / "__main__.py"
runpy.run_path(str(source_main), run_name="__main__")
