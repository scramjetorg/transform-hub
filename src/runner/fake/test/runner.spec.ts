import { StringStream } from "scramjet";

import { Runner } from "../../fake/runner";
import { RunnerOptions, RunnerMessageCode } from "../../../types";

const test = require("ninos")(require("ava"));

let runner: Runner;

let processExit = process.exit;
let runnerOptions: RunnerOptions = {};

test.beforeEach(() => {
    runner = new Runner(runnerOptions);

    process.exit = () => { throw new Error("exit"); };
});

test.afterEach(() => {
    process.exit = processExit;
});

test("Initialized", (t: any) => {
    t.not(runner, null);
});

test("start method should call stream method", (t: any) => {
    const streamSpy = t.context.spy(runner, "stream");

    runner.start();

    t.is(streamSpy.calls.length, 1);
});

test("startMonitoring method should call setInterval with proper parameters", (t: any) => {
    const setIntervalSpy = t.context.spy(global, "setInterval");
    runner.options.monitoringInterval = 2000;

    runner.startMonitoring();

    t.is(typeof setIntervalSpy.calls[0].arguments[0], "function");
    t.is(setIntervalSpy.calls[0].arguments[1], 2000);
});

test("stream method should call StringStream.from with stdin passed", (t: any) => {
    const stringStreamSpy = t.context.spy(StringStream, "from");

    runner.start();

    t.is(stringStreamSpy.calls[0].arguments[0], process.stdin);
});

test("getPayload should parse input to JSON", (t: any) => {
    const input = "[4000,{}]";

    t.deepEqual(runner.getPayload(input), [4000, {}]);
});

test("logger method should call write of process.stdout", (t: any) => {
    const stdoutSpy = t.context.spy(process.stdout, "write");

    runner.logger();

    t.is(stdoutSpy.calls.length, 1);
});

test("handleKillRequest should call stopMonitoring", (t: any) => {
    const stopMonitoringSpy = t.context.spy(runner, "stopMonitoring");

    try {
        runner.handleKillRequest();
    } catch (ignore) {
        /* */
    }

    t.is(stopMonitoringSpy.calls.length, 1);
});

test("handleKillRequest should call process.exit", (t: any) => {
    t.throws(() => {
        runner.handleKillRequest();
    }, { message: "exit" });
});

test("stopMonitoring should call clearInterval", (t: any) => {
    const clearIntervalSpy = t.context.spy(global, "clearInterval");

    runner.stopMonitoring();
    t.is(clearIntervalSpy.calls.length, 1);
});

test("readPayload method should call handleKillRequest on KILL message", (t: any) => {
    t.throws(() => {
        runner.readPayload([RunnerMessageCode.KILL, {}]);
    }, { message: "exit" });
});

test("readPayload method should return PONG on PING payload", (t: any) => {
    t.is(
        runner.readPayload([RunnerMessageCode.PING, {}]),
        JSON.stringify([RunnerMessageCode.PONG, {}])
    );
});

test("readPayload method should return msgCode on unsupported msgCode", (t: any) => {
    t.is(runner.readPayload([999, {}]), "[3004,{\"received\":999}]");
});
