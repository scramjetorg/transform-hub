import { RouteRequest, Router, RouterDefinition, registerHttpRoutes, replacePathVersion } from "@scramjet/api-router";
import { MMRestAPI } from "@scramjet/types";
import { ReasonPhrases } from "http-status-codes";
import { z } from "zod";

import { getMultiManagerVerser2TrustExport } from "../verser2-trust-export";
import type { MultiManager } from "../multi-manager";

export class MultiManagerAPIHandler {
    constructor(private multiManager: MultiManager) {}

    attach() {
        const multiManager = this.multiManager;

        multiManager.apiServer.use("*", (req, _res, next) => {
            multiManager.logger.trace("API request", req.method, req.url);
            return next();
        });
        registerHttpRoutes(multiManager.apiServer, this.createLowRiskRouter("v1"));

        multiManager.apiServer.op("post", `${multiManager.apiBase}/start`, (req) => multiManager.handleStartManagerRequest(req));
        multiManager.apiServer.op(
            "post",
            `${multiManager.apiBase}/cpm/:id/stop`,
            async (req, _res): Promise<MMRestAPI.OpResponse<MMRestAPI.SendStopManagerResponse>> => {
                const manager = multiManager.managersStore.getById(req.params!.id);

                if (manager) {
                    await manager.stop();

                    multiManager.managersStore.remove(req.params!.id);
                    return { id: req.params!.id, opStatus: ReasonPhrases.OK };
                }

                return { opStatus: ReasonPhrases.NOT_FOUND };
            }
        );

        multiManager.apiServer.use(`${multiManager.apiBase}/cpm/:id`, async (req, res, next) => await multiManager.cpmMiddleware(req, res, next));

        multiManager.apiServer.upstream(`${multiManager.apiBase}/log`, multiManager.apiCommonLogsPipe.getOut());
        multiManager.apiServer.upstream(`${multiManager.apiBase}/audit`, (req, _res) => multiManager.commonAuditPipe(req));

        this.attachV2Routes();
    }

    createLowRiskRouter(apiVersion: "v1" | "v2"): RouterDefinition {
        const multiManager = this.multiManager;
        const basePath = apiVersion === "v1" ? multiManager.apiBase : replacePathVersion(multiManager.apiBase, "v2");
        const objectResponse = z.object({}).passthrough();

        return Router.create({ basePath })
            .route(Router.get("/version", {
                id: `multi-manager.${apiVersion}.version`,
                schemas: {
                    response: z.object({
                        service: z.string(),
                        apiVersion: z.literal(apiVersion),
                        version: z.string(),
                        build: z.string()
                    })
                },
                handler: (): MMRestAPI.GetVersionResponse => ({
                    service: multiManager.service,
                    apiVersion,
                    version: multiManager.version,
                    build: multiManager.build,
                })
            }))
            .route(Router.get("/info", {
                id: `multi-manager.${apiVersion}.info`,
                schemas: {
                    response: z.object({
                        apiBase: z.string(),
                        apiPort: z.number(),
                        id: z.string(),
                        managersCount: z.number()
                    })
                },
                handler: (): MMRestAPI.GetInfoReposnse => ({
                    apiBase: basePath,
                    apiPort: multiManager.config.server.apiPort,
                    id: multiManager.id,
                    managersCount: multiManager.managersStore.size,
                })
            }))
            .route(Router.get("/load-check", {
                id: `multi-manager.${apiVersion}.load-check`,
                schemas: { response: z.unknown() },
                handler: async (): Promise<MMRestAPI.GetLoadCheckResponse> => multiManager.loadCheck.getLoadCheck()
            }))
            .route(Router.get("/list", {
                id: `multi-manager.${apiVersion}.list`,
                schemas: { response: z.array(objectResponse) },
                handler: () => multiManager.handleListManagersRequest()
            }))
            .route(Router.get("/health", {
                id: `multi-manager.${apiVersion}.health`,
                schemas: { response: objectResponse },
                handler: () => multiManager.healthCheck.getHealthCheckInfo()
            }))
            .route(Router.get("/verser2/trust/:id?", {
                id: `multi-manager.${apiVersion}.verser2.trust`,
                schemas: {
                    params: z.object({ id: z.string().optional() }).optional(),
                    response: objectResponse
                },
                handler: (req: RouteRequest) => {
                    const params = req.params as { id?: string } | undefined;
                    const manager = params?.id ? multiManager.managersStore.getById(params.id) : undefined;

                    if (params?.id && !manager) {
                        throw new Error(`Manager ${params.id} not found`);
                    }

                    return getMultiManagerVerser2TrustExport(multiManager.config.verser2, manager?.config);
                }
            }));
    }

    attachV2Routes() {
        registerHttpRoutes(this.multiManager.apiServer, this.createLowRiskRouter("v2"));
    }
}
