import { ObjLogger } from "@scramjet/obj-logger";
import { IRuntimeAdapter, InstanceRequirements, STHConfiguration } from "@scramjet/types";

export class AdapterManager {
    adapters: { [key: string]: IRuntimeAdapter } = {};
    sthConfig: STHConfiguration;

    logger = new ObjLogger(this);

    constructor(sthConfig: STHConfiguration) {
        this.sthConfig = sthConfig;
    }

    async init() {
        this.logger.info("Loading adapters...", Object.keys(this.sthConfig.adapters));

        await Promise.all(
            Object.keys(this.sthConfig.adapters).map(
                async (pkgName: string) => {
                    const adapter = Object.assign(await import(pkgName), { pkgName }) as IRuntimeAdapter;

                    if (!AdapterManager.validateAdapter(adapter)) {
                        throw new Error(`Invalid adapter provided ${adapter.pkgName}`);
                    }

                    console.log(adapter);

                    adapter.status = await this.initAdapter(adapter);

                    if (adapter.status !== "ready") {
                        this.logger.warn(`Failed to initialize "${adapter.pkgName}" Adapter: ${adapter.status.error}`);
                    }

                    if (this.adapters[adapter.pkgName]) throw new Error("Invalid adapters configuration, duplicated adapter name");
                    this.adapters[adapter.pkgName] = adapter;
                }
            )
        );

        const adaptersCount = Object.keys(this.adapters).length;

        if (adaptersCount) {
            this.logger.info(`${adaptersCount} Adapters available:`, this.adapters);
        } else {
            this.logger.warn("No adapters defined. Sequences and Instances unsupported.");
        }
    }

    static validateAdapter(adapter: IRuntimeAdapter): boolean {
        return !!(adapter.name.trim() && ["SequenceAdapter", "InstanceAdapter", "init"].every((className: string) => className in adapter));
    }

    async initAdapter(adapter: IRuntimeAdapter): Promise<{ error?: string } | "ready"> {
        const initResult = await adapter.init();
        return initResult.error ? initResult : Promise.resolve("ready");
    }

    getAdapterByName(pkgName: string): IRuntimeAdapter | undefined {
        return Object.values(this.adapters).find(a => a.pkgName === pkgName);
    }

    getDefaultAdapter(prefferedAdapter: string) {
        if (prefferedAdapter === "detect") {
            return Object.values(this.adapters).filter(adapter => adapter.status === "ready")[0];
        }

        return Object.values(this.adapters).find(a => a.name === prefferedAdapter);
    }

    /**
     * Returns available adapter for desired prerequesities.
     * @param _prerequesities Prerequesities
     * @returns IRuntimeAdapter
     */
    getAvailableAdapter(_prerequesities: {
        requirements?: InstanceRequirements, adapterName?: string
    } = {}): IRuntimeAdapter | undefined {
        if (_prerequesities.adapterName) {
            return this.getAdapterByName(_prerequesities.adapterName);
        }

        return Object.values(this.adapters)[0];
    }
}
