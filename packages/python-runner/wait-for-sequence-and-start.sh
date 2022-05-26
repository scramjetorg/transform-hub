#!/usr/bin/env bash

set -e

while true; do
    sleep 1;

    if test -f /package/.ready; then
        docker-entrypoint.sh start-runner;
        exit $?;
    elif test -f /package/.fail; then
        >&2 echo "$(cat /package/.fail)"
        exit 10
    fi
done;
