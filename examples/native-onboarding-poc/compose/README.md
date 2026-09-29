# Native Compose proof

The proof uses only the MultiManager container ingress on `2443` and a private
STH service. The ingress is not published to the host. Create a temporary
directory for the scenario; it contains the CA and disposable public issued
records. The CA key is used only by the offline Manager CLI and is not mounted
into MultiManager.

```sh
state=$(mktemp -d)
trap 'docker compose down --volumes --remove-orphans; rm -rf "$state"' EXIT
./bootstrap.sh "$state"
COMPOSE_STATE_DIR="$state" MM_COMPOSE_IMAGE=... STH_COMPOSE_IMAGE=... \
  docker compose up -d
```

The BDD lane starts MultiManager first, generates local `csr/v2` keys and CSRs
for STH and `si`, signs them with the offline Manager CLI, installs them, then
imports the native bundle profile into `si`. It deploys the repository-owned
provider and caller fixtures, observes their typed RPC result, and removes all
keys, requests, certificates, records, profiles, archives, containers, and
Compose resources in a `finally` cleanup.
