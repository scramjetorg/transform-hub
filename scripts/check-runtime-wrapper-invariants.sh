#!/usr/bin/env bash
#
# check-runtime-wrapper-invariants.sh
#
# Static guards against regressions of the runner-worker / python-runner
# wrapper isolation decisions captured in
# .omo/plans/runner-worker-isolation.md.
#
# All checks are read-only. The script exits with a non-zero status if any
# guard finds a forbidden pattern. Each guard prints a single
# "GUARD <N>: PASS|FAIL - <description>" line.
#
# Usage:
#   bash scripts/check-runtime-wrapper-invariants.sh
#
# Requirements: ripgrep (`rg`).

set -o pipefail

# Resolve repository root so the script works from any CWD.
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
REPO_ROOT="$(cd -- "${SCRIPT_DIR}/.." &> /dev/null && pwd)"
cd "${REPO_ROOT}"

if ! command -v rg > /dev/null 2>&1; then
    echo "ERROR: ripgrep (rg) is required but not installed." >&2
    exit 2
fi

PASS=0
FAIL=0
FAILURES=()

# run_guard <num> <description> <command...>
# Command should exit 0 on PASS, non-zero on FAIL.
run_guard() {
    local num="$1"
    local desc="$2"
    shift 2
    if "$@"; then
        echo "GUARD ${num}: PASS - ${desc}"
        PASS=$((PASS + 1))
    else
        echo "GUARD ${num}: FAIL - ${desc}"
        FAILURES+=("GUARD ${num}: FAIL - ${desc}")
        FAIL=$((FAIL + 1))
    fi
}

# ----------------------------------------------------------------------------
# Guard 1: No adapter-local runtime engine branching in adapter packages.
#
# Adapter src trees must not branch directly on runtime engines; selection is
# centralized in packages/symbols/src/runtime-kind.ts and shared helpers.
# Allow config/schema/image property access, but forbid engine-based branching.
# ----------------------------------------------------------------------------
guard1() {
    local hits
    hits="$(
        rg -n '"(node|bun|python3)"\s+in\s+engines|engines\.(node|bun|python3)' \
            packages/adapter-process/src \
            packages/adapter-docker/src \
            packages/adapter-kubernetes/src \
            --glob '!**/codemap.md' \
            2> /dev/null \
        || true
    )"
    if [ -z "${hits}" ]; then
        return 0
    fi
    echo "  forbidden \"python3\" references:"
    printf '    %s\n' "${hits}"
    return 1
}

# ----------------------------------------------------------------------------
# Guard 2: runner-python must not read the host wrapper env vars
# (SEQUENCE_PATH / SEQUENCE_INFO / RUNNER_CONNECT_INFO). Python runner
# receives its config via stdin/stdout from the Node runner-host wrapper.
# ----------------------------------------------------------------------------
guard2() {
    local hits
    hits="$(
        rg -n 'os\.environ.*(SEQUENCE_PATH|SEQUENCE_INFO|RUNNER_CONNECT_INFO)' \
            packages/runner-python/src \
            2> /dev/null \
        || true
    )"
    if [ -z "${hits}" ]; then
        return 0
    fi
    echo "  forbidden env-var reads:"
    printf '    %s\n' "${hits}"
    return 1
}

# ----------------------------------------------------------------------------
# Guard 3: runner-python must not import bpmux. Multiplexing is owned by the
# Node runner-host wrapper; the Python side speaks a plain stdio protocol.
# ----------------------------------------------------------------------------
guard3() {
    local hits
    hits="$(
        rg -n 'bpmux' packages/runner-python --glob '!Dockerfile*' 2> /dev/null || true
    )"
    if [ -z "${hits}" ]; then
        return 0
    fi
    echo "  forbidden bpmux references:"
    printf '    %s\n' "${hits}"
    return 1
}

# ----------------------------------------------------------------------------
# Guard 4: runner-python must not open a REQUESTS channel. REQUESTS is a
# Node-runner-only channel (see packages/runner-node/src/utils.ts).
# ----------------------------------------------------------------------------
guard4() {
    local hits
    hits="$(
        rg -in 'REQUESTS' packages/runner-python/src 2> /dev/null || true
    )"
    if [ -z "${hits}" ]; then
        return 0
    fi
    echo "  forbidden REQUESTS references:"
    printf '    %s\n' "${hits}"
    return 1
}

