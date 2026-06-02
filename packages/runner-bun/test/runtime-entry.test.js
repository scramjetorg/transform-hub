import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { tmpdir } from "os";
import { spawn } from "child_process";
import { describe, expect, test } from "bun:test";

const PKG_DIR = resolve(import.meta.dir, "..");
const FIXTURES_DIR = resolve(import.meta.dir, "fixtures");

function makeTempDir(prefix) {
    return mkdtempSync(join(tmpdir(), prefix));
}

function cleanupTempDir(dir) {
    rmSync(dir, { recursive: true, force: true });
}

function writeBootConfig(dir, data) {
    const bootPath = join(dir, "boot.json");
    writeFileSync(bootPath, JSON.stringify(data));
    return bootPath;
}

function runRunnerBun(bootPath, env = {}) {
    return new Promise((resolvePromise, rejectPromise) => {
        const child = spawn("bun", ["src/bin/runner-bun.ts", bootPath], {
            cwd: PKG_DIR,
            env: { ...process.env, ...env },
            stdio: ["ignore", "pipe", "pipe"]
        });

        let stdout = "";
        let stderr = "";

        child.stdout.on("data", chunk => { stdout += chunk.toString("utf8"); });
        child.stderr.on("data", chunk => { stderr += chunk.toString("utf8"); });

        child.once("error", rejectPromise);
        child.once("exit", code => resolvePromise({ code: code ?? -1, stdout, stderr }));
    });
}

function fixturePath(name) {
    return resolve(FIXTURES_DIR, name);
}

function fixturePackageJsonPath(name) {
    return resolve(FIXTURES_DIR, name, "package.json");
}

function assertFixturePackage(name) {
    const packageJsonPath = fixturePackageJsonPath(name);
    expect(readFileSync(packageJsonPath, "utf8")).toBeTruthy();
    return JSON.parse(readFileSync(packageJsonPath, "utf8"));
}

test("direct execution writes a marker", async () => {
    const tempDir = makeTempDir("runner-bun-direct-");
    try {
        const outPath = join(tempDir, "marker.out");
        const pkg = assertFixturePackage("direct-marker");
        const bootPath = writeBootConfig(tempDir, {
            sequencePath: fixturePath("direct-marker"),
            instanceId: "direct",
            sequenceArgs: [outPath]
        });

        const result = await runRunnerBun(bootPath, {
            SEQUENCE_PATH: "/bogus/sequence.js",
            SEQUENCE_INFO: JSON.stringify({ id: "bogus" }),
            RUNNER_CONNECT_INFO: JSON.stringify({ appConfig: { bogus: true } })
        });

        expect(result.code).toBe(0);
        expect(pkg.main).toBe("index.js");
        expect(readFileSync(outPath, "utf8")).toBe("marker\n");
    } finally {
        cleanupTempDir(tempDir);
    }
});

test("sequence args are forwarded", async () => {
    const tempDir = makeTempDir("runner-bun-args-");
    try {
        const outPath = join(tempDir, "args.json");
        const pkg = assertFixturePackage("record-args");
        const bootPath = writeBootConfig(tempDir, {
            sequencePath: fixturePath("record-args"),
            instanceId: "args",
            sequenceArgs: [outPath, "alpha", 7, { beta: true }]
        });

        const result = await runRunnerBun(bootPath);

        expect(result.code).toBe(0);
        expect(pkg.main).toBe("index.js");
        expect(JSON.parse(readFileSync(outPath, "utf8"))).toEqual(["alpha", 7, { beta: true }]);
    } finally {
        cleanupTempDir(tempDir);
    }
});

test("array exports run in order", async () => {
    const tempDir = makeTempDir("runner-bun-array-");
    try {
        const outPath = join(tempDir, "order.out");
        const pkg = assertFixturePackage("array-order");
        const bootPath = writeBootConfig(tempDir, {
            sequencePath: fixturePath("array-order"),
            instanceId: "array",
            sequenceArgs: [outPath]
        });

        const result = await runRunnerBun(bootPath);

        expect(result.code).toBe(0);
        expect(pkg.main).toBe("index.js");
        expect(readFileSync(outPath, "utf8")).toBe("first\nsecond\nthird\n");
    } finally {
        cleanupTempDir(tempDir);
    }
});

