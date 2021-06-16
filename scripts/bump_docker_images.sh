#!/usr/bin/env bash

set -e

DIR=$(cd $(dirname $0) && echo $PWD) # return absolute path of the script
IMAGE_CONFIG_JSON=(
  "${DIR}/../packages/csi-config/src/image-config.json"
  "${DIR}/../packages/csi-config/dist/image-config.json"
  "${DIR}/../dist/csi-config/image-config.json"
)
OTHER_FILES_WITH_CURRENT_VER=(
  "${DIR}/../packages/host/Dockerfile.release"
  "${DIR}/../packages/host/docker-compose.yaml"
)
CURR_VER=$(jq -r .version < ${DIR}/../package.json) # current release
NEW_VER=$(npx semver -i prerelease ${CURR_VER}) # new release

echo "Checking image-config.json files.."
for i in "${IMAGE_CONFIG_JSON[@]}"
do
  if test -f "$i"; then
    echo -n "${i}: ${CURR_VER} -> ${NEW_VER}"
    sed -i "s|${CURR_VER}|${NEW_VER}|" "${i}" && echo "  ..done"
  else
    echo "${i}: ..skip"
  fi
done

echo ""

# Currently separated from image-config.json files
echo "Checking other files with version.."
for i in "${OTHER_FILES_WITH_CURRENT_VER[@]}"
do
  if test -f "$i"; then
    echo -n "${i}: ${CURR_VER} -> ${NEW_VER}"
    sed -i "s|${CURR_VER}|${NEW_VER}|" "${i}" && echo "  ..done"
  else
    echo "${i}: ..skip"
  fi
done
