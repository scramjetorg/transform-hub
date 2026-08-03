from __future__ import annotations

from pathlib import Path


package_root = Path(__file__).resolve().parents[1]
source_package = package_root / "src" / "runner_python"
__path__ = [str(Path(__file__).resolve().parent), str(source_package)]
