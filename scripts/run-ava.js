#!/usr/bin/env node

const { spawnSync } = require("child_process");
const { existsSync, readFileSync } = require("fs");
const { dirname, join, resolve } = require("path");

function findPackageRoot(entrypoint) {
    let current = dirname(entrypoint);

    while (current !== dirname(current)) {
        const packageFile = join(current, "package.json");

        if (existsSync(packageFile)) {
            return current;
        }

        current = dirname(current);
    }

    throw new Error(`Could not find AVA package root from ${entrypoint}`);
}

function resolveAvaCli() {
    const avaEntrypoint = require.resolve("ava", { paths: [process.cwd()] });
    const packageRoot = findPackageRoot(avaEntrypoint);
    const packageJson = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8"));
    const bin = typeof packageJson.bin === "string" ? packageJson.bin : packageJson.bin?.ava;

    if (!bin) {
        throw new Error("AVA package does not declare an ava binary");
    }

    return resolve(packageRoot, bin);
}

function appendNodeOption(options, option) {
    const parts = options.split(/\s+/).filter(Boolean);
    const optionName = option.split("=")[0];

    if (parts.some(part => part === option || part.startsWith(`${optionName}=`))) {
        return options;
    }

    return [...parts, option].join(" ");
}

function replaceNodeOption(options, option) {
    const optionName = option.split("=")[0];
    const parts = options.split(/\s+/).filter(Boolean).filter(part => part !== optionName && !part.startsWith(`${optionName}=`));

    return [...parts, option].join(" ");
}

function avaNodeOptions(options = process.env.NODE_OPTIONS || "") {
    const withHeapLimit = replaceNodeOption(options, "--max-old-space-size=1536");

    return appendNodeOption(withHeapLimit, "--jitless");
}

const avaCli = resolveAvaCli();
const result = spawnSync(process.execPath, [avaCli, ...process.argv.slice(2)], {
    env: {
        ...process.env,
        NODE_OPTIONS: avaNodeOptions()
    },
    stdio: "inherit"
});

if (result.error) {
    throw result.error;
}

process.exit(result.status === null ? 1 : result.status);
