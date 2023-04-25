#!/usr/bin/env bash

set -e

tar zxf - -C /package 2>&2 && touch /package/.ready || touch $PACKAGE_DIR/.fail
