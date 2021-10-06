import { Readable } from "stream";
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
        return this.client.get("sequences");
    }

    async listInstances() {
        return this.client.get("instances");
    }

    async getLogStream() {
        return this.client.getStream("log");
    }

    async sendSequence(sequencePackage: Readable): Promise<SequenceClient> {
        const response = await this.client.sendStream("sequence", sequencePackage, { parseResponse: "json" });

        return SequenceClient.from(response.data?.id, this);
    }

    async getSequence(sequenceId: string) {
        return this.client.get(`sequence/${sequenceId}`);
    }

    async deleteSequence(sequenceId: string) {
        const response = await this.client.delete(`sequence/${sequenceId}`);

        return {
            data: response.data,
            status: response.status
        };
    }

    // REVIEW: move this to InstanceClient..getInfo()?
    async getInstanceInfo(instanceId: string) {
        return this.client.get(`instance/${instanceId}`);
    }

    async getLoadCheck() {
        return this.client.get("load-check");
    }

    async getVersion() {
        return this.client.get("version");
    }

    async sendNamedData(topic: string, stream: Readable, contentType?: string, end?: boolean) {
        return this.client.sendStream(`topic/${topic}`, stream, { type: contentType, end: end });
    }

    async getNamedData(topic: string) {
        return this.client.getStream(`topic/${topic}`);
    }
}

