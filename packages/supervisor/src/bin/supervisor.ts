import { LifeCycleConfig } from "@scramjet/types";

import { CSHClient } from "../lib/csh-client";
import { getInstanceAdapter } from "@scramjet/adapters";
import { LifeCycleController } from "../lib/lifecycle-controller";

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
const instanceAdapter = getInstanceAdapter(process.env.RUN_WITHOUT_DOCKER === "true");
const id: string = process.argv[2];
const cshc: CSHClient = new CSHClient(process.argv[3]);
const lcc = new LifeCycleController(id, instanceAdapter, config, cshc);

lcc.main()
    .catch(e => {
        setTimeout(() => {
            let exitCode = 10;

            if (e.data && e.data.exitCode) {
                exitCode = e.data.exitCode;
            }

            // eslint-disable-next-line no-console
            console.error(e.stack);
            process.exitCode = exitCode;
        }, 100);
    })
    .finally(() => {
        return cshc.disconnect();
    });
