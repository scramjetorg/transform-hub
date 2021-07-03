import axios, { AxiosResponse } from "axios";
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

    private safeRequest(_resp: Promise<AxiosResponse>): typeof _resp {
        const resp = _resp.catch(e => Promise.reject(ClientError.from(e)));

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
        return this.safeRequest(axios.get(`${this.apiBase}/${url}`, {
            headers: {
                Accept: "*/*"
            }
        }));
    }

    async getStream(url: string): Promise<ResponseStream> {
        return this.safeRequest(axios({
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
        return this.safeRequest(axios({
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
        return this.safeRequest(axios.delete(
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
