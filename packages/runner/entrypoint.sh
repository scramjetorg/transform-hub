#!/usr/bin/env bash

set -Eeo pipefail

RUNNER_USER="${RUNNER_USER:-runner}"

main() {
  if [ "$1" == "start-runner" ]; then

    mkdir -p ${RUNNER_DIR} ${PIPES_DIR} ${PACKAGE_DIR}
    chown -R ${RUNNER_USER}:${RUNNER_USER} ${RUNNER_DIR} ${PACKAGE_DIR}
    chown -R :${RUNNER_USER} ${PIPES_DIR}

    exec gosu ${RUNNER_USER} \
                node \
                bin/start-runner
  else
      exec gosu ${RUNNER_USER} "$@"
  fi
}

main "$@"