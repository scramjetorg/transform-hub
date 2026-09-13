"use strict";

const test = require("ava").default;
const { validateExternalPrMetadata } = require("../external-pr-metadata");

const metadata = { state: "open", head: { sha: "a".repeat(40), repo: { full_name: "contributor/project", owner: { login: "contributor" } } } };

test("accepts an open unchanged external head", (t) => {
    t.deepEqual(validateExternalPrMetadata(metadata, { expectedHeadSha: "a".repeat(40) }), { headRepository: "contributor/project", headSha: "a".repeat(40), owner: "contributor" });
});

for (const [name, change, message] of [
    ["closed PR", { state: "closed" }, /must be open/],
    ["changed SHA", { head: { ...metadata.head, sha: "b".repeat(40) } }, /changed/],
    ["same-org head", { head: { ...metadata.head, repo: { ...metadata.head.repo, owner: { login: "scramjetorg" } } } }, /external/],
]) {
    test(`rejects ${name}`, (t) => t.throws(() => validateExternalPrMetadata({ ...metadata, ...change }, { expectedHeadSha: "a".repeat(40) }), { message }));
}
