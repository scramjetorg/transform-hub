import { OpResponse } from "../rest-api-multi-manager";

export type PostDisconnectPayload = {
    limit?: number;
    accessKey?: string;
}

export type PostDisconnectResponse = OpResponse<{
    managerId: string;
    disconnected: {
        sthId: string;
        reason: string;
    }[];
}>;
