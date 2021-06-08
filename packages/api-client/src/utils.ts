import axios from "axios";

export type Response = {
    data: any;
    status: any;
}

class ClientUtils {
    async get(url: string): Promise<Response> {
        let resp: any;

        try {
            resp = await axios.get(url, {
                headers: {
                    Accept: "*/*"
                }
            });
        } catch (error) {
            console.error("Error during sending request: ", error.message);
            console.error(error);
        }

        return resp;
    }

    async post(url: string, data: any, headers?: object): Promise<Response> {
        let response: any;

        try {
            response = await axios({
                method: "POST",
                url,
                data,
                headers
            });
        } catch (error) {
            console.error("Error during sending request: ", error.message);
            console.error(error);
        }

        return {
            status: response.status,
            data: response.data
        };
    }
}

export const clientUtils = new ClientUtils();
