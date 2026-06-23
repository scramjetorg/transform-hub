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

function removeNodeOption(options, option) {
    const optionName = option.split("=")[0];

    return options.split(/\s+/).filter(Boolean).filter(part => part !== optionName && !part.startsWith(`${optionName}=`)).join(" ");
}

function isDisabled(value) {
    return ["0", "false", "no", "off"].includes(String(value).toLowerCase());
}

function avaNodeOptions(options = process.env.NODE_OPTIONS || "") {
    const withHeapLimit = replaceNodeOption(options, "--max-old-space-size=1536");
    const withFetchMode = isDisabled(process.env.SCRAMJET_AVA_FETCH)
        ? appendNodeOption(withHeapLimit, "--no-experimental-fetch")
        : withHeapLimit;

    if (isDisabled(process.env.SCRAMJET_AVA_JITLESS)) {
        return removeNodeOption(withFetchMode, "--jitless");
    }

    return appendNodeOption(withFetchMode, "--jitless");
}

function avaNodeArgs() {
    if (!isDisabled(process.env.SCRAMJET_AVA_JITLESS)) {
        return [];
    }

    return [
        "--wasm-num-compilation-tasks=1",
        "--wasm-max-mem-pages=4096",
        "--wasm-max-committed-code-mb=128",
        "--wasm-max-code-space-size-mb=128"
    ];
}

const avaCli = resolveAvaCli();
const result = spawnSync(process.execPath, [...avaNodeArgs(), avaCli, ...process.argv.slice(2)], {
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
