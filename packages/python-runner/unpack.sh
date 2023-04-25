#!/usr/bin/env bash

set -e

tar zxf - -C /package && touch /package/.ready || touch $PACKAGE_DIR/.fail
