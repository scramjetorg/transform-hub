import { Readable } from "stream";
import { ClientError } from "../client-error";

export type SendStreamOptions = Partial<{
    type: string;
    end: boolean;
    parseResponse?: "json" | "text" | "stream";
}>;

export type Headers = {
    [key: string]: string;
};

export type RequestLogger = {
    request: (...req: any) => void;
    ok: (res: any) => void;
    error: (res: ClientError) => void;
};

export type RequestConfig = {
    parse: "json" | "text" | "stream"
    json?: boolean;
};

export interface HttpClient {
    fetch?: any;
    addLogger(logger: RequestLogger): void;
    get<T>(url: string): Promise<T>;
    getStream(url: string): Promise<any>;
    post<T>(url: string, data: any, headers?: Headers, options?: { json: boolean } & RequestConfig): Promise<T>;
    delete<T>(url: string): Promise<T>;
    sendStream<T>(url: string, stream: any, options?: SendStreamOptions): Promise<T>;
}

export interface HttpClientNode extends HttpClient {
    getStream(url: string): Promise<Readable>;
    sendStream<T>(url: string, stream: Readable | string, options?: SendStreamOptions): Promise<T>;
}

export interface HttpClientBrowser extends HttpClient {
    getStream(url: string): Promise<Response["body"]>;
    sendStream<T>(url: string, stream: ReadableStream<any> | string, options?: SendStreamOptions): Promise<T>;
}

export interface ClientProvider {
    client: HttpClient;
}
