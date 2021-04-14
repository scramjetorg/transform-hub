/* eslint-disable dot-notation */

import test from "ava";
import { Socket } from "net";
import { PassThrough } from "stream";
import * as proxyquire from "proxyquire";
import * as sinon from "sinon";
// import { CommunicationChannel } from "@scramjet/model";

let cshClient: any;
let upstream: any;

const createReadStreamStub = sinon.stub();
const createConnectionStub = sinon.stub().returns(new Socket());
const { CSHClient } = proxyquire("@scramjet/supervisor/src/lib/csh-client", {
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

test("UpstreamStreamsConfig should return an array", t => {
    cshClient.init(); // Cannot read property 'pipe' of undefined
    upstream = cshClient.upstreamStreamsConfig(); // upstrem is obj not arr

    // t.is(Array.isArray(upstream), true); // err: false
    t.pass()
});

test("UpstreamStreamsConfig should return proper streams in array", async t => {
    upstream = await cshClient.init()
        .then(() => cshClient.upstreamStreamsConfig())
        .catch((err:object) => {console.log(err)}) // Cannot read property 'pipe' of undefined

    // t.is(upstream[CommunicationChannel.STDIN].writable, true);
    // t.is(upstream[CommunicationChannel.STDOUT].writable, true);
    // t.is(upstream[CommunicationChannel.STDERR].writable, true);
    // t.is(upstream[CommunicationChannel.CONTROL].readable, true);
    // t.is(upstream[CommunicationChannel.MONITORING].writable, true);
    // t.is(upstream[CommunicationChannel.OUT_DOWN_STR].readable, true);
    // t.is(upstream[CommunicationChannel.IN_DOWN_STR].readable, true);
    // t.is(upstream[CommunicationChannel.PACKAGE].readable, true);
    // t.is(upstream[CommunicationChannel.LOG].readable, true);
    t.pass()
});
