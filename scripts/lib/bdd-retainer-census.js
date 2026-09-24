const fs = require("node:fs");
const path = require("node:path");

const MAX_FAMILIES = 20;
const MAX_PATHS = 10;
const MAX_PATH_DEPTH = 8;
const MAX_SAMPLES_PER_FAMILY = 10;
const ALLOWED_TYPES = new Set(["array", "bigint", "closure", "code", "native", "number", "object", "regexp", "string", "symbol"]);
const ALLOWED_NAMES = new Set([
    "Array",
    "ArrayBuffer",
    "BigInt",
    "Boolean",
    "Buffer",
    "Date",
    "DataView",
    "Error",
    "EventEmitter",
    "Function",
    "Map",
    "Number",
    "Object",
    "Promise",
    "RegExp",
    "Set",
    "String",
    "Symbol",
    "Uint8Array",
    "URL",
    "WeakMap",
    "WeakSet"
]);
const ALLOWED_EDGE_TYPES = new Set(["context", "element", "hidden", "internal", "property", "shortcut", "weak"]);

function safeType(value) {
    return ALLOWED_TYPES.has(value) ? value : "other";
}

function safeNameFamily(value) {
    return ALLOWED_NAMES.has(value) ? value : "other";
}

function shallowSizeBucket(value) {
    const size = Number.isFinite(value) && value >= 0 ? value : 0;
    if (size < 64) return "0-63";
    if (size < 256) return "64-255";
    if (size < 1024) return "256-1023";
    if (size < 4096) return "1k-4k";
    if (size < 16384) return "4k-16k";
    return "16k+";
}

function pathEdgeKind(edge) {
    return edge && ALLOWED_EDGE_TYPES.has(edge.type) ? edge.type : "other";
}

function fingerprintForNode(node) {
    const dominator = node && node.dominatorNode;
    return {
        type: safeType(node?.type),
        safeNameFamily: safeNameFamily(node?.name),
        shallowSizeBucket: shallowSizeBucket(node?.self_size),
        dominatorFamily: dominator ? `${safeType(dominator.type)}:${safeNameFamily(dominator.name)}` : "root",
        pathEdgeKind: pathEdgeKind(node?.pathEdge)
    };
}

function fingerprintKey(fingerprint) {
    return [fingerprint.type, fingerprint.safeNameFamily, fingerprint.shallowSizeBucket, fingerprint.dominatorFamily, fingerprint.pathEdgeKind].join("|");
}

function iterableNodes(heap) {
    if (!heap || !heap.nodes || typeof heap.nodes.forEach !== "function") throw new Error("MemLab heap has no public nodes collection");
    const nodes = [];
    heap.nodes.forEach((node) => nodes.push(node));
    return nodes;
}

function buildAggregate(heap, { redactedSamples = false } = {}) {
    const families = new Map();
    for (const node of iterableNodes(heap)) {
        const fingerprint = fingerprintForNode(node);
        const key = fingerprintKey(fingerprint);
        const current = families.get(key) || (redactedSamples ? { fingerprint, count: 0, shallowBytes: 0, samples: [] } : { fingerprint, count: 0, shallowBytes: 0, nodes: [] });
        current.count++;
        current.shallowBytes += Number.isFinite(node.self_size) && node.self_size > 0 ? node.self_size : 0;
        if (redactedSamples) {
            if (current.samples.length < MAX_SAMPLES_PER_FAMILY) {
                current.samples.push({
                    retainedSize: Number.isFinite(node.retainedSize) && node.retainedSize > 0 ? node.retainedSize : 0,
                    path: redactedPathSummary(node)
                });
            }
        } else if (current.nodes.length < MAX_SAMPLES_PER_FAMILY) {
            current.nodes.push(node);
        }
        families.set(key, current);
    }
    return families;
}

function candidateKind(baseline, target, final) {
    if (baseline.count === 0 && target.count > 0 && final.count > 0) return "target-final-only";
    if (target.count > baseline.count && final.count > baseline.count) return "growth-beyond-baseline";
    return null;
}

function survivingCount(baseline, target, final, kind) {
    if (kind === "target-final-only") return Math.min(target.count, final.count);
    return Math.min(target.count - baseline.count, final.count - baseline.count);
}

function estimatedShallowBytes(target, final, count) {
    const targetAverage = target.count > 0 ? target.shallowBytes / target.count : 0;
    const finalAverage = final.count > 0 ? final.shallowBytes / final.count : 0;
    return Math.floor(Math.min(targetAverage, finalAverage) * count);
}

function isDominatedBy(node, possibleAncestor) {
    const seen = new Set();
    let current = node?.dominatorNode;
    while (current && !seen.has(current)) {
        if (current === possibleAncestor) return true;
        seen.add(current);
        current = current.dominatorNode;
    }
    return false;
}

function frontierForCandidates(candidateNodes) {
    const unique = [...new Set(candidateNodes)];
    const frontier = unique.filter((node) => !unique.some((other) => other !== node && isDominatedBy(node, other)));
    return frontier.filter((node) => !frontier.some((other) => other !== node && isDominatedBy(node, other)));
}

function redactedPathSummary(node) {
    const path = [];
    const seen = new Set();
    let current = node;
    for (let depth = 0; current && depth < MAX_PATH_DEPTH && !seen.has(current); depth++) {
        seen.add(current);
        path.push({ depth, fingerprint: fingerprintForNode(current) });
        current = current.dominatorNode;
    }
    return path;
}

