import { OpResponse } from "@scramjet/types";

export type PostVerifyResponse = OpResponse<{
    allowed: boolean;
}>;

export type GetAccessKeysResponse = OpResponse<{
    accessKeys: {
        created: number;
        description: string;
    }[]
}>
