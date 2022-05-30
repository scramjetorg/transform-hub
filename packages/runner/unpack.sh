#!/usr/bin/env bash

PACKAGE_DIR=${PACKAGE_DIR:-/package}

set -e

tar zxf - -C $PACKAGE_DIR 2> $PACKAGE_DIR/.fail && touch $PACKAGE_DIR/.ready || touch $PACKAGE_DIR/.fail
