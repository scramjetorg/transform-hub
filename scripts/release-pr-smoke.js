#!/usr/bin/env node
const { execFileSync } = require("node:child_process");
const { readFileSync } = require("node:fs");
const { join, resolve } = require("node:path");

const ROOT = resolve(__dirname, "..");
const TSX = [process.execPath, "node_modules/tsx/dist/cli.mjs"];
const SMOKE_COMMANDS = Object.freeze({
    config: [...TSX, "packages/sth/src/bin/hub.ts", "--help"],
    cli: [...TSX, "packages/cli/src/bin/index.ts", "--help"],
    runner: [...TSX, "packages/runner/src/bin/start-runner.ts", "--help"],
    // The BDD risk area gets a source-level TypeScript smoke only.  Full BDD is
    // deliberately owned by the candidate workflow and is never a PR gate.
    bdd: [...TSX, "scripts/release-risk-smoke.ts", "bdd"],
});
const RISK_ORDER = ["config", "cli", "runner", "bdd"];
const BROAD_ROOTS = ["package.json", "package-lock.json", "tsconfig.json", "config/", "scripts/", "bdd/"];

function workspaceManifests(root = ROOT) {
    const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    const patterns = [...(packageJson.workspaces?.release || packageJson.workspaces?.packages || [])].filter((entry) => entry.endsWith("/*"));
    return patterns.flatMap((pattern) => {
        const base = pattern.slice(0, -1);
        const entries = require("node:fs").readdirSync(join(root, base), { withFileTypes: true });
        return entries.filter((entry) => entry.isDirectory()).map((entry) => {
            const directory = join(base, entry.name);
            const manifest = JSON.parse(readFileSync(join(root, directory, "package.json"), "utf8"));
            return { name: manifest.name, directory: directory.replaceAll("\\", "/"), manifest };
        });
    });
}

function normalizeChangedFiles(changedFiles) {
    return (changedFiles || []).map((entry) => typeof entry === "string" ? { status: "M", path: entry } : entry);
}

function isDocsOnly(files) {
    return files.length > 0 && files.every(({ path }) => /(^|\/)(docs?|README|CHANGELOG|LICENSE)(\/|\.|$)/i.test(path) || /\.(md|mdx|txt)$/i.test(path));
}

function allReleaseWorkspaces(manifests) {
    return manifests.map(({ name }) => name).filter(Boolean).sort();
}

function affectedWorkspaces({ changedFiles, root = ROOT, manifests = workspaceManifests(root) }) {
    const files = normalizeChangedFiles(changedFiles);
    if (isDocsOnly(files)) return [];
    const all = allReleaseWorkspaces(manifests);
    if (files.some(({ status, path }) => status === "D" || !path || BROAD_ROOTS.some((prefix) => path === prefix || path.startsWith(prefix)))) return all;
    const direct = new Set();
    for (const file of files) {
        const workspace = manifests.find(({ directory }) => file.path === directory || file.path.startsWith(`${directory}/`));
        if (workspace) direct.add(workspace.name);
        else return all;
    }
    const reverse = new Map(manifests.map(({ name }) => [name, new Set()]));
    for (const { name, manifest } of manifests) {
        for (const section of ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"]) {
            for (const dependency of Object.keys(manifest[section] || {})) if (reverse.has(dependency)) reverse.get(dependency).add(name);
        }
    }
    const closure = new Set(direct);
    const queue = [...direct];
    while (queue.length) for (const dependent of reverse.get(queue.shift()) || []) if (!closure.has(dependent)) { closure.add(dependent); queue.push(dependent); }
    return all.filter((name) => closure.has(name));
}

function riskAreas(changedFiles) {
    const files = normalizeChangedFiles(changedFiles).map(({ path }) => path);
    const risks = new Set();
    for (const file of files) {
        if (/^(packages\/config|packages\/sth\/src\/.*config|config\/)/.test(file)) risks.add("config");
        if (/^packages\/cli\//.test(file)) risks.add("cli");
        if (/^packages\/(runner|runner-node|runner-bun|runner-python)\//.test(file)) risks.add("runner");
        if (/^(bdd|scripts\/run-bdd|scripts\/release-bdd)/.test(file)) risks.add("bdd");
    }
    return RISK_ORDER.filter((risk) => risks.has(risk));
}

function selectPrSmoke({ changedFiles, root = ROOT, manifests } = {}) {
    const files = normalizeChangedFiles(changedFiles);
    const workspaces = affectedWorkspaces({ changedFiles: files, root, manifests });
    const risks = riskAreas(files);
    return { workspaces, risks, commands: risks.map((risk) => SMOKE_COMMANDS[risk]) };
}

function assertSmokeCommands(commands) {
    for (const command of commands) {
        if (command[0] !== process.execPath || command[1] !== "node_modules/tsx/dist/cli.mjs" || command.some((part) => ["build", "pack", "install", "publish"].includes(part) || part === "npm")) throw new Error("PR smoke command violates the local-tsx/no-build/no-release policy.");
    }
}

function runPrSmoke(selection, runner = execFileSync) {
    assertSmokeCommands(selection.commands);
    for (const command of selection.commands) runner(command[0], command.slice(1), { cwd: ROOT, stdio: "inherit" });
    return selection;
}

if (require.main === module) {
    const base = process.argv[2] || "HEAD^";
    const output = execFileSync("git", ["diff", "--name-status", `${base}...HEAD`], { cwd: ROOT, encoding: "utf8" });
    const changedFiles = output.trim().split("\n").filter(Boolean).map((line) => { const [status, ...parts] = line.split(/\s+/); return { status: status[0], path: parts.at(-1) }; });
    runPrSmoke(selectPrSmoke({ changedFiles }));
}

module.exports = { SMOKE_COMMANDS, workspaceManifests, affectedWorkspaces, riskAreas, selectPrSmoke, assertSmokeCommands, runPrSmoke };
