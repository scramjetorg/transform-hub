import test from "ava";
import { selectDockerRunnerImage } from "../src/docker-sequence-adapter";

const runnerImages = { bun: "runner-bun", python3: "runner-py", node: "runner-node" };

test("selectDockerRunnerImage chooses bun for engines.bun", t => {
    t.is(selectDockerRunnerImage({ bun: "1.x" }, runnerImages), "runner-bun");
});

test("selectDockerRunnerImage prefers bun over python3 and node", t => {
    t.is(selectDockerRunnerImage({ bun: "1.x", python3: "3.9", node: ">=22" }, runnerImages), "runner-bun");
});

test("selectDockerRunnerImage falls back to python3 then node", t => {
    t.is(selectDockerRunnerImage({ python3: "3.9" }, runnerImages), "runner-py");
    t.is(selectDockerRunnerImage({ node: ">=22" }, runnerImages), "runner-node");
});
