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

const common = [
    // Isolation is loaded first so its Before hooks establish scenario-owned
    // paths and prerequisite checks before the memory baseline is measured.
    "--require support/scenario-isolation.ts",
    // Load support/memory-hooks.ts BEFORE step-definitions so its After hook
    // runs after step-definition cleanup hooks (Cucumber After hooks run in
    // reverse definition order).
    "--require support/memory-hooks.ts",
    "--require step-definitions/**/*.ts",
    "--require support/timing-boundary.ts",
    "--require-module ts-node/register",
    "--exit",
    `--tags "${tags}"`,
    ...report
].join(" ");

module.exports = {
    default: common
};
