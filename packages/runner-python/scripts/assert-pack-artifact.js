"use strict";

const { spawnSync } = require("node:child_process");

const npm = process.env.npm_execpath || require.resolve("npm/bin/npm-cli.js");
const result = spawnSync(process.execPath, [npm, "pack", "--dry-run", "--ignore-scripts", "--json"], { encoding: "utf8" });
if (result.error) throw result.error;
if (result.status !== 0) throw new Error(result.stderr || `npm pack exited with ${result.status}`);

const packageInfo = JSON.parse(result.stdout)[0];
const paths = new Set(packageInfo.files.map(({ path }) => path));
const required = [
    "runner_python/__main__.py",
    "src/runner_python/__main__.py",
    "pyproject.toml",
    "requirements.txt",
    "__pypackages__/verser2_guest_python/__init__.py"
];
const missing = required.filter((file) => !paths.has(file));
if (missing.length) throw new Error(`runner-python packed artifact is incomplete: ${missing.join(", ")}`);

process.stdout.write(`runner-python packed artifact contains ${packageInfo.entryCount} files\n`);
