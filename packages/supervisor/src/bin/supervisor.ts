import { LifeCycle, LifeCycleConfig } from "@scramjet/types";
import { LifecycleDockerAdapter } from "../lib/adapters/docker/lifecycle-docker-adapter";
import { LifeCycleController } from "../lib/lifecycle-controller";

/**
 * 
 * The script runs Supervisor.
 * 
 */

(async () => {
    const config: LifeCycleConfig = {
        makeSnapshotOnError: true
    };
    const lcda: LifecycleDockerAdapter = new LifecycleDockerAdapter();

    await lcda.init();

    // lcda as unknown: needs LifeCycle interface fix
    const lcc: LifeCycleController = new LifeCycleController(lcda as unknown as LifeCycle, config);

    await lcc.start();

})().catch(e => {
    console.error(e.stack);
    process.exitCode = e.exitCode || 10;
}
);
