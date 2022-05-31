import { ObjLogger } from "@scramjet/obj-logger";
import { IComponent, LoadCheckStat, LoadCheckRequirements, LoadCheckContstants } from "@scramjet/types";
import { defer } from "@scramjet/utility";

import { DataStream, StringStream } from "scramjet";
import { LoadCheckConfig } from "./config/load-check-config";
import { loadavg } from "os";

import _du from "diskusage-ng";
import { promisify } from "util";
import { mem } from "node-os-utils";

const MEBIBYTE = 1024 * 1024;
const du = promisify(_du);

/**
 * Provides methods to monitor resources usage and determine if machine is not overloaded.
 */
export class LoadCheck implements IComponent {
    /**
     * Configuration object with requirements to determine if machine is overloaded.
     *
     * @type {LoadCheckRequirements}
     */
    config: LoadCheckRequirements;

    /**
     * Values calculated from configuration indicating minimum requirements.
     *
     * @type {LoadCheckContstants}
     */
    constants: LoadCheckContstants;

    /**
     * Logger Instance.
     *
     * @type {IObjectLogger}
     */
    logger: ObjLogger = new ObjLogger(this);

    constructor(config: LoadCheckConfig) {
        if (!config.isValid()) throw new Error("Invalid load-check configuration");
        this.config = config.get();
        this.constants = {
            SAFE_OPERATION_LIMIT: this.config.safeOperationLimit * MEBIBYTE,
            MIN_INSTANCE_REQUIREMENTS: {
                freeMem: this.config.instanceRequirements.freeMem * MEBIBYTE,
                cpuLoad: this.config.instanceRequirements.cpuLoad,
                freeSpace: this.config.instanceRequirements.freeSpace * MEBIBYTE
            }
        };
    }

    /**
     * Gathers various resources usage and returns it as a {@link LoadCheckStat} object.
     *
     * @returns {Promise<LoadCheckStat>} Promise resolving to gathered load check data.
     */
    async getLoadCheck(): Promise<LoadCheckStat> {
        const safeOperationsLimit = this.constants.SAFE_OPERATION_LIMIT;

        const [currentLoad = 85, , avgLoad] = loadavg();

        const [usage, _fsSize] = await Promise.all([
            mem.info(),
            Promise.all(this.config.fsPaths.map(async (path) => ({ path, usage: await du(path) })))
        ]);

        const memFree = (usage.totalMemMb - usage.usedMemMb) * MEBIBYTE;
        const memUsed = usage.usedMemMb * MEBIBYTE;

        const fsSize = _fsSize.map(({ path, usage: fsUsage }) => ({
            fs: path,
            available: fsUsage.available - safeOperationsLimit,
            size: fsUsage.total,
            used: fsUsage.used,
            use: fsUsage.used / fsUsage.total
        }));

        return {
            avgLoad,
            currentLoad,
            memFree,
            memUsed,
            fsSize
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

        this.logger.trace("Conditions", conditionsMet);

        return !(conditionsMet.cpu && conditionsMet.mem && conditionsMet.dsk);
    }

    /**
     * Creates and returns a stream of load check data.
     * Load check data is emitted every second.
     *
     * @returns {DataStream} Stream with load check data.
     */
    getLoadCheckStream(): StringStream {
        const _this = this;

        return DataStream.from(
            async function*() {
                while (true) {
                    yield _this.getLoadCheck();

                    await defer(1000);
                }
            }
        ).JSONStringify();
    }
}
