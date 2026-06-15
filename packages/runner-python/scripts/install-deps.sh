#!/usr/bin/env bash
set -euo pipefail

PACKAGE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "${PACKAGE_DIR}/../.." && pwd)"
TARGET=""
INCLUDE_DEV=0
VERSER2_VERSION="0.3.1"
VERSER2_WHEEL="verser2_guest_python-${VERSER2_VERSION}-py3-none-any.whl"
VERSER2_WHEEL_SHA256="c1529bef856959c0baab2f0c012a052788b1a725ca2be75baf51c557f741a212"

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

if [[ -z "${GH_TOKEN:-}" && -z "${GITHUB_TOKEN:-}" && -z "${GITHUB_PACKAGES_TOKEN:-}" && -f "${REPO_ROOT}/.env" ]]; then
    set -a
    # shellcheck disable=SC1091
    . "${REPO_ROOT}/.env"
    set +a
fi

if [[ -z "${GH_TOKEN:-}" && -z "${GITHUB_TOKEN:-}" ]] && ! gh auth status >/dev/null 2>&1 && [[ -n "${GITHUB_PACKAGES_TOKEN:-}" ]]; then
    export GH_TOKEN="${GITHUB_PACKAGES_TOKEN}"
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

gh release download "v${VERSER2_VERSION}" \
    --repo signicode/verser2 \
    --pattern "${VERSER2_WHEEL}" \
    --dir "${TMP_DIR}"

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
