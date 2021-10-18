#!/bin/bash

pkg_dir="${PACKAGE_DIR:-/package}"
pkg_file="package.json"

die() {
    local msg=$1
    local code=${2-1}
    echo >&1 -e "{\"error\":\"${msg}\"}"
    exit ${code}
}
