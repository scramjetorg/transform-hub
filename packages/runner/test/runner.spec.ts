/* tslint:disable */
import * as sinon from "sinon";
import * as proxyquire from "proxyquire";
import { PassThrough } from "stream";
import { ReadStream, WriteStream } from "fs";
import { RunnerMessageCode } from "../../types/node_modules/@scramjet/model/src";

const test = require("ava");
const controlMockStream = new PassThrough() as unknown as ReadStream;
const monitorMockStream = new PassThrough() as unknown as WriteStream;
const createReadStreamStub = () => controlMockStream;
const createWriteStreamStub = () => monitorMockStream;
const writeMessageOnStreamMock = sinon.stub();
const { Runner } = proxyquire("../dist/runner.js", {
    fs: {
        createReadStream: createReadStreamStub,
        createWriteStream: createWriteStreamStub,
    },
    "./message-utils": {
        MessageUtils: {
            writeMessageOnStream: writeMessageOnStreamMock
        }
    }
});

test("Runner new instance", (t: any) => {
    const runner = new Runner("sequencePath", ".");

    t.not(runner, null);
});

test("Run main", async (t: any) => {
    const runner = new Runner("sequencePath", "fifoDir");
    const hookupFifoStreams = sinon.stub(runner, "hookupFifoStreams");
    const sendHandshakeMessage = sinon.stub(runner, "sendHandshakeMessage");

    await runner.main();

    t.is(hookupFifoStreams.callCount, 1);
    t.is(sendHandshakeMessage.callCount, 1);
});

test("Kill runner", async (t: any) => {
    const runner = new Runner("sequencePath", "fifoDir");
    const processExit = sinon.stub(process, "exit");
    const cleanupControlStreamMock = sinon.stub(runner, "cleanupControlStream");

    runner.controlStreamHandler([RunnerMessageCode.KILL, {}]);

    t.is(cleanupControlStreamMock.callCount, 1);
    t.is(processExit.callCount, 1);
});

test("Stop sequence", async (t: any) => {
    const runner = new Runner("sequencePath", "fifoDir");

    sinon.stub(runner, "sendHandshakeMessage");

    runner.main();
    runner.initAppContext({ configKey: "configKeyValue" });
    runner.controlStreamHandler([RunnerMessageCode.STOP, {}]);

    await new Promise(resolve => setTimeout(resolve, 200));

    t.true(
        writeMessageOnStreamMock.calledOnceWith([RunnerMessageCode.SEQUENCE_STOPPED, {}], runner.monitorStream)
    );
});
