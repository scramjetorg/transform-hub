import { ClientUtilsBase } from "./client-utils";
import { HttpClientNode as HttpClient } from "./types";
import * as nodefetch from "node-fetch";

export class ClientUtils extends ClientUtilsBase implements HttpClient {
    fetch = nodefetch;
}

export { ClientError, ClientErrorCode } from "./client-error";
export { RequestLogger } from "./types";

export interface ClientProvider {
    client: HttpClient;
}

export { HttpClient };
