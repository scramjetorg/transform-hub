#!/bin/bash

mkdir -p /package

# unpack from stdin to /package
cat <&0 | tar zxf - -C /package

# get fields from package.json and print to stdout
cat /package/package.json | jq '{ engines, image: .scramjet.image }' | cat
