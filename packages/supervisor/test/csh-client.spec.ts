/* eslint-disable dot-notation */
import test from "ava";
import * as proxyquire from "proxyquire";
import * as sinon from "sinon";

class CommunicationHandler {
    addControlHandler = sinon.stub();
}

let communicationHandler: any;
let cshClient: any;
let createReadStreamStub = sinon.stub();
let { CSHClient } = proxyquire("@scramjet/supervisor/src/lib/csh-client", {
    "@scramjet/model/src/stream-handler": CommunicationHandler,
    fs: {
        createReadStream: createReadStreamStub
    }
});

test.beforeEach(() => {
    communicationHandler = new CommunicationHandler();
    cshClient = new CSHClient(communicationHandler);
});

test("Should create instance.", t => {
    t.not(cshClient, null);
});

test("Should assign streams.", t => {
    t.not(cshClient["monitorStream"], null);
    t.not(cshClient["controlStream"], null);
});

test("Should store communication handler passed as param in contructor.", t => {
    t.is(cshClient["communicationHandler"], communicationHandler);
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
    cshClient.kill();

    t.true(communicationHandler.addControlHandler.calledOnceWith(4002, cshClient.killHandler));
});

test("killHandler should return encoded message for kill", t => {
    t.deepEqual(cshClient.killHandler(), [4002, {}]);
});
