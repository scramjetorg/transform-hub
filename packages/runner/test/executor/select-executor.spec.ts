import test from "ava";
import { selectExecutor } from "../src/executor/select";

test("selectExecutor returns node executor when engines.node is set", (t) => {
    const executor = selectExecutor({ engines: { node: ">=16" } });
    t.is(executor.kind, "node");
    t.true(typeof executor.spawn === "function");
});

test("selectExecutor returns python3 executor when engines.python3 is set", (t) => {
    const executor = selectExecutor({ engines: { python3: "3.9" } });
    t.is(executor.kind, "python3");
    t.true(typeof executor.spawn === "function");
});

test("selectExecutor defaults to node when engines is empty", (t) => {
    const executor = selectExecutor({ engines: {} });
    t.is(executor.kind, "node");
});

test("selectExecutor defaults to node when engines is undefined", (t) => {
    const executor = selectExecutor({});
    t.is(executor.kind, "node");
});

test("selectExecutor prefers python3 when both engines are set", (t) => {
    const executor = selectExecutor({ engines: { python3: "3.9", node: ">=16" } });
    t.is(executor.kind, "python3");
});

test("selectExecutor returned executor has spawn method", (t) => {
    const executor = selectExecutor({ engines: { node: ">=16" } });
    t.true(typeof executor.spawn === "function");
});
