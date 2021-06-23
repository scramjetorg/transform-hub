import { LifeCycleConfig } from "@scramjet/types";

import { CSHClient } from "../lib/csh-client";
import { LifecycleDockerAdapterInstance } from "@scramjet/adapters";
import { LifeCycleController } from "../lib/lifecycle-controller";
import { configService } from "@scramjet/csi-config";

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
const lcdai: LifecycleDockerAdapterInstance = new LifecycleDockerAdapterInstance();
const id: string = process.argv[2];
const cshc: CSHClient = new CSHClient(configService.getConfig().host.socketPath);
const lcc: LifeCycleController = new LifeCycleController(id, lcdai, config, cshc);

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
