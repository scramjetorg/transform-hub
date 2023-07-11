import { ObjLogger } from "@scramjet/obj-logger";
import { IRuntimeAdapter, InstanceRequirements, STHConfiguration } from "@scramjet/types";

export type InitializedRuntimeAdapter = IRuntimeAdapter & {
    moduleName: string;
    status: "ready" | { error?: string };
};

export type AdaptersStore = { [key: string]: InitializedRuntimeAdapter };

export class AdapterManager {
    adapters: AdaptersStore = {};
    sthConfig: STHConfiguration;

    logger = new ObjLogger(this);

    constructor(sthConfig: STHConfiguration) {
        this.sthConfig = sthConfig;
    }

    /**
     * Initializes all configured adapters.
     *
     * @returns True if any adapter is available. False otherwise.
     */
    async init(): Promise<boolean> {
        if (!this.sthConfig.adapters) {
            this.logger.info("No config for Runtime Adapters");

            return false;
        }

        const moduleNames = Object.keys(this.sthConfig.adapters);

        this.logger.info("Loading Runtime Adapters...", moduleNames);

        this.adapters = await Promise.all(
            moduleNames.map(
                async (moduleName) => {
                    const typedModuleName = moduleName as unknown as keyof STHConfiguration["adapters"];
                    const config = this.sthConfig.adapters[typedModuleName]!;

                    const adapter = Object.assign(
                        new (await import(moduleName)).default(config),
                        { moduleName }
                    ) as InitializedRuntimeAdapter;

                    if (!AdapterManager.validateAdapter(adapter)) {
                        throw new Error(`Invalid Runtime Adapter provided ${adapter.moduleName}`);
                    }

                    adapter.config = config;
                    adapter.status = await this.initAdapter(adapter);

                    if (adapter.status !== "ready") {
                        this.logger.warn(`Failed to initialize "${adapter.moduleName}" Adapter: ${adapter.status.error}`);
                    }

                    if (this.adapters[adapter.moduleName]) {
                        throw new Error("Invalid Runtime Adapters configuration, duplicated Runtime Adapter name");
                    }

                    return adapter;
                }
            )
        ).then((adapterList) =>
            adapterList.reduce((a: AdaptersStore, c) => { a[c.moduleName] = c; return a; }, {})
        );

        const adaptersCount = Object.keys(this.adapters).length;

        if (adaptersCount) {
            this.logger.info(`${adaptersCount} Runtime Adapters available:`, this.adapters);

            return true;
        }

        this.logger.warn("No Runtime Adapters defined. Sequences and Instances unsupported.");

        return false;
    }

    /**
     * Validates adapter.
     *
     * @param {IRuntimeAdapter} adapter Checks if adapter provides required fields.
     * @returns {boolean} True if required fields are available.
     */
    static validateAdapter(adapter: IRuntimeAdapter): boolean {
        return !!(adapter.name?.trim() && ["sequenceAdapter", "instanceAdapter", "init"].every((className: string) => className in adapter));
    }

    /**
     * Initializes adapter with adapter config.
     *
     * @param {IRuntimeAdapter} adapter Adapter to initialize
     * @returns Object with error field if initialization failed, "ready" otherwise.
     */
    async initAdapter(adapter: IRuntimeAdapter): Promise<{ error?: string } | "ready"> {
        const initResult = await adapter.init();

        return initResult.error ? initResult : Promise.resolve("ready");
    }

    /**
     * Returns Adapter by given package name.
     *
     * @param {string} moduleName Adapter package name.
     * @returns {IRuntimeAdapter} Adapter
     */
    getAdapterByName(moduleName: string): InitializedRuntimeAdapter | undefined {
        return Object.values(this.adapters).find(a => a.moduleName === moduleName);
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
