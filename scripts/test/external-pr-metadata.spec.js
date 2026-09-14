"use strict";

const test = require("ava").default;
const { validateExternalPrMetadata } = require("../external-pr-metadata");

const metadata = { state: "open", base: { sha: "b".repeat(40), ref: "devel", repo: { full_name: "scramjetorg/transform-hub" } }, head: { sha: "a".repeat(40), repo: { full_name: "contributor/project", owner: { login: "contributor" } } } };

test("accepts an open unchanged external head", (t) => {
    t.deepEqual(validateExternalPrMetadata(metadata, { expectedHeadSha: "a".repeat(40), expectedBaseSha: "b".repeat(40), expectedBaseRef: "devel", expectedBaseRepository: "scramjetorg/transform-hub" }), { headRepository: "contributor/project", headSha: "a".repeat(40), owner: "contributor", baseRepository: "scramjetorg/transform-hub", baseSha: "b".repeat(40), baseRef: "devel" });
});

for (const [name, change, message] of [
    ["closed PR", { state: "closed" }, /must be open/],
    ["changed SHA", { head: { ...metadata.head, sha: "b".repeat(40) } }, /changed/],
    ["same-org head", { head: { ...metadata.head, repo: { ...metadata.head.repo, owner: { login: "scramjetorg" } } } }, /external/],
    ["changed base SHA", { base: { ...metadata.base, sha: "c".repeat(40) } }, /base SHA/],
    ["changed base ref", { base: { ...metadata.base, ref: "main" } }, /base ref/],
]) {
    test(`rejects ${name}`, (t) => t.throws(() => validateExternalPrMetadata({ ...metadata, ...change }, { expectedHeadSha: "a".repeat(40), expectedBaseSha: "b".repeat(40), expectedBaseRef: "devel", expectedBaseRepository: "scramjetorg/transform-hub" }), { message }));
}
