/**
 * Telemetry configuration types.
 *
 * Simplified structural copies from @scramjet/types/telemetry-config.ts.
 */

export type TelemetryAdaptersConfig = {
    loki?: {
        host: string;
        replaceTimestamp: boolean;
        interval?: number;
        labels: { [key: string]: string };
    };
};
