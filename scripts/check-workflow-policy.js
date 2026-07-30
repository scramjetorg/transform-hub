#!/usr/bin/env node

/**
 * Deterministic, intentionally narrow policy checks for replacement GitHub
 * Actions workflows. It only evaluates files passed with --file so legacy
 * workflows can remain during the migration.
 *
 * This is not a YAML parser or a replacement for Actionlint, Zizmor, the
 * organization required workflow, or Gitleaks. Those controls remain required
 * external validation and are reported by the CLI on every invocation.
 */

const { readFileSync } = require("node:fs");
const { relative, resolve } = require("node:path");

const SHA_REF = /^[a-f0-9]{40}$/i;
const OCI_DIGEST = /^sha256:[a-f0-9]{64}$/i;

const LIMITATIONS = [
    "Actionlint syntax/expression validation is external and not run here.",
    "Zizmor GitHub Actions security analysis is external and not run here.",
    "The organization required security workflow and repository rulesets are remote-only.",
    "Gitleaks hook/CI secret detection is deferred to the dedicated scanner integration."
];

function lineIndent(line) {
    return (line.match(/^\s*/) || [""])[0].length;
}

function makeError(file, line, code, message) {
    return { code, file, line, message };
}

function workflowHasTrigger(lines, trigger) {
    const escaped = trigger.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const bareTrigger = new RegExp(`^\\s*${escaped}\\s*:`);
    const inlineTrigger = new RegExp(`^on:\\s*(?:\\[.*\\b${escaped}\\b.*\\]|${escaped}(?:\\s|$))`);

    return lines.some((line) => bareTrigger.test(line) || inlineTrigger.test(line));
}

