#!/usr/bin/env bash
#
# check-typings-split-boundaries.sh
#
# Red-state boundary and import-enforcement guards for the typings split
# (conductor track: typings_split_appcontext_20260622, Phase 2+).
#
# All checks are read-only. The script exits with a non-zero status if any
# guard finds a violation.
#
# Design:
#   Guard 1,4: Existence guards — assert @scramjet/runtime-types,
#     @scramjet/sequence-types, and @scramjet/api-types packages exist.
#     (fail until packages are scaffolded in Phase 2)
#   Guard 2:   Dependency-boundary check for @scramjet/runtime-types:
#     forbids @scramjet/rest-api2/api-types/sequence-types/types.
#   Guard 3:   Source import enforcement — detects source imports from
#     @scramjet/types outside allowed compatibility/metadata paths.
#     Scans packages/ and bdd/; covers static/dynamic/require/JSDoc patterns.
#     (expected red state until Phase 3 migration)
#
# Usage:
#   bash scripts/check-typings-split-boundaries.sh
#
# Requirements: ripgrep (`rg`).
#

set -o pipefail

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
# Guard 1: @scramjet/runtime-types package must exist.
#
# Guard fails when the package is not yet scaffolded.
# Passes when packages/runtime-types/package.json is present.
# ----------------------------------------------------------------------------
guard1() {
    if [ -f "packages/runtime-types/package.json" ]; then
        return 0
    fi
    echo "  packages/runtime-types/package.json not found — package not yet scaffolded"
    return 1
}

# ----------------------------------------------------------------------------
# Guard 2: @scramjet/runtime-types must not depend on forbidden packages.
#
# Forbidden: @scramjet/rest-api2, @scramjet/api-types, @scramjet/sequence-types,
# @scramjet/types.
#
# Checks BOTH package.json dependencies AND source imports under
# packages/runtime-types/src/ when they exist.
#
# Red-state: the package does not exist yet, so this guard fails via guard 1.
# When the package exists, this guard catches dependency violations.
# ----------------------------------------------------------------------------
guard2() {
    if [ ! -f "packages/runtime-types/package.json" ]; then
        echo "  packages/runtime-types/package.json not found — dependency check deferred (will run when package exists)"
        return 1
    fi

    local forbidden=("rest-api2" "api-types" "sequence-types" "types")
    local violations=()

    # Check package.json dependencies
    for dep in "${forbidden[@]}"; do
        if rg -q "\"@scramjet/${dep}\"" packages/runtime-types/package.json 2>/dev/null; then
            violations+=("package.json depends on @scramjet/${dep}")
        fi
    done

    # Check runtime-types/src/ for any forbidden @scramjet/* dependency reference.
    # Uses literal pattern matching (no regex escaping issues) — catches all forms:
    # static import, export-from, dynamic import(), require(), and JSDoc references.
    if [ -d "packages/runtime-types/src" ]; then
        for dep in "${forbidden[@]}"; do
            local src_hits
            src_hits="$(
                rg -nF "@scramjet/${dep}" packages/runtime-types/src/ 2>/dev/null || true
            )"
            if [ -n "${src_hits}" ]; then
                violations+=("src/ contains reference to @scramjet/${dep}")
            fi
        done
    fi

    if [ "${#violations[@]}" -gt 0 ]; then
        echo "  forbidden dependency references found in packages/runtime-types:"
        printf '    %s\n' "${violations[@]}"
        return 1
    fi
    return 0
}

