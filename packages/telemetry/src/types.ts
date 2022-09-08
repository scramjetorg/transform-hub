import { ObjLogger } from "@scramjet/obj-logger";
import { TelemetryAdaptersConfig } from "@scramjet/types";

export type logLevel = "debug" | "info" | "warn" | "error";

export interface ITelemetryAdapter {
    logger: ObjLogger;
    push(level: logLevel, payload: { message: string, labels?: { [key: string]: string }}): void;
}

export type TelemetryAdapter = {
    new (config: TelemetryAdaptersConfig): ITelemetryAdapter
}