function buildRetainerCensusFromAggregates({ baselineFamilies, targetFamilies, finalFamilies }) {
    const candidates = [];

    const familyKeys = new Set([...targetFamilies.keys(), ...finalFamilies.keys()]);
    for (const key of familyKeys) {
        const targetFamily = targetFamilies.get(key) || { fingerprint: finalFamilies.get(key).fingerprint, count: 0, shallowBytes: 0, nodes: [] };
        const baselineFamily = baselineFamilies.get(key) || { count: 0, shallowBytes: 0 };
        const finalFamily = finalFamilies.get(key) || { count: 0, shallowBytes: 0, nodes: [] };
        const kind = candidateKind(baselineFamily, targetFamily, finalFamily);
        if (!kind) continue;
        const count = survivingCount(baselineFamily, targetFamily, finalFamily, kind);
        if (count <= 0) continue;
        candidates.push({
            key,
            fingerprint: targetFamily.fingerprint,
            candidateKind: kind,
            confidence: kind === "target-final-only" ? "high" : "medium",
            baselineCount: baselineFamily.count,
            targetCount: targetFamily.count,
            finalCount: finalFamily.count,
            survivingCount: count,
            estimatedSurvivingShallowBytes: estimatedShallowBytes(targetFamily, finalFamily, count)
        });
    }

    candidates.sort((left, right) => right.estimatedSurvivingShallowBytes - left.estimatedSurvivingShallowBytes || right.finalCount - left.finalCount);
    const selected = candidates.slice(0, MAX_FAMILIES);
    const candidateNodes = selected.flatMap((candidate) => (finalFamilies.get(candidate.key)?.nodes || []).slice(0, candidate.survivingCount));
    const candidateSamples = selected.flatMap((candidate) => finalFamilies.get(candidate.key)?.samples || []);
    const frontier = frontierForCandidates(candidateNodes);
    const frontierBytes = frontier.length
        ? frontier.reduce((total, node) => total + (Number.isFinite(node.retainedSize) && node.retainedSize > 0 ? node.retainedSize : 0), 0)
        : candidateSamples.reduce((total, sample) => total + sample.retainedSize, 0);
    const paths = frontier.length ? frontier.slice(0, MAX_PATHS).map((node) => redactedPathSummary(node)) : candidateSamples.slice(0, MAX_PATHS).map((sample) => sample.path);
    const bounded = candidateSamples.length > 0;

    return {
        summary: {
            candidateFamilyCount: candidates.length,
            emittedFamilyCount: selected.length,
            finalFrontierRetainedEstimateBytes: frontierBytes,
            emittedPathSummaryCount: paths.length
        },
        families: selected.map(({ key, ...family }) => family),
        dominatorFrontier: {
            confidence: "low",
            estimateLabel: bounded ? "bounded redacted final sample retained estimate; not retained growth" : "heuristic final frontier retained estimate; not retained growth",
            finalFrontierRetainedEstimateBytes: frontierBytes,
            paths
        },
        policy: {
            maxFamilies: MAX_FAMILIES,
            maxPathSummaries: MAX_PATHS,
            maxPathDepth: MAX_PATH_DEPTH,
            maxSamplesPerFamily: MAX_SAMPLES_PER_FAMILY,
            mode: bounded ? "bounded-redacted" : "in-memory",
            identity: "fingerprint aggregates only; no cross-snapshot node identity claim",
            limitations: [
                "heuristic counts and public MemLab fields",
                "safe-name allowlist redacts custom and unknown names",
                "frontier bytes are an estimate, not retained growth"
            ]
        }
    };
}

function buildRetainerCensus({ baseline, target, final }) {
    return buildRetainerCensusFromAggregates({
        baselineFamilies: buildAggregate(baseline),
        targetFamilies: buildAggregate(target),
        finalFamilies: buildAggregate(final)
    });
}

async function loadRetainerAggregates(artifactDir) {
    const { validateArtifactDirectory } = require("./bdd-memlab.js");
    const { dir } = validateArtifactDirectory(artifactDir);
    const { getFullHeapFromFile } = require("@memlab/api");
    const aggregates = {};
    for (const phase of ["baseline", "target", "final"]) {
        let heap = await getFullHeapFromFile(path.join(dir, `${phase}.heapsnapshot`));
        aggregates[`${phase}Families`] = buildAggregate(heap, { redactedSamples: true });
        heap = null;
        global.gc();
    }
    return { dir, ...aggregates };
}

function writeCensusReport(dir, census) {
    const report = {
        version: 1,
        createdAt: new Date().toISOString(),
        inputs: { baseline: "baseline.heapsnapshot", target: "target.heapsnapshot", final: "final.heapsnapshot" },
        ...census
    };
    const reportPath = path.join(dir, "retainer-census.json");
    const tempPath = `${reportPath}.tmp-${process.pid}`;
    fs.writeFileSync(tempPath, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
    fs.chmodSync(tempPath, 0o600);
    fs.renameSync(tempPath, reportPath);
    return reportPath;
}

module.exports = {
    MAX_FAMILIES,
    MAX_PATHS,
    MAX_PATH_DEPTH,
    MAX_SAMPLES_PER_FAMILY,
    fingerprintForNode,
    buildAggregate,
    frontierForCandidates,
    buildRetainerCensus,
    buildRetainerCensusFromAggregates,
    loadRetainerAggregates,
    writeCensusReport
};
