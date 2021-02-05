#!/bin/bash

pid_var=$(ps -x | grep $1 | grep node | cut -d " " -f2)

if [[ $variable ]]; then
    kill $pid_var;
fi

if test -S "$1"; then
   rm $1
fi