import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import baseTest from "ava";

import {
    createFileBackedMockCursor,
    createSequenceFixture,
    resolveSequenceFixtureMetadata,
    type FileBackedMockCursor
} from "../../src";

const { createAvaMemoryGuard } = require("../../../../scripts/lib/ava-memory-guard");
const test: typeof baseTest = createAvaMemoryGuard(baseTest);

test("packaged resource resolution returns a fixture-local entry point", async t => {
    const fixture = await createSequenceFixture({
        "package.json": JSON.stringify({
            main: "src/progression.js",
            engines: { node: ">=16" }
        }),
        "src/progression.js": "module.exports = value => ({ step: value.step + 1 });\n"
    });

    try {
        const metadata = await resolveSequenceFixtureMetadata(fixture.directory);

        t.is(metadata.main, "src/progression.js");
        t.is(metadata.mainPath, path.join(fixture.directory, "src/progression.js"));
        t.is(metadata.runtimeKind, "node");
    } finally {
        await fixture.cleanup();
    }
});

test("fixture-local source-file summary stays relative to the packaged fixture", async t => {
    const fixture = await createSequenceFixture({
        "package.json": JSON.stringify({ main: "src/progression.js" }),
        "src/progression.js": "module.exports = value => ({ step: value.step + 1 });\n"
    });

    try {
        const metadata = await resolveSequenceFixtureMetadata(fixture.directory);
        const source = await fs.readFile(metadata.mainPath, "utf8");
        const summary = {
            file: path.relative(fixture.directory, metadata.mainPath),
            lines: source.trimEnd().split("\n").length,
            bytes: Buffer.byteLength(source)
        };

        t.deepEqual(summary, {
            file: "src/progression.js",
            lines: 1,
            bytes: Buffer.byteLength("module.exports = value => ({ step: value.step + 1 });\n")
        });
        t.false(path.isAbsolute(summary.file));
    } finally {
        await fixture.cleanup();
    }
});

test("file-backed mock cursor reads and overwrites synthetic progression state", async t => {
    const fixture = await createSequenceFixture({
        "package.json": JSON.stringify({ main: "src/progression.js" }),
        "src/progression.js": "module.exports = value => value;\n"
    });

    let cursor: FileBackedMockCursor | undefined;

    try {
        cursor = createFileBackedMockCursor({ directory: fixture.directory, fileName: "state/progress.json" });

        t.is(cursor.filePath, path.join(fixture.directory, "state/progress.json"));

        await cursor.write({ step: 1, value: "first" });
        t.deepEqual(await cursor.read<{ step: number; value: string }>(), { step: 1, value: "first" });

        await cursor.write({ step: 2, value: "second" });
        t.deepEqual(await cursor.read<{ step: number; value: string }>(), { step: 2, value: "second" });
        t.deepEqual(JSON.parse(await fs.readFile(cursor.filePath, "utf8")), { step: 2, value: "second" });
    } finally {
        await cursor?.cleanup();
        await fixture.cleanup();
    }
});

test("file-backed mock cursor keeps cleanup explicit and non-transactional", async t => {
    const fixture = await createSequenceFixture({
        "package.json": JSON.stringify({ main: "src/progression.js" }),
        "src/progression.js": "module.exports = value => value;\n"
    });

    let cursor: FileBackedMockCursor | undefined;

    try {
        cursor = createFileBackedMockCursor({ directory: fixture.directory, fileName: "state/progress.json" });
        await cursor.write({ step: 1 });
        await cursor.write({ step: 2 });
        await cursor.cleanup();

        t.false(await exists(cursor.filePath));
        t.deepEqual(await fs.readdir(fixture.directory), ["package.json", "src"]);
    } finally {
        await fixture.cleanup();
    }
});

test("reading before any write rejects with the native filesystem ENOENT classification", async t => {
    const fixture = await createSequenceFixture({
        "package.json": JSON.stringify({ main: "src/progression.js" }),
        "src/progression.js": "module.exports = value => value;\n"
    });

    const cursor = createFileBackedMockCursor({ directory: fixture.directory, fileName: "state/progress.json" });

    try {
        const error = await t.throwsAsync<NodeJS.ErrnoException>(() => cursor.read());
        t.is(error.code, "ENOENT");
    } finally {
        await cursor.cleanup();
        await fixture.cleanup();
    }
});

test("file-backed mock cursor rejects absolute and traversal paths", async t => {
    const fixture = await createSequenceFixture({
        "package.json": JSON.stringify({ main: "src/progression.js" }),
        "src/progression.js": "module.exports = value => value;\n"
    });

    try {
        for (const fileName of [path.join(fixture.directory, "outside.json"), "../outside.json", "state/../../outside.json"]) {
            t.throws(() => createFileBackedMockCursor({ directory: fixture.directory, fileName }));
        }
    } finally {
        await fixture.cleanup();
    }
});

test("file-backed mock cursor rejects a symlinked parent escape", async t => {
    const fixture = await createSequenceFixture({
        "package.json": JSON.stringify({ main: "src/progression.js" }),
        "src/progression.js": "module.exports = value => value;\n"
    });
    const outsideDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "sequence-test-cursor-outside-"));
    const symlinkPath = path.join(fixture.directory, "state", "linked");

    try {
        await fs.mkdir(path.dirname(symlinkPath), { recursive: true });
        try {
            await fs.symlink(outsideDirectory, symlinkPath, "junction");
        } catch (error) {
            const code = (error as NodeJS.ErrnoException).code;
            if (["EACCES", "EINVAL", "ENOSYS", "ENOTSUP", "EPERM"].includes(code ?? "")) {
                t.pass(`symlink creation unavailable (${code})`);
                return;
            }
            throw error;
        }

        t.throws(() => createFileBackedMockCursor({ directory: fixture.directory, fileName: "state/linked/progress.json" }));
        t.false(await exists(path.join(outsideDirectory, "progress.json")));
    } finally {
        await fs.rm(outsideDirectory, { recursive: true, force: true });
        await fixture.cleanup();
    }
});

test("fixture resolution classifies missing packaged resources", async t => {
    const fixture = await createSequenceFixture({
        "package.json": JSON.stringify({ main: "src/missing.js" })
    }, { sequenceFile: "package.json" });

    try {
        const error = await t.throwsAsync(() => resolveSequenceFixtureMetadata(fixture.directory));

        t.regex(error.message, /^package\.json main must resolve to an existing file inside fixture directory:/);
    } finally {
        await fixture.cleanup();
    }
});

test("fixture resolution classifies a missing package manifest", async t => {
    const fixture = await createSequenceFixture({
        "src/progression.js": "module.exports = value => value;\n"
    });

    try {
        const error = await t.throwsAsync(() => resolveSequenceFixtureMetadata(fixture.directory));

        t.is(error.message, `fixture package.json not found at ${path.join(fixture.directory, "package.json")}`);
    } finally {
        await fixture.cleanup();
    }
});

async function exists(filePath: string): Promise<boolean> {
    try {
        await fs.stat(filePath);
        return true;
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
        throw error;
    }
}
