/* eslint-disable */
import test from "ava";
import * as sinon from "sinon";
import { ICSHClient, ICommunicationHandler, ILifeCycleAdapter, RunnerConfig } from "@scramjet/types";
import { PassThrough } from "stream";
import { DataStream } from "scramjet";

import { LifeCycleController } from "../src/lib/lifecycle-controller";

// let { LifeCycleController } = proxyquire("@scramjet/supervisor/src/lib/lifecycle-controller", {
//     "@scramjet/model/src/stream-handler": {
//         pipeStdio: pipeStdioStub,
//         pipeMessageStreams: pipeMessageStreamsStub
//     }
// });

let lcc: LifeCycleController;

class LCDA implements ILifeCycleAdapter {
    snapshot  = sinon.stub()
    monitorRate  = sinon.stub()
    stop  = sinon.stub()
    remove  = sinon.stub()

    init = sinon.stub()
    identify = sinon.stub()
    run = sinon.stub()
    cleanup = sinon.stub()
    hookCommunicationHandler = sinon.stub()
    stats = sinon.stub()
}

class Client implements ICSHClient {
    PATH: string = "";
    logger: Console = console;
    init = sinon.stub().resolves();
    upstreamStreamsConfig = sinon.stub();
    hookCommunicationHandler = sinon.stub();
    kill = sinon.stub()
    disconnect = sinon.stub();
}

const streamHandlerInstance: ICommunicationHandler = {
    pipeStdio: sinon.stub(),
    pipeMessageStreams: sinon.stub(),
    hookUpstreamStreams: sinon.stub(),
    hookDownstreamStreams: sinon.stub(),
    addMonitoringHandler: sinon.stub(),
    addControlHandler: sinon.stub(),
    pipeDataStreams: sinon.stub(),
    sendMonitoringMessage: sinon.stub(),
    sendControlMessage: sinon.stub(),
    getMonitorStream: sinon.stub().returns(new DataStream()),
    getLogOutput: sinon.stub().returns({out: new PassThrough(), err: new PassThrough()}),
    getStdio: sinon.stub().returns(new DataStream()),
}

let lcdaInstance = new LCDA();
let clientIntance = new Client();

let config = {
    makeSnapshotOnError: false
}

test.beforeEach(() => {
    lcc = new LifeCycleController("test", lcdaInstance, config, clientIntance);
})

    test("When an instance of LifeCycleController is constructed with correct parameters it must not be null", t => {
    t.not(lcc, null);
});

test("Should store passed parameter in internal fields", t => {
    t.is(lcc["lifecycleAdapterRun"], lcdaInstance)
    t.is(lcc["lifecycleConfig"], config);
});

test("LCC main method should call sub methods", async (t) => {

    lcc["communicationHandler"] = streamHandlerInstance;

    const config = { container: { image: "example-image" }} as RunnerConfig;

    sinon.stub(lcc, "configMessageReceived").resolves(config);

    lcdaInstance.init.resolves();
    lcdaInstance.run.resolves();
    lcdaInstance.cleanup.resolves();
    clientIntance.init.resolves();
    clientIntance.hookCommunicationHandler.resolves();
    lcdaInstance.hookCommunicationHandler.resolves();

    (streamHandlerInstance.addControlHandler as sinon.SinonStub).resolves()

    await lcc.main();

    t.true(clientIntance.hookCommunicationHandler.calledOnceWithExactly(streamHandlerInstance))
    t.true(lcdaInstance.hookCommunicationHandler.calledOnceWithExactly(streamHandlerInstance))
    t.true(lcdaInstance.run.calledOnceWithExactly(config));
    t.true(lcdaInstance.cleanup.calledOnceWithExactly());

    // others should be called
})
