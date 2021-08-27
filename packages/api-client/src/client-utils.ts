/* eslint-disable no-console */
import fetch, { FetchError } from "node-fetch";
import { Stream } from "stream";
import { ClientError } from "./client-error";
import { Headers, HttpClient, RequestLogger, Response, ResponseStream, SendStreamOptions } from "./types";


export class ClientUtils implements HttpClient {
    apiBase: string = "";
    private log?: RequestLogger;

    constructor(apiBase: string) {
        this.apiBase = apiBase;
    }

    public addLogger(logger: Partial<RequestLogger>) {
        this.log = {
            request: () => 0,
            ok: () => 0,
            error: () => 0,
            ...logger
        };
    }

    private safeRequest(...args: Parameters<typeof fetch>): ReturnType<typeof fetch> {
        let resp = fetch(...args);

        if (this.log) {
            const log = this.log;

            log.request(...args);
            resp = resp
                .then(res => { log.ok(res); return res; })
                .catch(err => { log.error(err); throw err; })
            ;
        }

        const source = new Error();

        return resp
            .catch((e: FetchError) => {
                throw ClientError.from(e, undefined, source);
            });
    }

    async get(url: string): Promise<Response> {
        return this.safeRequest(`${this.apiBase}/${url}`)
            .then(async (response) => ({ data: await response.json(), status: response.status }));
    }

    async getStream(url: string): Promise<ResponseStream> {
        return this.safeRequest(`${this.apiBase}/${url}`)
            .then((d) => {
                return {
                    status: d.status,
                    data: d.body
                };
            });
    }

    async post(url: string, data: any, headers: Headers = {}, config = { json: false }): Promise<Response> {
        if (config.json) {
            headers["Content-Type"] = "application/json";
            data = JSON.stringify(data);
        }

        return this.safeRequest(
            `${this.apiBase}/${url}`,
            {
                method: "post",
                body: data,
                headers
            }
        )
            .then(async (res) => ({
                status: res.status,
                data: await res.json().catch(() => { /**/ })
            }));
    }

    async delete(url: string): Promise<Response> {
        return this.safeRequest(
            `${this.apiBase}/${url}`,
            {
                method: "delete",
                headers: {
                    "Content-Type": "application/json"
                }
            }
        )
            .then((res) => ({
                status: res.status
            }));
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
