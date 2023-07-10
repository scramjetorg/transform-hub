import { ObjLogger } from "@scramjet/obj-logger";
import { IRuntimeAdapter, InstanceRequirements, STHConfiguration } from "@scramjet/types";

export type InitializedRuntimeAdapter = IRuntimeAdapter & {
    pkgName: string;
    status: "ready" | { error?: string };
};

export class AdapterManager {
    adapters: { [key: string]: InitializedRuntimeAdapter } = {};
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
        this.logger.info("Loading adapters...", Object.keys(this.sthConfig.adapters));

        await Promise.all(
            Object.keys(this.sthConfig.adapters).map(
                async (pkgName) => {
                    const typedPkgName = pkgName as unknown as keyof STHConfiguration["adapters"];
                    const config = this.sthConfig.adapters[typedPkgName]!;

                    const adapter = Object.assign(
                        new (await import(pkgName)).default(config),
                        { pkgName }
                    ) as InitializedRuntimeAdapter;

                    if (!AdapterManager.validateAdapter(adapter)) {
                        throw new Error(`Invalid adapter provided ${adapter.pkgName}`);
                    }

                    adapter.config = config;
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

            return true;
        }

        this.logger.warn("No adapters defined. Sequences and Instances unsupported.");

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
     * @param {string} pkgName Adapter package name.
     * @returns {IRuntimeAdapter} Adapter
     */
    getAdapterByName(pkgName: string): InitializedRuntimeAdapter | undefined {
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
