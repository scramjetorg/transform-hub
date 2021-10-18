#!/usr/bin/env bash

set -e

RUNNER_USER="${RUNNER_USER:-runner}"

if [ "$1" == "start-runner" ]; then
	shift
	mkdir -p ${FIFOS_DIR} ${PACKAGE_DIR}
    chown -R ${RUNNER_USER}:${RUNNER_USER} ${HUB_DIR} ${PACKAGE_DIR}
    chown -R :${RUNNER_USER} ${FIFOS_DIR}

	set -- node bin/start-runner "$@"
fi

exec gosu ${RUNNER_USER} "$@"
