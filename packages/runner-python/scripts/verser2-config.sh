# Shared verser2 guest Python wheel configuration.
#
# Sourced by install-deps.sh and the Dockerfile so that both local
# development and the Docker image consume the identical wheel with the
# same checksum verification.  This is the single source of truth for
# the wheel version and integrity hash.
#
# VERSER2_WHEEL_URL is derived from VERSER2_VERSION automatically.

VERSER2_VERSION="0.9.3"
VERSER2_WHEEL="verser2_guest_python-${VERSER2_VERSION}-py3-none-any.whl"
VERSER2_WHEEL_SHA256="7e511a910c49cb8efd0af9e1f7f9ee604786aa2c891fbf243b1107cfcbbc509a"
VERSER2_WHEEL_URL="https://github.com/signicode/verser2/releases/download/v${VERSER2_VERSION}/${VERSER2_WHEEL}"
