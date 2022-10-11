import { InstanceRequirements } from "@scramjet/types";
import { ReadOnlyConfig } from "@scramjet/utility";


export class InstanceRequirementsConfig extends ReadOnlyConfig<InstanceRequirements> {

    get freeMem() { return this.configuration.freeMem; }
    get cpuLoad() { return this.configuration.cpuLoad; }
    get freeSpace() { return this.configuration.freeSpace; }

    protected validateEntry(key: string, value: any): boolean | null {
        switch (key) {
            case "freeMem": {
                if (!Number.isInteger(value)) return false;
                if (value < 0) return false;
                return true;
            }
            case "cpuLoad": {
                if (typeof value !== "number") return false;
                if (value < 0 || value > 100) return false;
                return true;
            }
            case "freeSpace": {
                if (!Number.isInteger(value)) return false;
                if (value < 0) return false;
                return true;
            }
            default:
                return null;
        }
    }
}
