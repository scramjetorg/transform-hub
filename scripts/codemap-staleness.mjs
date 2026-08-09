#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { statSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

const gitBinary = process.env.GIT_BINARY || "/usr/bin/git";

function git(args, options = {}) {
    return execFileSync(gitBinary, args, {
        cwd: options.cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", options.quiet ? "ignore" : "pipe"]
    }).trim();
}

function gitLines(args, options = {}) {
    const output = git(args, options);

    return output ? output.split(/\r?\n/).filter(Boolean) : [];
}

function firstCommitTimestamp(path, root) {
    const commits = gitLines(["log", "--follow", "--diff-filter=A", "--format=%ct", "--", path], { cwd: root, quiet: true });

    return commits.length ? Number(commits.at(-1)) : undefined;
}

function latestCommitTimestamp(paths, root) {
    if (!paths.length) return undefined;

    const timestamp = git(["log", "-1", "--format=%ct", "--", ...paths], { cwd: root, quiet: true });

    return timestamp ? Number(timestamp) : undefined;
}

function codemapUpdateTimestamp(path, root) {
    const status = git(["status", "--porcelain", "--", path], { cwd: root, quiet: true });

    if (status) {
        return Math.floor(statSync(resolve(root, path)).mtimeMs / 1000);
    }

    return latestCommitTimestamp([path], root);
}

function formatTimestamp(timestamp) {
    return timestamp ? new Date(timestamp * 1000).toISOString() : "never";
}

function folderFiles(folder, codemap, root) {
    const args = folder === "."
        ? ["ls-files"]
        : ["ls-files", `${folder}/`];

    return gitLines(args, { cwd: root }).filter(path => (
        path !== codemap
        && !path.endsWith("/codemap.md")
        && !path.includes("/node_modules/")
        && !path.startsWith("node_modules/")
        && !path.startsWith("dist/")
    ));
}

const jsonOutput = process.argv.includes("--json");
const rootArg = process.argv.slice(2).find(arg => !arg.startsWith("--"));
const root = resolve(rootArg || ".");
const codemaps = gitLines(["ls-files", "*codemap.md"], { cwd: root });

const rows = codemaps.map(codemap => {
    const folder = dirname(codemap);
    const trackedFolder = folder === "." ? "." : folder;
    const created = firstCommitTimestamp(codemap, root);
    const files = folderFiles(trackedFolder, codemap, root);
    const latest = latestCommitTimestamp(files, root);
    const updated = codemapUpdateTimestamp(codemap, root);
    const stale = Boolean(updated && latest && latest > updated);

    return {
        codemap,
        folder: trackedFolder,
        codemapCreated: created,
        codemapUpdated: updated,
        folderLastCommit: latest,
        stale,
        trackedFiles: files.length
    };
});

const staleRows = rows.filter(row => row.stale).sort((a, b) => (b.folderLastCommit ?? 0) - (a.folderLastCommit ?? 0));

if (jsonOutput) {
    process.stdout.write(`${JSON.stringify({ root, total: rows.length, stale: staleRows.length, rows }, null, 2)}\n`);
} else {
    console.log(`Codemaps checked: ${rows.length}`);
    console.log(`Stale codemaps: ${staleRows.length}`);
    console.log("");
    console.log("stale\tcodemap_created\tcodemap_updated\tfolder_last_commit\tfolder\tcodemap");

    for (const row of staleRows) {
        console.log([
            row.stale ? "yes" : "no",
            formatTimestamp(row.codemapCreated),
            formatTimestamp(row.codemapUpdated),
            formatTimestamp(row.folderLastCommit),
            row.folder,
            relative(root, resolve(root, row.codemap))
        ].join("\t"));
    }
}
