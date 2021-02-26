#!/bin/bash
tar zxf - -C /package && cat /package/package.json | \
    jq -c '{ engines, image: .scramjet.image }'
