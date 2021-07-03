/* eslint-disable @typescript-eslint/no-unused-vars */
import { ReadStream } from "fs";
import { ClientError, ClientUtils } from "./client-utils";
import { SequenceClient } from "./sequence-client";
import { ClientProvider } from "./types/client-provider";

export class HostClient implements ClientProvider {
    apiBase: string;
    clientUtils: ClientUtils;

    constructor(apiBase: string, utils = new ClientUtils(apiBase)) {
        this.apiBase = apiBase.replace(/\/$/, "");

        this.clientUtils = utils;
    }

    listSequences() {
        return this.clientUtils.get("sequences");
    }

    listInstances() {
        return this.clientUtils.get("instances");
    }

    // TODO: Dedicated log stream for host not yet implemented.
    getLogStream() {
        return this.clientUtils.getStream("stream/log");
    }

    async sendSequence(sequencePackage: ReadStream): Promise<SequenceClient> {
        try {
            const response = await this.clientUtils.post("sequence", sequencePackage, {
                "content-type": "application/octet-stream"
            });

            return SequenceClient.from(response.data?.id, this);
        } catch (e) {
            throw new ClientError(1, e, "Sequence upload failed");
        }
    }

    getSequence(sequenceId: string) {
        return this.clientUtils.get(`sequence/${sequenceId}`);
    }

    async deleteSequence(sequenceId: string) {
        try {
            const response = await this.clientUtils.delete(`sequence/${sequenceId}`);

            return {
                data: response.data,
                status: response.status
            };
        } catch (e) {
            throw new ClientError(1, e, "Sequence delete failed");
        }
    }

    getInstance(instanceId: string) {
        return this.clientUtils.get(`instance/${instanceId}`);
    }

    getLoadCheck() {
        return this.clientUtils.get("load-check");
    }

    getVersion() {
        return this.clientUtils.get("version");
    }
}
