#!/usr/bin/env node
const { validateArtifactDirectory } = require("../lib/bdd-memlab.js");
const { loadRetainerAggregates, buildRetainerCensusFromAggregates, writeCensusReport } = require("../lib/bdd-retainer-census.js");

const artifactDir = process.argv[2];
if (!artifactDir || process.argv.length !== 3) {
    process.stderr.write("usage: npm run analyze:bdd-retainer-census -- <artifact-dir>\n");
    process.exit(2);
}

try {
    validateArtifactDirectory(artifactDir);
} catch (error) {
    process.stderr.write(`[analyze:bdd-retainer-census] invalid artifact input: ${error.message}\n`);
    process.exit(2);
}

(async () => {
    const { dir, baselineFamilies, targetFamilies, finalFamilies } = await loadRetainerAggregates(artifactDir);
    const census = buildRetainerCensusFromAggregates({ baselineFamilies, targetFamilies, finalFamilies });
    const reportPath = writeCensusReport(dir, census);
    process.stdout.write(
        `retainer census: families=${census.summary.emittedFamilyCount} frontierBytes=${census.summary.finalFrontierRetainedEstimateBytes} report=${reportPath}\n`
    );
})().catch((error) => {
    process.stderr.write(`[analyze:bdd-retainer-census] parser/report error: ${error.message}\n`);
    process.exit(1);
});
