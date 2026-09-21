#!/usr/bin/env bash

set -e

RUNNER_USER="${RUNNER_USER:-runner}"
export PYTHONPATH="/opt/runner-python:/opt/runner-python/src:/package/__pypackages__:${PYTHONPATH:-}"

if [ "$1" == "start-runner" ]; then
	shift
	set -- node /opt/runner/dist/bin/start-runner.js "$@"
fi

exec gosu ${RUNNER_USER} "$@"
