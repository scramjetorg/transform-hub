import { ClientUtilsBase } from "./client-utils";
import { HttpClientNode as HttpClient, SendStreamOptions } from "./types";
import * as nodefetch from "node-fetch";

/**
 * Provides HTTP communication methods.
 *
 * @class ClientUtils
 * @extends ClientUtilsBase
 * @classdesc Provides HTTP communication methods.
 */
export class ClientUtils extends ClientUtilsBase implements HttpClient {
    fetch = nodefetch;
}

export { ClientError, ClientErrorCode } from "./client-error";
export { RequestLogger } from "./types";

export interface ClientProvider {
    client: HttpClient;
}

export { HttpClient };
export { SendStreamOptions };
