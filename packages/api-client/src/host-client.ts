/* eslint-disable @typescript-eslint/no-unused-vars */
import { SequenceClient } from "./sequence-client";
import { clientUtils } from "./client-utils";

export class HostClient {
    apiBase: string;

    constructor(apiBase: string) {
        this.apiBase = apiBase;
    }

    listSequences() {
        throw new Error("Method not implemented");
    }

    listInstances() {
        throw new Error("Method not implemented");
    }

    getLogStream() {
        throw new Error("Method not implemented");
    }

    async sendSequence(sequencePackage: Buffer): Promise<SequenceClient | undefined> {
        const response = await clientUtils.post(`${this.apiBase}/sequence`, sequencePackage, {
            "content-type":"application/octet-stream"
        });

        if (response) {
            return new SequenceClient(response.data.id, { apiBase: this.apiBase });
        }
        return undefined;

    }

    getSequence(sequenceId: string) {
        throw new Error("Method not implemented");
    }

    deleteSequence(sequenceId: string) {
        throw new Error("Method not implemented");
    }

    getInstance(instanceId: string) {
        throw new Error("Method not implemented");
    }
}
