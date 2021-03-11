import test from "ava";
import { LifecycleDockerAdapterMock } from "../mocks/supervisor-component-mocks";
import { LifeCycleController } from "../lib/lifecycle-controller";
import { LifeCycleConfig } from "@scramjet/types/src/lifecycle";

test("When an instance of LifeCycleController is construcred with correct parameters it must not be null", t => {

    const config: LifeCycleConfig = {
        makeSnapshotOnError: false
    };
    const lcda = new LifecycleDockerAdapterMock();
    const controller = new LifeCycleController(lcda, config);

    t.not(controller, null);

});
