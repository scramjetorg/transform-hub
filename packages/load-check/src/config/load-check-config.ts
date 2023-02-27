import { LoadCheckRequirements } from "@scramjet/types";
import { ReadOnlyConfig } from "@scramjet/utility";
import { InstanceRequirementsConfig } from "./instance-requirements-config";

export class LoadCheckConfig extends ReadOnlyConfig<LoadCheckRequirements> {
    get safeOperationLimit() { return this.configuration.safeOperationLimit; }
    get instanceRequirements() { return this.configuration.instanceRequirements; }

    protected validateEntry(key: string, value: any): boolean | null {
        return LoadCheckConfig.validateEntry(key, value);
    }

    static validateEntry(key: string, value: any): boolean | null {
        switch (key) {
            case "safeOperationLimit": {
                if (!Number.isInteger(value)) return false;
                return value >= 0;
            }
            case "instanceRequirements":
                return new InstanceRequirementsConfig(value).isValid();
            default:
                return null;
        }
    }
}
