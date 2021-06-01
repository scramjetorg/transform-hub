#!/usr/bin/env bash

set -e

DIR=$(cd $(dirname $0) && echo $PWD) # return absolute path of the script
IMAGE_CONFIG_JSON=(
    "${DIR}/../packages/csi-config/src/image-config.json"
    "${DIR}/../packages/csi-config/dist/image-config.json"
    "${DIR}/../dist/csi-config/image-config.json"
)
CURR_VER=$(jq -r .version < ${DIR}/../package.json)
NEW_VER=$(npx semver -i prerelease ${CURR_VER})

for i in "${IMAGE_CONFIG_JSON[@]}"
do
  if test -f "$i"; then
    echo -n "${i}: ${CURR_VER} -> ${NEW_VER}"
    sed -i "s|${CURR_VER}|${NEW_VER}|" "${i}" && echo "  ..done"
  else
    echo "${i}: ..skip"
  fi
done
