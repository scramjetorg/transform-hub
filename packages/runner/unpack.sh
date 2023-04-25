#!/usr/bin/env bash

PACKAGE_DIR=${PACKAGE_DIR:-/package}

set -e

tar zxf - -C $PACKAGE_DIR 2>&2 && touch $PACKAGE_DIR/.ready || touch $PACKAGE_DIR/.fail
