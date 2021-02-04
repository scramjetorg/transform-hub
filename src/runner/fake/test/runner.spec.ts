import { StringStream } from "scramjet";
import { Runner, MessageCode } from "../../fake/runner";

const test = require("ninos")(require("ava"));

let runner: Runner;

let processExit = process.exit;

test.beforeEach(() => {
    runner = new Runner();

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

test("start method should call setInterval with function as first parameter", (t: any) => {
    const setIntervalSpy = t.context.spy(global, "setInterval");

    runner.start();

    t.is(typeof setIntervalSpy.calls[0].arguments[0], "function");
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

test("handleKillRequest should clearInterval and exit", (t: any) => {
    const clearIntervalSpy = t.context.spy(global, "clearInterval");

    t.throws(() => {
        runner.handleKillRequest();
    }, { message: "exit" });

    t.is(clearIntervalSpy.calls.length, 1);
});

test("readPayload method should call handleKillRequest on KILL message", (t: any) => {
    t.throws(() => {
        runner.readPayload([MessageCode.KILL, {}]);
    }, { message: "exit" });
});

test("readPayload method should return PONG on PING payload", (t: any) => {
    t.is(
        runner.readPayload([MessageCode.PING, {}]),
        JSON.stringify([MessageCode.PONG, {}])
    );
});

test("readPayload method should return msgCode on unsupported msgCode", (t: any) => {
    t.is(runner.readPayload([999, {}]), "[3004,{\"received\":999}]");
});
