#!/bin/bash

RUNNER_USER="${RUNNER_USER:-runner}"

chown -R ${RUNNER_USER}:${RUNNER_USER} ${HUB_DIR} ${PACKAGE_DIR}
