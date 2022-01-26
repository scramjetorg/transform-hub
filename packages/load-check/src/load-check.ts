import { ObjLogger } from "@scramjet/obj-logger";
import { IComponent, LoadCheckStat, LoadCheckConfig, LoadCheckContstants } from "@scramjet/types";
import { defer } from "@scramjet/utility";

import sysinfo from "systeminformation";
import { DataStream, StringStream } from "scramjet";

const MB = 1024 * 1024;

/**
 * Provides methods to monitor resources usage and determine if machine is not overloaded.
 */
export class LoadCheck implements IComponent {
    /**
     * Congiguration object with requirements to determine if machine is overloaded.
     *
     * @type {LoadCheckConfig}
     */
    config: LoadCheckConfig;

    /**
     * Values calculated from configuration indicating minimum requirements.
     *
     * @type {LoadCheckContstants}
     */
    constants: LoadCheckContstants;

    /**
     * Logger instance.
     *
     * @type {IObjectLogger}
     */
    logger: ObjLogger = new ObjLogger(this);

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

    /**
     * Gathers various resources usage and returns it as a {@link LoadCheckStat} object.
     *
     * @returns {Promise<LoadCheckStat>} Promise resolving to gathered load check data.
     */
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

    /**
     * Compares current load check data with the requirements to determine if machine is overloaded.
     *
     * @returns {boolean} True if machine is overloaded, false otherwise.
     */
    async overloaded(): Promise<boolean> {
        const check = await this.getLoadCheck();

        this.logger.trace("Load Check", check);

        const conditionsMet = {
            cpu: check.avgLoad < 100 - this.constants.MIN_INSTANCE_REQUIREMENTS.cpuLoad,
            mem: check.memFree > this.constants.MIN_INSTANCE_REQUIREMENTS.freeMem,
            dsk: check.fsSize[0].available > this.constants.MIN_INSTANCE_REQUIREMENTS.freeSpace
        };

        this.logger.trace("Contidions", conditionsMet);

        return !(conditionsMet.cpu && conditionsMet.mem && conditionsMet.dsk);
    }

    /**
     * Creates and returns a stream of load check data.
     * Load check data is emitted every second.
     *
     * @returns {DataStream} Stream with load check data.
     */
    getLoadCheckStream(): StringStream {
        const safeOperationsLimit = this.constants.SAFE_OPERATION_LIMIT;

        return DataStream.from(
            async function*() {
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