# ----------------------------------------------------------------------------
# Guard 5: No `@scramjet/python-runner` references outside CHANGELOG / docs
# / roadmap / lockfiles. The wrapper rename retires the package; lingering
# references in source or package.json indicate incomplete migration.
# ----------------------------------------------------------------------------
guard5() {
    local hits
    hits="$(
        rg -l '@scramjet/python-runner' 2> /dev/null \
        | rg -v 'CHANGELOG' \
        | rg -v 'docs/roadmap' \
        | rg -v '(^|/)yarn\.lock$' \
        | rg -v '(^|/)package-lock\.json$' \
        | rg -v 'scripts/check-runtime-wrapper-invariants\.sh' \
        || true
    )"
    if [ -z "${hits}" ]; then
        return 0
    fi
    echo "  files referencing @scramjet/python-runner:"
    printf '    %s\n' "${hits}"
    return 1
}

# ----------------------------------------------------------------------------
# Guard 6: No `process.stdout =` reassignment or `redirectOutputs` regression
# in the runner package. Output redirection must not be reintroduced.
# ----------------------------------------------------------------------------
guard6() {
    local hits
    hits="$(
        rg -n 'process\.stdout\s*=|redirectOutputs' \
            packages/runner/src \
            2> /dev/null \
        || true
    )"
    if [ -z "${hits}" ]; then
        return 0
    fi
    echo "  forbidden stdout reassignment / redirectOutputs:"
    printf '    %s\n' "${hits}"
    return 1
}

# ----------------------------------------------------------------------------
# Guard 7: No new active BPMux / old-verser usage outside the explicit legacy
# migration allowlist. Existing paths are still present during the verser2
# rollout, but new paths must not be added while transports move behind
# verser2 abstractions.
# ----------------------------------------------------------------------------
guard7() {
    local files
    files="$(
        rg -l '@scramjet/bpmux|@scramjet/verser|from .*bpmux|require\(["'\''`]bpmux|import .*BPMux|new BPMux|new Verser|VerserClient|VerserConnection' \
            packages package.json \
            --glob '!**/codemap.md' \
            --glob '!package-lock.json' \
            2> /dev/null \
        || true
    )"

    local forbidden=()
    local file
    while IFS= read -r file; do
        [ -z "${file}" ] && continue
        case "${file}" in
            packages/bpmux/*|\
            packages/verser/*|\
            packages/host/package.json|\
            packages/host/src/lib/cpm-connector.ts|\
            packages/host/src/lib/csi-controller.ts|\
            packages/manager/package.json|\
            packages/manager/src/lib/manager.ts|\
            packages/manager/src/lib/sth-controller.ts|\
            packages/multi-manager/package.json|\
            packages/multi-manager/src/lib/multi-manager.ts|\
            packages/multi-manager/src/lib/multi-host-controller.ts|\
            packages/runner/package.json|\
            packages/runner/src/host-client.ts|\
            packages/runner-node/package.json|\
            packages/runner-node/src/host-client.ts|\
            packages/runner-node/test/host-client-parity.spec.ts|\
            packages/types/package.json|\
            packages/types/src/manager/sth-connection-store.ts)
                ;;
            *)
                forbidden+=("${file}")
                ;;
        esac
    done <<< "${files}"

    if [ "${#forbidden[@]}" -eq 0 ]; then
        return 0
    fi

    echo "  unexpected BPMux / old-verser references:"
    printf '    %s\n' "${forbidden[@]}"
    return 1
}

run_guard 1 "No adapter-local runtime engine branching in adapter packages" guard1
run_guard 2 "No env-var SEQUENCE_PATH/SEQUENCE_INFO/RUNNER_CONNECT_INFO in runner-python/src" guard2
run_guard 3 "No bpmux import in runner-python" guard3
run_guard 4 "No REQUESTS channel in runner-python/src" guard4
run_guard 5 "No @scramjet/python-runner references outside CHANGELOG/docs/roadmap/lockfiles" guard5
run_guard 6 "No process.stdout reassignment or redirectOutputs in runner/src" guard6
run_guard 7 "No new BPMux or old-verser references outside the verser2 migration allowlist" guard7

echo "---"
echo "RESULTS: ${PASS} passed, ${FAIL} failed"
if [ "${FAIL}" -gt 0 ]; then
    echo ""
    echo "Failed guards:"
    for failure in "${FAILURES[@]}"; do
        echo "  ${failure}"
    done
    exit 1
fi
exit 0
