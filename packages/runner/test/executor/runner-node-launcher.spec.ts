import test from "ava";
import { needsTypeScriptSourceLoader } from "../../src/executor/runner-node-launcher";

test("runner-node uses the TypeScript source loader only for .ts child paths", t => {
    t.true(needsTypeScriptSourceLoader("/workspace/runner-node/src/bin/runner-node.ts"));
    t.false(needsTypeScriptSourceLoader("/workspace/runner-node/dist/bin/runner-node.js"));
});
