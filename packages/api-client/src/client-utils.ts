import axios from "axios";
import { Stream } from "stream";

export type Response = {
    data: Stream | any;
    status: any;
} | undefined;

class ClientUtils {
    apiBase: string;

    init(apiBase: string) {
        this.apiBase = apiBase;
    }

    async get(url: string): Promise<Response> {
        try {
            return await axios.get(url, {
                headers: {
                    Accept: "*/*"
                }
            });
        } catch (error) {
            console.error("Error during sending request: ", error.message);
            console.error(error);
        }

        return undefined;
    }

    async getStream(url: string): Promise<Response> {
        try {
            return await axios({
                method: "GET",
                url: `${this.apiBase}/${url}`,
                headers: {
                    Accept: "*/*"
                },
                responseType: "stream"
            });
        } catch (error) {
            console.error("Error during sending request: ", error.message);
            console.error(error);
        }

        return undefined;
    }

    async post(url: string, data: any, headers: {[key: string]: string} = {}): Promise<Response | undefined> {
        try {
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
        } catch (error) {
            console.error("Error during sending request: ", error.message);
            console.error(error);
        }

        return undefined;
    }

    async delete(url: string): Promise<void> {
        try {
            return await axios.delete(url).then(() => undefined);
        } catch (error) {
            console.error("Error during sending request: ", error.message);
            console.error(error);
        }

        return undefined;
    }

    async sendStream(url: string, stream: Stream | string): Promise<Response> {
        return this.post(
            `${this.apiBase}/${url}`,
            stream,
            {
                "Content-type": "application/octet-stream"
            }
        );
    }
}

export const clientUtils = new ClientUtils();
