#!/bin/bash

# create docker volume called PACKAGE without displaying it's name
docker volume create PACKAGE > /dev/null

# pass stdin to docker
cat <&0  | docker run -i --rm -v PACKAGE:/package scramjet/pre-runner:latest -t
