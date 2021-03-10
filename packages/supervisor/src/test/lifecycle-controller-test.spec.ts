/* eslint-disable */
import test from "ava";
import * as proxyquire from "proxyquire";
import * as sinon from "sinon";

let getPackageStub = sinon.stub();

let { LifeCycleController } = proxyquire("@scramjet/supervisor/src/lib/lifecycle-controller", {
    "@scramjet/supervisor/src/lib/csh-client": {
        getPackage: getPackageStub
    }
});

let lcc: typeof LifeCycleController;

class LCDA {
    identify = sinon.stub()
    run= sinon.stub()
}

let LCDAInstance = new LCDA();

let config = {
    makeSnapshotOnError: false
}

test.beforeEach(() => {
    lcc = new LifeCycleController(LCDAInstance, config);
})

test("When an instance of LifeCycleController is construcred with correct parameters it must not be null", t => {
    t.not(lcc, null);
});

test("Should store passed parameter in internal fields", t => {
    t.is(lcc["lifecycleAdapter"], LCDAInstance)
    t.is(lcc["lifecycleConfig"], config);
});

/**
 * Homework.
 test("Should call LCDA.identify with value returned by client.getPackage", async (t) => {
     let getPackageResult = "example-readable";

    lcc.lifecycleAdapter.identify.resolves({image: "example-image"});
    lcc.lifecycleAdapter.run.resolves();

    let getPckg = sinon.stub(lcc.client, "getPackage");
    getPckg.returns(getPackageResult);

    lcc.start();

    console.dir(lcc, {depth: null})
    t.true(lcc.lifecycleAdapter.identify.calledOnceWith(getPackageResult));
})

*/
