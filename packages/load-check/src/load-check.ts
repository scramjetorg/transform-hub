import { getLogger } from "@scramjet/logger";
import { IComponent, Logger, LoadCheckStat, LoadCheckConfig, LoadCheckContstants } from "@scramjet/types";
import { defer } from "@scramjet/utility";

import * as sysinfo from "systeminformation";
import { DataStream } from "scramjet";

const MB = 1024 * 1024;

export class LoadCheck implements IComponent {
    config: LoadCheckConfig;
    constants: LoadCheckContstants;

    logger: Logger = getLogger(this);

    constructor(config: LoadCheckConfig) {
        this.config = config;
        this.constants = {
            SAFE_OPERATION_LIMIT: this.config.safeOperationLimit * MB,
            MIN_INSTANCE_REQUIREMENTS: {
                freeMem: this.config.instanceRequirements.freeMem * MB,
                cpuLoad: this.config.instanceRequirements.cpuLoad,
                freeSpace: this.config.instanceRequirements.freeSpace * MB
            }
        };
    }
    async getLoadCheck(): Promise<LoadCheckStat> {
        const [load, disksInfo, memInfo] = await Promise.all([
            sysinfo.currentLoad(),
            sysinfo.fsSize(),
            sysinfo.mem()
        ]);

        return {
            avgLoad: load.avgLoad,
            currentLoad: load.currentLoad || 85,
            memFree: memInfo.free + Math.max(0, memInfo.buffcache - this.constants.SAFE_OPERATION_LIMIT),
            memUsed: memInfo.used,
            fsSize: disksInfo
        };
    }

    async overloaded(): Promise<boolean> {
        const isOverloaded = true;
        const check = await this.getLoadCheck();

        this.logger.log(check);

        const conditionsMet = {
            cpu: check.avgLoad < 100 - this.constants.MIN_INSTANCE_REQUIREMENTS.cpuLoad,
            mem: check.memFree > this.constants.MIN_INSTANCE_REQUIREMENTS.freeMem,
            dsk: check.fsSize[0].available > this.constants.MIN_INSTANCE_REQUIREMENTS.freeSpace
        };

        this.logger.log(conditionsMet);

        if (
            conditionsMet.cpu && conditionsMet.mem && conditionsMet.dsk
        ) {
            return false;
        }

        return isOverloaded;
    }

    async getLoadCheckStream(): Promise<any> {
        const safeOperationsLimit = this.constants.SAFE_OPERATION_LIMIT;

        return DataStream.from(
            async function*() {
                // eslint-disable-next-line no-constant-condition
                while (true) {
                    const [load, disksInfo, memInfo] = await Promise.all([
                        sysinfo.currentLoad(),
                        sysinfo.fsSize(),
                        sysinfo.mem()
                    ]);

                    yield {
                        avgLoad: load.avgLoad,
                        currentLoad: load.currentLoad || 85,
                        memFree: memInfo.free + Math.max(
                            0,
                            memInfo.buffcache - safeOperationsLimit
                        ),
                        memUsed: memInfo.used,
                        fsSize: disksInfo
                    };

                    await defer(1000);
                }
            }
        ).JSONStringify();
    }
}
