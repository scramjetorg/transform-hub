"use strict";

const test = require("ava").default;
const runtime = require("../release-production-runtime");

const sha = (letter) => letter.repeat(40);

function gitRunner(_command, args) {
    if (args[0] === "rev-list") return `${sha("a")} ${sha("b")} ${sha("c")}\n`;
    return `${sha("d")}\n`;
}

test("main parent admission requires an exact two-parent merge and matching trees", (t) => {
    const result = runtime.gitParents({ mainSha: sha("a"), gitRunner });
    t.deepEqual(result, { mainSha: sha("a"), parents: [sha("b"), sha("c")], mainTree: sha("d"), secondParentTree: sha("d") });
    t.throws(() => runtime.gitParents({ mainSha: sha("a"), gitRunner: (_command, args) => args[0] === "rev-list" ? `${sha("a")} ${sha("b")}\n` : `${sha("d")}\n` }), { message: /exactly two parents/ });
});

test("publish fails closed before invoking a publisher when policy or npm auth is unsafe", async (t) => {
    let called = false;
    await t.throwsAsync(runtime.publishMain({ tuple: { mainSha: sha("a"), sourceSha: sha("b"), candidateReleaseId: 1, releaseSetDigest: "sha256:" + "a".repeat(64), sealedStateDigest: "sha256:" + "b".repeat(64), version: "1.0.0" }, releaseSet: {}, tarballPaths: [], publisher: () => { called = true; }, env: { RELEASE_PRODUCTION_POLICY_CONFIRMED: "true", MAIN_RELEASE_PUBLISH_ENABLED: "true", NODE_AUTH_TOKEN: "unexpected" } }), { message: /NODE_AUTH_TOKEN/ });
    t.false(called);
});

test("read-only registry verification rejects publishing-shaped options", async (t) => {
    await t.throwsAsync(runtime.verifyRegistry({ command: "npm publish", fetchTarball: async () => Buffer.from("unused") }), { message: /publishing/ });
});
