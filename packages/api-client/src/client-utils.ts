import axios from "axios";
import { Stream } from "stream";

export type Response = {
    data: Stream | any;
    status: any;
} | undefined;

class ClientUtils {
    async get(url: string): Promise<Response> {
        try {
            const resp = await axios.get(url, {
                headers: {
                    Accept: "*/*"
                }
            });

            return resp;
        } catch (error) {
            console.error("Error during sending request: ", error.message);
            console.error(error);
        }
    }

    async getStream(url: string): Promise<Response> {
        let resp;

        try {
            resp = await axios({
                method: "GET",
                url: url,
                headers: {
                    Accept: "*/*"
                },
                responseType: "stream"
            });
        } catch (error) {
            console.error("Error during sending request: ", error.message);
            console.error(error);
        }

        return resp;
    }

    async post(url: string, data: any, headers: {[key: string]: "string"} = {}): Promise<Response | undefined> {
        let response: any;

        try {
            response = await axios({
                method: "POST",
                url: url,
                data,
                headers
            });
        } catch (error) {
            console.error("Error during sending request: ", error.message);
            console.error(error);
        }

        if (response) {
            return {
                status: response.status,
                data: response.data
            };
        }

        return undefined;
    }

    async delete(url: string): Promise<boolean> {
        let response: any;

        try {
            response = await axios({
                method: "DELETE",
                url: url
            });
        } catch (error) {
            console.error("Error during sending request: ", error.message);
            console.error(error);
        }

        return !!response;
    }

    async sendStream(url: string, stream: Stream | string): Promise<Response> {
        return this.post(url, stream, {
            "Content-type": "application/octet-stream"
        });
    }
}

export const clientUtils = new ClientUtils();
