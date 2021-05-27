import { getLogger } from "@scramjet/logger";
import { IComponent, Logger } from "@scramjet/types";
import { LoadCheckStat } from "@scramjet/model";

import * as sysinfo from "systeminformation";

const MB = 1024 * 1024;
const MIN_INSTANCE_REQUIREMENTS = {
    freeMem: 256 * MB,
    cpuLoad: 10,
    freeSpace: 128 * MB
};

class FakeLoadCheck implements IComponent {
    logger: Logger = getLogger(this);

    async getLoadCheck(): Promise<LoadCheckStat> {
        const [load, disksInfo, memInfo] = await Promise.all([
            sysinfo.currentLoad(),
            sysinfo.fsSize(),
            sysinfo.mem()
        ]);

        return {
            avgLoad: load.avgLoad,
            currentLoad: load.currentLoad || 85,
            memFree: memInfo.free,
            memUsed: memInfo.used,
            fsSize: disksInfo
        };
    }

    async overloaded(): Promise<boolean> {
        const isOverloaded = true;
        const check = await this.getLoadCheck();

        this.logger.log(check);

        const conditionsMet = {
            cpu: check.currentLoad < 100 - MIN_INSTANCE_REQUIREMENTS.cpuLoad,
            mem: check.memFree > MIN_INSTANCE_REQUIREMENTS.freeMem,
            dsk: check.fsSize[0].available > MIN_INSTANCE_REQUIREMENTS.freeSpace
        };

        this.logger.log(conditionsMet);

        if (
            conditionsMet.cpu && conditionsMet.mem && conditionsMet.dsk
        ) {
            return false;
        }

        return isOverloaded;
    }
}

export const fakeLoadCheck = new FakeLoadCheck();
