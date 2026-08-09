const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { ENV, TEST_PROFILES, isMemoryGuardEnabled, testProfile } = require("./ava-options.js");

function stripCommentsAndStrings(source) {
	const blank = (match) => match.replace(/[^\n]/g, " ");

	return source
		.replace(/(['"`])(?:\\.|(?!\1)[^\\])*\1/g, blank)
		.replace(/\/\*[\s\S]*?\*\//g, blank)
		.replace(/\/\/.*$/gm, blank);
}

function locationsFor(source, expression) {
	const locations = [];
	let match = expression.exec(source);

	while (match !== null) {
		const before = source.slice(0, match.index);
		locations.push({
			line: before.split("\n").length,
			column: match.index - before.lastIndexOf("\n"),
		});
		match = expression.exec(source);
	}

	return locations;
}

function inspectAvaMemoryGuardFile(filePath) {
	const absolutePath = resolve(filePath);
	const source = readFileSync(absolutePath, "utf8");
	const code = stripCommentsAndStrings(source);
	const adoptionLocations = locationsFor(code, /\bcreateAvaMemoryGuard\s*\(/g);
	const allowanceLocations = locationsFor(code, /\ballowAvaMemoryGrowth\s*\(/g);

	return {
		file: absolutePath,
		adopted: adoptionLocations.length > 0,
		adoptionLocations,
		allowances: allowanceLocations,
	};
}

function inspectAvaMemoryGuardFiles(filePaths, env = process.env) {
	const files = filePaths.map(inspectAvaMemoryGuardFile);
	const profile = testProfile();

	return {
		runnerGuardEnabled: isMemoryGuardEnabled(),
		measurementSkipped: env[ENV.MEMORY_SKIP] === "1",
		measurementSkipReason: env[ENV.MEMORY_SKIP_REASON] || null,
		profile: profile || null,
		files,
		summary: {
			selectedFiles: files.length,
			adoptedFiles: files.filter((file) => file.adopted).length,
			missingAdoption: files.filter((file) => !file.adopted).map((file) => file.file),
			allowances: files.reduce((count, file) => count + file.allowances.length, 0),
		},
	};
}

function shouldFail(report, { strict = false, failOnAllowances = false } = {}) {
	const phaseFinal = report.profile === TEST_PROFILES.PHASE_FINAL;
	const enforce = strict || phaseFinal;

	return enforce && (
		report.summary.missingAdoption.length > 0 ||
		report.measurementSkipped ||
		((failOnAllowances || phaseFinal) && report.summary.allowances > 0)
	);
}

module.exports = {
	inspectAvaMemoryGuardFile,
	inspectAvaMemoryGuardFiles,
	shouldFail,
	stripCommentsAndStrings,
};
