#!/usr/bin/env bash

set -e

while true; do
    sleep 1;

    if test -f /package/.ready; then
       docker-entrypoint.sh start-runner;
       exit $?; 
    fi
done;
