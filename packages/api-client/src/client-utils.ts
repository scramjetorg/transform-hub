import axios from "axios";
import { Stream } from "stream";

export type Response = {
    data: Stream | any;
    status: any;
} | undefined;

class ClientUtils {
    async get(url: string): Promise<Response> {
        try {
<<<<<<< Updated upstream
            const resp = await axios.get(url, {
=======
            return await axios.get(url, {
>>>>>>> Stashed changes
                headers: {
                    Accept: "*/*"
                }
            });

            return resp;
        } catch (error) {
            console.error("Error during sending request: ", error.message);
            console.error(error);
        }
<<<<<<< Updated upstream
=======

        return undefined;
>>>>>>> Stashed changes
    }

    async getStream(url: string): Promise<Response> {
        try {
            return await axios({
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

        return undefined;
    }

<<<<<<< Updated upstream
    async post(url: string, data: any, headers: {[key: string]: "string"} = {}): Promise<Response | undefined> {
        let response: any;
=======
    async post(url: string, data: any, headers?: object): Promise<Response | undefined> {
        headers = headers || {};
>>>>>>> Stashed changes

        try {
            const response = await axios({
                method: "POST",
                url: url,
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
