import { ClientUtilsBase } from "./client-utils";
import { HttpClientNode as HttpClient, SendStreamOptions } from "./types";
import { normalizeUrl } from "@scramjet/utility";
import type * as nodefetch from "node-fetch";
import http from "http";
import https from "https";

type AgentFetch = ((req: nodefetch.RequestInfo, init?: nodefetch.RequestInit) => Promise<nodefetch.Response>) & {
    httpAgent: http.Agent;
    httpsAgent: https.Agent;
    dispose: () => void;
};

type FetchFunction = typeof nodefetch.default;

function selectRuntimeFetch(): FetchFunction {
    const modulePath = typeof process.versions.bun === "string"
        ? require.resolve("node-fetch/lib/index.js")
        : require.resolve("node-fetch");
    const loaded = require(modulePath) as { default?: FetchFunction } | FetchFunction;
    const fetcher = typeof loaded === "function" ? loaded : loaded.default;
    if (typeof fetcher !== "function") {
        throw new Error(`Unable to load a fetch implementation from ${modulePath}`);
    }
    return fetcher;
}

const runtimeFetch = selectRuntimeFetch();

const nodeFetchWithHttps = (ca?: string | Buffer): AgentFetch => {
    const httpAgent = new http.Agent({ keepAlive: true });
    const httpsAgent = new https.Agent({ keepAlive: true, ca });
    const fetcher = ((req: nodefetch.RequestInfo, init?: nodefetch.RequestInit): Promise<nodefetch.Response> => {
        if (typeof req === "string") {
            return runtimeFetch(req, {
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
                return runtimeFetch(req, {
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

export { ClientError } from "./client-error";
export type { ClientErrorCode } from "./client-error";
export type { RequestLogger, Headers, RequestConfig, HttpMethod } from "./types";

export interface ClientProvider {
    client: HttpClient;
}

export type { HttpClient };
export type { SendStreamOptions };
