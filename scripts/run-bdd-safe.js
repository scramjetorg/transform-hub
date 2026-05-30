#!/usr/bin/env node

const { spawn } = require("child_process");
const fs = require("fs");

const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;
const DEFAULT_GRACE_MS = 15 * 1000;
const DEFAULT_MEMORY_POLL_MS = 1000;
const DEFAULT_MEMORY_SOFT_TRIPS = 2;
const TIMEOUT_EXIT_CODE = 124;
const MEMORY_EXIT_CODE = 137;
const SIGNAL_EXIT_CODE = {
    SIGHUP: 129,
    SIGINT: 130,
    SIGTERM: 143
};

const readPositiveInteger = (name, fallback) => {
    const value = Number(process.env[name]);

    return Number.isFinite(value) && value > 0 ? value : fallback;
};

const timeoutMs = readPositiveInteger("BDD_TIMEOUT_MS", DEFAULT_TIMEOUT_MS);
const graceMs = readPositiveInteger("BDD_GRACE_MS", DEFAULT_GRACE_MS);
const memoryLimitMb = readPositiveInteger("BDD_MEMORY_LIMIT_MB", 0);
const memoryPollMs = readPositiveInteger("BDD_MEMORY_POLL_MS", DEFAULT_MEMORY_POLL_MS);
const memorySoftTrips = readPositiveInteger("BDD_MEMORY_SOFT_TRIPS", DEFAULT_MEMORY_SOFT_TRIPS);
const separatorIndex = process.argv.indexOf("--");
const passthroughArgs = separatorIndex === -1
    ? process.argv.slice(2)
    : process.argv.slice(separatorIndex + 1);

if (passthroughArgs.includes("--help")) {
    console.log([
        "Usage: node scripts/run-bdd-safe.js -- [cucumber args...]",
        "",
        "Runs yarn --cwd=./bdd run test:bdd in a detached process group and kills",
        "that group if it exceeds BDD_TIMEOUT_MS.",
        "",
        "Environment:",
        `  BDD_TIMEOUT_MS  Hard timeout in ms (default ${DEFAULT_TIMEOUT_MS})`,
        `  BDD_GRACE_MS    SIGTERM-to-SIGKILL grace in ms (default ${DEFAULT_GRACE_MS})`,
        "  BDD_MEMORY_LIMIT_MB  Process-group RSS ceiling in MiB (default 0, disabled)",
        `  BDD_MEMORY_POLL_MS    Memory polling interval in ms (default ${DEFAULT_MEMORY_POLL_MS})`,
        `  BDD_MEMORY_SOFT_TRIPS Consecutive over-limit samples before kill (default ${DEFAULT_MEMORY_SOFT_TRIPS})`
    ].join("\n"));
    process.exit(0);
}

const parseCommandOverride = () => {
    if (!process.env.BDD_SAFE_COMMAND_JSON) {
        return null;
    }

    const command = JSON.parse(process.env.BDD_SAFE_COMMAND_JSON);

    if (!Array.isArray(command) || command.length === 0 || !command.every((part) => typeof part === "string")) {
        throw new Error("BDD_SAFE_COMMAND_JSON must be a JSON array of strings");
    }

    return command;
};

const readProcessGroupRssKb = (pgid) => {
    let total = 0;

    for (const entry of fs.readdirSync("/proc")) {
        if (!/^\d+$/.test(entry)) {
            continue;
        }

        try {
            const stat = fs.readFileSync(`/proc/${entry}/stat`, "utf8");
            const fields = stat.slice(stat.lastIndexOf(") ") + 2).split(" ");

            if (Number(fields[2]) !== pgid) {
                continue;
            }

            const status = fs.readFileSync(`/proc/${entry}/status`, "utf8");
            const match = status.match(/^VmRSS:\s+(\d+)\s+kB$/m);

            if (match) {
                total += Number(match[1]);
            }
        } catch (error) {
            if (!error || !["ENOENT", "EACCES", "EPERM"].includes(error.code)) {
                continue;
            }
        }
    }

    return total;
};

let command;

