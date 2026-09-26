const fs = require("node:fs");
const path = require("node:path");

const PHASES = ["baseline", "target", "final"];
const MIN_MEMORY_BYTES = 3 * 1024 * 1024 * 1024;
const MIN_TIMEOUT_MS = 15 * 60 * 1000;

function parseMemoryBytes(value) {
    const match = String(value).trim().match(/^(\d+(?:\.\d+)?)([kmgt]?i?b?)?$/i);
    if (!match) throw new Error(`BDD_DOCKER_MEMORY must be a finite positive size such as 3g; got ${JSON.stringify(value)}`);
    const suffix = (match[2] || "b").toLowerCase();
    const powers = { b: 0, k: 1, kb: 1, kib: 1, m: 2, mb: 2, mib: 2, g: 3, gb: 3, gib: 3, t: 4, tb: 4, tib: 4 };
    const power = powers[suffix];
    const bytes = power === undefined ? NaN : Number(match[1]) * 1024 ** power;
    if (!Number.isFinite(bytes) || bytes <= 0) throw new Error(`BDD_DOCKER_MEMORY must be a finite positive size; got ${JSON.stringify(value)}`);
    return bytes;
}

function validateDiagnosticCapacity(env = process.env) {
    const unsafe = env.SCRAMJET_BDD_MEMLAB_UNSAFE === "1";
    const memoryRaw = env.BDD_DOCKER_MEMORY === undefined ? "1536m" : env.BDD_DOCKER_MEMORY;
    const memory = parseMemoryBytes(memoryRaw);
    const timeoutRaw = env.BDD_TIMEOUT_MS === undefined ? "600000" : env.BDD_TIMEOUT_MS;
    const timeout = Number(timeoutRaw);
    if (!Number.isFinite(timeout) || timeout <= 0) throw new Error(`BDD_TIMEOUT_MS must be a finite positive millisecond value; got ${JSON.stringify(timeoutRaw)}`);
    if (!unsafe && (memory < MIN_MEMORY_BYTES || timeout < MIN_TIMEOUT_MS)) {
        throw new Error(`MemLab diagnostic mode requires BDD_DOCKER_MEMORY >= 3GiB and BDD_TIMEOUT_MS >= 900000; set SCRAMJET_BDD_MEMLAB_UNSAFE=1 to override intentionally.`);
    }
    return { memoryBytes: memory, timeoutMs: timeout, unsafe };
}

function validateDiagnosticMemoryGuard(env = process.env) {
    const guard = env.SCRAMJET_BDD_MEMORY_GUARD;
    if (guard !== undefined && guard !== "1") throw new Error("diagnostic mode requires SCRAMJET_BDD_MEMORY_GUARD=1; disabled guard overrides are not allowed");
    if (guard === undefined && env.SCRAMJET_MEMORY_GUARD !== undefined && env.SCRAMJET_MEMORY_GUARD !== "1") {
        throw new Error("diagnostic mode requires SCRAMJET_MEMORY_GUARD=1 when SCRAMJET_BDD_MEMORY_GUARD is unset");
    }
    if (env.SCRAMJET_MEMORY_SKIP === "1") throw new Error("diagnostic mode does not allow SCRAMJET_MEMORY_SKIP=1");
}

function resolveFeature(feature) {
    if (!feature || path.isAbsolute(feature) || feature.includes("..")) throw new Error("--feature must be a relative feature path");
    if (feature.startsWith("features/")) feature = feature.slice("features/".length);
    const root = path.resolve(__dirname, "../../bdd/features");
    const resolved = path.resolve(root, feature);
    if (!resolved.startsWith(`${root}${path.sep}`) || !resolved.endsWith(".feature") || !fs.existsSync(resolved)) {
        throw new Error(`feature does not exist under bdd/features: ${feature}`);
    }
    return resolved;
}

