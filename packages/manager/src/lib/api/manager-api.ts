import { CeroError } from "@scramjet/api-server";
import { MRestAPI, ParsedMessage } from "@scramjet/types";
import { ReasonPhrases } from "http-status-codes";
import { IncomingMessage, ServerResponse } from "http";

import { getS3Router } from "../s3-router";
import { prepareDisconnectDroplist, translateDeleteError, translateDisconnectError, validateDisconnectRequest } from "../utils";
import { getManagerVerser2TrustExport } from "../verser2-trust-export";
import type { Manager, SthRegistrationPayload } from "../manager";

const defaultLimit = 100;
const defaultOffset = 0;

export class ManagerAPIHandler {
    constructor(private manager: Manager) {}

    async attach() {
        const manager = this.manager;
        const apiBase = manager.config.apiBase;
        const router = manager.router;

        router.get(`${apiBase}/sth/:id/info`, (req: ParsedMessage): MRestAPI.GetHostInfoResponse => {
            const sth = manager.apiSthConnectionStore.getById(req.params?.id);

            if (!sth) {
                throw new CeroError("ERR_NOT_FOUND");
            }

            return sth.getInfo();
        });

        router.get(
            `${apiBase}/version`,
            (): MRestAPI.GetVersionResponse => ({
                service: manager.service,
                apiVersion: manager.apiVersion,
                version: manager.version,
                build: manager.build,
            })
        );

        router.get(`${apiBase}/config`, (): MRestAPI.GetConfigResponse => ({ config: manager.publicConfig }));
        router.get(`${apiBase}/verser2/trust`, () => getManagerVerser2TrustExport(manager.config));
        router.op("post", `${apiBase}/sth`, async (req: IncomingMessage): Promise<{ id: string; opStatus: string }> => {
            const payload = (req as IncomingMessage & { body: SthRegistrationPayload }).body || {};
            const id = await manager.handleSthRegistration(payload);

            return { id, opStatus: ReasonPhrases.ACCEPTED };
        });
        router.get(`${apiBase}/list`, (req: ParsedMessage): MRestAPI.GetListResponse => {
            let offset = req.query && req.query.offset ? parseInt(req.query.offset, 10) : defaultOffset;
            let limit = req.query && req.query.limit ? parseInt(req.query.limit, 10) : defaultLimit;

            if (!manager.validateQueries(offset, limit)) {
                offset = defaultOffset;
                limit = defaultLimit;
            }

            return manager.getList(offset, limit);
        });
        router.get(`${apiBase}/instances`, (req: ParsedMessage): MRestAPI.GetInstancesResponse => {
            let offset = req.query && req.query.offset ? parseInt(req.query.offset, 10) : defaultOffset;
            let limit = req.query && req.query.limit ? parseInt(req.query.limit, 10) : defaultLimit;

            if (!manager.validateQueries(offset, limit)) {
                offset = defaultOffset;
                limit = defaultLimit;
            }

            return manager.getInstances(offset, limit);
        });
        router.get(`${apiBase}/sequences`, (): MRestAPI.GetSequenceIDSResponse => manager.getSequencesIds());
        router.get(`${apiBase}/all_sequences`, (req: ParsedMessage): MRestAPI.GetSequencesResponse => {
            let offset = req.query && req.query.offset ? parseInt(req.query.offset, 10) : defaultOffset;
            let limit = req.query && req.query.limit ? parseInt(req.query.limit, 10) : defaultLimit;

            if (!manager.validateQueries(offset, limit)) {
                offset = defaultOffset;
                limit = defaultLimit;
            }

            return manager.getSequences(offset, limit);
        });
        router.get(`${apiBase}/entities`, (): MRestAPI.GetEntitiesResponse => manager.getEntities());
        router.get(`${apiBase}/topics`, (): MRestAPI.GetTopicsResponse => manager.apiServiceDiscovery.list());
        router.get(`${apiBase}/load`, (): Promise<MRestAPI.GetLoadResponse> => manager.apiLoadCheck.getLoadCheck());

        router.upstream(`${apiBase}/log`, () => manager.apiCommonLogsPipe.getOut());
        router.upstream(`${apiBase}/load-stream`, () => manager.apiLoadCheck.getLoadCheckStream());

        router.upstream(`${apiBase}/topic/:name`, (req: ParsedMessage, res: ServerResponse) => {
            return manager.handleTopicUpstreamRequest(req, res);
        });

        router.downstream(
            `${apiBase}/topic/:name`,
            async (req: ParsedMessage, res: ServerResponse) => {
                return manager.handleTopicDownstreamRequest(req, res);
            },
            { checkContentType: false, end: false }
        );

        router.op("delete", `${apiBase}/store`, async (): Promise<MRestAPI.StoreClearResponse> => {
            try {
                await manager.apiS3Middleware.clearIndex();
                return { opStatus: ReasonPhrases.ACCEPTED };
            } catch (err: any) {
                return {
                    opStatus: ReasonPhrases.NOT_FOUND,
                    error: err.message
                };
            }
        });

        router.op("delete", `${apiBase}/sth/:id`, async (req: ParsedMessage): Promise<MRestAPI.HubDeleteResponse> => {
            req.params ||= {};

            const id = req.params.id;
            const force = req.headers["x-force"] === "true";

            if (!id) {
                return {
                    opStatus: ReasonPhrases.NOT_FOUND,
                    error: "Id was not supplied"
                };
            }

            manager.logger.debug("Received delete request", { id, force });

            try {
                await manager.apiSthConnectionStore.delete(id, force);
            } catch (e: any) {
                return translateDeleteError(e);
            }
            return {
                opStatus: ReasonPhrases.ACCEPTED,
            };
        });
        router.use(`${apiBase}/sth/:id`, (req: ParsedMessage, res: ServerResponse) => manager.handleRequestToSTH(req, res));

        if (manager.config.s3) {
            manager.apiS3Middleware = await getS3Router(manager.s3Client, {
                base: `${apiBase}/s3`,
                id: manager.id,
                bucket: manager.config.s3.bucket!,
                bucketLimit: manager.config.s3.bucketLimit
            });

            manager.apiS3Middleware.logger.pipe(manager.logger);

            await manager.apiS3Middleware.loadIndex();

            router.use(`${apiBase}/s3/`, (req: ParsedMessage, res: ServerResponse, next: any) => {
                return manager.apiS3Middleware.router.lookup(req, res, next);
            });
        }

        router.op("post", `${apiBase}/disconnect`, async (req: IncomingMessage): Promise<MRestAPI.PostDisconnectResponse> => {
            // eslint-disable-next-line no-extra-parens
            const payload = (req as IncomingMessage & { body: MRestAPI.PostDisconnectPayload }).body || {};

            manager.logger.debug("Received disconnect request", payload);
            const requestInvalid = validateDisconnectRequest(payload, manager.apiSthConnectionStore);

            if (requestInvalid === 0 || requestInvalid !== undefined) {
                return translateDisconnectError(requestInvalid);
            }
            const dropList = prepareDisconnectDroplist(payload, manager.apiSthConnectionStore);

            dropList.forEach(drop => {
                manager.logger.info("dropping", drop.sthController.id, drop.reason);
                drop.sthController.disconnect(drop.reason).catch((err: Error) => {
                    manager.logger.error("STH disconnect error", err.message);
                });
            });

            return {
                opStatus: ReasonPhrases.ACCEPTED,
                managerId: manager.id,
                disconnected: dropList.map(elem => ({
                    sthId: elem.sthController.id,
                    reason: elem.reason
                }))
            };
        });
    }
}
