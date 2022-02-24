import { ClientError, HttpClient } from "@scramjet/client-utils";

export type SendStreamOptions = Partial<{
    type: string;
    end: boolean;
    parseResponse?: "json" | "text";
}>;

export type Headers = {
    [key: string]: string;
};

export type RequestLogger = {
    request: (...req: any) => void;
    ok: (res: any) => void;
    error: (res: ClientError) => void;
};

export type PostRequestConfig = {
    parseResponse?: "json" | "text";
    json?: boolean;
};

export interface ClientProvider {
    client: HttpClient;
}
