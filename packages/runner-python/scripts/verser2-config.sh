# Shared verser2 guest Python wheel configuration.
#
# Sourced by install-deps.sh and the Dockerfile so that both local
# development and the Docker image consume the identical wheel with the
# same checksum verification.  This is the single source of truth for
# the wheel version and integrity hash.
#
# VERSER2_WHEEL_URL is derived from VERSER2_VERSION automatically.

VERSER2_VERSION="0.4.2"
VERSER2_WHEEL="verser2_guest_python-${VERSER2_VERSION}-py3-none-any.whl"
VERSER2_WHEEL_SHA256="da5ab6efd2ef572a864b8f6766f043fcbe25af3d10a5f5ba0c3878e82e84eef0"
VERSER2_WHEEL_URL="https://github.com/signicode/verser2/releases/download/v${VERSER2_VERSION}/${VERSER2_WHEEL}"
