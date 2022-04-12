import { ClientUtilsBase } from "./client-utils";
import { HttpClientNode as HttpClient, SendStreamOptions } from "./types";
import { normalizeUrl } from "@scramjet/utility";
import * as nodefetch from "node-fetch";
import http from "http";
import https from "https";

const nodeFetchWithHttps = (ca?: string | Buffer) =>
    (req: nodefetch.RequestInfo, init?: nodefetch.RequestInit): Promise<nodefetch.Response> => {
        if (typeof req === "string") {
            return nodefetch.default(req, {
                ...init,
                agent: (url) => url.protocol === "http:"
                    ? new http.Agent({ keepAlive: true })
                    : new https.Agent({ keepAlive: true, ca })
            });
        }

        throw new Error("not implemented");
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
        super(apiBase, nodeFetchWithHttps(ca), normalizeUrl);
    }
}

export { ClientError } from "./client-error";
export type { ClientErrorCode } from "./client-error";
export type { RequestLogger } from "./types";

export interface ClientProvider {
    client: HttpClient;
}

export type { HttpClient };
export type { SendStreamOptions };
