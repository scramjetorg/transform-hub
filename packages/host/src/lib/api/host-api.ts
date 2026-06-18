import { APIExpose } from "@scramjet/types";

import { IHost } from "../types";
import { HostAPIV1Handler } from "./host-api-v1";
import { HostAPIV2Handler } from "./host-api-v2";

export {
    matchesRpcExposePath,
    normalizeRpcForwardPath,
    stripRpcExposePath
} from "./host-api-v1";

export class HostAPIHandler {
    private readonly v1: HostAPIV1Handler;

    constructor(
        private hostApi: APIExpose,
        private hostInstance: IHost,
        private hostVersion: string,
        build: string
    ) {
        this.v1 = new HostAPIV1Handler(hostApi, hostInstance, hostVersion, build);
    }

    attach() {
        this.v1.attach();
        new HostAPIV2Handler(this.hostApi, this.hostInstance, this.hostVersion).attach();
    }
}
