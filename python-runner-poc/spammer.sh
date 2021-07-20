#!/bin/bash

value=1
delay=1
counter=0

while true; do
  # log time to stderr for easier debugging
  echo 1>&2 "$(date +%T) - Emit #$counter"
  # payload
  echo "{\"counter\": $counter, \"value\": $value}"

  # sleep longer every 5th time 
  sleep $delay; [ $((counter % 5)) -eq 4 ] && sleep $((delay * 5))
  let "counter++"
done
