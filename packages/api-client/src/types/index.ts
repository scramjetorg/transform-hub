import { Stream } from "stream";
import { ClientError } from "../client-error";

export type Response = {
    data?: { [key: string]: any };
    status: number;
};

export type ResponseStream = {
    data?: typeof Response;
    status: number;
};

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
export interface HttpClient {
    addLogger(logger: RequestLogger): void;
    get<T>(url: string): Promise<T>;
    getStream(url: string): Promise<any>;
    post<T>(url: string, data: any, headers?: Headers, options?: { json: boolean } & PostRequestConfig): Promise<T>;
    delete(url: string): Promise<Response>;
    sendStream<T>(url: string, stream: Stream | string, options?: SendStreamOptions): Promise<T>;
}

export interface ClientProvider {
    client: HttpClient;
}
