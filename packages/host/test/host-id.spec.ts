import test from "ava";
import { IDProvider } from "@scramjet/model";
import { mkdtemp, readFile, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

import { resolveStableHostId } from "../src/lib/host-id";

const logger = {
    info() {},
    warn() {},
    error() {}
};

test("Host getId generates and persists a stable local id when config and info file have no id", async t => {
    const tempDir = await mkdtemp(join(tmpdir(), "sth-host-id-"));
    const infoFilePath = join(tempDir, "nested", "sth-id.json");

    try {
        const id = resolveStableHostId(undefined, infoFilePath, logger);
        const persisted = JSON.parse(await readFile(infoFilePath, "utf8"));

        t.true(IDProvider.isValid(id));
        t.is(persisted.id, id);
    } finally {
        await rm(tempDir, { recursive: true, force: true });
    }
});

test("Host getId reuses a persisted local id", async t => {
    const tempDir = await mkdtemp(join(tmpdir(), "sth-host-id-"));
    const infoFilePath = join(tempDir, "sth-id.json");

    try {
        const generated = resolveStableHostId(undefined, infoFilePath, logger);

        t.is(resolveStableHostId(undefined, infoFilePath, logger), generated);
    } finally {
        await rm(tempDir, { recursive: true, force: true });
    }
});
