/* tslint:disable */
import { RunnerOptions } from "@scramjet/types";
import { RunnerMessageCode } from "@scramjet/model";
import * as sinon from "sinon";

const test = require("ava");
const proxyquire = require("proxyquire");

let processExit = process.exit;
let runnerOptions: RunnerOptions = {};

const sandbox = sinon.createSandbox();

let stringStreamFromStub = sandbox.stub();
let stringStreamLinesStub = sandbox.stub();
let stringStreamMapStub = sandbox.stub();
let stringStreamAppendStub = sandbox.stub();
let stringStreamPipeStub = sandbox.stub();

const scramjetMock = {
    StringStream: {
        from: stringStreamFromStub,
        lines: stringStreamLinesStub,
        map: stringStreamMapStub,
        append: stringStreamAppendStub,
        pipe: stringStreamPipeStub
    }
};

stringStreamFromStub.returns(scramjetMock.StringStream);
stringStreamLinesStub.returns(scramjetMock.StringStream);
stringStreamMapStub.returns(scramjetMock.StringStream);
stringStreamAppendStub.returns(scramjetMock.StringStream);

let { Runner } = proxyquire("../dist/mock/runner", {
    scramjet: scramjetMock
});
let runner: any;

test.beforeEach(() => {
    runner = new Runner(runnerOptions);

    process.exit = () => { throw new Error("exit"); };
});

test.afterEach(() => {
    process.exit = processExit;
    sandbox.restore();
});

test("Initialized", (t: any) => {
    t.not(runner, null);
});

test("start method should call stream method", (t: any) => {
    runner.start();

    t.is(stringStreamFromStub.callCount, 1);
});

test("startMonitoring method should call setInterval with proper parameters", (t: any) => {
    const setIntervalSpy = sandbox.spy(global, "setInterval");

    runner.options.monitoringInterval = 2000;

    runner.startMonitoring();

    t.is(typeof setIntervalSpy.firstCall.args[0], "function");
    t.is(setIntervalSpy.firstCall.args[1], 2000);
});

test("stream method should call StringStream.from with stdin passed", (t: any) => {
    runner.start();

    t.is(stringStreamFromStub.getCall(0).args[0], process.stdin);
});

test("getPayload should parse input to JSON", (t: any) => {
    const input = "[4000,{}]";

    t.deepEqual(runner.getPayload(input), [4000, {}]);
});

test("logger method should call write of process.stdout", (t: any) => {
    const stdoutSpy = sandbox.spy(process.stdout, "write");

    runner.logger();

    t.is(stdoutSpy.callCount, 1);
});

test("handleKillRequest should call stopMonitoring", (t: any) => {
    const stopMonitoringSpy = sandbox.spy(runner, "stopMonitoring");

    try {
        runner.handleKillRequest();
    } catch (ignore) {
        /* */
    }

    t.is(stopMonitoringSpy.callCount, 1);
});

test("handleKillRequest should call process.exit", (t: any) => {
    t.throws(() => {
        runner.handleKillRequest();
    }, { message: "exit" });
});

test("stopMonitoring should call clearInterval", (t: any) => {
    const clearIntervalSpy = sandbox.spy(global, "clearInterval");

    runner.stopMonitoring();
    t.is(clearIntervalSpy.callCount, 1);
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
