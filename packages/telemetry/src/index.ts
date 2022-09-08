import { TelemetryAdaptersConfig } from "@scramjet/types";
import { ITelemetryAdapter } from "./types";

const adapters = new Map<string, string>([
    ["loki", "./adapters/loki"]
]);

export const getTelemetryAdapter =
    async (adapter: string, config: TelemetryAdaptersConfig): Promise<ITelemetryAdapter> => {
        const _adapterLocation = adapters.get(adapter);

        if (_adapterLocation) {
            return new (await import(_adapterLocation)).default(config);
        }

        throw new Error("Unknown telemetry adapter requested");
    };

export * from "./types";
