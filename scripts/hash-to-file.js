#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-floating-promises */
const { writeFile } = require("fs/promises");
const { exec: execCallback } = require("child_process");
const { promisify } = require("util");
const { join, resolve } = require("path");

const exec = promisify(execCallback);

(async () => {
    const toPath = process.argv[2] || "";

    const hash = await exec("git rev-parse --short HEAD");
    const contents = `export const hash = "${hash.stdout.trim()}";\n`;

    await writeFile(resolve(join("./", toPath, "hash.ts")), contents, "utf8");
})();
