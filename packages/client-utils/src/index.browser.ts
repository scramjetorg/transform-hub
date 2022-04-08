import normalizeUrl from "normalize-url";
import { ClientUtilsBase } from "./client-utils";
import { HttpClientBrowser as HttpClient } from "./types";

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
    ) {
        super(apiBase, window.fetch.bind(window), normalizeUrl);
    }
}

export { ClientError } from "./client-error";
export type { ClientErrorCode } from "./client-error";
export type { RequestLogger } from "./types";

export interface ClientProvider {
    client: HttpClient;
}

export type { HttpClient };
