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

        this.adapters = (await Promise.all(
            Object.keys(this.sthConfig.adapters).map(
                async (pkgName: string) => ({ name: pkgName, pkg: await import(pkgName) })
            )
        )).reduce((acc, pkg) => {
            if (!AdapterManager.validateAdapter(pkg.pkg)) {
                throw new Error(`Invalid adapter provided ${pkg.name}`);
            }

            if (acc[pkg.name]) throw new Error("Invalid adapters configuration, duplicated adapter name");

            acc[pkg.name] = pkg.pkg;

            return acc;
        }, {} as { [key: string]: IRuntimeAdapter });

        const adaptersCount = Object.keys(this.adapters).length;

        if (adaptersCount) {
            this.logger.info(`${adaptersCount} Adapters available:`, this.adapters);
        } else {
            this.logger.warn("No adapters defined. Sequences and Instances unsupported.");
        }
    }

    static validateAdapter(adapter: IRuntimeAdapter): boolean {
        return !!(adapter.name.trim() && ["SequenceAdapter", "InstanceAdapter"].every((className: string) => className in adapter));
    }

    async initAdapter(name: string): Promise<{ error?: string }> {
        const adapter = this.getAdapterByName(name);

        if (!adapter) {
            return { error: "Adapter not found." };
        }

        return await adapter.init();
    }

    getAdapterByName(name: string): IRuntimeAdapter | undefined {
        return Object.values(this.adapters).find(a => a.name === name);
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
