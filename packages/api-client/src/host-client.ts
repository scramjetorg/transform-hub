/* eslint-disable @typescript-eslint/no-unused-vars */
import { ReadStream } from "fs";
import { ClientUtils } from "./client-utils";
import { SequenceClient } from "./sequence-client";
import { ClientProvider } from "./types";

export class HostClient implements ClientProvider {
    apiBase: string;
    client: ClientUtils;

    constructor(apiBase: string, utils = new ClientUtils(apiBase)) {
        this.apiBase = apiBase.replace(/\/$/, "");

        this.client = utils;
    }

    async listSequences() {
        return await this.client.get("sequences");
    }

    async listInstances() {
        return await this.client.get("instances");
    }

    // TODO: Dedicated log stream for host not yet implemented.
    async getLogStream() {
        return await this.client.getStream("stream/log");
    }

    async sendSequence(sequencePackage: ReadStream): Promise<SequenceClient> {
        const response = await this.client.post("sequence", sequencePackage, {
            "content-type": "application/octet-stream"
        });

        return SequenceClient.from(response.data?.id, this);
    }

    async getSequence(sequenceId: string) {
        return await this.client.get(`sequence/${sequenceId}`);
    }

    async deleteSequence(sequenceId: string) {
        const response = await this.client.delete(`sequence/${sequenceId}`);

        return {
            data: response.data,
            status: response.status
        };
    }

    async getInstance(instanceId: string) {
        return this.client.get(`instance/${instanceId}`);
    }

    async getLoadCheck() {
        return this.client.get("load-check");
    }

    async getVersion() {
        return this.client.get("version");
    }
}
