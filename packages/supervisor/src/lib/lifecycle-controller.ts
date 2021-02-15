/* eslint-disable @typescript-eslint/no-unused-vars */

import { Readable } from "stream";
import { LifeCycle, LifeCycleError, LifeCycleConfig } from "@scramjet/types/src/lifecycle";

async function LifeCycleController(tgz: Readable, lifecycleAdapter: LifeCycle, lifecycleConfig: LifeCycleConfig) {
    // this executes pre-runner
    const config = await lifecycleAdapter.idenitfy(tgz);
    try {
        // this executes runner
        // this may run for 24 hours or even longer...
        await lifecycleAdapter.run(config);
    } catch (error: LifeCycleError) {
        // Dunno what?
        if (lifecycleConfig.makeSnapshotOnError) {
            // remove all artifacts
            return await lifecycleAdapter.snapshot();
        }
    }

    // remove all artifacts
    return lifecycleAdapter.cleanup();
}

export { LifeCycleController };
