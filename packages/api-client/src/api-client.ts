import axios from "axios";
import { IncomingMessage } from "http";
import { Transform } from "stream";
import * as http from "http";
export class ApiClient {

    private apiBase: string;

    constructor(base: string = "http://localhost:8000/api/v1") {
        this.apiBase = base;
    }

    public async postEvent(instanceId: string, eventName: string, postMessage: string): Promise<any> {
        const postEventUrl = `instance/${instanceId}/_event`;
        const data = [4005, { eventName: eventName, message: postMessage }];

        return this.post(postEventUrl, data, "application/json");
    }

    public async getEvent(instanceId: string): Promise<any> {
        const getEventUrl = `${this.apiBase}/instance/${instanceId}/event`;

        return this.get(getEventUrl);
    }

    public async stopInstance(instanceId: string, timeoutInMs: number, canCallKeepalive: boolean) {
        const stopMethodUrl = `instance/${instanceId}/_stop`;
        const data = [4001, { timeout: timeoutInMs, canCallKeepalive: canCallKeepalive }];

        return this.post(stopMethodUrl, data, "application/json");
    }

    public async killInstance(instanceId: string) {
        const killMethodUrl = `instance/${instanceId}/_kill`;
        const data = [4002, {}];

        return this.post(killMethodUrl, data, "application/json");
    }

    public async postInput(id: string, data: any): Promise<any> {
        const url = `instance/${id}/input`;

        return this.post(url, data, "application/octet-stream");
    }

    public async postMonitoringRate(): Promise<any> {
        const monitoringMethodUrl = `${this.apiBase}/sequence/_monitoring_rate`;
        const data = [4003, { monitoringRate: 2 }];//TODO implement message

        return this.post(monitoringMethodUrl, data, "application/json");
    }

    public async getHealth(instanceId:string): Promise<any> {
        const gethealthUrl = `${this.apiBase}/instance/${instanceId}/health`;

        return this.get(gethealthUrl);
    }

    public async getStatus(instanceId:string): Promise<any> {
        const gethealthUrl = `${this.apiBase}/instance/${instanceId}/status`;

        return this.get(gethealthUrl);
    }

    public async post(url: string, data: any, contentType: string): Promise<any> {
        let resp;

        try {
            resp = await axios({
                method: "POST",
                url: `${this.apiBase}/` + url,
                data: data,
                headers: {
                    "content-type": contentType
                }
            });
        } catch (error) {
            console.error("Error during sending request: ", error.message);
            return error.response;
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

    public async startSequence(sequenceId: string, sequenceArgs: Object) {
        return this.post(`sequence/${sequenceId}/start`, sequenceArgs, "application/json");
    }

    private async get(url: string): Promise<any> {
        let resp;

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

    private streamFromAxios(url: string) {
        const inoutStream = new Transform({
            transform(chunk, encoding, callback) {
                this.push(chunk);
                callback();
            },
        });

        axios({
            method: "get",
            url,
            responseType: "stream",
            headers: {
                Accept: "*/*"
            }
        }).then((res) => {
            res.data.pipe(inoutStream);
        }).catch((err) => {
            console.log(err);
        });

        return inoutStream;
    }

    private getRemoteStream(url: string): Promise<IncomingMessage> {
        return new Promise((resolve, reject) => {
            http.get(url, (response: IncomingMessage) => {
                if (response.statusCode !== 200) {
                    reject();
                }
                resolve(response);
            });
        });
    }

    public getStreamByInstanceId(id: string, url: string): Transform {
        const getLogUrl = `${this.apiBase}/instance/${id}/${url}`;

        return this.streamFromAxios(getLogUrl);
    }

    public getInstanceStream(id: string, url: string): Promise<IncomingMessage> {
        const absoluteUrl = `${this.apiBase}/instance/${id}/${url}`;

        return this.getRemoteStream(absoluteUrl);
    }

    public async getHostLoadCheck(): Promise<any> {
        return this.get(`${this.apiBase}/load-check`);
    // private postRemoteStream(url: string): Promise<IncomingMessage> {
    //     return new Promise((resolve, reject) => {
    //         http.request(url, (response: IncomingMessage) => {
    //             if (response.statusCode !== 200) {
    //                 reject();
    //             }
    //             resolve(response);
    //         });
    //     });
    // }
    }

    public postInstanceStream(id: string, url: string): Promise<IncomingMessage> {
        const absoluteUrl = `${this.apiBase}/instance/${id}/${url}`;

        return this.getRemoteStream(absoluteUrl);
    }

    public pushPackage() {
        // for future refactoring
    }
}
