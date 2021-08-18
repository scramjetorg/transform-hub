/* eslint-disable no-console */
import fetch, { FetchError, Response as FetchReponse } from "node-fetch";
import { Stream } from "stream";
import { ClientError } from "./client-error";
import { Headers, HttpClient, RequestLogger, Response, ResponseStream, SendStreamOptions } from "./types";


export class ClientUtils implements HttpClient {
    apiBase: string = "";
    private log?: RequestLogger;

    constructor(apiBase: string) {
        this.apiBase = apiBase;
    }

    public addLogger(logger: RequestLogger) {
        this.log = logger;
    }

    private safeRequest(_resp: Promise<FetchReponse>): typeof _resp {
        const resp = _resp.catch((e: FetchError) => Promise.reject(ClientError.from(e)));

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
        return this.safeRequest(
            fetch(`${this.apiBase}/${url}`)
        ).then(async (response) => ({ data: await response.json(), status: response.status }));
    }

    async getStream(url: string): Promise<ResponseStream> {
        return this.safeRequest(
            fetch(`${this.apiBase}/${url}`)
        )
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
            fetch(`${this.apiBase}/${url}`, {
                method: "post",
                body: data,
                headers
            })
        )
            .then(async (res) => ({
                status: res.status,
                data: await res.json().catch(() => { /**/ })
            }));
    }

    async delete(url: string): Promise<Response> {
        return this.safeRequest(
            fetch(`${this.apiBase}/${url}`, {
                method: "delete",
                headers: {
                    "Content-Type": "application/json"
                }
            })
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
