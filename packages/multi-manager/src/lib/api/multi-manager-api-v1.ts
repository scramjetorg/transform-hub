import { RouteRequest, Router, RouterDefinition, registerHttpRoutes } from "@scramjet/api-router";
import { MMRestAPI } from "@scramjet/api-types";
import { ReasonPhrases } from "http-status-codes";
import { z } from "zod";

import { getMultiManagerVerser2TrustExport } from "../verser2-trust-export";
import type { MultiManager } from "../multi-manager";

export class MultiManagerAPIV1Handler {
    constructor(private multiManager: MultiManager) {}

    createV1Router(): RouterDefinition {
        const multiManager = this.multiManager;
        const objectResponse = z.object({}).passthrough();

        return Router.create({ basePath: multiManager.apiBase })
            .route(Router.get("/version", {
                id: "multi-manager.v1.version",
                schemas: {
                    response: z.object({
                        service: z.string(),
                        apiVersion: z.literal("v1"),
                        version: z.string(),
                        build: z.string()
                    })
                },
                handler: (): MMRestAPI.GetVersionResponse => ({
                    service: multiManager.service,
                    apiVersion: "v1",
                    version: multiManager.version,
                    build: multiManager.build,
                })
            }))
            .route(Router.get("/info", {
                id: "multi-manager.v1.info",
                schemas: {
                    response: z.object({
                        apiBase: z.string(),
                        apiPort: z.number(),
                        id: z.string(),
                        managersCount: z.number()
                    })
                },
                handler: (): MMRestAPI.GetInfoReposnse => ({
                    apiBase: multiManager.apiBase,
                    apiPort: multiManager.config.server.apiPort,
                    id: multiManager.id,
                    managersCount: multiManager.managersStore.size,
                })
            }))
            .route(Router.get("/load-check", {
                id: "multi-manager.v1.load-check",
                schemas: { response: z.unknown() },
                handler: async (): Promise<MMRestAPI.GetLoadCheckResponse> => multiManager.loadCheck.getLoadCheck()
            }))
            .route(Router.get("/list", {
                id: "multi-manager.v1.list",
                schemas: { response: z.array(objectResponse) },
                handler: () => multiManager.handleListManagersRequest()
            }))
            .route(Router.get("/health", {
                id: "multi-manager.v1.health",
                schemas: { response: objectResponse },
                handler: () => multiManager.healthCheck.getHealthCheckInfo()
            }))
            .route(Router.get("/verser2/trust/:id?", {
                id: "multi-manager.v1.verser2.trust",
                schemas: {
                    params: z.object({ id: z.string().optional() }).optional(),
                    response: objectResponse
                },
                handler: (req: RouteRequest) => this.getTrustExport(req)
            }));
    }

    attach() {
        const multiManager = this.multiManager;

        registerHttpRoutes(multiManager.apiServer, this.createV1Router());

        multiManager.apiServer.op("post", `${multiManager.apiBase}/start`, (req) => multiManager.handleStartManagerRequest(req));
        multiManager.apiServer.op(
            "post",
            `${multiManager.apiBase}/cpm/:id/stop`,
            async (req, _res): Promise<MMRestAPI.OpResponse<MMRestAPI.SendStopManagerResponse>> => {
                const stopped = await multiManager.stopManager(req.params!.id);

                if (stopped) {
                    return { id: req.params!.id, opStatus: ReasonPhrases.OK };
                }

                return { opStatus: ReasonPhrases.NOT_FOUND };
            }
        );

        multiManager.apiServer.use(`${multiManager.apiBase}/cpm/:id`, async (req, res, next) => await multiManager.cpmMiddleware(req, res, next));

        multiManager.apiServer.upstream(`${multiManager.apiBase}/log`, multiManager.apiCommonLogsPipe.getOut());
        multiManager.apiServer.upstream(`${multiManager.apiBase}/audit`, (req, _res) => multiManager.commonAuditPipe(req));
    }

    private getTrustExport(req: RouteRequest) {
        const params = req.params as { id?: string } | undefined;
        const manager = params?.id ? this.multiManager.managersStore.getById(params.id) : undefined;

        if (params?.id && !manager) {
            throw new Error(`Manager ${params.id} not found`);
        }

        return getMultiManagerVerser2TrustExport(this.multiManager.config.verser2, manager?.config);
    }
}
