/* eslint-disable dot-notation */
import test from "ava";
import { Socket } from "net";
import { PassThrough } from "stream";
import * as proxyquire from "proxyquire";
import * as sinon from "sinon";

let cshClient: any;
let upstream: any;
let createReadStreamStub = sinon.stub();
let createConnectionStub = sinon.stub().returns(new Socket());
let { CSHClient } = proxyquire("@scramjet/supervisor/src/lib/csh-client", {
    fs: {
        createReadStream: createReadStreamStub
    },
    net: {
        createConnection: createConnectionStub
    },
    bpmux: {
        BPMux: function() {
            return {
                multiplex: sinon.stub().returns(new PassThrough())
            };
        }
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
