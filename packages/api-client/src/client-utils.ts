import axios from "axios";
import { Stream } from "stream";

export type Response = {
    data: Stream | any;
    status: any;
};
class ClientUtils {
    apiBase: string = "";

    init(apiBase: string) {
        this.apiBase = apiBase;
    }

    async get(url: string): Promise<Response> {
        return axios.get(`${this.apiBase}/${url}`, {
            headers: {
                Accept: "*/*"
            }
        });
    }

    async getStream(url: string): Promise<Response> {
        return axios({
            method: "GET",
            url: `${this.apiBase}/${url}`,
            headers: {
                Accept: "*/*"
            },
            responseType: "stream"
        });
    }

    async post(url: string, data: any, headers: {[key: string]: string} = {}): Promise<Response> {
        const response = await axios({
            method: "POST",
            url: `${this.apiBase}/${url}`,
            data,
            headers
        });

        return {
            status: response.status,
            data: response.data
        };
    }

    async delete(url: string): Promise<void> {
        return axios.delete(`${this.apiBase}/${url}`).then(() => undefined);
    }

    async sendStream(url: string, stream: Stream | string): Promise<Response> {
        return this.post(
            url,
            stream,
            {
                "Content-type": "application/octet-stream"
            }
        );
    }
}

export const clientUtils = new ClientUtils();
