"use strict";

const test = require("ava");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const cp = require("node:child_process");

const root = path.resolve(__dirname, "../..");
const source = (...parts) => fs.readFileSync(path.join(root, "docs-source", ...parts), "utf8");

test("installed Sequence guide covers package, readiness, and execution paths", t => {
    const guide = source("sequences", "setup-and-run.md");

    for (const evidence of [
        /"main": "dist\/index\.js"/,
        /"build": "tsc -p tsconfig\.json"/,
        /"test": "node --test"/,
        /npm install --production/,
        /bun install --production/,
        /si sequence pack \./,
        /hello-sequence\.tar\.gz/,
        /\.siignore/,
        /does \*\*not\*\* install dependencies/,
        /npm pack/,
        /npm install -g @scramjet\/sth @scramjet\/cli/,
        /--runtime-adapter process/,
        /--sequences-root/,
        /api\/v1\/status/,
        /ready === true/,
        /si sequence deploy \.\/hello-sequence\.tar\.gz/,
        /si sequence send \.\/hello-sequence\.tar\.gz[\s\S]*si sequence start/,
        /Manager-routed/,
        /hubClient\(\)/,
        /spaceClient\(\)/
    ]) {
        t.regex(guide, evidence);
    }
});

test("archive packaging/load path validation: install production deps, pack, extract, run in isolation", t => {
    // Validate the documented procedure documented in setup-and-run.md:
    // 1. Install production dependencies in the package directory
    // 2. Create a tarball
    // 3. Extract to an isolated location
    // 4. Verify node_modules is present and resolves without the source project's node_modules

    const srcDir = fs.mkdtempSync(path.join(os.tmpdir(), "sth-guide-pack-"));
    const extDir = fs.mkdtempSync(path.join(os.tmpdir(), "sth-guide-ext-"));

    try {
        // Create a minimal sequence package with a simple dependency
        fs.writeFileSync(path.join(srcDir, "package.json"), JSON.stringify({
            name: "guide-test-sequence",
            version: "1.0.0",
            main: "index.js",
            engines: { node: ">=18" },
            dependencies: {
                "escape-string-regexp": "^4.0.0"
            }
        }));

        fs.writeFileSync(path.join(srcDir, "index.js"), `
"use strict";
const escapeStringRegexp = require("escape-string-regexp");
module.exports = async function (input) {
    const chunks = [];
    for await (const chunk of input) chunks.push(chunk);
    return { escaped: escapeStringRegexp(chunks.join("")), count: chunks.length };
};
        `.trim());

        // Step 1: install --production (simulating the documented procedure)
        const install = cp.spawnSync("npm", ["install", "--production"], {
            cwd: srcDir, encoding: "utf8", timeout: 60000
        });
        t.is(install.status, 0, `npm install --production failed: ${install.stderr}`);

        // Confirm node_modules exists before packing
        const nmPath = path.join(srcDir, "node_modules", "escape-string-regexp");
        t.true(fs.existsSync(nmPath), "dependency must be installed before packing");

        // Step 2: create a gzipped tarball (si sequence pack equivalent)
        const archivePath = path.join(os.tmpdir(), `guide-test-${Date.now()}.tar.gz`);
        const pack = cp.spawnSync("tar", ["czf", archivePath, "-C", srcDir, "."], {
            encoding: "utf8", timeout: 30000
        });
        t.is(pack.status, 0, `tar czf failed: ${pack.stderr}`);

        // Step 3: extract to isolated directory
        const extract = cp.spawnSync("tar", ["xzf", archivePath, "-C", extDir], {
            encoding: "utf8", timeout: 30000
        });
        t.is(extract.status, 0, `tar xzf failed: ${extract.stderr}`);

        // Step 4: verify the extraction is self-contained
        t.true(fs.existsSync(path.join(extDir, "node_modules")),
            "node_modules/ must be present in the extraction");
        t.true(fs.existsSync(path.join(extDir, "node_modules", "escape-string-regexp")),
            "dependency must be present in the extraction");

        // Verify the package loads without falling back to the source project's node_modules.
        // Run a child process with NODE_PATH cleared so only the extraction's own
        // node_modules is visible.
        const loadTest = cp.spawnSync("node", [
            "-e", `
                const path = require("path");
                const seqDir = process.argv[1];
                // Isolate module resolution: only the extraction's own node_modules
                module.paths = [path.join(seqDir, "node_modules")];
                const pkg = require(path.join(seqDir, "package.json"));
                const mainPath = require.resolve(path.join(seqDir, pkg.main),
                    { paths: [seqDir, path.join(seqDir, "node_modules")] });
                const seq = require(mainPath);
                console.log("OK:" + (typeof seq === "function" ? "function" : typeof seq));
            `,
            extDir
        ], {
            encoding: "utf8", timeout: 15000,
            env: { ...process.env, NODE_PATH: "" }
        });
        t.is(loadTest.status, 0, `isolated load failed: ${loadTest.stderr}`);
        t.regex(loadTest.stdout, /^OK:function/,
            "extracted sequence main exports a function in isolation");
    } finally {
        fs.rmSync(srcDir, { recursive: true, force: true });
        fs.rmSync(extDir, { recursive: true, force: true });
    }
});

test("relevant setup and example pages link to the canonical guide", t => {
    for (const file of [
        ["transform-hub", "getting-started.md"],
        ["transform-hub", "build-run.md"],
        ["sequences", "packaging-deploying.md"],
        ["examples", "simple-transform.md"],
        ["examples", "local-object-filter-to-consumer.md"],
        ["examples", "customer-site-topic-probe-pipeline.md"]
    ]) {
        t.regex(source(...file), /\.\.\/sequences\/setup-and-run\.md|\(setup-and-run\.md\)/, file.join("/"));
    }
});
