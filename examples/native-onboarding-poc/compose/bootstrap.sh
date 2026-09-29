#!/bin/sh
set -eu

# This script creates disposable state in a caller-owned temporary directory.
# It intentionally takes no credentials or secret values from the environment.
root=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
state=${1:?usage: bootstrap.sh TEMP_STATE_DIRECTORY}
case "$state" in /*) ;; *) state="$root/$state" ;; esac
mkdir -p -m 700 "$state"
mkdir -p -m 700 "$state/issued-store" "$state/sth-identity" "$state/si-identity"

openssl req -x509 -newkey rsa:2048 -nodes -days 365 \
  -addext 'basicConstraints=critical,CA:TRUE' -addext 'keyUsage=critical,keyCertSign,cRLSign' \
  -subj '/CN=scramjet-native-compose-ca' -keyout "$state/ca.key" -out "$state/ca.pem" >/dev/null 2>&1

make_server_cert() {
  name=$1
  san=$2
  openssl req -newkey rsa:2048 -nodes -subj "/CN=$name" \
    -keyout "$state/$name.key" -out "$state/$name.csr" >/dev/null 2>&1
  printf 'subjectAltName=%s\nextendedKeyUsage=serverAuth,clientAuth\n' "$san" > "$state/$name.ext"
  openssl x509 -req -days 1 -sha256 -in "$state/$name.csr" \
    -CA "$state/ca.pem" -CAkey "$state/ca.key" -CAcreateserial \
    -extfile "$state/$name.ext" -out "$state/$name.pem" >/dev/null 2>&1
  rm -f "$state/$name.csr" "$state/$name.ext"
}

make_server_cert mm 'DNS:multimanager,DNS:localhost'
chmod 600 "$state"/*.key

cp "$root/config/mm.json" "$state/mm.json"
cp "$root/config/sth.json" "$state/sth.json"
