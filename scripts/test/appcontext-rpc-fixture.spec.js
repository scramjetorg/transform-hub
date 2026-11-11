"use strict";

const test = require("ava").default;
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const tar = require("tar");
const { createAppContextRpcFixture, FIXTURE_SOURCE } = require("../../bdd/lib/appcontext-rpc-fixture.js");

test("AppContext RPC fixture archives preserve JS source and select runtime metadata", async t => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "appcontext-rpc-fixture-"));
    t.teardown(() => fs.rm(root, { recursive: true, force: true }));
    const isolation = { createArtifactDirectory: name => {
        const directory = path.join(root, name);
        require("node:fs").mkdirSync(directory, { recursive: true });
        return directory;
    } };
    const node = await createAppContextRpcFixture(isolation, "node");
    const bun = await createAppContextRpcFixture(isolation, "bun");
    const readArchive = async archivePath => {
        const extracted = `${archivePath}.contents`;
        await fs.mkdir(extracted);
        await tar.x({ file: archivePath, cwd: extracted });
        return extracted;
    };
    const nodeDir = await readArchive(node.archivePath);
    const bunDir = await readArchive(bun.archivePath);
    const source = await fs.readFile(path.join(FIXTURE_SOURCE, "index.js"));
    t.deepEqual(await fs.readFile(path.join(nodeDir, "index.js")), source);
    t.deepEqual(await fs.readFile(path.join(bunDir, "index.js")), source);
    t.deepEqual(JSON.parse(await fs.readFile(path.join(nodeDir, "package.json"), "utf8")).engines, { node: ">=18" });
    t.deepEqual(JSON.parse(await fs.readFile(path.join(bunDir, "package.json"), "utf8")).engines, { bun: "1" });
});
