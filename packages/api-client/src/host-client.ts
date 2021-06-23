/* eslint-disable @typescript-eslint/no-unused-vars */
import { SequenceClient } from "./sequence-client";
import { clientUtils } from "./client-utils";
import { ReadStream } from "fs";
import { AxiosError } from "axios";

export class HostClient {
    apiBase: string;

    constructor(apiBase: string) {
        this.apiBase = apiBase;
        clientUtils.init(apiBase);
    }

    listSequences() {
        return clientUtils.get("sequences");
    }

    listInstances() {
        return clientUtils.get("instances");
    }

    // TODO: Dedicated log stream for host not yet implemented.
    getLogStream() {
        return clientUtils.getStream("log");
    }

    async sendSequence(sequencePackage: ReadStream): Promise<SequenceClient> {
        const response = await clientUtils.post("sequence", sequencePackage, {
            "content-type": "application/octet-stream"
        }).catch((error: AxiosError) => {
            return {
                ...error.response
            };
        });

        if (response.data?.error || !response.data?.id) {
            console.error(response.data?.error);
            throw new Error("Sequence upload failed");
        }

        return SequenceClient.from(response.data?.id);
    }

    getSequence(sequenceId: string) {
        return clientUtils.get(`sequence/${sequenceId}`);
    }

    deleteSequence(sequenceId: string) {
        return clientUtils.delete(`sequence/${sequenceId}`);
    }

    getInstance(instanceId: string) {
        return clientUtils.get(`instance/${instanceId}`);
    }

    getLoadCheck() {
        return clientUtils.get("load-check");
    }

    getVersion() {
        return clientUtils.get("version");
    }
}
