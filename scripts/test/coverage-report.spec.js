/**
 * Focused coverage for the root coverage-report script and its lib helpers:
 * lcov parsing, per-package/overall aggregation, table formatting, missing
 * reports, and deterministic package ordering.
 */

"use strict";

const test = require("ava").default;
const { mkdirSync, mkdtempSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join, resolve } = require("node:path");
const { spawnSync } = require("node:child_process");

const {
    parseLcov,
    collectPackageReports,
    aggregateReports,
    formatCoverageTable,
    percentage
} = require("../lib/coverage-report.js");

const cli = resolve(__dirname, "..", "coverage-report.js");

const ZERO_COUNTERS = { LF: 0, LH: 0, FNF: 0, FNH: 0, BRF: 0, BRH: 0 };

const RECORD_A = [
    "TN:",
    "SF:src/a.ts",
    "FN:1,fnA",
    "FNDA:1,fnA",
    "FNF:2",
    "FNH:1",
    "DA:1,1",
    "DA:2,0",
    "LF:2",
    "LH:1",
    "BRF:2",
    "BRH:1",
    "end_of_record"
].join("\n");

const RECORD_B = [
    "TN:",
    "SF:src/b.ts",
    "FN:1,fnB",
    "FNDA:0,fnB",
    "FNF:2",
    "FNH:1",
    "DA:1,1",
    "DA:2,1",
    "DA:3,0",
    "LF:3",
    "LH:2",
    "BRF:3",
    "BRH:2",
    "end_of_record"
].join("\n");

function createFixtureRoot(t, packages) {
    const root = mkdtempSync(join(tmpdir(), "transform-hub-coverage-report-"));

    for (const [name, lcov] of Object.entries(packages)) {
        const dir = join(root, "packages", name, "coverage");

        mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, "lcov.info"), lcov);
    }

    t.teardown(() => rmSync(root, { force: true, recursive: true }));
    return root;
}

test("parseLcov aggregates a single record", (t) => {
    t.deepEqual(parseLcov(RECORD_A), { LF: 2, LH: 1, FNF: 2, FNH: 1, BRF: 2, BRH: 1 });
});

test("parseLcov sums multiple records", (t) => {
    t.deepEqual(parseLcov(`${RECORD_A}\n${RECORD_B}\n`), { LF: 5, LH: 3, FNF: 4, FNH: 2, BRF: 5, BRH: 3 });
});

test("parseLcov defaults missing summary keys to zero", (t) => {
    t.deepEqual(parseLcov("TN:\nSF:src/empty.ts\nend_of_record\n"), ZERO_COUNTERS);
});

test("parseLcov ignores malformed lines and unterminated records", (t) => {
    const content = ["TN:", "SF:src/a.ts", "not-a-counter:42", "LF:3", "LH:2", "SF:src/b.ts", "LF:1", "LH:1"].join("\n");

    t.deepEqual(parseLcov(content), { LF: 4, LH: 3, FNF: 0, FNH: 0, BRF: 0, BRH: 0 });
});

test("parseLcov returns zero counters for empty content", (t) => {
    t.deepEqual(parseLcov(""), ZERO_COUNTERS);
});

test("collectPackageReports sorts packages deterministically", (t) => {
    const root = createFixtureRoot(t, { zeta: RECORD_A, alpha: RECORD_B, mid: RECORD_A });
    const reports = collectPackageReports(root);

    t.deepEqual(reports.map((report) => report.package), ["alpha", "mid", "zeta"]);
});

test("collectPackageReports skips packages without lcov reports", (t) => {
    const root = createFixtureRoot(t, { "with-report": RECORD_A });

    mkdirSync(join(root, "packages", "no-report", "src"), { recursive: true });

    const reports = collectPackageReports(root);

    t.deepEqual(reports.map((report) => report.package), ["with-report"]);
});

test("collectPackageReports returns an empty list when no reports exist", (t) => {
    const root = mkdtempSync(join(tmpdir(), "transform-hub-coverage-report-empty-"));

    t.teardown(() => rmSync(root, { force: true, recursive: true }));
    t.deepEqual(collectPackageReports(root), []);
});

test("aggregateReports sums per-package counters into an overall row", (t) => {
    const reports = [
        { package: "alpha", counters: { LF: 2, LH: 1, FNF: 2, FNH: 1, BRF: 2, BRH: 1 } },
        { package: "beta", counters: { LF: 3, LH: 2, FNF: 2, FNH: 1, BRF: 3, BRH: 2 } }
    ];
    const { rows, overall } = aggregateReports(reports);

    t.is(rows, reports);
    t.deepEqual(overall, { LF: 5, LH: 3, FNF: 4, FNH: 2, BRF: 5, BRH: 3 });
});

