import { InstanceLimits } from "./instance-limits";

export type InstanceStats = {
    limits: InstanceLimits;
    current: {
        memory?: number;
        cpu?: number;
    }
}
