"use strict";

const test = require("ava").default;
const { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");

const { INCLUDED_PACKAGES, RELEASE_WAVES, includedPackageDir, validateReleaseWaves } = require("../lib/release-boundary.js");
const {
    NPM_CLI,
    PUBLICATION_FORMAT,
    assertOidcPublication,
    createRelease,
    publishRelease,
    publicationChecksum,
    verifyPublication,
    verifyRelease,
    waitForRegistryVisibility,
    writeRelease,
} = require("../release-main.js");

const SHA = "a".repeat(40);
const BOUNDARY = new Set(["@scramjet/a", "@scramjet/b"]);
const SUBSET_WAVES = [["@scramjet/b"], ["@scramjet/a"]];
const APPROVED_WAVES = [
    ["@scramjet/logger", "@scramjet/pre-runner", "@scramjet/runner-python", "@scramjet/runtime-types", "@scramjet/symbols", "@scramjet/utility"],
    ["@scramjet/api-types", "@scramjet/obj-logger", "@scramjet/sequence-types"],
    ["@scramjet/adapters-common", "@scramjet/config", "@scramjet/load-check", "@scramjet/model", "@scramjet/module-loader", "@scramjet/monitoring-server", "@scramjet/telemetry", "@scramjet/types"],
    ["@scramjet/adapter-kubernetes", "@scramjet/api-router", "@scramjet/client-utils"],
    ["@scramjet/api-client", "@scramjet/api-server", "@scramjet/rest-api2"],
    ["@scramjet/multi-manager-api-client", "@scramjet/runner-node"],
    ["@scramjet/middleware-api-client", "@scramjet/runner-bun"],
    ["@scramjet/cli", "@scramjet/runner"],
    ["@scramjet/adapter-docker", "@scramjet/adapter-process", "@scramjet/sequence-test"],
    ["@scramjet/adapters", "@scramjet/manager"],
    ["@scramjet/host", "@scramjet/multi-manager"],
    ["@scramjet/sth"],
];
const ENVIRONMENT = {
    ACTIONS_ID_TOKEN_REQUEST_TOKEN: "token",
    ACTIONS_ID_TOKEN_REQUEST_URL: "url",
    MAIN_RELEASE_PUBLISH_ENABLED: "true",
};

function subsetFixture(t) {
    const root = mkdtempSync(join(tmpdir(), "main-release-"));
    t.teardown(() => rmSync(root, { force: true, recursive: true }));
    for (const [directory, manifest] of Object.entries({
        a: { name: "@scramjet/a", version: "2.0.0", dependencies: { "@scramjet/b": "2.0.0" } },
        b: { name: "@scramjet/b", version: "2.0.0" },
    })) {
        mkdirSync(join(root, directory), { recursive: true });
        writeFileSync(join(root, directory, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    }
    return root;
}

function fixture(t) {
    const root = mkdtempSync(join(tmpdir(), "main-release-full-"));
    t.teardown(() => rmSync(root, { force: true, recursive: true }));
    for (const name of INCLUDED_PACKAGES) {
        const manifest = {
            name,
            version: "2.0.0",
            ...(name === "@scramjet/api-types" ? { dependencies: { "@scramjet/logger": "2.0.0" } } : {}),
        };
        mkdirSync(join(root, name.replace("@scramjet/", "")), { recursive: true });
        writeFileSync(join(root, name.replace("@scramjet/", ""), "package.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    }
    return root;
}

function release(t) {
    const packagesDir = fixture(t);
    const document = createRelease({
        node: "v22.16.0",
        npm: "11.19.0",
        packagesDir,
        sourceSha: SHA,
    });
    const output = join(packagesDir, "release.json");
    return { document: writeRelease(output, document).document, packagesDir };
}

function packageRunner(document, packagesDir, published, operations = []) {
    return (_command, args, options = {}) => {
        const npmArguments = args.slice(1);
        operations.push({ command: _command, npmArguments, npmCli: args[0] });
        if (npmArguments[0] === "view") {
            const entry = document.packages.find((item) => `${item.name}@${item.version}` === npmArguments[1]);
            if (!published.has(entry.name)) throw new Error("not found");
            return JSON.stringify(published.get(entry.name));
        }
        if (npmArguments[0] === "publish") {
            const packageJson = JSON.parse(readFileSync(join(options.cwd, "package.json"), "utf8"));
            published.set(packageJson.name, packageJson);
            return "";
        }
        throw new Error(`Unexpected npm operation ${npmArguments[0]}`);
    };
}

test("approved waves partition all release packages exactly once", (t) => {
    const waveByPackage = validateReleaseWaves(RELEASE_WAVES);
    t.is(RELEASE_WAVES.length, 12);
    t.is(waveByPackage.size, 37);
    t.deepEqual(RELEASE_WAVES, APPROVED_WAVES);
});

test("approved waves put every real runtime boundary dependency in an earlier wave", (t) => {
    const manifests = new Map(
        [...INCLUDED_PACKAGES].map((name) => [
            name,
            { packageJson: JSON.parse(readFileSync(join(__dirname, "..", "..", includedPackageDir(name), "package.json"), "utf8")) },
        ]),
    );
    t.notThrows(() => validateReleaseWaves(RELEASE_WAVES, { manifests }));
});

test("main release identity preserves the complete wave plan and package checksums", (t) => {
    const { document, packagesDir } = release(t);
    t.deepEqual(document.packages.map((entry) => entry.name), RELEASE_WAVES.flat());
    t.deepEqual(document.waves.map((wave) => wave.packages), RELEASE_WAVES);
    t.deepEqual(document.identity.waves.map((wave) => wave.packages), RELEASE_WAVES);
    t.is(document.identity.source.sha, SHA);
    verifyRelease(document, packagesDir);
    const packageJson = JSON.parse(readFileSync(join(packagesDir, "api-types", "package.json"), "utf8"));
    t.is(packageJson.scramjet.release.identityDigest, document.identityDigest);
    t.is(packageJson.scramjet.release.packageChecksum, document.packages.find((entry) => entry.name === "@scramjet/api-types").checksum);
});

test("main release rejects dependencies in the same or a later wave", (t) => {
    const packagesDir = subsetFixture(t);
    t.throws(
        () => createRelease({ boundary: BOUNDARY, node: "v22.16.0", npm: "11.19.0", packagesDir, sourceSha: SHA, waves: [["@scramjet/a", "@scramjet/b"]] }),
        { message: /must be in an earlier wave/ },
    );
    t.throws(
        () => validateReleaseWaves([["@scramjet/b"], ["@scramjet/a"], ["@scramjet/a"]], { boundary: BOUNDARY }),
        { message: /more than once/ },
    );
    t.throws(() => validateReleaseWaves([["@scramjet/b"]], { boundary: BOUNDARY }), { message: /omits boundary package/ });
    t.throws(
        () => validateReleaseWaves([["@scramjet/b"], ["@scramjet/a", "@scramjet/outside"]], { boundary: BOUNDARY }),
        { message: /outside the release boundary/ },
    );
});

test("release and publication verification reject a self-consistent subset", (t) => {
    const packagesDir = subsetFixture(t);
    const document = writeRelease(join(packagesDir, "release.json"), createRelease({
        boundary: BOUNDARY,
        node: "v22.16.0",
        npm: "11.19.0",
        packagesDir,
        sourceSha: SHA,
        waves: SUBSET_WAVES,
    })).document;
    const publication = {
        format: PUBLICATION_FORMAT,
        identityDigest: document.identityDigest,
        publicationVerified: true,
        releaseChecksum: document.checksum,
        waves: document.waves.map((wave) => ({
            number: wave.number,
            published: [...wave.packages],
            registryVerified: true,
            reused: [],
        })),
    };
    publication.checksum = publicationChecksum(publication);

    t.throws(() => verifyRelease(document, packagesDir), { message: /complete included package boundary exactly once/ });
    t.throws(() => verifyPublication(publication, document), { message: /complete included package boundary exactly once/ });
});

test("main publication waits for earlier-wave registry proof before publishing a dependent wave", (t) => {
    const { document, packagesDir } = release(t);
    const published = new Map();
    const operations = [];
    const delays = [];
    let prerequisiteViewsAfterPublish = 0;
    let prerequisiteRegistryVerified = false;
    const runner = (_command, args, options = {}) => {
        const npmArguments = args.slice(1);
        operations.push(npmArguments);
        if (npmArguments[0] === "view") {
            const entry = document.packages.find((item) => `${item.name}@${item.version}` === npmArguments[1]);
            if (!published.has(entry.name)) throw new Error("not found");
            if (entry.name === "@scramjet/logger" && ++prerequisiteViewsAfterPublish < 3) throw new Error("not found");
            if (entry.name === "@scramjet/logger") prerequisiteRegistryVerified = true;
            return JSON.stringify(published.get(entry.name));
        }
        const packageJson = JSON.parse(readFileSync(join(options.cwd, "package.json"), "utf8"));
        if (packageJson.name === "@scramjet/api-types") {
            t.true(prerequisiteRegistryVerified, "dependent publish requires prior registry proof");
            t.deepEqual(delays, [500, 1000, 2000, 500]);
        }
        published.set(packageJson.name, packageJson);
        return "";
    };

    const result = publishRelease({
        environment: ENVIRONMENT,
        packagesDir,
        release: document,
        runner,
        visibility: { sleep: (milliseconds) => delays.push(milliseconds) },
    });

    t.true(result.publication.publicationVerified);
    t.true(verifyPublication(result.publication, document));
    t.true(operations.some((args) => args[0] === "publish" && args.includes("--provenance") && args.includes("--access") && args.includes("public") && args.includes("--tag") && args.includes("latest")));
    t.true(operations.every((args) => args[0] === "view" || args[0] === "publish"));
});

test("main publication reuses exact partial releases and invokes repository-pinned npm", (t) => {
    const { document, packagesDir } = release(t);
    const published = new Map();
    const firstWave = new Set(RELEASE_WAVES[0]);
    for (const entry of document.packages.filter((item) => firstWave.has(item.name))) {
        published.set(entry.name, JSON.parse(readFileSync(join(packagesDir, entry.path), "utf8")));
    }
    const operations = [];
    const runner = packageRunner(document, packagesDir, published, operations);

    const first = publishRelease({ environment: ENVIRONMENT, packagesDir, release: document, runner, visibility: { sleep: () => {} } });
    t.deepEqual(first.published, document.packages.filter((entry) => !firstWave.has(entry.name)).map((entry) => entry.name));
    t.deepEqual(first.reused, RELEASE_WAVES[0]);
    t.true(verifyPublication(first.publication, document));
    const second = publishRelease({ environment: ENVIRONMENT, packagesDir, release: document, runner, visibility: { sleep: () => {} } });
    t.deepEqual(second.published, []);
    t.deepEqual(second.reused, RELEASE_WAVES.flat());
    t.true(operations.every((operation) => operation.command === process.execPath));
    t.true(operations.every((operation) => operation.npmArguments[0] === "view" || operation.npmArguments[0] === "publish"));
    t.true(operations.every((operation) => operation.npmCli.endsWith(NPM_CLI)));
});

test("registry visibility retries use the fixed exponential cap and fail closed", (t) => {
    const { document } = release(t);
    const delays = [];
    const events = [];
    const entry = document.packages[0];
    let views = 0;

    t.throws(
        () => waitForRegistryVisibility(
            [entry],
            document,
            () => {
                events.push("view");
                views++;
                throw new Error("not found");
            },
            ENVIRONMENT,
            { sleep: (milliseconds) => {
                delays.push(milliseconds);
                events.push(`sleep:${milliseconds}`);
            } },
        ),
        { message: /Timed out waiting for npm registry visibility/ },
    );

    t.deepEqual(delays, [500, 1000, 2000, 4000, 8000, 16000]);
    t.is(views, 6);
    t.deepEqual(events, ["sleep:500", "view", "sleep:1000", "view", "sleep:2000", "view", "sleep:4000", "view", "sleep:8000", "view", "sleep:16000", "view"]);
    t.is(delays.reduce((total, delay) => total + delay, 0), 31500);
});

test("main publication fails closed without protected OIDC or matching immutable metadata", (t) => {
    const { document, packagesDir } = release(t);
    t.throws(() => assertOidcPublication({ MAIN_RELEASE_PUBLISH_ENABLED: "true" }), { message: /OIDC/i });
    const entry = document.packages[0];
    t.throws(
        () => publishRelease({
            environment: ENVIRONMENT,
            packagesDir,
            release: document,
            runner: (_command, args) => args[1] === "view"
                ? JSON.stringify({ name: entry.name, scramjet: { release: { identityDigest: document.identityDigest, packageChecksum: `sha256:${"0".repeat(64)}` } }, version: entry.version })
                : undefined,
        }),
        { message: /Immutable production.*checksum/i },
    );
});
