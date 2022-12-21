#!/bin/bash

display_help() {
    echo "Usage: $0 <target>" >&2
    echo >&2
    echo "Copies files to a script dir (or CWD if the dirname is 'script')" >&2
    exit 1
}

show_error() {
    echo "$1" >&2
    exit 2
}

WD=$(dirname $0)
TARGET=

while [[ "$#" -gt 0 ]]; do
    case $1 in
        -h|--help) display_help; shift ;;
        *) TARGET="$1" ;;
    esac
    shift
done

[ -z "$TARGET" ] && display_help
[ -w "$TARGET" ] && [ -d "$TARGET" ] || show_error "Erorr: Target must be a writable directory..."

echo "Copying scripts..." >&2

cp -pvt "$TARGET" \
    $WD/add-to-packages-json.js \
    $WD/build-all.js \
    $WD/deps-update.js \
    $WD/run-script.js

echo "Copying libs..." >&2

mkdir -p "${TARGET%/}/lib"
cp -pvt "${TARGET%/}/lib" \
    $WD/lib/build-utils.js \
    $WD/lib/get-deep-deps.js \
    $WD/lib/opts.js

echo "Scripts copied" >&2
echo >&2
echo "Remember to add dependencies: npm i -D glob globrex minimist semver scramjet @npmcli/run-script" >&2
