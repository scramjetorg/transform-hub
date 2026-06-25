import test from "ava";

import { RunnerMessageCode } from "@scramjet/symbols";

import { buildPing } from "../src/handshake";

const sequenceInfo = {
    id: "seq-1",
    config: {
        type: "process",
        engines: {},
        id: "seq-1",
        entrypointPath: "index.js",
        name: "seq-1",
        version: "1.0.0",
        sequenceDir: "/tmp/seq-1",
        language: "js",
    },
    instances: [],
    location: "STH",
};

test("buildPing includes exposed API metadata when supplied", t => {
    const [code, message] = buildPing({
        instanceId: "instance-1",
        sequenceInfo,
        appConfig: {},
        args: [],
        exposePath: "/test",
        exposeHost: "127.0.0.1",
        exposePort: 12345,
    });

    t.is(code, RunnerMessageCode.PING);
    t.is(message.payload.exposePath, "/test");
    t.is(message.payload.exposeHost, "127.0.0.1");
    t.is(message.payload.exposePort, 12345);
});

test("buildPing includes input and output topic metadata when supplied", t => {
    const [, message] = buildPing({
        instanceId: "instance-1",
        sequenceInfo,
        appConfig: {},
        args: [],
        inputTopic: "topic-in",
        outputTopic: "topic-out",
    });

    t.is(message.payload.inputTopic, "topic-in");
    t.is(message.payload.outputTopic, "topic-out");
});

test("buildPing omits exposed API metadata when no server was started", t => {
    const [, message] = buildPing({
        instanceId: "instance-1",
        sequenceInfo,
        appConfig: {},
        args: [],
    });

    t.false("exposePath" in message.payload);
    t.false("exposeHost" in message.payload);
    t.false("exposePort" in message.payload);
});
