import { getLogger } from "@scramjet/logger";
import { IComponent, Logger } from "@scramjet/types";
import { LoadCheckStat } from "@scramjet/model";

const sysinfo = require("systeminformation");

export class FakeLoadCheck implements IComponent {

    logger: Logger;

    constructor() {

        this.logger = getLogger(this);
    }

    getLoadCheck(): LoadCheckStat {

        sysinfo.fsSize().then((data: any) => console.log(data));

        sysinfo.currentLoad().then((data: any) => console.log(data));

        sysinfo.mem().then((data: any) => console.log(data));

        return {

            avgLoad: 0,

            currentLoad: 0,

            memFree: 0,

            memUsed: 0,

            fsSize: []
        };
    }
}
