import {
    ApiClientTransport,
    RouteManifest,
    createApiClient,
    createHttpClientTransport,
    createVerser2ClientTransport
} from "@scramjet/api-router";

import { RestAPI2 } from "./contracts";

export type RestAPI2ClientOptions = {
    manifest: RouteManifest;
    transport: ApiClientTransport;
};

export function createRestAPI2Client({ manifest, transport }: RestAPI2ClientOptions): RestAPI2.Client {
    const client = createApiClient(manifest, transport);

    return {
        async request<TBody = unknown, TOperation extends RestAPI2.OperationId = RestAPI2.OperationId>(request: RestAPI2.ClientRequest<TOperation>) {
            const response = await client.request<TBody>(request.operationId, request);

            return {
                operationId: request.operationId,
                ...response
            };
        }
    };
}

export { createHttpClientTransport, createVerser2ClientTransport };
export type { ApiClientTransport };
