#!/usr/bin/env bash
set -euo pipefail

PACKAGE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "${PACKAGE_DIR}/../.." && pwd)"
TARGET=""
INCLUDE_DEV=0
VERSER2_VERSION="0.4.2"
VERSER2_WHEEL="verser2_guest_python-${VERSER2_VERSION}-py3-none-any.whl"
VERSER2_WHEEL_SHA256="da5ab6efd2ef572a864b8f6766f043fcbe25af3d10a5f5ba0c3878e82e84eef0"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --target)
            TARGET="$2"
            shift 2
            ;;
        --dev)
            INCLUDE_DEV=1
            shift
            ;;
        *)
            echo "Unknown argument: $1" >&2
            exit 2
            ;;
    esac
done

if [[ -z "${TARGET}" ]]; then
    echo "Missing required --target argument" >&2
    exit 2
fi

# No GitHub CLI or GitHub Packages token is required; the Python wheel is a
# public GitHub release asset and verser2 npm packages resolve from public npmjs.

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

python - "https://github.com/signicode/verser2/releases/download/v${VERSER2_VERSION}/${VERSER2_WHEEL}" "${TMP_DIR}/${VERSER2_WHEEL}" <<'PY'
import sys
from pathlib import Path
from urllib.request import urlopen

url, destination = sys.argv[1], Path(sys.argv[2])

with urlopen(url) as response:
    destination.write_bytes(response.read())
PY

echo "${VERSER2_WHEEL_SHA256}  ${TMP_DIR}/${VERSER2_WHEEL}" | sha256sum --check --status

PIP_ARGS=(
    -r "${PACKAGE_DIR}/requirements.txt"
    "${TMP_DIR}/${VERSER2_WHEEL}"
    --target "${PACKAGE_DIR}/${TARGET}"
    --upgrade
)

if [[ "${INCLUDE_DEV}" == "1" ]]; then
    PIP_ARGS+=( -r "${PACKAGE_DIR}/requirements-dev.txt" )
fi

pip install "${PIP_ARGS[@]}"
