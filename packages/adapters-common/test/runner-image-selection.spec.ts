import test from "ava";

const { selectRunnerImageForEngines } = require("../src/utils");

const runnerImages = { bun: "runner-bun", python3: "runner-py", node: "runner-node" };

test("selectRunnerImageForEngines prefers node", t => {
    t.is(selectRunnerImageForEngines({ node: ">=22" }, runnerImages), "runner-node");
});

test("selectRunnerImageForEngines prefers node over bun and python3", t => {
    t.is(selectRunnerImageForEngines({ node: ">=22", bun: "1.x", python3: "3.9" }, runnerImages), "runner-node");
});

test("selectRunnerImageForEngines selects bun", t => {
    t.is(selectRunnerImageForEngines({ bun: "1.x" }, runnerImages), "runner-bun");
});

test("selectRunnerImageForEngines selects python3 when node and bun are absent", t => {
    t.is(selectRunnerImageForEngines({ python3: "3.9" }, runnerImages), "runner-py");
});

test("selectRunnerImageForEngines defaults to node", t => {
    t.is(selectRunnerImageForEngines({}, runnerImages), "runner-node");
});
