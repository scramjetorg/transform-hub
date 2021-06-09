/* eslint-disable @typescript-eslint/no-unused-vars */
import { SequenceClient } from "./sequence-client";
import { clientUtils } from "./client-utils";

export class HostClient {
    apiBase: string;

    constructor(apiBase: string) {
        this.apiBase = apiBase;
    }

    listSequences() {
        return clientUtils.get(`${this.apiBase}/sequences`);
    }

    listInstances() {
        return clientUtils.get(`${this.apiBase}/instances`);
    }

    // TODO: Dedicated log stream for host not yet implemented.
    getLogStream() {
        return clientUtils.getStream(`${this.apiBase}/log`);
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
        return clientUtils.get(`${this.apiBase}/sequence/${sequenceId}`);
    }

    deleteSequence(sequenceId: string) {
        return clientUtils.delete(`${this.apiBase}/sequence/${sequenceId}`);
    }

    getInstance(instanceId: string) {
        return clientUtils.get(`${this.apiBase}/instance/${instanceId}`);
    }

    getLoadCheck() {
        return clientUtils.get(`${this.apiBase}/load-check`);
    }
}