test("default export shape works", async () => {
    const tempDir = makeTempDir("runner-bun-default-");
    try {
        const outPath = join(tempDir, "default.out");
        const pkg = assertFixturePackage("default-export");
        const bootPath = writeBootConfig(tempDir, {
            sequencePath: fixturePath("default-export"),
            instanceId: "default",
            sequenceArgs: [outPath]
        });

        const result = await runRunnerBun(bootPath);

        expect(result.code).toBe(0);
        expect(pkg.main).toBe("index.js");
        expect(readFileSync(outPath, "utf8")).toBe("default-export\n");
    } finally {
        cleanupTempDir(tempDir);
    }
});

test("throwing fixture exits non-zero and logs runner-bun failed", async () => {
    const tempDir = makeTempDir("runner-bun-throw-");
    try {
        const bootPath = writeBootConfig(tempDir, {
            sequencePath: fixturePath("throwing"),
            instanceId: "throwing",
            sequenceInfo: { id: "throwing" }
        });

        const result = await runRunnerBun(bootPath);

        expect(result.code).toBe(1);
        expect(result.stderr).toContain("STH runtime error phase=instance-runtime runtime=bun");
        expect(result.stderr).toContain("sequenceId=throwing");
        expect(result.stderr).toContain("fixture boom");
        expect(result.stderr).toContain("runner-bun failed:");
    } finally {
        cleanupTempDir(tempDir);
    }
});

test("missing import fixture exits non-zero and logs sequence-load context", async () => {
    const tempDir = makeTempDir("runner-bun-missing-import-");
    try {
        const bootPath = writeBootConfig(tempDir, {
            sequencePath: fixturePath("missing-import"),
            instanceId: "missing-import",
            sequenceInfo: { id: "missing-import" }
        });

        const result = await runRunnerBun(bootPath);

        expect(result.code).toBe(1);
        expect(result.stderr).toContain("STH runtime error phase=sequence-load runtime=bun");
        expect(result.stderr).toContain("sequenceId=missing-import");
        expect(result.stderr).toContain("Cannot find module");
    } finally {
        cleanupTempDir(tempDir);
    }
});

test("bootstrap ignores bogus env metadata when boot config is valid", async () => {
    const tempDir = makeTempDir("runner-bun-bootstrap-");
    try {
        const outPath = join(tempDir, "bootstrap.out");
        const pkg = assertFixturePackage("bootfile-driven");
        const bootPath = writeBootConfig(tempDir, {
            sequencePath: fixturePath("bootfile-driven"),
            instanceId: "bootfile",
            sequenceArgs: [outPath, "driven-by-boot"]
        });

        const result = await runRunnerBun(bootPath, {
            SEQUENCE_PATH: fixturePath("throwing"),
            SEQUENCE_INFO: JSON.stringify({ id: "bogus-sequence" }),
            RUNNER_CONNECT_INFO: JSON.stringify({ appConfig: { bogus: true } })
        });

        expect(result.code).toBe(0);
        expect(pkg.main).toBe("index.js");
        expect(readFileSync(outPath, "utf8")).toBe("driven-by-boot\n");
    } finally {
        cleanupTempDir(tempDir);
    }
});

test("fixture residue guard", () => {
    const bad = [];

    function walk(dir, prefix = "") {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            const rel = prefix ? `${prefix}/${entry.name}` : entry.name;

            if (entry.isDirectory()) {
                walk(resolve(dir, entry.name), rel);
                continue;
            }

            if ((/\.out$/.test(entry.name) || (/\.json$/.test(entry.name) && entry.name !== "package.json") || /^tmp/.test(entry.name))) bad.push(rel);
        }
    }

    walk(FIXTURES_DIR);

    expect(bad).toEqual([]);
});
