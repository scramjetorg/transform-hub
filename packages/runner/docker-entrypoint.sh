#!/usr/bin/env bash

set -e

RUNNER_USER="${RUNNER_USER:-runner}"

if [ "$1" == "start-runner" ]; then
	shift
	set -- node bin/start-runner "$@"
fi

exec gosu ${RUNNER_USER} "$@"
