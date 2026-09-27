const test = require("ava").default;
const fs = require("fs");

const fixture = fs.readFileSync("bdd/lib/native-control-plane-fixture.ts", "utf8");
const hostUtils = fs.readFileSync("bdd/lib/host-utils.ts", "utf8");
const manifest = require("../../package.json");

test("native control-plane gate is limited to the three runtime CI suites", t => {
    for (const name of ["test:bdd-ci-node", "test:bdd-ci-python", "test:bdd-ci-bun"]) {
        t.regex(manifest.scripts[name], /SCRAMJET_BDD_NATIVE_CONTROL_PLANE=1/);
    }
    for (const [name, command] of Object.entries(manifest.scripts)) {
        if (name.startsWith("test:bdd") && !["test:bdd-ci-node", "test:bdd-ci-python", "test:bdd-ci-bun"].includes(name)) {
            t.false(command.includes("SCRAMJET_BDD_NATIVE_CONTROL_PLANE=1"), name);
        }
    }
});

test("fixture owns one embedded-manager process and bounded teardown", t => {
    t.regex(fixture, /manager: managerConfig/);
    t.regex(fixture, /waitFor\([^,]+, child, 2000/);
    t.regex(fixture, /stopProcess\(child, \{ graceMs: 400 \}\)/);
    t.regex(fixture, /markProcessesAsExpectedToExit/);
    t.regex(fixture, /removeAllListeners/);
    t.notRegex(fixture, /2443/);
});

test("normal Hub launches receive explicit native config only when gated", t => {
    t.regex(hostUtils, /SCRAMJET_BDD_NATIVE_CONTROL_PLANE === "1"/);
    t.regex(hostUtils, /SCRAMJET_BDD_NATIVE_HUB_CONFIG/);
});
