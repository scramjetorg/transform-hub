import { STHConfiguration } from "@scramjet/types";
import { HostOptions, startHost } from "@scramjet/host";

export class STH {
    config: STHConfiguration;

    constructor(config: STHConfiguration) {
        this.config = config;
    }

    start(options: HostOptions = {}) {
        startHost(
            {},
            this.config.host.socketPath,
            {
                identifyExisting: options.identifyExisting
            })
            .catch((e: Error & { exitCode?: number }) => {
                // eslint-disable-next-line no-console
                console.error(e.stack);
                process.exitCode = e.exitCode || 1;
                process.exit();
            });
    }
}
