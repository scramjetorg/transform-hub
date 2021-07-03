import axios, { AxiosResponse } from "axios";
import { Stream } from "stream";
import { Headers, HttpClient, RequestLogger, Response, ResponseStream, SendStreamOptions } from "./types";

export class ClientError extends Error {
    reason?: Error;
    exitCode: number = 1;

    constructor(exitCode: number = 1, reason?: Error|string, message?: string) {
        super(message || (reason instanceof Error ? reason.message : reason));
        if (reason instanceof Error) {
            this.reason = reason;
        }
        this.exitCode = exitCode;
    }
}

export class ClientUtils implements HttpClient {
    apiBase: string = "";
    private log?: RequestLogger;

    constructor(apiBase: string) {
        this.apiBase = apiBase;
    }

    public addLogger(logger: RequestLogger) {
        this.log = logger;
    }

    private logRequest(resp: Promise<AxiosResponse>): typeof resp {
        if (this.log) {
            const log = this.log;

            return resp.then(
                res => { log.ok(res); return res; },
                err => { log.error(err); throw err; }
            );
        }

        return resp;
    }

    async get(url: string): Promise<Response> {
        return this.logRequest(axios.get(`${this.apiBase}/${url}`, {
            headers: {
                Accept: "*/*"
            }
        }));
    }

    async getStream(url: string): Promise<ResponseStream> {
        return this.logRequest(axios({
            method: "GET",
            url: `${this.apiBase}/${url}`,
            headers: {
                Accept: "*/*"
            },
            responseType: "stream"
        }))
            .then((d) => {
                return {
                    status: d.status,
                    data: d.data
                };
            })
        ;
    }

    async post(url: string, data: any, headers: Headers = {}): Promise<Response> {
        return this.logRequest(axios({
            method: "POST",
            url: `${this.apiBase}/${url}`,
            data,
            headers
        }))
            .then(res => ({
                status: res.status,
                data: res.data
            }))
        ;
    }

    async delete(url: string): Promise<Response> {
        return this.logRequest(axios.delete(
            `${this.apiBase}/${url}`, {
                headers: {
                    "Content-Type": "application/json"
                }
            }))
            .then((res) => ({
                status: res.status
            }))
        ;
    }

    async sendStream(
        url: string,
        stream: Stream | string,
        {
            type = "application/octet-stream",
            end
        }: SendStreamOptions = {}
    ): Promise<Response> {
        const headers: Headers = {
            "content-type": type
        };

        if (typeof end !== "undefined") headers["x-end-stream"] = end ? "true" : "false";

        return this.post(
            url,
            stream,
            headers
        );
    }
}
