"use strict";

const test = require("ava").default;
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");

const root = resolve(__dirname, "..", "..");

test("runner-python image verifies and bootstraps the launcher in the final stage", (t) => {
    const dockerfile = readFileSync(resolve(root, "packages/runner-python/Dockerfile"), "utf8");
    const entrypoint = readFileSync(resolve(root, "packages/runner-python/docker-entrypoint.sh"), "utf8");

    t.regex(dockerfile, /COPY packages\/runner-python\/runner_python \$\{RUNNER_PY_DIR\}\/runner_python/);
    t.regex(dockerfile, /RUN test -f \$\{RUNNER_PY_DIR\}\/runner_python\/__main__\.py/);
    t.regex(dockerfile, /python3 -c "import runner_python"/);
    t.regex(entrypoint, /export PYTHONPATH="\/opt\/runner-python:\/opt\/runner-python\/src:\/package\/__pypackages__/);
});
