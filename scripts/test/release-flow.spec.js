"use strict";

const test = require("ava").default;
const flow = require("../release-flow.js");

test("release flow derives stable release identity only from devel versions", (t) => {
    t.is(flow.releaseVersionFromDevelopment("1.2.3-devel"), "1.2.3");
    t.is(flow.developmentVersionFromStable("1.2.3"), "1.2.4-devel");
    t.is(flow.developmentVersionFromStable("2.1.0"), "2.1.1-devel");
    t.is(flow.releaseBranch("1.2.3"), "release/1.2.3");
    t.throws(() => flow.releaseVersionFromDevelopment("1.2.4"), { message: /development/ });
    t.throws(() => flow.developmentVersionFromStable("1.2"), { message: /stable/ });
});

test("release branch admission is exact", (t) => {
    t.true(flow.assertReleaseBranch("release/2.0.0", "2.0.0"));
    t.throws(() => flow.assertReleaseBranch("release/2.0.1", "2.0.0"), { message: /does not match/ });
});
