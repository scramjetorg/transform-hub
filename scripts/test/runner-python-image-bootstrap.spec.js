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
    t.regex(dockerfile, /FROM python:3\.14-slim-bookworm/);
    t.regex(entrypoint, /export PYTHONPATH="\/opt\/runner-python:\/opt\/runner-python\/src:\/package\/__pypackages__/);
});

test("BDD image installs the runner-python runtime dependencies", (t) => {
    const dockerfile = readFileSync(resolve(root, "docker/Dockerfile.bdd-bun"), "utf8");

    t.regex(dockerfile, /COPY packages\/runner-python\/requirements\.txt \/tmp\/runner-python\/requirements\.txt/);
    t.regex(dockerfile, /RUNNER_PYTHON_VENV=\/opt\/runner-python-venv/);
    t.regex(dockerfile, /\$\{RUNNER_PYTHON_VENV\}\/bin\/pip" install --no-cache-dir/);
    t.regex(dockerfile, /FROM python:3\.14-slim-bookworm/);
});
