import axios, { AxiosError, AxiosResponse } from "axios";
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

const logOk = (result: AxiosResponse) => {
    if (process.env.SCRAMJET_TEST_LOG) {
        const {
            status, statusText, config: { url, method }
        } = result;

        console.error("Request ok:", method, url, `status: ${status} ${statusText}`);
    }
    return result;
};
const logError = (result: AxiosError) => {
    if (process.env.SCRAMJET_TEST_LOG) {
        const { status, statusText } = result.response || {};
        const { url, method } = result.config;

        console.error("Request failed:", method, url, `status: ${status} ${statusText}`);
    }
    return Promise.reject(result);
};

class ClientUtils {
    apiBase: string = "";

    init(apiBase: string) {
        this.apiBase = apiBase;
    }

    private handleError(error: AxiosError) {
        return Promise.reject({
            message: error.response?.statusText,
            status: error.response?.status
        });
    }

    async get(url: string): Promise<Response> {
        return axios.get(`${this.apiBase}/${url}`, {
            headers: {
                Accept: "*/*"
            }
        })
            .then(logOk, logError)
            .catch(this.handleError);
    }

    async getStream(url: string): Promise<ResponseStream> {
        return axios({
            method: "GET",
            url: `${this.apiBase}/${url}`,
            headers: {
                Accept: "*/*"
            },
            responseType: "stream"
        })
            .then(logOk, logError)
            .then((d) => {
                return {
                    status: d.status,
                    data: d.data
                };
            })
            .catch(this.handleError);
    }

    async post(url: string, data: any, headers: Headers = {}): Promise<Response> {
        return axios({
            method: "POST",
            url: `${this.apiBase}/${url}`,
            data,
            headers
        })
            .then(logOk, logError)
            .then(res => ({
                status: res.status,
                data: res.data
            }))
            .catch(this.handleError);
    }

    async delete(url: string): Promise<Response> {
        return axios.delete(
            `${this.apiBase}/${url}`, {
                headers: {
                    "Content-Type": "application/json"
                }
            })
            .then(logOk, logError)
            .then((res) => ({
                status: res.status
            }))
            .catch(this.handleError);
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

export const clientUtils = new ClientUtils();
