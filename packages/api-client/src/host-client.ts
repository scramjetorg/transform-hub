/* eslint-disable @typescript-eslint/no-unused-vars */
import { ReadStream } from "fs";
import { ClientError, clientUtils } from "./client-utils";
import { SequenceClient } from "./sequence-client";

export class HostClient {
    apiBase: string;

    constructor(apiBase: string) {
        this.apiBase = apiBase.replace(/\/$/, "");
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
        return clientUtils.getStream("stream/log");
    }

    async sendSequence(sequencePackage: ReadStream): Promise<SequenceClient> {
        try {
            const response = await clientUtils.post("sequence", sequencePackage, {
                "content-type": "application/octet-stream"
            });

            return SequenceClient.from(response.data?.id);
        } catch (e) {
            throw new ClientError(1, e, "Sequence upload failed");
        }
    }

    getSequence(sequenceId: string) {
        return clientUtils.get(`sequence/${sequenceId}`);
    }

    async deleteSequence(sequenceId: string) {
        try {
            const response = await clientUtils.delete(`sequence/${sequenceId}`);

            return {
                data: response.data,
                status: response.status
            };
        } catch(e) {
            throw new ClientError(1, e, "Sequence delete failed");
        }
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
