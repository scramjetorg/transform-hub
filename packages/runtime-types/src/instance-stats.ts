/**
 * Instance runtime statistics.
 *
 * Simplified structural copy from the old types package/instance-stats.ts.
 */

import { InstanceLimits } from "./instance-limits";

export type InstanceStats = {
    limits: InstanceLimits;
    current: {
        memory?: number;
        cpu?: number;
    };
};
