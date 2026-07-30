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
# Requirements: @vscode/ripgrep devDependency (bundles ripgrep).

set -o pipefail

# Resolve repository root so the script works from any CWD.
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
REPO_ROOT="$(cd -- "${SCRIPT_DIR}/.." &> /dev/null && pwd)"
cd "${REPO_ROOT}"

# Resolve bundled ripgrep binary via @vscode/ripgrep.
RG_PATH=""
if ! RG_PATH="$(node -p "require('@vscode/ripgrep').rgPath" 2>/dev/null)"; then
    echo "ERROR: @vscode/ripgrep is not installed or resolution failed." >&2
    echo "  Run: npm install @vscode/ripgrep@^1.18.0" >&2
    exit 2
fi
if [ ! -x "${RG_PATH}" ]; then
    echo "ERROR: Bundled ripgrep binary not found or not executable:" >&2
    echo "  ${RG_PATH}" >&2
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
        "${RG_PATH}" -n '"(node|bun|python3)"\s+in\s+engines|engines\.(node|bun|python3)' \
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
        "${RG_PATH}" -n 'os\.environ.*(SEQUENCE_PATH|SEQUENCE_INFO|RUNNER_CONNECT_INFO)' \
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
        "${RG_PATH}" -n 'bpmux' packages/runner-python --glob '!Dockerfile*' 2> /dev/null || true
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
        "${RG_PATH}" -n '\bREQUESTS\b' packages/runner-python/src 2> /dev/null || true
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
        "${RG_PATH}" -l '@scramjet/python-runner' 2> /dev/null \
        | "${RG_PATH}" -v 'CHANGELOG' \
        | "${RG_PATH}" -v 'docs/roadmap' \
        | "${RG_PATH}" -v '(^|/)yarn\.lock$' \
        | "${RG_PATH}" -v '(^|/)package-lock\.json$' \
        | "${RG_PATH}" -v 'scripts/check-runtime-wrapper-invariants\.sh' \
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
        "${RG_PATH}" -n 'process\.stdout\s*=|redirectOutputs' \
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
# Guard 7: No active legacy transport usage outside the standalone legacy
# packages. The retained `packages/verser` and `packages/bpmux` workspaces may
# still contain and depend on the legacy implementation; active runtime packages
# must not import it, instantiate it, or expose old transport selection paths.
# ----------------------------------------------------------------------------
guard7() {
    local files
    files="$(
        "${RG_PATH}" -l '@scramjet/bpmux|@scramjet/verser|from .*bpmux|require\(["'\''`]bpmux|import .*\bBPMux\b|new BPMux\(|new Verser\(|\bVerserClient\b|\bVerserConnection\b|\bapiVerser\b|\bverserConnection\b|\bmigrationMode\b|\bverser2MigrationMode\b|verser2-migration-mode|SCRAMJET_VERSER2_MIGRATION_MODE|kind: "legacy"|kind === "legacy"|\bRunnerTransportConfigLegacy\b|RunnerTransportKind = "legacy"|\bSocketServer\b' \
            packages package.json \
            --glob '!packages/verser/**' \
            --glob '!packages/bpmux/**' \
            --glob '!**/codemap.md' \
            --glob '!**/*.md' \
            --glob '!package-lock.json' \
            --glob '!**/node_modules/**' \
            --glob '!**/dist/**' \
            --glob '!**/__pypackages__/**' \
            2> /dev/null \
        || true
    )"

    local forbidden=()
    local file
    while IFS= read -r file; do
        [ -z "${file}" ] && continue
        forbidden+=("${file}")
    done <<< "${files}"

    if [ "${#forbidden[@]}" -eq 0 ]; then
        return 0
    fi

    echo "  unexpected legacy transport references:"
    printf '    %s\n' "${forbidden[@]}"
    return 1
}

run_guard 1 "No adapter-local runtime engine branching in adapter packages" guard1
run_guard 2 "No env-var SEQUENCE_PATH/SEQUENCE_INFO/RUNNER_CONNECT_INFO in runner-python/src" guard2
run_guard 3 "No bpmux import in runner-python" guard3
run_guard 4 "No REQUESTS channel in runner-python/src" guard4
run_guard 5 "No @scramjet/python-runner references outside CHANGELOG/docs/roadmap/lockfiles" guard5
run_guard 6 "No process.stdout reassignment or redirectOutputs in runner/src" guard6
run_guard 7 "No active legacy transport references outside standalone legacy packages" guard7

# ----------------------------------------------------------------------------
# Guard 8: No direct Commander usage in package source or package manifests.
# CLI and adapter option handling must go through Scramjet-owned config and
# command descriptors instead of leaking Commander types or imports.
# ----------------------------------------------------------------------------
guard8() {
    local hits
    hits="$(
        "${RG_PATH}" -n 'from ["'\''`]commander["'\''`]|require\(["'\''`]commander["'\''`]\)|import\(["'\''`]commander["'\''`]\)|"commander"\s*:' \
            packages \
            --glob '!**/node_modules/**' \
            --glob '!**/dist/**' \
            --glob '!**/*.md' \
            2> /dev/null \
        || true
    )"
    if [ -z "${hits}" ]; then
        return 0
    fi
    echo "  forbidden Commander references:"
    printf '    %s\n' "${hits}"
    return 1
}

run_guard 8 "No direct Commander imports or package dependencies in packages" guard8

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
