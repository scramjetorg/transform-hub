"use strict";

const fs = require("node:fs");
const path = require("node:path");
const v8 = require("node:v8");

const captured = new Set();

function captureBddMemlabHeap(phase) {
    if (!process.env.SCRAMJET_BDD_MEMLAB_ARTIFACT_DIR) return null;
    if (!["baseline", "target", "final"].includes(phase)) throw new Error(`unknown MemLab capture phase: ${phase}`);
    if (captured.has(phase)) throw new Error(`duplicate MemLab capture phase: ${phase}`);
    const dir = process.env.SCRAMJET_BDD_MEMLAB_ARTIFACT_DIR;
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    captured.add(phase);
    const file = path.join(dir, `${phase}.heapsnapshot`);
    v8.writeHeapSnapshot(file);
    return file;
}

globalThis.__scramjetBddMemlabCapture = captureBddMemlabHeap;
module.exports = { captureBddMemlabHeap };
