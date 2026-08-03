"use strict";

const { existsSync } = require("node:fs");
const { resolve } = require("node:path");

const packageRoot = resolve(__dirname, "..");
const requiredPaths = [
    "dist/runner_python/__main__.py",
    "dist/src/runner_python/__main__.py",
    "dist/pyproject.toml",
    "dist/requirements.txt",
    "dist/__pypackages__/pyee",
    "dist/__pypackages__/scramjet",
    "dist/__pypackages__/verser2_guest_python"
];

const missing = requiredPaths.filter(relativePath => !existsSync(resolve(packageRoot, relativePath)));

if (missing.length > 0) {
    throw new Error(`runner-python distribution artifact is incomplete: ${missing.join(", ")}`);
}
