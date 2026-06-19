import { RouteRequest, Router, RouterDefinition, registerHttpRoutes, replacePathVersion } from "@scramjet/api-router";
import { MMRestAPI } from "@scramjet/types";
import { z } from "zod";

import { getMultiManagerVerser2TrustExport } from "../verser2-trust-export";
import type { MultiManager } from "../multi-manager";

export class MultiManagerAPIV2Handler {
    constructor(private multiManager: MultiManager) {}

    get v2ApiBase() {
        return replacePathVersion(this.multiManager.apiBase, "v2");
    }

    createV2Router(): RouterDefinition {
        const multiManager = this.multiManager;
        const objectResponse = z.object({}).passthrough();

        return Router.create({ basePath: this.v2ApiBase })
            .route(Router.get("/version", {
                id: "multi-manager.v2.version",
                schemas: {
                    response: z.object({
                        service: z.string(),
                        apiVersion: z.literal("v2"),
                        version: z.string(),
                        build: z.string()
                    })
                },
                handler: (): MMRestAPI.GetVersionResponse => ({
                    service: multiManager.service,
                    apiVersion: "v2",
                    version: multiManager.version,
                    build: multiManager.build,
                })
            }))
            .route(Router.get("/info", {
                id: "multi-manager.v2.info",
                schemas: {
                    response: z.object({
                        apiBase: z.string(),
                        apiPort: z.number(),
                        id: z.string(),
                        managersCount: z.number()
                    })
                },
                handler: (): MMRestAPI.GetInfoReposnse => ({
                    apiBase: this.v2ApiBase,
                    apiPort: multiManager.config.server.apiPort,
                    id: multiManager.id,
                    managersCount: multiManager.managersStore.size,
                })
            }))
            .route(Router.get("/load", {
                id: "multi-manager.v2.load",
                schemas: { response: z.unknown() },
                handler: async (): Promise<MMRestAPI.GetLoadCheckResponse> => multiManager.loadCheck.getLoadCheck()
            }))
            .route(Router.get("/list", {
                id: "multi-manager.v2.list",
                schemas: { response: z.array(objectResponse) },
                handler: () => multiManager.handleListManagersRequest()
            }))
            .route(Router.get("/health", {
                id: "multi-manager.v2.health",
                schemas: { response: objectResponse },
                handler: () => multiManager.healthCheck.getHealthCheckInfo()
            }))
            .route(Router.get("/verser2/trust/:id?", {
                id: "multi-manager.v2.verser2.trust",
                schemas: {
                    params: z.object({ id: z.string().optional() }).optional(),
                    response: objectResponse
                },
                handler: (req: RouteRequest) => this.getTrustExport(req)
            }))
            .resolve("/managers/:managerId", {
                id: "multi-manager.v2.manager.forward",
                description: "Resolve a selected Manager to its verser2 route domain for Manager-owned v2 routes.",
                schemas: { params: z.object({ managerId: z.string() }) },
                targetDefinitions: {
                    owner: "mgr",
                    mountPath: "/managers/:managerId",
                    implementerBasePath: this.v2ApiBase
                },
                handler: ({ params, remainingPath }) => {
                    const managerId = (params as { managerId: string }).managerId;
                    const manager = this.multiManager.managersStore.getById(managerId);
                    const routeDomain = manager?.config?.verser2?.localGuest?.routeDomain;

                    if (!routeDomain) {
                        return undefined;
                    }

                    return {
                        redirect: {
                            routeDomain,
                            targetPath: this.toManagerImplementerPath(remainingPath)
                        }
                    };
                }
            });
    }

    attach() {
        registerHttpRoutes(this.multiManager.apiServer, this.createV2Router());
    }

    private getTrustExport(req: RouteRequest) {
        const params = req.params as { id?: string } | undefined;
        const manager = params?.id ? this.multiManager.managersStore.getById(params.id) : undefined;

        if (params?.id && !manager) {
            throw new Error(`Manager ${params.id} not found`);
        }

        return getMultiManagerVerser2TrustExport(this.multiManager.config.verser2, manager?.config);
    }

    private toManagerImplementerPath(remainingPath: string): string {
        return remainingPath === "/" ? this.v2ApiBase : `${this.v2ApiBase}${remainingPath}`;
    }
}
