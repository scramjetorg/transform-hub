import { getLogger } from "@scramjet/logger";
import { IComponent, Logger } from "@scramjet/types";
import { defer, LoadCheckStat } from "@scramjet/model";

import * as sysinfo from "systeminformation";
import { configService } from "@scramjet/sth-config";
import { DataStream } from "scramjet";

const { safeOperationLimit, instanceRequirements } = configService.getConfig();
const MB = 1024 * 1024;
const SAFE_OPERATION_LIMIT = safeOperationLimit * MB;
const MIN_INSTANCE_REQUIREMENTS = {
    freeMem: instanceRequirements.freeMem * MB,
    cpuLoad: instanceRequirements.cpuLoad,
    freeSpace: instanceRequirements.freeSpace * MB
};

class LoadCheck implements IComponent {
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
            memFree: memInfo.free + Math.max(0, memInfo.buffcache - SAFE_OPERATION_LIMIT),
            memUsed: memInfo.used,
            fsSize: disksInfo
        };
    }

    async overloaded(): Promise<boolean> {
        const isOverloaded = true;
        const check = await this.getLoadCheck();

        this.logger.log(check);

        const conditionsMet = {
            cpu: check.avgLoad < 100 - MIN_INSTANCE_REQUIREMENTS.cpuLoad,
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

    async getLoadCheckStream(): Promise<DataStream> {
        const [load, disksInfo, memInfo] = await Promise.all([
            sysinfo.currentLoad(),
            sysinfo.fsSize(),
            sysinfo.mem()
        ]);

        return DataStream.from(
            async function*(){
                // eslint-disable-next-line no-constant-condition
                while (true) {
                    await defer(1000);
                    yield {
                        avgLoad: load.avgLoad,
                        currentLoad: load.currentLoad || 85,
                        memFree: memInfo.free + Math.max(0, memInfo.buffcache - SAFE_OPERATION_LIMIT),
                        memUsed: memInfo.used,
                        fsSize: disksInfo
                    };
                }
            }
        );
    }
}

export const loadCheck = new LoadCheck();
