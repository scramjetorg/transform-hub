import { HostClient } from "@scramjet/api-client";
import { Command } from "commander";

let hostClient: HostClient;

export const getHostClient = (program: Command) => {
    if (hostClient) return hostClient;

    hostClient = new HostClient(program.opts().apiUrl);

    if (program.opts().log)
        hostClient.client.addLogger({
            ok(result) {
                const {
                    status, statusText, config: { url, method }
                } = result;

                // eslint-disable-next-line no-console
                console.error("Request ok:", method, url, `status: ${status} ${statusText}`);
            },
            error(result) {
                const { status, statusText } = result.response || {};
                const { url, method } = result.config;

                // eslint-disable-next-line no-console
                console.error("Request failed:", method, url, `status: ${status} ${statusText}`);
            }
        });
    return hostClient;
};
