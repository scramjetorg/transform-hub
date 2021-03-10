/* eslint-disable */

//import { join } from "path";
//import { readFile } from "fs";
import test from "ava";
import * as proxyquire from "proxyquire";
import * as sinon from "sinon";

//const PACKAGES_DIR = "test-file.tar.gz";
//const mockFilePath = join(__dirname, "..", "src", "mocks", PACKAGES_DIR);


class CommunicationHandler {
    addControlHandler =  sinon.stub();
}

let createReadStreamStub = sinon.stub();

let { CSHClient } = proxyquire("@scramjet/supervisor/src/lib/csh-client", {
    "@scramjet/model/src/stream-handler": CommunicationHandler,
    "fs": {
        createReadStream: createReadStreamStub
    }
});

test("Should create instance.", t => {
    const cshClient = new CSHClient(new CommunicationHandler());

    t.not(cshClient, null);
});

test("Should assign streams.", t => {
    const communicationHandler = new CommunicationHandler();
    const cshClient = new CSHClient(communicationHandler);

    t.not(cshClient["monitorStream"], null);
    t.not(cshClient["controlStream"], null);
});

test("Should store communication handler passed as param in contructor.", t => {
    const communicationHandler = new CommunicationHandler();

    const cshClient = new CSHClient(communicationHandler);

    t.is(cshClient["communicationHandler"], communicationHandler);
});

test("getPackage should throw an error if path is not defined.", t => {
    const communicationHandler = new CommunicationHandler();

    const cshClient = new CSHClient(communicationHandler);

    const error = t.throws(() => cshClient.getPackage(), { instanceOf: Error });
    t.is(error.message, "Path is empty");
});

test("getPackage should return createReadStream results. (path not passed)", t => {
    const envPath = "example_path"

    process.env.SEQUENCE_PATH = '';
    sinon.stub(process.env, "SEQUENCE_PATH").value(envPath);

    const communicationHandler = new CommunicationHandler();

    const cshClient = new CSHClient(communicationHandler);
    cshClient.PATH = process.env.SEQUENCE_PATH || "";

    createReadStreamStub.returns(envPath);
    createReadStreamStub.calledOnceWith(envPath);

    t.is(cshClient.getPackage(), envPath);
});

test("getPackage should return createReadStream results. (path passed)", t => {
    const path = "example_path"
    const communicationHandler = new CommunicationHandler();
    const cshClient = new CSHClient(communicationHandler);

    createReadStreamStub.returns(path);
    createReadStreamStub.calledOnceWith(path);

    t.is(cshClient.getPackage(path), path);
});

test("kill should execute addControlHandler with proper params", t => {
    const communicationHandler = new CommunicationHandler();
    const cshClient = new CSHClient(communicationHandler);

    cshClient.kill();

    t.true(communicationHandler.addControlHandler.calledOnceWith(4002, cshClient.killHandler));
});

test("killHandler should return encoded message for kill", t => {
    const communicationHandler = new CommunicationHandler();
    const cshClient = new CSHClient(communicationHandler);

    t.deepEqual(cshClient.killHandler(), [4002, {}]);
});
/*
test.cb("load package form path " + mockFilePath, _t => {
    // Test if path from env can be load.
    readFile(mockFilePath, _t.end);
});

test("check file path " + mockFilePath, _t => {
    // Test if path from env is string.
    _t.is(typeof mockFilePath, "string");
});

test("return readable stream with package " + mockFilePath, _t => {
    // Test if getPackage method returns a readable stream.
    const result = cshClient.getPackage(mockFilePath);

    _t.is(result.readable, true);
});

test("throw an error when string is empty " + mockFilePath, _t => {
    // Test if getPackage method throw an error when path to file is empty.
    const error = _t.throws(() => cshClient.getPackage(), { instanceOf: Error });

    _t.is(error.message, "Path is empty");
});

test("return an array", _t => {
    // Test if hookStreams method return an array.
    // _t.is(Array.isArray(streams), true);
    _t.pass();
});

test("array contains proper elements", _t => {
    // Test if hookStreams method contains array with proper streams.
    // _t.is(streams[0].readable, true);
    // _t.is(streams[1].writable, true);
    // _t.is(streams[2].writable, true);
    _t.pass();
});

test("log to the console", _t => {
    // Test if hookStreams method log output to the console.
    // consoleSpy = sinon.stub(console, 'log');
    // cshClient.hookStreams(streams)
    // consoleSpy.called.should.be.true;
    // consoleSpy.restore();
    _t.pass();
});
*/