function selectScenario(featureFile, scenarioName, options = {}) {
    if (!scenarioName || scenarioName.includes("\n")) throw new Error("--scenario must be an exact non-empty scenario name");
    const lines = fs.readFileSync(featureFile, "utf8").split(/\r?\n/);
    const matches = [];
    let pendingTags = [];
    let featureTags = [];
    for (const [index, line] of lines.entries()) {
        if (/^\s*@/.test(line)) {
            pendingTags.push(line.trim());
            continue;
        }
        if (/^\s*Feature:/.test(line)) {
            featureTags = pendingTags;
            pendingTags = [];
            continue;
        }
        const match = line.match(/^\s*Scenario(?: Outline)?:\s*(.*?)\s*$/);
        if (match) {
            if (match[1] === scenarioName) {
                if (/^\s*Scenario Outline:/i.test(line)) throw new Error(`Scenario Outline ${JSON.stringify(scenarioName)} is not supported by MemLab diagnostics; select one concrete Scenario`);
                matches.push({ line: index + 1, name: scenarioName, tags: [...featureTags, ...pendingTags] });
            }
            pendingTags = [];
            continue;
        }
        if (line.trim() !== "") pendingTags = [];
    }
    if (matches.length !== 1) throw new Error(`expected exactly one scenario named ${JSON.stringify(scenarioName)} in ${featureFile}; found ${matches.length}`);
    const tags = matches[0].tags.join(" ");
    if (/@ignore\b/.test(tags)) throw new Error(`selected scenario ${JSON.stringify(scenarioName)} is excluded by @ignore`);
    if (!options.includeHarnessSelftest && /@harness-selftest\b/.test(tags)) throw new Error("selected scenario is excluded by the default harness-selftest filter");
    if (!options.includeNeedsFix && /@needs-fix\b/.test(tags)) throw new Error("selected scenario is excluded by the default needs-fix filter");
    return { line: matches[0].line, name: matches[0].name };
}

function createArtifactDirectory(repoRoot, runId = `${Date.now()}-${process.pid}`) {
    const root = path.resolve(repoRoot, "bdd/.work/memlab");
    fs.mkdirSync(root, { recursive: true, mode: 0o700 });
    const dir = path.join(root, runId);
    fs.mkdirSync(dir, { mode: 0o700 });
    fs.chmodSync(dir, 0o700);
    const stats = fs.statfsSync(dir);
    if (stats.bavail * stats.bsize < 3 * 1024 * 1024 * 1024) throw new Error("insufficient disk space for three heap snapshots (need at least 3GiB free)");
    return dir;
}

function writeManifest(dir, metadata) {
    const manifest = { version: 1, createdAt: new Date().toISOString(), ...metadata, snapshots: PHASES.map(phase => `${phase}.heapsnapshot`) };
    fs.writeFileSync(path.join(dir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
}

function validateArtifactDirectory(dir) {
    const resolved = path.resolve(dir);
    const manifestPath = path.join(resolved, "manifest.json");
    if (!fs.existsSync(manifestPath)) throw new Error("artifact directory is missing manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    if (manifest.version !== 1 || typeof manifest.createdAt !== "string" || typeof manifest.feature !== "string" || typeof manifest.scenario !== "string" || typeof manifest.runId !== "string") throw new Error("manifest is missing required diagnostic metadata");
    if (JSON.stringify(manifest.snapshots) !== JSON.stringify(PHASES.map(phase => `${phase}.heapsnapshot`))) throw new Error("manifest must list baseline, target, and final snapshots in order");
    for (const phase of PHASES) {
        const file = path.join(resolved, `${phase}.heapsnapshot`);
        if (!fs.existsSync(file) || !fs.statSync(file).isFile()) throw new Error(`missing ${phase}.heapsnapshot`);
    }
    return { dir: resolved, manifest };
}

module.exports = { PHASES, MIN_MEMORY_BYTES, MIN_TIMEOUT_MS, parseMemoryBytes, validateDiagnosticCapacity, validateDiagnosticMemoryGuard, resolveFeature, selectScenario, createArtifactDirectory, writeManifest, validateArtifactDirectory };
