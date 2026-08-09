import test from "ava";
import { mkdtempSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

import { loadSequenceModule } from "../src/utils";

function fixture(source: string): string {
    const dir = mkdtempSync(join(tmpdir(), "runner-readiness-"));
    const path = join(dir, "sequence.js");
    writeFileSync(path, source);
    return path;
}

test("Node loader wires initialize from a default-export registry", t => {
    const module = loadSequenceModule(fixture("module.exports = { default: function run() {}, initialize() {} };"));
    t.is(typeof module.initialize, "function");
});

test("Node loader rejects an absent/non-callable initialize consistently", t => {
    const error = t.throws(() => loadSequenceModule(fixture("module.exports = { default: function run() {}, initialize: true };")));
    t.regex((error as Error).message, /initialize export must be a function/);
});
