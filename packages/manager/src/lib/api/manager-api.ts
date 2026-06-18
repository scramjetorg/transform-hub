import { getS3Router } from "../s3-router";
import type { Manager } from "../manager";
import { ManagerAPIV1Handler } from "./manager-api-v1";
import { ManagerAPIV2Handler } from "./manager-api-v2";

export class ManagerAPIHandler {
    private readonly v1: ManagerAPIV1Handler;
    private readonly v2: ManagerAPIV2Handler;

    constructor(
        manager: Manager,
        createS3Router: typeof getS3Router = getS3Router
    ) {
        this.v1 = new ManagerAPIV1Handler(manager, createS3Router);
        this.v2 = new ManagerAPIV2Handler(manager);
    }

    async attach() {
        await this.v1.attach();
        this.v2.attach();
    }
}

export { ManagerAPIV1Handler } from "./manager-api-v1";
export { ManagerAPIV2Handler } from "./manager-api-v2";
