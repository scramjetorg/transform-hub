"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const tar = require("tar");

const FIXTURE_SOURCE = path.resolve(__dirname, "../data/sequences/appcontext-rpc-add");

async function createAppContextRpcFixture(isolation, runtime, sourceDirectory = FIXTURE_SOURCE) {
    if (!isolation || typeof isolation.createArtifactDirectory !== "function") {
        throw new Error("ScenarioIsolation must be available to create the AppContext RPC fixture");
    }
    if (runtime !== "node" && runtime !== "bun") throw new Error(`Unsupported AppContext RPC runtime: ${runtime}`);

    const directory = isolation.createArtifactDirectory(`appcontext-rpc-${runtime}`);
    for (const entry of await fs.readdir(sourceDirectory, { withFileTypes: true })) {
        if (!entry.isFile()) throw new Error(`Unsupported AppContext RPC fixture entry: ${entry.name}`);
        await fs.copyFile(path.join(sourceDirectory, entry.name), path.join(directory, entry.name));
    }

    const packagePath = path.join(directory, "package.json");
    const manifest = JSON.parse(await fs.readFile(packagePath, "utf8"));
    manifest.engines = runtime === "node" ? { node: ">=18" } : { bun: "1" };
    await fs.writeFile(packagePath, `${JSON.stringify(manifest, null, 2)}\n`);

    const archivePath = path.join(directory, `appcontext-rpc-${runtime}.tar.gz`);
    await tar.c({ cwd: directory, gzip: true, portable: true, file: archivePath }, ["index.js", "package.json"]);
    return { directory, archivePath };
}

module.exports = { createAppContextRpcFixture, FIXTURE_SOURCE };
