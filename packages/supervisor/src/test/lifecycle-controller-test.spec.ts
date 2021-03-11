/* eslint-disable */
import test from "ava";
import * as proxyquire from "proxyquire";
import * as sinon from "sinon";

let getPackageStub = sinon.stub();
let hookCommunicationHandlerStub = sinon.stub();
let pipeStdioStub = sinon.stub();
let pipeMessageStreamsStub = sinon.stub();

let { LifeCycleController } = proxyquire("@scramjet/supervisor/src/lib/lifecycle-controller", {
    "@scramjet/supervisor/src/lib/csh-client": {
        getPackage: getPackageStub,
        hookCommunicationHandler: hookCommunicationHandlerStub
    },
    "@scramjet/model/src/stream-handler": {
        pipeStdio: pipeStdioStub,
        pipeMessageStreams: pipeMessageStreamsStub
    }
});

let lcc: typeof LifeCycleController;

class LCDA {
    identify = sinon.stub()
    run= sinon.stub()
    cleanup = sinon.stub()
    hookCommunicationHandler = sinon.stub()
}

let LCDAInstance = new LCDA();

let config = {
    makeSnapshotOnError: false
}

test.beforeEach(() => {
    lcc = new LifeCycleController(LCDAInstance, config);
})

test("When an instance of LifeCycleController is constructed with correct parameters it must not be null", t => {
    t.not(lcc, null);
});

test("Should store passed parameter in internal fields", t => {
    t.is(lcc["lifecycleAdapter"], LCDAInstance)
    t.is(lcc["lifecycleConfig"], config);
});

test("Should call LCDA.identify with value returned by client.getPackage", async (t) => {
    
    let getPackageResult = "example-readable";

    lcc.lifecycleAdapter.identify.resolves({image: "example-image"});
    lcc.lifecycleAdapter.run.resolves();
    lcc.lifecycleAdapter.cleanup.resolves();

    let getPckg = sinon.stub(lcc.client, "getPackage");
    getPckg.returns(getPackageResult);

    let pipeStd = sinon.stub(lcc.communicationHandler, "pipeStdio");
    pipeStd.returns(lcc.communicationHandler);
    let pipeMessages = sinon.stub(lcc.communicationHandler, "pipeMessageStreams");
    pipeMessages.callsFake(() => {});

    lcc.start();

    t.true(lcc.lifecycleAdapter.identify.calledOnceWith(getPackageResult));
})
