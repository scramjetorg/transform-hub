import { APIExpose } from "@scramjet/api-types";

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
    private readonly v2: HostAPIV2Handler;

    constructor(
        hostApi: APIExpose,
        hostInstance: IHost,
        hostVersion: string,
        build: string
    ) {
        this.v2 = new HostAPIV2Handler(hostApi, hostInstance, hostVersion);
        this.v1 = new HostAPIV1Handler(hostApi, hostInstance, hostVersion, build, this.v2);
    }

    attach() {
        this.v1.attach();
        this.v2.attach();
    }
}
