#!/usr/bin/env node

const { existsSync } = require("node:fs");
const { resolve } = require("node:path");

const artifactRoot = resolve(__dirname, "..", "dist", "runner-python");
const requiredPaths = [
    "runner_python/__main__.py",
    "src/runner_python/__main__.py",
    "pyproject.toml",
    "requirements.txt",
    "__pypackages__/pyee",
    "__pypackages__/scramjet",
    "__pypackages__/verser2_guest_python"
];

const missing = requiredPaths.filter(relativePath => !existsSync(resolve(artifactRoot, relativePath)));

if (missing.length > 0) {
    throw new Error(`prepacked runner-python artifact is incomplete: ${missing.join(", ")}`);
}
