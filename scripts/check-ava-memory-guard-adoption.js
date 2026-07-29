#!/usr/bin/env node

const { inspectAvaMemoryGuardFiles, shouldFail } = require("./lib/ava-memory-guard-adoption.js");

function usage() {
	console.error("Usage: node scripts/check-ava-memory-guard-adoption.js [--json] [--strict] [--fail-on-allowances] <ava-test-file...>");
}

const args = process.argv.slice(2);
const json = args.includes("--json");
const strict = args.includes("--strict");
const failOnAllowances = args.includes("--fail-on-allowances");
const files = args.filter((arg) => !["--json", "--strict", "--fail-on-allowances"].includes(arg));

if (args.includes("--help") || files.length === 0) {
	usage();
	process.exit(args.includes("--help") ? 0 : 2);
}

try {
	const report = inspectAvaMemoryGuardFiles(files);
	const fail = shouldFail(report, { strict, failOnAllowances });

	if (json) {
		console.log(JSON.stringify({ ...report, pass: !fail }, null, 2));
	} else {
		console.log(`Runner guard mode: ${report.runnerGuardEnabled ? "enabled" : "disabled"}`);
		console.log(`Measurement skip: ${report.measurementSkipped ? report.measurementSkipReason || "enabled (no reason)" : "disabled"}`);
		for (const file of report.files) {
			console.log(`${file.adopted ? "ADOPTED" : "MISSING"}: ${file.file} (${file.allowances.length} allowance${file.allowances.length === 1 ? "" : "s"})`);
		}
		console.log(`Selected: ${report.summary.selectedFiles}; adopted: ${report.summary.adoptedFiles}; allowances: ${report.summary.allowances}`);
	}

	process.exitCode = fail ? 1 : 0;
} catch (error) {
	console.error(`[ava-memory-guard-adoption] ${error.message}`);
	process.exitCode = 2;
}
