import { InstanceClient, HostClient } from "@scramjet/api-client";
import { Command } from "commander";
import { displayEntity } from "./output";

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
export const getInstance = (program: Command, id: string) => InstanceClient.from(id, getHostClient(program));
export const attachStdio = (program: Command, instance: InstanceClient) => {
    return displayEntity(
        program,
        Promise.all([
            instance.sendStdin(process.stdin),
            instance.getStream("stdout").then(out => out.data?.pipe(process.stdout)),
            instance.getStream("stderr").then(err => err.data?.pipe(process.stderr))
        ]).then(() => undefined)
    );
};
