const reportFileName = new Date().toISOString().replace(new RegExp(/[:\\.]/g), "_") + "_report.html";
const report = process.env.TEST_REPORT
    ? [ "--format pretty", "--format html:reports/" + reportFileName ]
    : [ "--format progress" ];
const includeHarnessSelftest = ["1", "true"].includes(String(process.env.BDD_INCLUDE_HARNESS_SELFTEST).toLowerCase());
const includeLongRunning = ["1", "true"].includes(String(process.env.BDD_INCLUDE_LONG_RUNNING).toLowerCase());
const includeNeedsFix = ["1", "true"].includes(String(process.env.BDD_INCLUDE_NEEDS_FIX).toLowerCase());
const validationExclusions = "not @slow and not @stress and not @perf and not @load and not @external-dependency and not @compatibility and not @manager-migration and not @requires-docker and not @docker-specific";
const tagParts = ["not @ignore"];

if (!includeNeedsFix) tagParts.push("not @needs-fix");

if (!includeHarnessSelftest) tagParts.push("not @harness-selftest");
if (!includeLongRunning) tagParts.push(validationExclusions);

const tags = tagParts.join(" and ");
const stepDefinitions = {
    "hub-configuration": [
        "--require step-definitions/world.ts",
        "--require support/hub-configuration-host.ts",
        "--require step-definitions/hub/config.ts"
    ],
    "hub-runtime": [
        "--require step-definitions/world.ts",
        "--require step-definitions/e2e/host-steps.ts",
        "--require step-definitions/hub/config.ts",
        "--require step-definitions/e2e/cli.ts"
    ]
}[process.env.SCRAMJET_BDD_CHUNK_ID] || ["--require step-definitions/**/*.ts"];

const common = [
    // Isolation is loaded first so its Before hooks establish scenario-owned
    // paths and prerequisite checks before the memory baseline is measured.
    "--require support/scenario-isolation.ts",
    "--require support/host-control-ingress-memory-warmup.ts",
    "--require support/cli-ingress-memory-warmup.ts",
    "--require support/manager-control-ingress-memory-warmup.ts",
    // Load support/memory-hooks.ts BEFORE step-definitions so its After hook
    // runs after step-definition cleanup hooks (Cucumber After hooks run in
    // reverse definition order).
    "--require support/memory-hooks.ts",
    "--require support/control-plane-cycle-diagnostics.ts",
    ...stepDefinitions,
    "--require support/timing-boundary.ts",
    "--require-module ts-node/register",
    "--exit",
    `--tags "${tags}"`,
    ...report
].join(" ");

module.exports = {
    default: common
};
