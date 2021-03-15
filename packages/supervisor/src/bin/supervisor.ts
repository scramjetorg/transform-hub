import { LifeCycleConfig } from "@scramjet/types";
import { LifecycleDockerAdapter } from "../lib/adapters/docker/lifecycle-docker-adapter";
import { LifeCycleController } from "../lib/lifecycle-controller";

/**
 * 
 * This script runs the main component of the CSI - the Supervisor.
 * It creates an instance of LifeCycle Adapter and LifeCycle configuration file
 * which are both required by the LifeCycle Controller.
 * It then creates an instance of LifeCycle Controller and runs it.
 * 
 * In the event of error, the stack trace is consoled out and the process exits.
 * 
 */

(async () => {

    // In the future it will be configurable.
    const config: LifeCycleConfig = {
        makeSnapshotOnError: false
    };
    const lcda: LifecycleDockerAdapter = new LifecycleDockerAdapter();

    await lcda.init();

    const lcc: LifeCycleController = new LifeCycleController(lcda, config);

    await lcc.start();

})().catch(e => {
    console.error(e.stack);
    process.exitCode = e.exitCode || 10;
});
