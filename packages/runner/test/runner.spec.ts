/* tslint:disable */
import * as sinon from "sinon";
import * as proxyquire from "proxyquire";
import { PassThrough } from "stream";
import { ReadStream, WriteStream } from "fs";
import { RunnerMessageCode } from "../../types/node_modules/@scramjet/model/src";

const controlMockStream = new PassThrough() as unknown as ReadStream;
const monitorMockStream = new PassThrough() as unknown as WriteStream;
const createReadStreamStub = () => controlMockStream;
const createWriteStreamStub = () => monitorMockStream;
const { Runner } = proxyquire("../dist/runner.js", {
    fs: {
        createReadStream: createReadStreamStub,
        createWriteStream: createWriteStreamStub,
    }
});
const test = require("ava");

test("Runner new instance", (t: any) => {
    let runner = new Runner("sequencePath", ".");
   
    t.not(runner, null);
});

test("Run main", async (t: any) => {
    let runner = new Runner("sequencePath", "fifoDir");

    const hookupFifoStreams = sinon.stub(runner, "hookupFifoStreams");
    const sendHandshakeMessage = sinon.stub(runner, "sendHandshakeMessage");

    await runner.main();

    t.is(hookupFifoStreams.callCount, 1);
    t.is(sendHandshakeMessage.callCount, 1);
});

test("Kill runner", async (t: any) => {
    let runner = new Runner("sequencePath", "fifoDir");

    const processExit = sinon.stub(process, "exit");
    const cleanupControlStreamMock = sinon.stub(runner, "cleanupControlStream");

    runner.controlStreamHandler([RunnerMessageCode.KILL, {}]);

    await new Promise(async (resolve) => {
        setTimeout(() => {
            resolve(1);
        }, 500);
    });

    t.is(cleanupControlStreamMock.callCount, 1);
    t.is(processExit.callCount, 1);
});

// test("Kill runner", async (t: any) =>  {
//     let runner = new Runner("sequencePath", "fifoDir");

//     // const runnerKill = sinon.stub(runner, "handleKillRequest");
//     // const processExit = sinon.spy(process, "exit");

//     // const hookupFifoStreams = sinon.stub(runner, "hookupFifoStreams");
//     const sendHandshakeMessage = sinon.stub(runner, "sendHandshakeMessage");


//     await runner.main();

//     // await t.is(hookupFifoStreams.callCount, 1);
//     await t.is(sendHandshakeMessage.callCount, 1);    


//     // await t.is(runnerKill.callCount, 1);
//     //     await t.is(processExit.callCount, 1);
//     // new Promise
//     // await setTimeout(async () => {
//     //     console.log("xxxx");
//     //     await t.is(runnerKill.callCount, 0);
//     //     await t.is(processExit.callCount, 0);
//     // }, 500).unref();


//     // await new Promise(async (resolve) => {
//     //     setTimeout(() => {
//     //         // await StringStream.from(await StringStream.from(controlMockStream).whenWrote([RunnerMessageCode.KILL, {}]);
//     //         controlMockStream.push([RunnerMessageCode.KILL, {}]);
//     //         resolve(1);
//     //     }, 1000);
//     // });

//     // await new Promise(async (resolve) => {
//     //     setTimeout(async () => {
//     //         await t.is(runnerKill.callCount, 1);
//     //         // await t.is(processExit.callCount, 1);
//     //         resolve(1);
//     //     }, 1000);
//     // });
// });


// test("Send handshake", async (t: any) =>  {
//     let runner = new Runner("sequencePath", "fifoDir");

//     const hookupFifoStreams = sinon.stub(runner, "hookupFifoStreams");
//     const sendHandshakeMessage = sinon.stub(runner, "sendHandshakeMessage");

//     await runner.main();

//     t.is(hookupFifoStreams.callCount, 1);
//     t.is(sendHandshakeMessage.callCount, 1);
// });
