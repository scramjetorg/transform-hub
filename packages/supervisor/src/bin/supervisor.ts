import { LifeCycleConfig } from "@scramjet/types";
import { LifecycleDockerAdapter } from "../lib/adapters/docker/lifecycle-docker-adapter";
import { CSHClient } from "../lib/csh-client";
import { LifeCycleController } from "../lib/lifecycle-controller";
import * as path from "path";
import * as fs from "fs";


/**
 *
 * This script runs the main component of the CSI - the Supervisor.
 * It creates an instance of LifeCycle Adapter and LifeCycle configuration file
 * which are both required by the LifeCycle Controller.
 * It then creates an instance of LifeCycle Controller and runs it.
 *
 * In the event of error, the stack trace is consoled out and the process exits.
 **/


(async () => {

    // In the future it will be configurable.
    const config: LifeCycleConfig = {
        makeSnapshotOnError: false
    };
    const lcda: LifecycleDockerAdapter = new LifecycleDockerAdapter();

    let socketPath: string = path.resolve(process.cwd(), process.argv[2]) || "";

    if (!fs.existsSync(socketPath)) {
        console.error("Incorrect run argument: sequence path (" + socketPath + ") does not exists. ");
        process.exit(1);
    }
    const cshc: CSHClient = new CSHClient(socketPath);
    const lcc: LifeCycleController = new LifeCycleController(lcda, config, cshc);

    await lcc.main();

})().catch(e => {
    console.error(e.stack);
    process.exitCode = e.exitCode || 10;
});
