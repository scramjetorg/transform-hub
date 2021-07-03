import { AxiosError, AxiosResponse } from "axios";

import { Stream } from "stream";

export type Response = {
    data?: { [ key: string ]: any };
    status: number | undefined;
};

export type ResponseStream = {
    data?: Stream;
    status: number | undefined;
};

export type SendStreamOptions = Partial<{
    type: string;
    end: boolean;
}>;

export type Headers = {
    [key: string]: string;
};

export type RequestLogger = {
    ok: (res: AxiosResponse) => void;
    error: (res: AxiosError) => void;
};

export interface HttpClient {
    addLogger(logger: RequestLogger): void;
    get(url: string): Promise<Response>;
    getStream(url: string): Promise<ResponseStream>;
    post(url: string, data: any, headers?: Headers): Promise<Response>;
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

