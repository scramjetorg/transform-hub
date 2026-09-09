#!/usr/bin/env node

/**
 * @file scripts/coverage-report.js
 *
 * Aggregate per-package c8 lcov coverage reports into a single
 * GitHub-log-safe summary table.
 *
 * Reads every `packages/<name>/coverage/lcov.info` under the repository root,
 * aggregates LF/LH/FNF/FNH/BRF/BRH per package and overall, and prints an
 * ASCII/Markdown-compatible table with columns Package, Lines, Functions,
 * Branches followed by an Overall row with hit/total and percentage.
 *
 * Usage:
 *   node scripts/coverage-report.js [--root <dir>]
 *
 * Exits nonzero with a clear message when no reports exist.
 */

const { cwd } = require("node:process");
const { resolve } = require("node:path");
const { collectPackageReports, aggregateReports, formatCoverageTable } = require("./lib/coverage-report.js");

function usage() {
    console.error("Usage: node scripts/coverage-report.js [--root <dir>]");
}

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
    usage();
    process.exit(0);
}

let root = cwd();
const rootIndex = args.indexOf("--root");

if (rootIndex !== -1) {
    const value = args[rootIndex + 1];

    if (!value || value.startsWith("--")) {
        usage();
        process.exit(2);
    }

    root = resolve(value);
}

const reports = collectPackageReports(root);

if (!reports.length) {
    console.error("[coverage-report] No coverage reports found under packages/<name>/coverage/lcov.info.");
    console.error("[coverage-report] Run package tests with coverage enabled first, e.g.: npm run test:packages:ci");
    process.exit(1);
}

const summary = aggregateReports(reports);

process.stdout.write(formatCoverageTable(summary));