test("percentage formats one decimal and handles zero totals", (t) => {
    t.is(percentage(1, 2), "50.0%");
    t.is(percentage(1, 3), "33.3%");
    t.is(percentage(0, 0), "-");
    t.is(percentage(5, 0), "-");
});

test("formatCoverageTable prints a width-aligned header, separator, package rows and an Overall row", (t) => {
    const summary = {
        rows: [
            { package: "alpha", counters: { LF: 2, LH: 1, FNF: 2, FNH: 1, BRF: 2, BRH: 1 } },
            { package: "beta", counters: { LF: 3, LH: 2, FNF: 2, FNH: 1, BRF: 3, BRH: 2 } }
        ],
        overall: { LF: 5, LH: 3, FNF: 4, FNH: 2, BRF: 5, BRH: 3 }
    };
    const table = formatCoverageTable(summary);
    const lines = table.trimEnd().split("\n");

    t.is(lines[0], "| Package | Lines       | Functions   | Branches    |");
    t.is(lines[1], "| ------- | ----------- | ----------- | ----------- |");
    t.is(lines[2], "| alpha   | 1/2 (50.0%) | 1/2 (50.0%) | 1/2 (50.0%) |");
    t.is(lines[3], "| beta    | 2/3 (66.7%) | 1/2 (50.0%) | 2/3 (66.7%) |");
    t.is(lines[4], "| Overall | 3/5 (60.0%) | 2/4 (50.0%) | 3/5 (60.0%) |");
    t.true(table.endsWith("\n"));
});

test("formatCoverageTable sizes columns to the longest cell including the Overall row", (t) => {
    const summary = {
        rows: [
            { package: "very-long-package-name", counters: { LF: 2, LH: 1, FNF: 2, FNH: 1, BRF: 2, BRH: 1 } }
        ],
        overall: { LF: 2, LH: 1, FNF: 2, FNH: 1, BRF: 2, BRH: 1 }
    };
    const table = formatCoverageTable(summary);
    const lines = table.trimEnd().split("\n");

    t.is(lines[0], "| Package                | Lines       | Functions   | Branches    |");
    t.is(lines[1], "| ---------------------- | ----------- | ----------- | ----------- |");
    t.is(lines[2], "| very-long-package-name | 1/2 (50.0%) | 1/2 (50.0%) | 1/2 (50.0%) |");
    t.is(lines[3], "| Overall                | 1/2 (50.0%) | 1/2 (50.0%) | 1/2 (50.0%) |");
});

test("CLI fails clearly when no reports exist", (t) => {
    const root = mkdtempSync(join(tmpdir(), "transform-hub-coverage-report-missing-"));

    t.teardown(() => rmSync(root, { force: true, recursive: true }));

    const result = spawnSync(process.execPath, [cli, "--root", root], { encoding: "utf8" });

    t.is(result.status, 1);
    t.is(result.stdout, "");
    t.true(result.stderr.includes("No coverage reports found"));
});

test("CLI prints the aggregated table for a fixture root", (t) => {
    const root = createFixtureRoot(t, { zeta: RECORD_A, alpha: RECORD_B });
    const result = spawnSync(process.execPath, [cli, "--root", root], { encoding: "utf8" });
    const lines = result.stdout.trimEnd().split("\n");

    t.is(result.status, 0, result.stderr);
    t.is(lines[0], "| Package | Lines       | Functions   | Branches    |");
    t.is(lines[1], "| ------- | ----------- | ----------- | ----------- |");
    t.true(lines.some((line) => line.startsWith("| alpha   |")));
    t.true(lines.some((line) => line.startsWith("| zeta    |")));
    t.true(lines.some((line) => line.startsWith("| Overall |")));

    const alphaIndex = lines.findIndex((line) => line.startsWith("| alpha   |"));
    const zetaIndex = lines.findIndex((line) => line.startsWith("| zeta    |"));

    t.true(alphaIndex < zetaIndex, "packages must be sorted deterministically");
});

test("CLI --help prints usage and exits zero", (t) => {
    const result = spawnSync(process.execPath, [cli, "--help"], { encoding: "utf8" });

    t.is(result.status, 0);
    t.true(result.stderr.includes("Usage:"));
});