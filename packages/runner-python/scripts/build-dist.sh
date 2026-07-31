#!/usr/bin/env bash
set -euo pipefail

PACKAGE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="${PACKAGE_DIR}/dist"

# The root package build pre-packs this directory into dist/runner-python.
# Stage the exact production layout selected by buildPythonPath(): source,
# compatibility launcher, Python metadata, and vendored runtime dependencies.
rm -rf "${DIST_DIR}"
mkdir -p "${DIST_DIR}"

bash "${PACKAGE_DIR}/scripts/install-deps.sh" --target "dist/__pypackages__"

cp "${PACKAGE_DIR}/LICENSE" "${DIST_DIR}/LICENSE"
cp "${PACKAGE_DIR}/pyproject.toml" "${DIST_DIR}/pyproject.toml"
cp "${PACKAGE_DIR}/requirements.txt" "${DIST_DIR}/requirements.txt"
cp -R "${PACKAGE_DIR}/runner_python" "${DIST_DIR}/runner_python"
cp -R "${PACKAGE_DIR}/src" "${DIST_DIR}/src"
