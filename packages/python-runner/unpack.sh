#!/usr/bin/env bash

set -e

tar zxf - -C /package 2> $PACKAGE_DIR/.fail && touch /package/.ready || touch $PACKAGE_DIR/.fail
