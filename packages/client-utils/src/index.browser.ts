import { ClientUtilsBase } from "./client-utils";
import { HttpClientBrowser as HttpClient } from "./types";

export class ClientUtils extends ClientUtilsBase implements HttpClient {
    fetch = window.fetch.bind(window);
}

export { ClientError, ClientErrorCode } from "./client-error";
export { RequestLogger } from "./types";

export interface ClientProvider {
    client: HttpClient;
}

export { HttpClient };
