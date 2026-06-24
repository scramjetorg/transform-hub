/**
 * Instance resource limits.
 *
 * Simplified structural copy from the old types package/instance-limits.ts.
 */

export type InstanceLimits = {
    memory?: number;
    gpu?: boolean;
};
