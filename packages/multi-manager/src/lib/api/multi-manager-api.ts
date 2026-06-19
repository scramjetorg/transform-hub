import type { MultiManager } from "../multi-manager";
import { MultiManagerAPIV1Handler } from "./multi-manager-api-v1";
import { MultiManagerAPIV2Handler } from "./multi-manager-api-v2";

export class MultiManagerAPIHandler {
    private readonly v1: MultiManagerAPIV1Handler;
    private readonly v2: MultiManagerAPIV2Handler;

    constructor(private multiManager: MultiManager) {
        this.v1 = new MultiManagerAPIV1Handler(multiManager);
        this.v2 = new MultiManagerAPIV2Handler(multiManager);
    }

    attach() {
        const multiManager = this.multiManager;

        multiManager.apiServer.use("*", (req, _res, next) => {
            multiManager.logger.trace("API request", req.method, req.url);
            return next();
        });

        this.v1.attach();
        this.v2.attach();
    }
}

export { MultiManagerAPIV1Handler } from "./multi-manager-api-v1";
export { MultiManagerAPIV2Handler } from "./multi-manager-api-v2";