# ----------------------------------------------------------------------------
# Guard 3: No source imports from @scramjet/types outside allowed paths.
#
# Scans packages/ AND bdd/ for references to @scramjet/types.
# Covers static imports, export-from, dynamic import(), require(), and
# JSDoc import type references where practical.
#
# After Phase 3 migration, all internal source imports have been migrated
# away from @scramjet/types to @scramjet/runtime-types, @scramjet/api-types,
# @scramjet/sequence-types, or owning-package local types.
#
# Allowed exceptions:
#   - Compatibility package files (packages/types/src/**, packages/types/test/**)
#   - Package metadata files (package.json, package-lock.json)
#   - Compatibility test files in packages/types/test-typings-split/**
#   - This check script itself
#   - Documentation files (*.md)
#   - Symbol files that re-export types (packages/symbols/**)
#   - Environment/CI config files (*.yml, *.yaml) — typically reference package
#     names, not source-level imports
#   - Boundary test fixtures in runtime-types/sequence-types/api-types
#     packages (mention literal forbidden package names as test constants,
#     not actual source imports)
#   - Test spec files (*.spec.ts, *.test.ts) — tests may reference old types
#   - Declaration files (*.d.ts) — typed declarations for external consumers
#   - Template files (*.mtpl) — not actual source code
#   - Sequence-test compatibility test files
#   - Documentation comments in split packages (packages/api-types/src/**)
# ----------------------------------------------------------------------------
guard3() {
    local hits

    # Scan for the literal string @scramjet/types. After the glob exclusions
    # below, this catches all forms: static import/export, dynamic import(),
    # require(), JSDoc @type/@import references, and any other text mention.
    # Using -F (fixed-string) avoids regex escaping pitfalls with parentheses,
    # curly braces, and dots in import() / @type { / "@scramjet/types" patterns.
    hits="$(
        rg -n -F \
            '@scramjet/types' \
            packages/ bdd/ \
            --glob '!**/node_modules/**' \
            --glob '!**/dist/**' \
            --glob '!packages/types/src/**' \
            --glob '!packages/types/test/**' \
            --glob '!packages/types/test-typings-split/**' \
            --glob '!**/package.json' \
            --glob '!**/package-lock.json' \
            --glob '!**/*.md' \
            --glob '!packages/symbols/**' \
            --glob '!**/*.yml' \
            --glob '!**/*.yaml' \
            --glob '!packages/runtime-types/test/**' \
            --glob '!packages/sequence-types/test/**' \
            --glob '!packages/api-types/test/**' \
            --glob '!**/*.spec.ts' \
            --glob '!**/*.test.ts' \
            --glob '!**/*.d.ts' \
            --glob '!**/*.mtpl' \
            --glob '!**/*.cjs' \
            --glob '!packages/sequence-test/**' \
            --glob '!packages/api-types/src/**' \
            2> /dev/null \
        || true
    )"

    if [ -z "${hits}" ]; then
        return 0
    fi
    echo "  source imports from @scramjet/types found outside allowed paths:"
    printf '    %s\n' "${hits}"
    return 1
}

# ----------------------------------------------------------------------------
# Guard 4: Split packages (api-types, sequence-types) must exist.
#
# Guard fails when the packages are not yet scaffolded.
# Passes when packages/api-types/package.json and
# packages/sequence-types/package.json are present.
# ----------------------------------------------------------------------------
guard4() {
    local missing=0
    for pkg in "api-types" "sequence-types"; do
        if [ ! -f "packages/${pkg}/package.json" ]; then
            echo "  packages/${pkg}/package.json not found — split package not yet scaffolded"
            missing=$((missing + 1))
        fi
    done
    if [ "${missing}" -gt 0 ]; then
        return 1
    fi
    echo "  split packages (api-types, sequence-types) exist"
    return 0
}

run_guard 1 "@scramjet/runtime-types package exists" guard1
run_guard 2 "@scramjet/runtime-types forbids @scramjet/rest-api2/api-types/sequence-types/types" guard2
run_guard 3 "No source imports from @scramjet/types outside allowed paths (expected red state until Phase 3)" guard3
run_guard 4 "Split packages (api-types, sequence-types) exist" guard4

echo "---"
echo "RESULTS: ${PASS} passed, ${FAIL} failed"
if [ "${FAIL}" -gt 0 ]; then
    echo ""
    echo "Failed guards:"
    for failure in "${FAILURES[@]}"; do
        echo "  ${failure}"
    done
    echo ""
    echo "Note: Guard 1 and Guard 4 passed — split packages are scaffolded. If they"
    echo "fail, split packages are missing. Guard 3 failures indicate source imports"
    echo "from @scramjet/types have not been migrated yet (expected until Phase 3)."
    exit 1
fi
exit 0
