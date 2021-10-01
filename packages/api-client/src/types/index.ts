import fetch, { Response as FetchResponse } from "node-fetch";
import { Stream } from "stream";
import { ClientError } from "../client-error";

export type Response = {
    data?: { [key: string]: any };
    status: number | undefined;
};

export type ResponseStream = {
    data?: Stream;
    status: number | undefined;
};

export type SendStreamOptions = Partial<{
    type: string;
    end: boolean;
    parseResponse? : "json" | "text"
}>;

export type Headers = {
    [key: string]: string;
};

export type RequestLogger = {
    request: (...req: Parameters<typeof fetch>) => void;
    ok: (res: FetchResponse) => void;
    error: (res: ClientError) => void;
};

export type PostRequestConfig = {
    parseResponse? : "json" | "text"
    json?: boolean;
}
export interface HttpClient {
    addLogger(logger: RequestLogger): void;
    get(url: string): Promise<Response>;
    getStream(url: string): Promise<ResponseStream>;
    post(url: string, data: any, headers?: Headers, options?: { json: boolean } & PostRequestConfig): Promise<Response>;
    delete(url: string): Promise<Response>;
    sendStream(
        url: string,
        stream: Stream | string,
        options?: SendStreamOptions
    ): Promise<Response>;
}

export interface ClientProvider {
    client: HttpClient;
}

