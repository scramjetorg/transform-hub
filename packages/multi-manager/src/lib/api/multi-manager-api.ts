import { MMRestAPI, ParsedMessage } from "@scramjet/types";
import { ReasonPhrases } from "http-status-codes";

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
        multiManager.apiServer.get(
            `${multiManager.apiBase}/version`,
            (): MMRestAPI.GetVersionResponse => ({
                service: multiManager.service,
                apiVersion: multiManager.apiVersion,
                version: multiManager.version,
                build: multiManager.build,
            })
        );

        multiManager.apiServer.get(
            `${multiManager.apiBase}/info`,
            (): MMRestAPI.GetInfoReposnse => ({
                apiBase: multiManager.apiBase,
                apiPort: multiManager.config.server.apiPort,
                id: multiManager.id,
                managersCount: multiManager.managersStore.size,
            })
        );

        multiManager.apiServer.get(
            `${multiManager.apiBase}/load-check`,
            async (): Promise<MMRestAPI.GetLoadCheckResponse> => multiManager.loadCheck.getLoadCheck()
        );
        multiManager.apiServer.get(`${multiManager.apiBase}/list`, () => multiManager.handleListManagersRequest());
        multiManager.apiServer.get(`${multiManager.apiBase}/health`, () => multiManager.healthCheck.getHealthCheckInfo());
        multiManager.apiServer.get(`${multiManager.apiBase}/verser2/trust/:id?`, (req: ParsedMessage) => {
            const manager = req.params?.id ? multiManager.managersStore.getById(req.params.id) : undefined;

            if (req.params?.id && !manager) {
                throw new Error(`Manager ${req.params.id} not found`);
            }

            return getMultiManagerVerser2TrustExport(multiManager.config.verser2, manager?.config);
        });

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
    }
}
