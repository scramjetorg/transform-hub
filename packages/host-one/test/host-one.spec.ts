import test from "ava";
import { HostOne } from "../src/host-one";
import * as sinon from "sinon";

test("Placeholder for test. Tests coming after the class gets OK", t => {
    let hostOne = new HostOne("sequencePath", "configPath");

    t.not(hostOne, null);
});

test("Vorpal should not execute controlStream when params in 'event' command are not provided", t => {
    const hostOne = new HostOne("sequencePath", "configPath");
    const conStream = sinon.spy(hostOne["controlStream"], "whenWrote");

    hostOne.init();
    hostOne.controlStreamsHandler();
    hostOne.vorpalExec("event");

    t.is(conStream.getCall(0), null);
});

test("Vorpal should execute controlStream with proper params when command 'event' is provided ", t => {
    const hostOne = new HostOne("sequencePath", "configPath");
    const conStream = sinon.spy(hostOne["controlStream"], "whenWrote");

    hostOne.init();
    hostOne.controlStreamsHandler();
    hostOne.vorpalExec("event fooBar {'foo':'bar'}");

    t.is(conStream.getCall(0).firstArg[0], 4005);
    t.is(typeof conStream.getCall(0).firstArg[1], "object");
});

test("Vorpal should execute controlStream with proper code when command 'kill' is provided", t => {
    const hostOne = new HostOne("sequencePath", "configPath");
    const conStream = sinon.spy(hostOne["controlStream"], "whenWrote");

    hostOne.init();
    hostOne.controlStreamsHandler();
    hostOne.vorpalExec("kill");

    t.is(conStream.getCall(0).firstArg[0], 4002);
});

test("Vorpal should execute controlStream with proper code when command 'stop' is provided", t => {
    const hostOne = new HostOne("sequencePath", "configPath");
    const conStream = sinon.spy(hostOne["controlStream"], "whenWrote");

    hostOne.init();
    hostOne.controlStreamsHandler();
    hostOne.vorpalExec("stop");

    t.is(conStream.getCall(0).firstArg[0], 4001);
});

test("Vorpal should not execute controlStream when proper params in 'monitor' command are not provided", t => {
    const hostOne = new HostOne("sequencePath", "configPath");
    const conStream = sinon.spy(hostOne["controlStream"], "whenWrote");

    hostOne.init();
    hostOne.controlStreamsHandler();
    hostOne.vorpalExec("monitor");
    t.is(conStream.getCall(0), null);
});

test("Vorpal should execute controlStream when command monitor is provided", t => {
    const hostOne = new HostOne("sequencePath", "configPath");
    const conStream = sinon.spy(hostOne["controlStream"], "whenWrote");

    hostOne.init();
    hostOne.controlStreamsHandler();
    hostOne.vorpalExec("monitor 200");

    t.is(conStream.getCall(0).firstArg[0], 4003);
    t.deepEqual(conStream.getCall(0).firstArg[1], { monitoringRate: 200 });
});
