#!/bin/bash

pkg_dir="/package"
pkg_file="package.json"

die() {
    local msg=$1
    local code=${2-1}
    echo >&2 -e "{\"error\":\"${msg}\"}"
    exit ${code}
}

if [ ! -w "${pkg_dir}" ]; then
  die "${pkg_dir} doesnt exist or is not writable."
fi

tar zxf - -C ${pkg_dir} || die "Invalid pkg tar.gz archive"

if [ ! -r "${pkg_dir}/${pkg_file}" ]; then
  die "No ${pkg_file} in pkg archive."
fi

cat ${pkg_dir}/${pkg_file} \
  | jq -c '{ engines, image: .scramjet.image }'
