/* eslint-disable dot-notation */
import test from "ava";
import * as proxyquire from "proxyquire";
import * as sinon from "sinon";

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
    cshClient = new CSHClient("/tmp/sock");
});

test("Should create instance.", t => {
    t.not(cshClient, null);
});

test("createUpstream should return an array", t => {
    cshClient.init();
    upstream = cshClient.upstreamStreamsConfig();

    t.is(Array.isArray(upstream), true);
});

test("createUpstream should return proper streams in array", t => {
    cshClient.init();
    upstream = cshClient.upstreamStreamsConfig();

    t.is(upstream[0].readable, true);
    t.is(upstream[1].writable, true);
    t.is(upstream[2].writable, true);
    t.is(upstream[3].readable, true);
    t.is(upstream[4].writable, true);
    t.is(upstream[5].readable, true);
});
