/* eslint-disable @typescript-eslint/no-unused-vars */
import { ReadStream } from "fs";
import { ClientError, ClientUtils } from "./client-utils";
import { SequenceClient } from "./sequence-client";
import { ClientProvider } from "./types";

export class HostClient implements ClientProvider {
    apiBase: string;
    client: ClientUtils;

    constructor(apiBase: string, utils = new ClientUtils(apiBase)) {
        this.apiBase = apiBase.replace(/\/$/, "");

        this.client = utils;
    }

    listSequences() {
        return this.client.get("sequences");
    }

    listInstances() {
        return this.client.get("instances");
    }

    // TODO: Dedicated log stream for host not yet implemented.
    getLogStream() {
        return this.client.getStream("stream/log");
    }

    async sendSequence(sequencePackage: ReadStream): Promise<SequenceClient> {
        try {
            const response = await this.client.post("sequence", sequencePackage, {
                "content-type": "application/octet-stream"
            });

            return SequenceClient.from(response.data?.id, this);
        } catch (e) {
            throw new ClientError(1, e, "Sequence upload failed");
        }
    }

    getSequence(sequenceId: string) {
        return this.client.get(`sequence/${sequenceId}`);
    }

    async deleteSequence(sequenceId: string) {
        try {
            const response = await this.client.delete(`sequence/${sequenceId}`);

            return {
                data: response.data,
                status: response.status
            };
        } catch (e) {
            throw new ClientError(1, e, "Sequence delete failed");
        }
    }

    getInstance(instanceId: string) {
        return this.client.get(`instance/${instanceId}`);
    }

    getLoadCheck() {
        return this.client.get("load-check");
    }

    getVersion() {
        return this.client.get("version");
    }
}
