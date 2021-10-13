#!/usr/bin/env bash

set -Eeo pipefail

RUNNER_USER="${RUNNER_USER:-runner}"

main() {
  if [ "$1" == "start-runner" ]; then

    mkdir -p ${HUB_DIR} ${FIFOS_DIR} ${PACKAGE_DIR}
    chown -R ${RUNNER_USER}:${RUNNER_USER} ${HUB_DIR} ${PACKAGE_DIR}
    chown -R :${RUNNER_USER} ${FIFOS_DIR}

    exec gosu ${RUNNER_USER} \
                node \
                bin/start-runner
  else
      exec gosu ${RUNNER_USER} "$@"
  fi
}

main "$@"