function permissionBlocks(lines) {
    const blocks = [];

    for (let index = 0; index < lines.length; index++) {
        const match = lines[index].match(/^(\s*)permissions:\s*(.*?)\s*$/);
        if (!match) continue;

        const indent = match[1].length;
        const value = match[2];
        const entries = [];

        if (!value) {
            for (let nested = index + 1; nested < lines.length; nested++) {
                const nestedLine = lines[nested];
                if (!nestedLine.trim() || nestedLine.trimStart().startsWith("#")) continue;
                if (lineIndent(nestedLine) <= indent) break;

                const entry = nestedLine.match(/^\s*([a-z-]+):\s*([^#\s]+).*$/);
                if (entry) entries.push({ key: entry[1], value: entry[2], line: nested + 1 });
            }
        }

        blocks.push({
            entries,
            line: index + 1,
            scope: indent === 0 ? "workflow" : "job",
            value
        });
    }

    return blocks;
}

function stepBlock(lines, start) {
    const indent = lineIndent(lines[start]);
    const block = [];

    for (let index = start + 1; index < lines.length; index++) {
        if (/^\s*-\s+/.test(lines[index]) && lineIndent(lines[index]) <= indent) break;
        block.push({ line: index + 1, text: lines[index] });
    }

    return block;
}

function immutableActionReference(reference) {
    if (reference.startsWith("./")) return true;

    if (reference.startsWith("docker://")) {
        const digest = reference.slice(reference.lastIndexOf("@") + 1);
        return OCI_DIGEST.test(digest);
    }

    const at = reference.lastIndexOf("@");
    return at > 0 && SHA_REF.test(reference.slice(at + 1));
}

function parseJobsIfConditions(lines) {
    const jobsLineIndex = lines.findIndex((line) => line.trim() === "jobs:");
    if (jobsLineIndex === -1) return [];

    const jobs = [];

    for (let i = jobsLineIndex + 1; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trimStart();
        if (!trimmed || trimmed.startsWith("#")) continue;

        const indent = lineIndent(line);

        if (trimmed.endsWith(":") && !trimmed.startsWith("-") && indent === 2) {
            const name = trimmed.slice(0, -1).trim();
            let endIndex = lines.length;

            for (let j = i + 1; j < lines.length; j++) {
                const nl = lines[j].trim();
                if (nl && !nl.startsWith("#") && lineIndent(lines[j]) <= 2) {
                    endIndex = j;
                    break;
                }
            }

            let ifCondition = null;

            for (let j = i + 1; j < endIndex; j++) {
                const ifMatch = lines[j].match(/^\s+if:\s*(.+?)\s*$/);
                if (ifMatch) {
                    ifCondition = ifMatch[1];
                    break;
                }
            }

            jobs.push({ name, startLine: i + 1, endLine: endIndex + 1, ifCondition });
            i = endIndex - 1;
        }
    }

    return jobs;
}

function hasReleasePrGuard(source) {
    if (source.includes("||") || source.includes("!")) return false;
    return (
        source.includes("github.event.pull_request.head.repo.full_name == github.repository") &&
        /github\.event\.pull_request\.head\.ref\s*==\s*["']devel["']/.test(source) &&
        /github\.event\.pull_request\.base\.ref\s*==\s*["']main["']/.test(source)
    );
}

function isGuardedJob(jobs, line) {
    const job = jobs.find((j) => line >= j.startLine && line < j.endLine);
    return !!job && !!job.ifCondition && hasReleasePrGuard(job.ifCondition);
}

function checkWorkflowSource(source, file) {
    const lines = source.replace(/\r\n/g, "\n").split("\n");
    const errors = [];
    const isPullRequestWorkflow = workflowHasTrigger(lines, "pull_request");
    const jobs = parseJobsIfConditions(lines);
    const blocks = permissionBlocks(lines);
    const workflowBlocks = blocks.filter((block) => block.scope === "workflow");

    if (workflowHasTrigger(lines, "pull_request_target")) {
        const line = lines.findIndex((item) => /^\s*pull_request_target\s*:/.test(item)) + 1;
        errors.push(makeError(file, line, "PULL_REQUEST_TARGET", "pull_request_target is forbidden."));
    }

    if (workflowBlocks.length === 0) {
        errors.push(makeError(file, 1, "MISSING_TOP_LEVEL_PERMISSIONS", "workflow must declare explicit top-level permissions."));
    }

    for (const block of blocks) {
        if (block.value === "write-all" || block.value === "read-all") {
            errors.push(makeError(file, block.line, "EXCESSIVE_PERMISSION", `permissions: ${block.value} is forbidden.`));
        }

        for (const entry of block.entries) {
            if (block.scope === "workflow" && entry.value === "write") {
                errors.push(makeError(file, entry.line, "EXCESSIVE_PERMISSION", `top-level ${entry.key}: write is forbidden; grant writes only to a narrow job.`));
            }

            if (!isPullRequestWorkflow || entry.value !== "write") continue;

            if (entry.key === "id-token") {
                errors.push(makeError(file, entry.line, "PR_OIDC_PERMISSION", "pull_request workflows must not grant id-token: write."));
            } else if (entry.key === "packages") {
                const owningJob = jobs.find(
                    (job) => entry.line >= job.startLine && entry.line < job.endLine
                );
                const hasJobGuard = owningJob && owningJob.ifCondition && hasReleasePrGuard(owningJob.ifCondition);
                if (!hasJobGuard) {
                    errors.push(makeError(file, entry.line, "PR_PUBLISH_PERMISSION", "pull_request publishing requires the explicit same-repository devel-to-main release guard."));
                }
            } else if (entry.key !== "packages") {
                errors.push(makeError(file, entry.line, "PR_WRITE_PERMISSION", `pull_request workflows must not grant ${entry.key}: write.`));
            }
        }
    }

    for (let index = 0; index < lines.length; index++) {
        const uses = lines[index].match(/^\s*(?:-\s+)?uses:\s*([^\s#]+?)(?:\s+#.*)?$/);
        if (!uses) continue;

        const reference = uses[1];
        if (!immutableActionReference(reference)) {
            errors.push(makeError(file, index + 1, "MUTABLE_ACTION_REF", `action reference ${reference} must use a full commit SHA or OCI digest.`));
        }

        if (!reference.startsWith("actions/checkout@")) continue;
        const block = stepBlock(lines, index);
        const hasSafeCredentials = block.some(({ text }) => /^\s*persist-credentials:\s*false\s*$/.test(text));
        if (!hasSafeCredentials) {
            errors.push(makeError(file, index + 1, "PERSISTENT_CHECKOUT_CREDENTIALS", "actions/checkout must set persist-credentials: false."));
        }
    }

    if (isPullRequestWorkflow) {
        for (let index = 0; index < lines.length; index++) {
            const uses = lines[index].match(/^\s*-\s+uses:\s*([^\s#]+?)(?:\s+#.*)?$/);
            if (!uses) continue;

            if (uses[1].startsWith("actions/cache@")) {
                errors.push(makeError(file, index + 1, "UNTRUSTED_CACHE", "pull_request workflows must not write or supply reusable caches."));
            }

            if (!uses[1].startsWith("actions/upload-artifact@") || isGuardedJob(jobs, index + 1)) continue;
            const block = stepBlock(lines, index);
            const name = block.find(({ text }) => /^\s*name:\s*(\S+)\s*$/.test(text));
            const retention = block.find(({ text }) => /^\s*retention-days:\s*1\s*$/.test(text));
            const artifactName = name ? name.text.replace(/^\s*name:\s*/, "") : "";

            if (!artifactName.startsWith("pr-") || !retention) {
                errors.push(makeError(file, index + 1, "UNTRUSTED_ARTIFACT_PROMOTION", "pull_request artifacts must be disposable (name pr-* and retention-days: 1)."));
            }
        }

        for (let index = 0; index < lines.length; index++) {
            if (!/^\s*(?:-\s+)?run:\s*(?:\|\s*)?$/.test(lines[index]) && !/^\s*(?:-\s+)?run:\s*.+$/.test(lines[index])) continue;
            const block = [lines[index], ...stepBlock(lines, index).map(({ text }) => text)].join("\n");
            if (/\b(?:docker|oras)\s+push\b|docker\s+buildx\s+build[^\n]*--push/.test(block)) {
                errors.push(makeError(file, index + 1, "UNTRUSTED_IMAGE_PROMOTION", "pull_request workflows must not push images."));
            }
            if (/\bnpm\s+publish\b/.test(block) && !isGuardedJob(jobs, index + 1)) {
                errors.push(makeError(file, index + 1, "UNTRUSTED_PACKAGE_PROMOTION", "pull_request workflows must not publish packages outside the guarded release path."));
            }
        }
    }

    return errors;
}

function checkFiles(files, cwd = process.cwd()) {
    return files.flatMap((file) => {
        const absolute = resolve(cwd, file);
        const display = relative(cwd, absolute) || file;
        return checkWorkflowSource(readFileSync(absolute, "utf8"), display);
    });
}

function parseArgs(args) {
    const files = [];
    for (let index = 0; index < args.length; index++) {
        if (args[index] === "--file") {
            if (!args[index + 1]) throw new Error("--file requires a path.");
            files.push(args[++index]);
        } else if (args[index] === "--help") {
            return { help: true, files };
        } else {
            throw new Error(`Unknown argument: ${args[index]}`);
        }
    }
    return { help: false, files };
}

function printLimitations() {
    console.log("External/remote validation still required:");
    for (const limitation of LIMITATIONS) console.log(`- ${limitation}`);
}

function main() {
    let options;
    try {
        options = parseArgs(process.argv.slice(2));
    } catch (error) {
        console.error(`[workflow-policy] ${error.message}`);
        process.exitCode = 2;
        return;
    }

    if (options.help || options.files.length === 0) {
        console.log("Usage: node scripts/check-workflow-policy.js --file <workflow.yml> [--file <workflow.yml> ...]");
        console.log("Only explicitly passed files are checked; legacy workflows are intentionally not scanned by default.");
        printLimitations();
        process.exitCode = options.help ? 0 : 2;
        return;
    }

    const errors = checkFiles(options.files);
    if (errors.length > 0) {
        for (const error of errors) {
            console.error(`${error.file}:${error.line} [${error.code}] ${error.message}`);
        }
        printLimitations();
        process.exitCode = 1;
        return;
    }

    console.log(`Workflow policy check passed for ${options.files.length} explicitly selected file(s).`);
    console.log("Legacy workflows were not evaluated unless passed with --file.");
    printLimitations();
}

if (require.main === module) main();

module.exports = {
    LIMITATIONS,
    checkFiles,
    checkWorkflowSource,
    hasReleasePrGuard,
    immutableActionReference,
    isGuardedJob,
    parseArgs,
    parseJobsIfConditions
};
