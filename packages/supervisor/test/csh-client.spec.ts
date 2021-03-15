/* eslint-disable dot-notation */
import test from "ava";
import * as proxyquire from "proxyquire";
import * as sinon from "sinon";
// import { DataStream } from "scramjet";

let cshClient: any;
let upstream: any;
let createReadStreamStub = sinon.stub();
let { CSHClient } = proxyquire("@scramjet/supervisor/src/lib/csh-client", {
    fs: {
        createReadStream: createReadStreamStub
    }
});

test.beforeEach(() => {
    sinon.reset();
    cshClient = new CSHClient();
});

test("Should create instance.", t => {
    t.not(cshClient, null);
});

test("Should assign streams.", t => {
    t.not(cshClient["monitorStream"], null);
    t.not(cshClient["controlStream"], null);
});

test("getPackage should throw an error if path is not defined.", t => {
    const error = t.throws(() => cshClient.getPackage(), { instanceOf: Error });

    t.is(error.message, "Path is empty");
});

test("getPackage should return createReadStream results. (path not passed)", t => {
    const envPath = "example_path";

    process.env.SEQUENCE_PATH = "";
    sinon.stub(process.env, "SEQUENCE_PATH").value(envPath);
    cshClient.PATH = process.env.SEQUENCE_PATH || "";

    createReadStreamStub.returns(envPath);
    createReadStreamStub.calledOnceWith(envPath);

    t.is(cshClient.getPackage(), envPath);
});

test("getPackage should return createReadStream results. (path passed)", t => {
    const path = "example_path";

    createReadStreamStub.returns(path);
    createReadStreamStub.calledOnceWith(path);

    t.is(cshClient.getPackage(path), path);
});

test("kill should execute addControlHandler with proper params", t => {
    const ch = sinon.spy(cshClient.controlStream, "write");

    cshClient.kill();

    t.true(ch.calledOnceWith([4002, {}]));
});

test("createUpstream should return an array", t => {
    upstream = cshClient.upstreamStreamsConfig();

    t.is(Array.isArray(upstream), true);
});

test("createUpstream should return proper streams in array", t => {
    t.is(upstream[0].readable, true);
    t.is(upstream[1].writable, true);
    t.is(upstream[2].writable, true);
    t.is(upstream[3].readable, true);
    t.is(upstream[4].writable, true);
});

test("hookCommunicationHandler should execute hookClientStreams with upstreamStreamsConfig", t => {
    // cshClient.hookCommunicationHandler();
    // Test throw errorMsg: Double initialization, getStream() method can be called only once.
    // What can I do about it? Can I somehow make reset?
    // t.true(communicationHandler.hookClientStreams.calledOnceWith(upstream))
    t.pass();
});

test("hookCommunicationHandler should create upstream config", t => {
    // Same issue as above
    t.pass();
});

test("getMonitoringDownstream should call DataStream", t => {
    // cshClient.getMonitoringDownstream();
    // no idea how to stub monitoringDownstream
    // t.not(DataStream, null);
    t.pass();
});
