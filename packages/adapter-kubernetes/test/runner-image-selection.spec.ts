import test from "ava";
import { selectKubernetesRunnerImage } from "../src/kubernetes-instance-adapter";

const runnerImages = { bun: "runner-bun", python3: "runner-py", node: "runner-node" };

test("selectKubernetesRunnerImage chooses bun for engines.bun", t => {
    t.is(selectKubernetesRunnerImage({ bun: "1.x" }, runnerImages), "runner-bun");
});

test("selectKubernetesRunnerImage prefers bun over python3 and node", t => {
    t.is(selectKubernetesRunnerImage({ bun: "1.x", python3: "3.9", node: ">=22" }, runnerImages), "runner-bun");
});

test("selectKubernetesRunnerImage falls back to python3 then node", t => {
    t.is(selectKubernetesRunnerImage({ python3: "3.9" }, runnerImages), "runner-py");
    t.is(selectKubernetesRunnerImage({ node: ">=22" }, runnerImages), "runner-node");
});
