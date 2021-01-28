#!/bin/bash

find src/ scripts/ lib/ -name 'package.json' -not -wholename '*node_modules*' -execdir npm install ';'