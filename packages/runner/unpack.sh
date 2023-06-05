#!/usr/bin/env bash

PACKAGE_DIR=${PACKAGE_DIR:-/package}

set -e

tar zxf - -C $PACKAGE_DIR && chown -R 1200:1200 $PACKAGE_DIR && touch $PACKAGE_DIR/.ready || touch $PACKAGE_DIR/.fail
