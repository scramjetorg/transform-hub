"use strict";

const test = require("ava").default;
const { execFileSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { loadRuntimeProfile, verifyRuntimeManifest } = require("../checkpoint/runtime-dependencies.js");

const root = resolve(__dirname, "..", "..");

function sha256(file) {
    return `sha256:${createHash("sha256").update(readFileSync(file)).digest("hex")}`;
}

function verifierFixture() {
    const directory = mkdtempSync(resolve(root, "runtime-verifier-test-"));
    const cacheFile = "v6/npm-test-1.0.0-integrity/node_modules/test/package.json";
    mkdirSync(resolve(directory, "bun"), { recursive: true });
    mkdirSync(resolve(directory, "yarn"), { recursive: true });
    writeFileSync(resolve(directory, "bun/bun-linux-x64.zip"), "bun");
    writeFileSync(resolve(directory, "yarn/yarn.tar.gz"), "yarn");
    mkdirSync(resolve(directory, "yarn/cache", cacheFile.slice(0, cacheFile.lastIndexOf("/"))), { recursive: true });
    writeFileSync(resolve(directory, "yarn/cache", cacheFile), "cache");
    const packageJson = resolve(directory, "package.json");
    const lockfile = resolve(directory, "yarn.lock");
    writeFileSync(packageJson, "{\"name\":\"runner\"}\n");
    writeFileSync(lockfile, "# yarn lockfile v1\n");
    const manifest = {
        files: [
            ["bun/bun-linux-x64.zip", "bun"],
            ["yarn/yarn.tar.gz", "yarn"],
            [`yarn/cache/${cacheFile}`, "cache"]
        ].map(([path, value]) => ({ path, sha256: `sha256:${createHash("sha256").update(value).digest("hex")}` })),
        runner: {
            packageJsonSha256: sha256(packageJson),
            lockfileSha256: sha256(lockfile),
            cacheFiles: [cacheFile]
        }
    };
    writeFileSync(resolve(directory, "manifest.v1.json"), `${JSON.stringify(manifest)}\n`);
    return { directory, packageJson, lockfile, cacheFile };
}

function runVerifier(fixture) {
    return execFileSync(process.execPath, [
        resolve(root, "scripts/checkpoint/verify-runtime-dependencies.js"), fixture.directory,
        "--runner", "--runner-package-json", fixture.packageJson, "--runner-lockfile", fixture.lockfile
    ], { stdio: "pipe" });
}

test("runtime profile pins the immutable runtime artifacts", (t) => {
    const profile = loadRuntimeProfile(root);
    t.is(profile.bun.sha256, "4e9edc4cba0c7c1623a288be01e53bbde11a4d073f2cf339cab026627858b548");
    t.is(profile.yarn.sha256, "88268464199d1611fcf73ce9c0a6c4d44c7d5363682720d8506f6508addf36a0");
    t.is(profile.python.wheelhouse.verser2.sha256, "da5ab6efd2ef572a864b8f6766f043fcbe25af3d10a5f5ba0c3878e82e84eef0");
    t.false(readFileSync(resolve(root, "packages/runner-python/requirements.txt"), "utf8").includes("scramjet-framework-py\n"));
});

test("prefetched manifest covers every Python wheel", (t) => {
    const manifest = verifyRuntimeManifest(resolve(root, "runtime-dependencies"));
    t.regex(manifest.runner.lockfileSha256, /^sha256:[a-f0-9]{64}$/);
    t.regex(manifest.runner.packageJsonSha256, /^sha256:[a-f0-9]{64}$/);
    t.is(manifest.runner.packageJsonSha256, sha256(resolve(root, "packages/runner/package.json")));
    t.is(manifest.runner.lockfileSha256, sha256(resolve(root, "packages/runner/yarn.lock")));
    t.true(manifest.runner.cacheFiles.length > 0);
    t.deepEqual(manifest.runner.cacheFiles, manifest.files
        .filter(({ path }) => path.startsWith("yarn/cache/"))
        .map(({ path }) => path.slice("yarn/cache/".length))
        .sort());
    const wheels = manifest.files.filter(({ path }) => path.startsWith("python/wheelhouse/") && path.endsWith(".whl"));
    t.deepEqual(wheels.map(({ path }) => path.split("/").pop()), [
        "cffi-2.1.1-cp311-cp311-manylinux2014_x86_64.manylinux_2_17_x86_64.whl",
        "cryptography-49.0.0-cp311-abi3-manylinux2014_x86_64.manylinux_2_17_x86_64.whl",
        "h2-4.4.1-py3-none-any.whl",
        "hpack-4.2.0-py3-none-any.whl",
        "hyperframe-6.1.0-py3-none-any.whl",
        "pycparser-3.0-py3-none-any.whl",
        "pyee-13.0.1-py3-none-any.whl",
        "scramjet_framework_py-0.10.1-py3-none-any.whl",
        "typing_extensions-4.16.0-py3-none-any.whl",
        "verser2_guest_python-0.4.2-py3-none-any.whl",
    ]);
});

test("Docker verifier binds runner inputs and rejects cache extras", (t) => {
    const fixture = verifierFixture();
    t.teardown(() => rmSync(fixture.directory, { recursive: true, force: true }));
    t.notThrows(() => runVerifier(fixture));

    rmSync(resolve(fixture.directory, "yarn/cache", fixture.cacheFile));
    t.throws(() => runVerifier(fixture));
    mkdirSync(resolve(fixture.directory, "yarn/cache", fixture.cacheFile.slice(0, fixture.cacheFile.lastIndexOf("/"))), { recursive: true });
    writeFileSync(resolve(fixture.directory, "yarn/cache", fixture.cacheFile), "cache");

    writeFileSync(resolve(fixture.directory, "yarn/cache", "extra"), "extra");
    t.throws(() => runVerifier(fixture), { message: /exactly match/ });
    rmSync(resolve(fixture.directory, "yarn/cache", "extra"));

    writeFileSync(fixture.packageJson, "{\"name\":\"changed\"}\n");
    t.throws(() => runVerifier(fixture), { message: /package.json digest mismatch/ });
});
