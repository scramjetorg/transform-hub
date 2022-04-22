import { STHConfiguration } from "@scramjet/types";
import { Host, startHost } from "@scramjet/host";

export class STH {
    config: STHConfiguration;
    host?: Host;

    constructor(config: STHConfiguration) {
        this.config = config;
    }

    async start(): Promise<Host> {
        this.host = await startHost(
            {},
            this.config
        )
            .catch((e: Error & { exitCode?: number }) => {
                // eslint-disable-next-line no-console
                console.error(e.stack);
                process.exitCode = e.exitCode || 1;
                process.exit();
            });

        return this.host;
    }

    async stop() {
        return this.host?.stop();
    }
}
