"use strict";

const fs = require("node:fs");
const Module = require("node:module");
const os = require("node:os");
const path = require("node:path");

let ownedRoot;

function setupCliTestIsolation() {
    if (ownedRoot) return;

    const workerTempRoot = os.tmpdir();
    const root = fs.mkdtempSync(path.join(workerTempRoot, "scramjet-cli-ava-"));

    try {
        const home = path.join(root, "home");
        const temp = path.join(root, "tmp");
        fs.mkdirSync(home, { recursive: true });
        fs.mkdirSync(temp, { recursive: true });

        process.env.HOME = home;
        process.env.TMPDIR = temp;
        process.env.TMP = temp;
        process.env.TEMP = temp;
        if (process.platform === "win32") process.env.USERPROFILE = home;

        os.homedir = () => home;
        os.tmpdir = () => temp;
        Module.syncBuiltinESMExports();

        ownedRoot = root;
        process.once("exit", () => {
            fs.rmSync(root, { recursive: true, force: true });
        });
    } catch (error) {
        fs.rmSync(root, { recursive: true, force: true });
        throw error;
    }
}

module.exports = setupCliTestIsolation;
