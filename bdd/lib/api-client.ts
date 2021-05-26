import axios from "axios";

export class ApiClient {

    constructor(private apiBase: string = "http://localhost:8000/api/v1") {
    }

    public async postEvent(eventName: string, postMessage: string): Promise<any> {
        const postEventUrl = `${this.apiBase}/sequence/_event`;
        const data = [4005, { eventName: eventName, message: postMessage }];

        return await this.post(postEventUrl, data);
    }

    public async getEvent(): Promise<any> {
        const getEventUrl = `${this.apiBase}/sequence/event`;

        return await this.get(getEventUrl);
    }

    public async postStop(timeoutInMs: number, canCallKeepalive: boolean): Promise<any> {
        const stopMethodUrl = `${this.apiBase}/sequence/_stop`;
        const data = [4001, { timeout: timeoutInMs, canCallKeepalive: canCallKeepalive }];

        return await this.post(stopMethodUrl, data);
    }

    public async postKill(): Promise<any> {
        const killMethodUrl = `${this.apiBase}/sequence/_kill`;
        const data = [4002, {}];

        return await this.post(killMethodUrl, data);
    }

    public async postMonitoringRate(): Promise<any> {
        const monitoringMethodUrl = `${this.apiBase}/sequence/_monitoring_rate`;
        const data = [4003, { monitoringRate: 2 }];//TODO implement message

        return await this.post(monitoringMethodUrl, data);
    }

    public async getHealth(): Promise<any> {
        const gethealthUrl = `${this.apiBase}/sequence/health`;

        return await this.get(gethealthUrl);
    }

    public async post(url: string, data: any): Promise<any> {
        let resp;

        try {
            resp = await axios({
                method: "POST",
                url: `${this.apiBase}/` + url,
                data: data,
                headers: {
                    "content-type": "application/json"
                }
            });
        } catch (error) {
            console.error("Error during sending request: ", error.message);
            console.error(error);
        }

        return resp;
    }

    public async postPackage(data: any): Promise<any> {
        let resp;

        try {
            resp = await axios({
                method: "POST",
                url: `${this.apiBase}/sequence`,
                data: data,
                headers: {
                    "content-type": "application/octet-stream"
                }
            });
        } catch (error) {
            console.error("Error during sending request: ", error.message);
            console.error(error);
        }

        return resp;
    }

    private async get(url: string): Promise<any> {
        let resp;

        try {
            resp = await axios({
                method: "GET",
                url: url,
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

    private async getStream(url: string): Promise<any> {
        console.log("--XXX------url: ", url);

        const resp = await axios.get(url, {
            headers: {
                Accept: "*/*"
            },
            responseType: "stream"
        }).then((r) => {
            console.log(r.data);
            return r;
        });

        console.log("----- axios resolves with:", resp);

        console.log("--------resp.data: ", resp.data);
        return resp.data;
    }

    public getStreamByInstanceId(id: string, url: string) {
        const getLogUrl = `${this.apiBase}/instance/${id}/${url}`;

        return this.getStream(getLogUrl);
    }
}

