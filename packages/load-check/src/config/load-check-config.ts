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
                console.log('DWA:', typeof(value), value)
                if (!Number.isInteger(value)) return false;
                if (value < 0) return false;
                return true;
            }
            case "instanceRequirements":
                return new InstanceRequirementsConfig(value).isValid();
            default:
                return null;
        }
    }
}
