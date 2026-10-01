const { parseTimingEventLines } = require("./bdd-chunk-timing.js");

function parseRunnerOptions(args) {
    const runnerArgs = [];
    const cucumberArgs = [];
    let quiet = false;
    let silent = false;
    let afterSeparator = false;
    for (const arg of args) {
        if (afterSeparator) { cucumberArgs.push(arg); continue; }
        if (arg === "--") { afterSeparator = true; continue; }
        if (arg === "-q" || arg === "--quiet") quiet = true;
        else if (arg === "-s" || arg === "--silent") silent = true;
        else runnerArgs.push(arg);
    }
    return { mode: silent ? "silent" : quiet ? "quiet" : "full", runnerArgs, cucumberArgs };
}

function formatElapsedOffset(offsetMs) {
    return `+${(offsetMs / 1000).toFixed(3)}s`;
}

function formatTimelineWindow(event) {
    const startOffsetMs = Number(event.startOffsetMs);
    const endOffsetMs = Number(event.endOffsetMs);
    const durationMs = Number(event.durationMs) || 0;
    if (!Number.isFinite(startOffsetMs) || !Number.isFinite(endOffsetMs)) return `[${formatDuration(durationMs)}; offset unavailable]`;
    return `[${formatElapsedOffset(startOffsetMs)} → ${formatElapsedOffset(endOffsetMs)}; ${formatDuration(durationMs)}]`;
}

function formatRunLog({ phases = [], events = [], status = "PASS", mode = "run", runId = "unknown", chunkId = "unknown", owner = "unknown", invocationElapsedMs }) {
    const lines = [`BDD ${mode} log run=${runId} chunk=${chunkId} owner=${owner}`];

    const timeline = phases.map(phase => ({ ...phase, kind: "phase" }));
    timeline.push(...events.filter(event => ["scenario", "step", "cleanup"].includes(event.kind)));

    const timedSteps = events.filter(event => event.kind === "step" && Number.isFinite(Number(event.startOffsetMs)) && Number.isFinite(Number(event.endOffsetMs)));
    if (timedSteps.length > 0) {
        const firstStepStartMs = Math.min(...timedSteps.map(event => Number(event.startOffsetMs)));
        const lastStepEndMs = Math.max(...timedSteps.map(event => Number(event.endOffsetMs)));
        timeline.push({
            kind: "phase",
            name: "warm-up (invocation to first Gherkin step)",
            startOffsetMs: 0,
            endOffsetMs: firstStepStartMs,
            durationMs: firstStepStartMs,
            status: "PASS",
            category: "envelope",
        });
        if (Number.isFinite(invocationElapsedMs) && invocationElapsedMs > lastStepEndMs) {
            timeline.push({
                kind: "phase",
                name: "teardown (last Gherkin step to log emission)",
                startOffsetMs: lastStepEndMs,
                endOffsetMs: invocationElapsedMs,
                durationMs: invocationElapsedMs - lastStepEndMs,
                status,
                category: "envelope",
            });
        }
    }

    timeline.sort((left, right) => {
        const leftOffset = Number.isFinite(Number(left.startOffsetMs)) ? Number(left.startOffsetMs) : Number.POSITIVE_INFINITY;
        const rightOffset = Number.isFinite(Number(right.startOffsetMs)) ? Number(right.startOffsetMs) : Number.POSITIVE_INFINITY;
        return leftOffset - rightOffset;
    });

    for (const event of timeline) {
        const window = formatTimelineWindow(event);
        if (event.kind === "phase") {
            lines.push(`  phase ${event.name} ${window} ${event.status}${event.category === "envelope" ? " (enclosing span; not additive)" : ""}`);
        } else if (event.kind === "scenario") {
            lines.push(`  scenario [${event.status || "UNKNOWN"}] ${event.name || "unknown scenario"} ${window}`);
        } else if (event.kind === "cleanup") {
            lines.push(`  teardown ${event.scenario || "unknown scenario"} — ${event.phase || "cleanup"} ${window}`);
        } else if (event.kind === "step") {
            lines.push(`  step [${event.status || "UNKNOWN"}] ${event.scenario || "unknown scenario"} — ${event.name || "unknown step"} ${window}`);
        }
    }
    lines.push(`BDD ${status}`);
    if (Number.isFinite(invocationElapsedMs) && invocationElapsedMs >= 0) {
        lines.push(`Total elapsed since invocation: ${(invocationElapsedMs / 1000).toFixed(2)}s`);
    }
    return lines.join("\n");
}

function readTimingEvents(raw) { return parseTimingEventLines(raw); }
function readStepEvents(raw) { return readTimingEvents(raw).filter(event => event.kind === "step"); }
function formatDuration(durationMs) { return `${(Number(durationMs) || 0).toFixed(1)}ms`; }

function renderModeOutput({ mode, success, runLog = "", diagnostic = "", stderr = "" }) {
    if (mode === "full") return { stdout: "", stderr: "" };
    if (mode === "silent") return { stdout: success ? "PASS\n" : "FAIL\n", stderr: success ? "" : `${diagnostic}${stderr}` };
    return { stdout: `${runLog}${runLog ? "\n" : ""}`, stderr: success ? "" : `${diagnostic}${stderr}` };
}

function actionableOutput(raw) {
    return String(raw || "").split(/\r?\n/).filter(line => /\b(fail(?:ed|ure)?|error|undefined step|pending|ambiguous|exception|assertion)\b/i.test(line)).join("\n");
}

module.exports = { parseRunnerOptions, formatRunLog, readStepEvents, readTimingEvents, formatDuration, renderModeOutput, actionableOutput };
