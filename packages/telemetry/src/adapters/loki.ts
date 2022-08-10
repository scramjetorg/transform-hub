
import { ObjLogger } from "@scramjet/obj-logger";
import { TelemetryAdaptersConfig } from "@scramjet/types";
import winston, { createLogger } from "winston";
import LokiTransport from "winston-loki";
import { ITelemetryAdapter, logLevel } from "../types";

export default class LokiAdapter implements ITelemetryAdapter {
    config: TelemetryAdaptersConfig["loki"];
    winstonLogger: winston.Logger;
    logger = new ObjLogger(this);

    validateConfig(config: TelemetryAdaptersConfig["loki"]) {
        if (!config || !config.host) {
            throw new Error("Invalid Loki Adapter Configuration");
        }
    }

    constructor(config: TelemetryAdaptersConfig) {
        this.validateConfig(config.loki);

        this.config = config.loki!;

        this.winstonLogger = createLogger({
            transports: [
                new LokiTransport({
                    ...this.config,
                    replaceTimestamp: true,
                })
            ]
        });

        this.logger.info("Telemetry Adapter created", config);
    }

    push(level: logLevel, { message, labels }: { message: string, labels: { [ key: string ]: string } }): void {
        this.logger.debug("Pushing", [message, labels]);
        this.winstonLogger[level]({ message, labels });
    }
}
