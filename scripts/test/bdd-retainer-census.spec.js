"use strict";

const test = require("ava").default;
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const census = require("../lib/bdd-retainer-census.js");

function heap(nodes) {
    return { nodes: { forEach(callback) { nodes.forEach(callback); } } };
}

function node(name, selfSize, retainedSize, dominatorNode = null, edgeType = "property") {
    return { type: "object", name, self_size: selfSize, retainedSize, dominatorNode, pathEdge: { type: edgeType } };
}

test("fingerprints redact custom names and preserve only bounded safe families", t => {
    const fingerprint = census.fingerprintForNode(node("UserSecretConstructor", 70, 100));
    t.deepEqual(fingerprint, { type: "object", safeNameFamily: "other", shallowSizeBucket: "64-255", dominatorFamily: "root", pathEdgeKind: "property" });
    t.notRegex(JSON.stringify(fingerprint), /UserSecretConstructor/);
});

test("census ranks growth, reports target-final-only families, and bounds frontier paths", t => {
    const baselineRoot = node("Object", 10, 10);
    const targetRoot = node("Object", 10, 10);
    const finalRoot = node("Object", 10, 10);
    const baselineLeak = node("SecretThing", 500, 900, baselineRoot);
    const targetLeak = node("SecretThing", 500, 900, targetRoot);
    const targetLeak2 = node("SecretThing", 500, 900, targetRoot);
    const finalLeak = node("SecretThing", 500, 900, finalRoot);
    const finalLeak2 = node("SecretThing", 500, 900, finalRoot);
    const result = census.buildRetainerCensus({
        baseline: heap([baselineRoot, baselineLeak]),
        target: heap([targetRoot, targetLeak, targetLeak2]),
        final: heap([finalRoot, finalLeak, finalLeak2]),
    });
    t.is(result.summary.emittedFamilyCount, 1);
    t.is(result.families[0].candidateKind, "growth-beyond-baseline");
    t.is(result.families[0].estimatedSurvivingShallowBytes, 500);
    t.is(result.dominatorFrontier.finalFrontierRetainedEstimateBytes, 900);
    t.true(result.dominatorFrontier.paths[0].length <= 8);
    t.notRegex(JSON.stringify(result), /SecretThing/);
});

test("small final decrease with target increase is not growth and contributes no bytes", t => {
    const sample = node("Object", 100, 100);
    const [key, aggregate] = [...census.buildAggregate(heap([sample]))][0];
    const family = { fingerprint: aggregate.fingerprint, count: 754496, shallowBytes: 75449600, nodes: [] };
    const target = { ...family, count: 754573, shallowBytes: 75457300 };
    const final = { ...family, count: 754494, shallowBytes: 75449400 };
    const result = census.buildRetainerCensusFromAggregates({
        baselineFamilies: new Map([[key, family]]),
        targetFamilies: new Map([[key, target]]),
        finalFamilies: new Map([[key, final]]),
    });
    t.is(result.summary.candidateFamilyCount, 0);
    t.is(result.summary.finalFrontierRetainedEstimateBytes, 0);
});

test("frontier estimate deduplicates nested candidate nodes", t => {
    const root = node("Object", 10, 10);
    const outer = node("Map", 100, 1000, root);
    const inner = node("Map", 100, 500, outer);
    const result = census.buildRetainerCensus({ baseline: heap([root]), target: heap([root, outer, inner]), final: heap([root, outer, inner]) });
    t.is(result.dominatorFrontier.finalFrontierRetainedEstimateBytes, 1000);
});

test("bounded aggregate retains only redacted path samples", t => {
    const root = node("Object", 10, 10);
    const secret = node("SensitiveConstructor", 100, 1000, root);
    const aggregate = census.buildAggregate(heap(Array.from({ length: census.MAX_SAMPLES_PER_FAMILY + 1 }, () => secret)), { redactedSamples: true });
    const family = [...aggregate.values()][0];
    t.is(family.samples.length, census.MAX_SAMPLES_PER_FAMILY);
    t.false(Object.hasOwn(family, "nodes"));
    t.notRegex(JSON.stringify(family.samples), /SensitiveConstructor/);
});

test("report is written with restrictive permissions and no private node data", t => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "retainer-census-"));
    const reportPath = census.writeCensusReport(dir, census.buildRetainerCensus({ baseline: heap([]), target: heap([]), final: heap([]) }));
    const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    t.is(report.summary.emittedFamilyCount, 0);
    t.false(Object.hasOwn(report, "_selectedKeys"));
    t.is(fs.statSync(reportPath).mode & 0o777, 0o600);
    fs.rmSync(dir, { recursive: true, force: true });
});
