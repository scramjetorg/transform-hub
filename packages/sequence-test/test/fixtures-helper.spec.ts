import { promises as fs } from "node:fs";
import path from "node:path";

import test from "ava";

import {
    createBunSequenceFixture,
    createNodeSequenceFixture,
    createPythonSequenceFixture,
    createSequenceFixture
} from "../src";

test("createSequenceFixture creates files and cleans up", async t => {
    const fixture = await createSequenceFixture({
        "index.js": "module.exports = () => [];",
        "nested/config.json": JSON.stringify({ ok: true })
    });

    t.is(path.basename(fixture.sequencePath), "index.js");
    t.true(await exists(path.join(fixture.directory, "nested/config.json")));

    await fixture.cleanup();

    t.false(await exists(fixture.directory));
});

test("createNodeSequenceFixture defaults to index.js", async t => {
    const fixture = await createNodeSequenceFixture({
        "index.js": "module.exports = () => [];"
    });

    try {
        t.true(fixture.sequencePath.endsWith(`${path.sep}index.js`));
        t.true(await exists(fixture.sequencePath));
    } finally {
        await fixture.cleanup();
    }
});

test("createPythonSequenceFixture defaults to sequence/main.py", async t => {
    const fixture = await createPythonSequenceFixture({
        "sequence/main.py": "def run(input):\n    return input\n"
    });

    try {
        t.true(fixture.sequencePath.endsWith(`${path.sep}sequence${path.sep}main.py`));
        t.true(await exists(fixture.sequencePath));
    } finally {
        await fixture.cleanup();
    }
});

test("createBunSequenceFixture defaults to index.js", async t => {
    const fixture = await createBunSequenceFixture({
        "index.js": "export default () => [];"
    });

    try {
        t.true(fixture.sequencePath.endsWith(`${path.sep}index.js`));
        t.true(await exists(fixture.sequencePath));
    } finally {
        await fixture.cleanup();
    }
});

test("createSequenceFixture rejects paths outside fixture directory", async t => {
    await t.throwsAsync(
        () => createSequenceFixture({ "../outside.js": "bad" }),
        { message: /relative and stay inside/ }
    );
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
