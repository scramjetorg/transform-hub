import test from "ava";
import * as sinon from "sinon";
import { LifecycleDockerAdapterMock } from "@scramjet/supervisor/src/mocks/supervisor-component-mocks";
import { LifeCycleController } from "@scramjet/supervisor/src/lib/lifecycle-controller";
import { LifeCycleConfig } from "@scramjet/types/src/lifecycle";

const sandbox = sinon.createSandbox();

test("When an instance of LifeCycleController is construcred with correct parameters it must not be null", t => {

    const config: LifeCycleConfig = {
        makeSnapshotOnError: false
    };

    const lcda = new LifecycleDockerAdapterMock();

    const controller = new LifeCycleController(lcda, config);
    t.not(controller, null);

});

test("When snapshot option is not false, snapshot method must not be called", t => {

    const config: LifeCycleConfig = {
        makeSnapshotOnError: false
    };

    const lcda = new LifecycleDockerAdapterMock();

    const controller = new LifeCycleController(lcda, config);
    let takeSnapshot = sandbox.spy(lcda, "snapshot");

    controller.start();
    t.false(takeSnapshot.calledOnce);
    takeSnapshot.restore();

});

