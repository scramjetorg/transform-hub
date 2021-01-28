#!/bin/bash

function runtest {
    ( cd $line && npm test )
    return $?
}

while IFS='' read -r line; do
    runtest || exit 11
done < <(
    find src/ scripts/ lib/ -name 'package.json' -not -wholename '*node_modules*' -execdir pwd ';'
)