try {
    command = parseCommandOverride() || ["yarn", "--cwd=./bdd", "run", "test:bdd", ...passthroughArgs];
} catch (error) {
    console.error(`Failed to parse BDD safe command override: ${error.message}`);
    process.exit(1);
}

const child = spawn(command[0], command.slice(1), {
    detached: true,
    stdio: "inherit"
});

let timedOut = false;
let memoryTripped = false;
let settled = false;
let killTimer;
let memoryTimer;
let memoryOverLimitTrips = 0;

const killGroup = (signal) => {
    if (!child.pid) {
        return;
    }

    try {
        process.kill(-child.pid, signal);
    } catch (error) {
        if (error && error.code !== "ESRCH") {
            throw error;
        }
    }
};

const timeoutTimer = setTimeout(() => {
    timedOut = true;
    console.error(`BDD run exceeded ${timeoutMs}ms; sending SIGTERM to process group ${child.pid}`);

    try {
        killGroup("SIGTERM");
    } catch (error) {
        console.error(`Failed to send SIGTERM to BDD process group: ${error.message}`);
    }

    killTimer = setTimeout(() => {
        console.error(`BDD process group ${child.pid} did not exit after ${graceMs}ms; sending SIGKILL`);

        try {
            killGroup("SIGKILL");
        } catch (error) {
            console.error(`Failed to send SIGKILL to BDD process group: ${error.message}`);
        }
    }, graceMs);
}, timeoutMs);

if (memoryLimitMb > 0 && process.platform === "linux") {
    memoryTimer = setInterval(() => {
        if (settled || !child.pid) {
            return;
        }

        const rssKb = readProcessGroupRssKb(child.pid);
        const rssMb = rssKb / 1024;

        memoryOverLimitTrips = rssMb > memoryLimitMb
            ? memoryOverLimitTrips + 1
            : 0;

        if (memoryOverLimitTrips < memorySoftTrips) {
            return;
        }

        memoryTripped = true;
        clearInterval(memoryTimer);
        console.error(`BDD memory ceiling exceeded (${rssMb.toFixed(1)}MiB > ${memoryLimitMb}MiB); sending SIGTERM to process group ${child.pid}`);

        try {
            killGroup("SIGTERM");
        } catch (error) {
            console.error(`Failed to send SIGTERM to BDD process group: ${error.message}`);
        }

        killTimer = setTimeout(() => {
            console.error(`BDD process group ${child.pid} did not exit after ${graceMs}ms; sending SIGKILL`);

            try {
                killGroup("SIGKILL");
            } catch (error) {
                console.error(`Failed to send SIGKILL to BDD process group: ${error.message}`);
            }
        }, graceMs);
    }, memoryPollMs);
} else if (memoryLimitMb > 0) {
    console.error("BDD_MEMORY_LIMIT_MB is only supported on Linux; memory ceiling disabled.");
}

for (const signal of Object.keys(SIGNAL_EXIT_CODE)) {
    process.once(signal, () => {
        if (!settled) {
            try {
                killGroup(signal);
            } catch (error) {
                console.error(`Failed to forward ${signal} to BDD process group: ${error.message}`);
            }
        }

        process.exit(SIGNAL_EXIT_CODE[signal]);
    });
}

child.once("error", (error) => {
    settled = true;
    clearTimeout(timeoutTimer);
    clearTimeout(killTimer);
    clearInterval(memoryTimer);
    console.error(`Failed to start BDD process: ${error.message}`);
    process.exit(1);
});

child.once("exit", (code, signal) => {
    settled = true;
    clearTimeout(timeoutTimer);
    clearTimeout(killTimer);
    clearInterval(memoryTimer);

    if (timedOut) {
        process.exit(TIMEOUT_EXIT_CODE);
    }

    if (memoryTripped) {
        process.exit(MEMORY_EXIT_CODE);
    }

    if (typeof code === "number") {
        process.exit(code);
    }

    if (signal && SIGNAL_EXIT_CODE[signal]) {
        process.exit(SIGNAL_EXIT_CODE[signal]);
    }

    process.exit(1);
});
