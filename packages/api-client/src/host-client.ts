/* eslint-disable @typescript-eslint/no-unused-vars */
import { SequenceClient } from "./sequence-client";
import { clientUtils } from "./utils";

export class HostClient {
    apiBase: string = "http://localhost:8000/api/v1";

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

    async sendSequence(sequencePackage: Buffer) {
        const sequenceId = (await clientUtils.post(`${this.apiBase}/sequence`, sequencePackage, {
            "content-type":"application/octet-stream"
        })).data.id;

        return new SequenceClient(sequenceId);
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
