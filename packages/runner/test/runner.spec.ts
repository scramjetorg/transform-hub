/* eslint-disable dot-notation */
import * as sinon from "sinon";
import { PassThrough, Readable, Writable } from "stream";
import { RunnerMessageCode } from "@scramjet/model";
import { MessageUtils, Runner } from "@scramjet/runner";

import * as fs from "fs";
import { DataStream } from "scramjet";

const test = require("ava");
const controlMockStream = new PassThrough() as unknown as fs.ReadStream;
const monitorMockStream = new PassThrough() as unknown as fs.WriteStream;
const createReadStreamStub = () => controlMockStream;
const createWriteStreamStub = () => monitorMockStream;
const writeMessageOnStreamMock = sinon.stub();

sinon.stub(fs, "createReadStream").returns(createReadStreamStub());
sinon.stub(fs, "createWriteStream").returns(createWriteStreamStub());
sinon.stub(MessageUtils, "writeMessageOnStream").callsFake(writeMessageOnStreamMock);

test.beforeEach(() => {
    writeMessageOnStreamMock.reset();
});

test("Runner new instance", (t: any) => {
    const runner = new Runner("sequencePath", ".");

    t.not(runner, null);
});

test("Run main", async (t: any) => {
    const runner = new Runner("sequencePath", "fifoDir");
    const hookupFifoStreams = sinon.stub(runner, "hookupFifoStreams").callsFake(() => {
        // eslint-disable-next-line dot-notation
        runner["loggerStream"] = new DataStream().each(console.log);

        return Promise.resolve([undefined, undefined, undefined, undefined, undefined]);
    });
    const sendHandshakeMessage = sinon.stub(runner, "sendHandshakeMessage");

    await runner.main();

    t.is(hookupFifoStreams.callCount, 1);
    t.is(sendHandshakeMessage.callCount, 1);
});

test("Kill runner", async (t: any) => {
    const runner = new Runner("sequencePath", "fifoDir");
    const processExit = sinon.stub(process, "exit");
    const cleanupStreams = sinon.stub(runner, "cleanupStreams");

    await runner.controlStreamHandler([RunnerMessageCode.KILL, {}]);

    t.is(cleanupStreams.callCount, 1);
    t.is(processExit.callCount, 1);
});

test("Stop sequence", async (t: any) => {
    const runner = new Runner("sequencePath", "fifoDir");

    sinon.stub(runner, "hookupFifoStreams").callsFake(async () => {
        // eslint-disable-next-line dot-notation
        runner["loggerStream"] = new DataStream().each(console.log);
        // eslint-disable-next-line dot-notation
        runner["monitorStream"] = new Writable();
        runner["controlStream"] = new Readable();

        runner["inputStream"] = new Readable();
        runner["outputStream"] = new Writable();

        return Promise.resolve([undefined, undefined, undefined, undefined, undefined]);
    });

    sinon.stub(runner, "sendHandshakeMessage");

    await runner.main();

    runner.initAppContext({ configKey: "configKeyValue" });
    await runner.controlStreamHandler([RunnerMessageCode.STOP, {}]);

    await new Promise(resolve => setTimeout(resolve, 200));

    t.true(
        writeMessageOnStreamMock.calledOnceWith(
            // eslint-disable-next-line dot-notation
            [RunnerMessageCode.SEQUENCE_STOPPED, { sequenceError: undefined }], runner["monitorStream"]
        )
    );
});
