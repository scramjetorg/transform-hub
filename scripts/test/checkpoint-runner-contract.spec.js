"use strict";

const test = require("ava").default;
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");

const root = resolve(__dirname, "..", "..");

test("checkpoint runner variants use the isolated runner install contract", (t) => {
    for (const dockerfile of ["packages/runner/Dockerfile", "packages/runner-bun/Dockerfile", "packages/runner-python/Dockerfile"]) {
        const source = readFileSync(resolve(root, dockerfile), "utf8");
        t.regex(source, /COPY packages\/runner\/package\.json \/tmp\/scramjet-runner-install\/package\.json/);
        t.regex(source, /COPY packages\/runner\/yarn\.lock \/tmp\/scramjet-runner-install\/yarn\.lock/);
        t.regex(source, /--runner-package-json \/tmp\/scramjet-runner-install\/package\.json/);
        t.regex(source, /--runner-lockfile \/tmp\/scramjet-runner-install\/yarn\.lock/);
        t.regex(source, /yarn --cwd \/tmp\/scramjet-runner-install install/);
        t.regex(source, /--modules-folder \$\{HUB_DIR\}\/node_modules/);
    }
});

test("Bun and Python runner variants copy a complete Node runtime", (t) => {
    for (const dockerfile of ["packages/runner-bun/Dockerfile", "packages/runner-python/Dockerfile"]) {
        const source = readFileSync(resolve(root, dockerfile), "utf8");
        t.true(source.includes("COPY --from=node-runtime /usr/local /usr/local"), `${dockerfile} must copy the complete Node runtime`);
        t.false(source.includes("COPY --from=node-runtime /usr/local/bin/node /usr/local/bin/node"), `${dockerfile} must not graft Node binaries individually`);
        t.false(source.includes("COPY --from=node-runtime /usr/local/lib/node_modules /usr/local/lib/node_modules"), `${dockerfile} must not graft npm libraries partially`);
        t.true(source.includes("rm -f /usr/local/bin/yarn /usr/local/bin/yarnpkg"), `${dockerfile} must replace the copied Corepack shims before normal Yarn installation`);
    }
});

test("Python runner normal install downloads the Verser2 wheel without Python indentation", (t) => {
    const source = readFileSync(resolve(root, "packages/runner-python/Dockerfile"), "utf8");
    t.true(source.includes('python3 -c "import sys; from pathlib import Path; from urllib.request import urlopen; url, dst = sys.argv[1], Path(sys.argv[2]); dst.write_bytes(urlopen(url).read())"'));
    t.true(source.includes('echo "${VERSER2_WHEEL_SHA256}  ${TMP_DIR}/${VERSER2_WHEEL}" | sha256sum --check --status'));
});
