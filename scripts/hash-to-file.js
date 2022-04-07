#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-floating-promises */
const { writeFile } = require("fs/promises");
const { exec: execCallback } = require("child_process");
const { promisify } = require("util");
const { join, resolve } = require("path");

const exec = promisify(execCallback);

(async () => {
    try {
        const toPath = process.argv[2] || "";

        const hash = await exec("git rev-parse --short HEAD");
        const contents = { hash: hash.stdout.trim(), timestamp: Date.now() };

        await writeFile(resolve(join("./", toPath, "build.info.json")), JSON.stringify(contents, null, "  "), "utf8");
    } catch (err) {
        console.log(`Saving git hash to file failed: ${err}`);
    }
})();
