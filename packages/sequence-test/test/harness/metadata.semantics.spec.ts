import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import test from "ava";

import {
    createRunnerEnv,
    createRunnerLaunchPlan,
    createSequenceFixture,
    resolveSequenceFixtureMetadata
} from "../../src";

test("resolveSequenceFixtureMetadata requires package.json main", async t => {
    const fixture = await createRawFixture({
        "package.json": JSON.stringify({ name: "without-main", version: "1.0.0" }),
        "index.js": "module.exports = () => []"
    });

    try {
        const error = await t.throwsAsync(async () => resolveSequenceFixtureMetadata(fixture.directory));

        t.true(error instanceof Error);
        t.true((error as Error).message.toLowerCase().includes("main must be a required string"));
    } finally {
        await fixture.cleanup();
    }
});

test("resolveSequenceFixtureMetadata rejects package main escaping fixture directory", async t => {
    const fixture = await createRawFixture({
        "package.json": JSON.stringify({
            main: "../outside.js",
            name: "bad-main",
            version: "1.0.0"
        })
    });

    try {
        const error = await t.throwsAsync(async () => resolveSequenceFixtureMetadata(fixture.directory));

        t.true(error instanceof Error);
        t.true(
            (error as Error).message.toLowerCase().includes("inside fixture")
            || (error as Error).message.toLowerCase().includes("must be relative")
        );
    } finally {
        await fixture.cleanup();
    }
});

test("resolveSequenceFixtureMetadata requires package main to resolve to an existing file", async t => {
    const fixture = await createRawFixture({
        "package.json": JSON.stringify({
            main: "missing.js",
            name: "missing-main-file",
            version: "1.0.0"
        })
    });

    try {
        const error = await t.throwsAsync(async () => resolveSequenceFixtureMetadata(fixture.directory));

        t.true(error instanceof Error);
        t.true((error as Error).message.toLowerCase().includes("existing file"));
    } finally {
        await fixture.cleanup();
    }
});

test("resolveSequenceFixtureMetadata defaults engines to node when missing", async t => {
    const fixture = await createSequenceFixture({
        "index.js": "module.exports = () => []",
        "package.json": JSON.stringify({
            main: "index.js",
            name: "default-node",
            version: "1.0.0"
        })
    });

    try {
        const metadata = await resolveSequenceFixtureMetadata(fixture.directory);

        t.deepEqual(metadata.engines, { node: ">=16" });
        t.is(metadata.runtimeKind, "node");
    } finally {
        await fixture.cleanup();
    }
});

test("resolveSequenceFixtureMetadata enforces node-first engine precedence", async t => {
    const fixture = await createSequenceFixture({
        "index.js": "module.exports = () => []",
        "package.json": JSON.stringify({
            main: "index.js",
            name: "multi-engine",
            version: "1.0.0",
            engines: {
                bun: ">=1",
                python3: ">=3.8",
                node: ">=20"
            }
        })
    });

    try {
        const metadata = await resolveSequenceFixtureMetadata(fixture.directory);

        t.is(metadata.runtimeKind, "node");
    } finally {
        await fixture.cleanup();
    }
});

test("resolveSequenceFixtureMetadata rejects invalid engines metadata", async t => {
    const fixture = await createRawFixture({
        "index.js": "module.exports = () => []",
        "package.json": JSON.stringify({
            main: "index.js",
            name: "invalid-engines",
            version: "1.0.0",
            engines: {
                node: 20
            } as unknown as Record<string, unknown>
        })
    });

    try {
        const error = await t.throwsAsync(async () => resolveSequenceFixtureMetadata(fixture.directory));

        t.true(error instanceof Error);
        t.true((error as Error).message.includes("engines.node must be a string"));
    } finally {
        await fixture.cleanup();
    }
});

test("createSequenceFixture uses package main when package metadata is present", async t => {
    const fixture = await createSequenceFixture({
        "sequence/main.js": "module.exports = () => []",
        "package.json": JSON.stringify({
            name: "package-main",
            version: "1.0.0",
            main: "sequence/main.js"
        })
    });

    try {
        t.true(fixture.sequencePath.endsWith(`${path.sep}sequence${path.sep}main.js`));
    } finally {
        await fixture.cleanup();
    }
});

test("fixture-generated runner metadata uses resolved engines", async t => {
    const fixture = await createSequenceFixture({
        "sequence/main.py": "print('ok')",
        "package.json": JSON.stringify({
            name: "generated-metadata",
            version: "1.0.0",
            main: "sequence/main.py",
            engines: {
                python3: ">=3.8"
            }
        })
    });

    try {
        const metadata = await resolveSequenceFixtureMetadata(fixture.directory);
        const env = createRunnerEnv({
            runtime: "python",
            sequencePath: path.resolve(fixture.directory, metadata.main),
            instancesServer: { host: "127.0.0.1", port: 9123 },
            engines: metadata.engines
        });

        const launchPlan = createRunnerLaunchPlan({
            runtime: "python",
            sequencePath: path.resolve(fixture.directory, metadata.main),
            instancesServer: { host: "127.0.0.1", port: 9124 },
            engines: metadata.engines
        });

        const envInfo = JSON.parse(env.SEQUENCE_INFO as string) as { config: { engines: Record<string, string> } };
        const launchInfo = JSON.parse(launchPlan.env.SEQUENCE_INFO as string) as { config: { engines: Record<string, string> } };

        t.deepEqual(envInfo.config.engines, metadata.engines);
        t.deepEqual(launchInfo.config.engines, metadata.engines);
    } finally {
        await fixture.cleanup();
    }
});

async function createRawFixture(files: Record<string, string | Buffer>): Promise<{ directory: string; cleanup: () => Promise<void> }> {
    const directory = await fs.mkdtemp(path.join(tmpdir(), "sequence-test-metadata-"));

    for (const [filePath, content] of Object.entries(files)) {
        const destination = path.join(directory, filePath);

        await fs.mkdir(path.dirname(destination), { recursive: true });
        await fs.writeFile(destination, content);
    }

    return {
        directory,
        cleanup: () => fs.rm(directory, { recursive: true, force: true })
    };
}
