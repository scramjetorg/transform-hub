/**
 * @file scripts/lib/coverage-report.js
 *
 * Pure helpers for aggregating per-package c8 lcov coverage reports into a
 * single GitHub-log-safe summary table.
 *
 * c8 emits one `lcov.info` per package under `<package>/coverage/lcov.info`
 * with one record per source file (`SF:` ... `end_of_record`).  Each record
 * carries the summary counters LF/LH (lines found/hit), FNF/FNH (functions
 * found/hit) and BRF/BRH (branches found/hit).  This module parses those
 * counters, aggregates them per package and overall, and formats the result
 * as an ASCII/Markdown-compatible table.
 */

const { existsSync, readFileSync, readdirSync } = require("node:fs");
const { join } = require("node:path");

/** Summary counter keys emitted per lcov record. */
const SUMMARY_KEYS = ["LF", "LH", "FNF", "FNH", "BRF", "BRH"];

/**
 * @typedef {Object} CoverageCounters
 * @property {number} LF  Lines found.
 * @property {number} LH  Lines hit.
 * @property {number} FNF Functions found.
 * @property {number} FNH Functions hit.
 * @property {number} BRF Branches found.
 * @property {number} BRH Branches hit.
 */

/** @returns {CoverageCounters} */
function emptyCounters() {
    return { LF: 0, LH: 0, FNF: 0, FNH: 0, BRF: 0, BRH: 0 };
}

/**
 * Parse the summary counters of a single lcov record.
 *
 * A record is the text following one `SF:` line up to the next `SF:` line or
 * the end of the file.  Summary lines are emitted once per record by c8; when
 * a producer emits a key more than once, the last value wins (matching lcov's
 * own parser).  Missing keys default to 0.
 *
 * @param {string} record  Record body (everything after `SF:`).
 * @returns {CoverageCounters}
 */
function parseRecord(record) {
    const counters = emptyCounters();

    for (const key of SUMMARY_KEYS) {
        const matches = record.match(new RegExp(`^${key}:(\\d+)`, "gm"));

        if (!matches || !matches.length) continue;

        const last = matches[matches.length - 1];

        counters[key] = Number(last.slice(key.length + 1));
    }

    return counters;
}

/**
 * Parse lcov content into aggregated summary counters.
 *
 * Records are split on `SF:` markers rather than `end_of_record` so files with
 * missing terminators are still handled; every record's counters are summed.
 *
 * @param {string} content  Raw lcov.info content.
 * @returns {CoverageCounters}
 */
function parseLcov(content) {
    const counters = emptyCounters();
    const records = content.split(/^SF:/m).slice(1);

    for (const record of records) {
        const parsed = parseRecord(record);

        for (const key of SUMMARY_KEYS) counters[key] += parsed[key];
    }

    return counters;
}

/**
 * Collect per-package coverage counters from `<root>/packages/<name>/coverage/lcov.info`
 * for every package directory that contains one.
 *
 * Packages are sorted deterministically by directory name (codepoint order),
 * independent of filesystem enumeration order.
 *
 * @param {string} rootDir  Repository root.
 * @returns {Array<{ package: string, counters: CoverageCounters }>}
 */
function collectPackageReports(rootDir) {
    const packagesDir = join(rootDir, "packages");
    const reports = [];

    if (!existsSync(packagesDir)) return reports;

    for (const entry of readdirSync(packagesDir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;

        const lcovPath = join(packagesDir, entry.name, "coverage", "lcov.info");

        if (!existsSync(lcovPath)) continue;

        reports.push({ package: entry.name, counters: parseLcov(readFileSync(lcovPath, "utf8")) });
    }

    reports.sort((a, b) => (a.package < b.package ? -1 : a.package > b.package ? 1 : 0));

    return reports;
}

/**
 * Aggregate per-package reports into rows plus an overall counter set.
 *
 * @param {Array<{ package: string, counters: CoverageCounters }>} reports
 * @returns {{ rows: Array<{ package: string, counters: CoverageCounters }>, overall: CoverageCounters }}
 */
function aggregateReports(reports) {
    const overall = emptyCounters();

    for (const { counters } of reports) {
        for (const key of SUMMARY_KEYS) overall[key] += counters[key];
    }

    return { rows: reports, overall };
}

/**
 * Format a hit/total pair as a percentage with one decimal place.
 *
 * @param {number} hit
 * @param {number} total
 * @returns {string}  e.g. "72.0%" or "-" when total is 0.
 */
function percentage(hit, total) {
    if (!total) return "-";

    return `${((hit / total) * 100).toFixed(1)}%`;
}

/**
 * Format one metric cell as `hit/total (percentage)`.
 *
 * @param {number} hit
 * @param {number} total
 * @returns {string}
 */
function formatMetric(hit, total) {
    return `${hit}/${total} (${percentage(hit, total)})`;
}

/**
 * Format the coverage summary as an ASCII/Markdown-compatible table.
 *
 * Each column is padded to the width of its longest header or cell (including
 * the Overall row) so the table aligns in monospaced CI logs.  The separator
 * row is sized to the same column widths.
 *
 * @param {{ rows: Array<{ package: string, counters: CoverageCounters }>, overall: CoverageCounters }} summary
 * @returns {string}  Table text ending with a newline.
 */
function formatCoverageTable(summary) {
    const headers = ["Package", "Lines", "Functions", "Branches"];
    const { overall } = summary;
    const rows = summary.rows.map(({ package: name, counters }) => [
        name,
        formatMetric(counters.LH, counters.LF),
        formatMetric(counters.FNH, counters.FNF),
        formatMetric(counters.BRH, counters.BRF)
    ]);
    const overallRow = ["Overall", formatMetric(overall.LH, overall.LF), formatMetric(overall.FNH, overall.FNF), formatMetric(overall.BRH, overall.BRF)];
    const widths = headers.map((header, index) => Math.max(header.length, ...rows.map((row) => row[index].length), overallRow[index].length));
    const formatRow = (cells) => `| ${cells.map((cell, index) => cell.padEnd(widths[index])).join(" | ")} |`;
    const lines = [formatRow(headers), `| ${widths.map((width) => "-".repeat(width)).join(" | ")} |`, ...rows.map(formatRow), formatRow(overallRow)];

    return `${lines.join("\n")}\n`;
}

module.exports = {
    SUMMARY_KEYS,
    emptyCounters,
    parseRecord,
    parseLcov,
    collectPackageReports,
    aggregateReports,
    percentage,
    formatMetric,
    formatCoverageTable
};
