/* eslint-disable dot-notation */
import test, { beforeEach } from "ava";
import * as sinon from "sinon";
import * as fs from "fs";
import { PassThrough, Readable, Writable } from "stream";
import { DataStream } from "scramjet";
import { RunnerMessageCode } from "@scramjet/symbols";
/* eslint-disable-next-line import/no-extraneous-dependencies */
import { MessageUtils, Runner } from "@scramjet/runner";
// const readInputHeaders = require("../src/input-stream");
const controlMockStream = new PassThrough() as unknown as fs.ReadStream;
const monitorMockStream = new PassThrough() as unknown as fs.WriteStream;
const createReadStreamStub = () => controlMockStream;
const createWriteStreamStub = () => monitorMockStream;
const writeMessageOnStreamMock = sinon.stub();
const sequence = [
    (input: Readable) => Promise.resolve(input),
    (input: Readable) => Promise.resolve(input)
];

// sinon.stub(readInputHeaders, "readInputStreamHeaders").returns("");
sinon.stub(fs, "createReadStream").returns(createReadStreamStub());
sinon.stub(fs, "createWriteStream").returns(createWriteStreamStub());
sinon.stub(MessageUtils, "writeMessageOnStream").callsFake(writeMessageOnStreamMock);

beforeEach(() => {
    writeMessageOnStreamMock.reset();
});

test("Runner new instance", (t: any) => {
    const runner = new Runner("sequencePath", ".");

    t.not(runner, null);
});

test("Run main", async (t: any) => {
    const runner = new Runner("sequencePath", "fifoDir");
    const hookupFifoStreams = sinon.stub(runner, "hookupFifoStreams").callsFake(() => {
        // eslint-disable-next-line no-console
        runner["loggerStream"] = new DataStream().each(console.log);
        runner["monitorStream"] = new Writable();
        runner["inputStream"] = new Readable();
        return Promise.resolve([undefined, undefined, undefined, undefined]);
    });
    const sendHandshakeMessage = sinon.stub(runner, "sendHandshakeMessage");

    runner.getSequence = sinon.stub().returns(sequence);
    runner.runSequence = sinon.stub().resolves();
    runner.cleanup = sinon.stub().resolves();
    runner.waitForHandshakeResponse = sinon.stub().resolves({
        appConfig: {},
        args: []
    });
    // runner.setInputContentType = sinon.stub().resolves();

    await runner.main().catch((e) => {
        console.error(e);
    });

    t.is(hookupFifoStreams.callCount, 1);
    t.is(sendHandshakeMessage.callCount, 1);
});

test("Kill runner", async (t: any) => {
    const runner = new Runner("sequencePath", "fifoDir");
    const cleanup = sinon.stub(runner, "cleanup");
    const exit = runner["exit"] = sinon.stub();

    await runner.controlStreamHandler([RunnerMessageCode.KILL, {}]);

    t.is(cleanup.callCount, 1);
    t.is(exit.callCount, 1);
    t.is(exit.getCalls()[0].args[0], 137);
});

test("Stop sequence", async (t: any) => {
    const runner = new Runner("sequencePath", "fifoDir");

    sinon.stub(runner, "hookupFifoStreams").callsFake(async () => {
        // eslint-disable-next-line no-console
        runner["loggerStream"] = new DataStream().each(console.log);
        runner["monitorStream"] = new Writable();
        runner["controlStream"] = new Readable();
        runner["inputStream"] = new Readable();
        runner["outputStream"] = new Writable();

        return Promise.resolve([undefined, undefined, undefined, undefined]);
    });

    sinon.stub(runner, "sendHandshakeMessage");
    runner.waitForHandshakeResponse = sinon.stub().resolves({
        appConfig: {},
        args: []
    });
    runner.cleanup = sinon.stub().resolves();
    runner.getSequence = sinon.stub().returns(sequence);

    await runner.main();

    runner.initAppContext({ configKey: "configKeyValue" });

    writeMessageOnStreamMock.reset();
    await runner.controlStreamHandler([RunnerMessageCode.STOP, {}]);

    t.true(
        writeMessageOnStreamMock.calledOnceWith(
            // eslint-disable-next-line dot-notation
            [RunnerMessageCode.SEQUENCE_STOPPED, { sequenceError: undefined }], runner["monitorStream"]
        )
    );
});

