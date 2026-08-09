import { ApiClientRequest, ApiClientResponse, ApiClientTransport } from "../../src";

export class ClientRequestProbeError extends Error {}

export type ClientRequestProbe = {
    readonly count: number;
    transport: ApiClientTransport;
    assertUsed(): void;
    assertNotUsed(): void;
};

export function createClientRequestProbe(transport: ApiClientTransport): ClientRequestProbe {
    let count = 0;

    return {
        get count() {
            return count;
        },
        transport: {
            async request<T = unknown>(request: ApiClientRequest): Promise<ApiClientResponse<T>> {
                count++;

                return transport.request<T>(request);
            }
        },
        assertUsed() {
            if (count === 0) {
                throw new ClientRequestProbeError("Expected API client request, but none was recorded");
            }
        },
        assertNotUsed() {
            if (count > 0) {
                throw new ClientRequestProbeError(`Expected no API client requests, but recorded ${count}`);
            }
        }
    };
}
