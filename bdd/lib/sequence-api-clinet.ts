import axios from "axios";

export class SequenceApiClient {

    constructor(private apiBase: string = "http://localhost:8000/api/v1/sequence") {
    }

    public async stop(timeoutInMs: number, canCallKeepalive: boolean): Promise<any> {
        const stopMethodUrl = `${this.apiBase}/_stop`;
        const data = [4001, { timeout: timeoutInMs, canCallKeepalive: canCallKeepalive }];

        return await this.post(stopMethodUrl, data);
    }

    public async kill(): Promise<any> {
        const killMethodUrl = `${this.apiBase}/_kill`;
        const data = [4002, {}];

        return await this.post(killMethodUrl, data);
    }

    public async monitoringRate(): Promise<any> {
        const monitoringMethodUrl = `${this.apiBase}/_monitoring_rate`;
        const data = [3001, {}];//TODO implement message

        return await this.post(monitoringMethodUrl, data);
    }

    private async post(url: string, data: any): Promise<any> {
        let resp;

        try {
            resp = await axios({
                method: "POST",
                url: url,
                data: data,
                headers: {
                    "content-type": "application/json"
                }
            });
        } catch (error) {
            console.error("Error during sending request: ", error);
        }

        return resp;
    }

    //TODO
    // this.api.get(`${apiBase}/sequence/health`, RunnerMessageCode.DESCRIBE_SEQUENCE, this.communicationHandler);
    // this.api.get(`${apiBase}/sequence/status`, RunnerMessageCode.STATUS, this.communicationHandler);

}
