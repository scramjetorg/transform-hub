import axios from "axios";
import { IncomingMessage } from "http";
import { Transform } from "stream";
import * as http from "http";
import * as https from "https";
export class ApiClient {

    private apiBase: string;

    constructor(base: string = "http://localhost:8000/api/v1") {
        this.apiBase = base;
    }

    public async postEvent(instanceId: string, eventName: string, postMessage: string): Promise<any> {
        const postEventUrl = `instance/${instanceId}/_event`;
        const data = [4005, { eventName: eventName, message: postMessage }];

        return await this.post(postEventUrl, data, "application/json");
    }

    public async getEvent(instanceId: string): Promise<any> {
        const getEventUrl = `${this.apiBase}/instance/${instanceId}/event`;

        return await this.get(getEventUrl);
    }

    // public async postStop(timeoutInMs: number, canCallKeepalive: boolean): Promise<any> {
    //     const stopMethodUrl = `${this.apiBase}/sequence/_stop`;_STOP
    //     const data = [4001, { timeout: timeoutInMs, canCallKeepalive: canCallKeepalive }];

    //     return await this.post(stopMethodUrl, data);
    // }

    public async postStop(id: string, timeoutInMs: number, canCallKeepalive: boolean): Promise<any> {
        const stopMethodUrl = `instance/${id}/_stop`;
        const data = [4001, { timeout: timeoutInMs, canCallKeepalive: canCallKeepalive }];

        return await this.post(stopMethodUrl, data, "application/json");
    }

    public async stopInstance(instanceId: string, timeoutInMs: number, canCallKeepalive: boolean) {
        return await this.post(`instance/${instanceId}/_stop`, [4001, { timeout: timeoutInMs, canCallKeepalive: canCallKeepalive }]);
    }

    public async postKill(): Promise<any> {
        const killMethodUrl = `${this.apiBase}/sequence/_kill`;
        const data = [4002, {}];

        return await this.post(killMethodUrl, data, "application/json");
    }

    public async postInput(id: string, data: any): Promise<any> {
        const url = `instance/${id}/input`;

        return await this.post(url, data, "application/octet-stream");
    }

    public async postMonitoringRate(): Promise<any> {
        const monitoringMethodUrl = `${this.apiBase}/sequence/_monitoring_rate`;
        const data = [4003, { monitoringRate: 2 }];//TODO implement message

        return await this.post(monitoringMethodUrl, data, "application/json");
    }

    public async getHealth(): Promise<any> {
        const gethealthUrl = `${this.apiBase}/sequence/health`;

        return await this.get(gethealthUrl);
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

    public newPost(url: string) {

        const options = {
            hostname: "localhost",
            port: 8000,
            path: "/api/v1" + url,
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            }
        };
        const req = https.request(options, (res) => {
            console.log("-------------statusCode:", res.statusCode);
            console.log("-------------headers:", res.headers);

            res.on("data", (d) => {
                process.stdout.write(d);
            });
        });

        console.log("-------------headers:");
        req.on("error", (e) => {
            console.error(e);
        });

        req.write("[4002, {}]");
        req.end();

        return req;
    }

    public pushPackage() {
        // for future refactoring
    }
}
