#!/usr/bin/env bash

set -e

tar zxf - -C /package && chown -R 1200:1200 $PACKAGE_DIR && touch /package/.ready || touch $PACKAGE_DIR/.fail
