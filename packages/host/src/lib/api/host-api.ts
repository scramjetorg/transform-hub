import { APIExpose, OpResponse } from "@scramjet/types";
import { RestAPI2 } from "@scramjet/rest-api2";
import { ReasonPhrases } from "http-status-codes";

import { IHost } from "../types";
import { HostAPIV1Handler } from "./host-api-v1";
import { HostAPIV2Handler } from "./host-api-v2";

export {
    matchesRpcExposePath,
    normalizeRpcForwardPath,
    stripRpcExposePath
} from "./host-api-v1";

export class HostAPIHandler {
    private readonly v1: HostAPIV1Handler;

    constructor(
        private hostApi: APIExpose,
        private hostInstance: IHost,
        private hostVersion: string,
        build: string
    ) {
        this.v1 = new HostAPIV1Handler(hostApi, hostInstance, hostVersion, build);
    }

    attach() {
        this.v1.attach();
        this.attachV2Routes();
    }

    private attachV2Routes() {
        new HostAPIV2Handler(this.hostApi, this.hostInstance, this.hostVersion, {
            handleDeleteSequence: (req) => this.v1.handleDeleteSequence(req) as Promise<OpResponse<Record<string, unknown>>>,
            handleStartSequence: (req) => this.v1.handleStartSequence(req) as Promise<OpResponse<Record<string, unknown>>>,
            toRestOperation: (response, result) => this.toRestOperation(response, result),
        }).attach();
    }

    private toRestOperation<TOutput>(response: OpResponse<Record<string, unknown>>, result: TOutput): RestAPI2.OpResponse<TOutput> {
        const ok = response.opStatus === ReasonPhrases.OK || response.opStatus === ReasonPhrases.ACCEPTED;

        return {
            operation: {
                id: String((response as { id?: string }).id || response.opStatus),
                status: ok ? "completed" : "failed"
            },
            result: ok ? result : undefined,
            error: ok ? undefined : {
                code: String(response.opStatus || ReasonPhrases.INTERNAL_SERVER_ERROR),
                message: String((response as { error?: unknown }).error || response.opStatus)
            }
        };
    }
}
