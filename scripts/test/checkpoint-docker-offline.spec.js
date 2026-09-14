"use strict";

const test = require("ava").default;
const { execFileSync } = require("node:child_process");
const { existsSync } = require("node:fs");
const { resolve } = require("node:path");

const root = resolve(__dirname, "..", "..");
const images = [
    ["runner", "packages/runner/Dockerfile"],
    ["runner-bun", "packages/runner-bun/Dockerfile"],
    ["runner-python", "packages/runner-python/Dockerfile"],
    ["bdd-bun", "docker/Dockerfile.bdd-bun"]
];

function dockerAvailable() {
    try {
        execFileSync("docker", ["info"], { stdio: "ignore" });
        return true;
    } catch {
        return false;
    }
}

for (const [name, dockerfile] of images) {
    test(`checkpoint Docker image ${name} installs its runtime dependencies offline`, (t) => {
        t.timeout(120000);
        if (!dockerAvailable()) return t.pass("Docker daemon unavailable; integration test skipped");
        if (!existsSync(resolve(root, "runtime-dependencies/manifest.v1.json"))) return t.pass("runtime dependency checkpoint bundle unavailable; integration test skipped");
        if (name !== "bdd-bun" && !existsSync(resolve(root, "dist/docker-runner"))) return t.pass("staged runner build unavailable; integration test skipped");

        const tag = `transform-hub-checkpoint-${name}-${process.pid}`;
        t.teardown(() => {
            try { execFileSync("docker", ["image", "rm", "--force", tag], { stdio: "ignore" }); } catch { /* best effort */ }
        });
        execFileSync("docker", [
            "build", "--no-cache", "--build-arg", "CHECKPOINT_RUNTIME_DEPENDENCIES=true",
            "--file", resolve(root, dockerfile), "--tag", tag, root
        ], { cwd: root, stdio: "inherit" });
    });
}
