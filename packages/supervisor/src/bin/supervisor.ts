import { LifeCycleConfig } from "@scramjet/types";
import { SupervisorError } from "@scramjet/model";
import { LifecycleDockerAdapter } from "../lib/adapters/docker/lifecycle-docker-adapter";
import { CSHClient } from "../lib/csh-client";
import { LifeCycleController } from "../lib/lifecycle-controller";
import * as path from "path";
import * as fs from "fs";

/**
 * This script runs the main component of the CSI - the Supervisor.
 * It creates an instance of LifeCycle Adapter and LifeCycle configuration file
 * which are both required by the LifeCycle Controller.
 * It then creates an instance of LifeCycle Controller and runs it.
 *
 * In the event of error, the stack trace is consoled out and the process exits.
 **/

const config: LifeCycleConfig = {
    makeSnapshotOnError: false
};
const lcda: LifecycleDockerAdapter = new LifecycleDockerAdapter();
const socketPath: string = path.resolve(process.cwd(), process.argv[2]) || "";

if (!fs.existsSync(socketPath)) {
    throw new SupervisorError("INVALID_CONFIGURATION", { details: "Missing file " + socketPath });
}

const cshc: CSHClient = new CSHClient(socketPath);
const lcc: LifeCycleController = new LifeCycleController(lcda, config, cshc);

lcc.main()
    .catch(e => {
        setTimeout(() => {
            let exitCode = 10;

            if (e.data && e.data.exitCode) {
                exitCode = e.data.exitCode;
            }

            console.log(e.stack);
            process.exitCode = exitCode;
        }, 100);
    })
    .finally(() => {
        return cshc.disconnect();
    });
