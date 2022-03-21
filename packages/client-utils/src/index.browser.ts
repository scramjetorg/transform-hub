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
        super(apiBase, window.fetch.bind(window));
    }
}

export { ClientError, ClientErrorCode } from "./client-error";
export { RequestLogger } from "./types";

export interface ClientProvider {
    client: HttpClient;
}

export { HttpClient };
