#!/bin/bash

. ./env.sh

if [ ! -w "${pkg_dir}" ]; then
  die "${pkg_dir} doesnt exist or is not writable."
fi

tar zxf - -C ${pkg_dir} || die "Invalid pkg tar.gz archive"
