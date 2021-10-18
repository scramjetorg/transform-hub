#!/usr/bin/env bash

set -e

HUB_USER="${HUB_USER:-sth}"

chown -R ${HUB_USER}:${HUB_USER} ${HUB_DIR}

if [ "${1#-}" != "$1" ]; then
	set -- node bin/hub "$@"
fi

if [ "$1" == "scramjet-transform-hub" ]; then
	shift
	set -- node bin/hub -H 0.0.0.0 -P 8000 "$@"
fi

exec gosu ${HUB_USER} "$@"
