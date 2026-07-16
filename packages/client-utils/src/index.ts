import { ClientUtilsBase } from "./client-utils";
import { HttpClientNode as HttpClient, SendStreamOptions } from "./types";
import { normalizeUrl } from "@scramjet/utility";
import * as nodefetch from "node-fetch";
import http from "http";
import https from "https";

type AgentFetch = ((req: nodefetch.RequestInfo, init?: nodefetch.RequestInit) => Promise<nodefetch.Response>) & {
    httpAgent: http.Agent;
    httpsAgent: https.Agent;
    dispose: () => void;
};

const nodeFetchWithHttps = (ca?: string | Buffer): AgentFetch => {
    const httpAgent = new http.Agent({ keepAlive: true });
    const httpsAgent = new https.Agent({ keepAlive: true, ca });
    const fetcher = ((req: nodefetch.RequestInfo, init?: nodefetch.RequestInit): Promise<nodefetch.Response> => {
        if (typeof req === "string") {
            return nodefetch.default(req, {
                ...init,
                agent: (url) => url.protocol === "http:"
                    ? httpAgent
                    : httpsAgent
            });
        }

        throw new Error("not implemented");
    }) as AgentFetch;
    fetcher.httpAgent = httpAgent;
    fetcher.httpsAgent = httpsAgent;
    fetcher.dispose = () => {
        httpAgent.destroy();
        httpsAgent.destroy();
    };
    return fetcher;
};

/**
 * Provides HTTP communication methods.
 *
 * @class ClientUtils
 * @extends ClientUtilsBase
 * @classdesc Provides HTTP communication methods.
 */
export class ClientUtils extends ClientUtilsBase implements HttpClient {
    constructor(
        apiBase: string,
        ca?: string | Buffer
    ) {
        const fetcher = nodeFetchWithHttps(ca);
        super(apiBase, fetcher, normalizeUrl);
        this.agent = fetcher.httpAgent;
    }
}

export class ClientUtilsCustomAgent extends ClientUtilsBase implements HttpClient {
    constructor(
        apiBase: string,
        agent: http.Agent | https.Agent,
        ownsAgent = false
    ) {
        super(
            apiBase,
            (req: nodefetch.RequestInfo, init?: nodefetch.RequestInit): Promise<nodefetch.Response> => {
                return nodefetch.default(req, {
                    ...init,
                    agent
                });
            },
            normalizeUrl
        );

        this.agent = agent;
        this.ownsAgent = ownsAgent;
    }
}

export { ClientError, ClientErrorCode } from "./client-error";
export { RequestLogger, Headers, RequestConfig, HttpMethod } from "./types";

export interface ClientProvider {
    client: HttpClient;
}

export { HttpClient };
export { SendStreamOptions };
