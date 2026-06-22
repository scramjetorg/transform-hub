import { RawHttpRouteRequest, RouteRequest, Router, RouterDefinition, bindResolver, bindRoutes, registerHttpRoutes, replacePathVersion, resolverBinding, routeBinding } from "@scramjet/api-router";
import { RestAPI2, RestAPI2RouteSets } from "@scramjet/rest-api2";
import { DisconnectReason, ParsedMessage } from "@scramjet/types";
import { ServerResponse } from "http";

import { getManagerVerser2TrustExport } from "../verser2-trust-export";
import type { Manager } from "../manager";

const defaultLimit = 100;
const defaultOffset = 0;

type StoredSequenceInfo = {
    _filename?: string;
    id?: string;
    packageSize?: number;
};

function isDisconnectReason(reason: string): reason is DisconnectReason {
    return reason === "key_revoked" || reason === "limit_exceeded" || reason === "id_drop" || reason === "disconnected";
}

export class ManagerAPIV2Handler {
    constructor(private manager: Manager) {}

    get v2ApiBase() {
        return replacePathVersion(this.manager.config.apiBase, "v2");
    }

    createV2Router(): RouterDefinition {
        const manager = this.manager;
        const routes = RestAPI2RouteSets.space.routes();
        const router = bindRoutes(routes, {
            version: routeBinding.handler<typeof routes.version>(() => ({
                version: manager.version
            }), { id: "space.v2.version" }),
            config: routeBinding.handler<typeof routes.config>(() => ({ config: manager.publicConfig }), { id: "space.v2.config" }),
            trust: routeBinding.handler<typeof routes.trust>(() => getManagerVerser2TrustExport(manager.config), { id: "space.v2.verser2.trust" }),
            load: routeBinding.handler<typeof routes.load>(async (): Promise<RestAPI2.LoadResponse<RestAPI2.Space>> => {
                const load = await manager.apiLoadCheck.getLoadCheck();

                return { load: (load as { load?: number }).load ?? 0 };
            }, { id: "space.v2.load" }),
            health: routeBinding.handler<typeof routes.health>(() => manager.getV2HealthCheckInfo(), { id: "space.v2.health" }),
            list: routeBinding.handler<typeof routes.list>(req => this.listResponse<RestAPI2.Hub>(this.getPaginated(req, manager.getList.bind(manager)), "hosts", id => ({ id })), { id: "space.v2.list" }),
            hubs: routeBinding.handler<typeof routes.hubs>(req => this.listResponse<RestAPI2.Hub>(this.getPaginated(req, manager.getList.bind(manager)), "hosts", id => ({ id })), { id: "space.v2.hubs" }),
            instances: routeBinding.handler<typeof routes.instances>(req => ({
                items: this.mapManagerInstances(this.getPaginated(req, manager.getInstances.bind(manager)))
            }), { id: "space.v2.instances" }),
            sequences: routeBinding.handler<typeof routes.sequences>(() => ({
                items: manager.getSequencesIds().map(id => ({ id: String(id) }))
            }), { id: "space.v2.sequences" }),
            allSequences: routeBinding.handler<typeof routes.allSequences>(req => ({
                items: this.mapManagerSequences(this.getPaginated(req, manager.getSequences.bind(manager)))
            }), { id: "space.v2.all_sequences" }),
            entities: routeBinding.handler<typeof routes.entities>(() => this.entityListResponse(manager.getEntities()), { id: "space.v2.entities" }),
            topics: routeBinding.handler<typeof routes.topics>(() => this.topicListResponse(manager.apiServiceDiscovery.list()), { id: "space.v2.topics" }),
            topicInfo: routeBinding.handler<typeof routes.topicInfo>(({ params }) => this.topicInfo(params.name), { id: "space.v2.topic.info" }),
            topicRead: routeBinding.handler<typeof routes.topicRead>(req => manager.handleTopicUpstreamRequest(this.rawRequest(req), this.rawResponse(req)), { id: "space.v2.topic.read" }),
            topicWrite: routeBinding.handler<typeof routes.topicWrite>(req => manager.handleTopicDownstreamRequest(this.rawRequest(req), this.rawResponse(req)), { id: "space.v2.topic.write" }),
            logs: routeBinding.handler<typeof routes.logs>(() => manager.apiCommonLogsPipe.getOut(), { id: "space.v2.logs" }),
            audit: routeBinding.handler<typeof routes.audit>(req => this.handleAuditRequest(req), { id: "space.v2.audit" }),
            deleteHub: routeBinding.handler<typeof routes.deleteHub>(req => this.handleInventoryHubDelete(req), { id: "space.v2.inventory.hub.delete" }),
            storageSequences: routeBinding.handler<typeof routes.storageSequences>(() => this.storageSequenceList(), { id: "space.v2.storage.sequences" }),
            storageObjectRead: routeBinding.skip("Storage object read requires storage service extraction; do not proxy v2 through legacy v1 storage router."),
            storageObjectWrite: routeBinding.skip("Storage object write requires storage service extraction; do not proxy v2 through legacy v1 storage router."),
            storageObjectDelete: routeBinding.skip("Storage object delete requires storage service extraction; do not proxy v2 through legacy v1 storage router."),
            storageClear: routeBinding.handler<typeof routes.storageClear>(() => this.clearStorage(), { id: "space.v2.storage.clear" })
        }, Router.create({ basePath: this.v2ApiBase }));
        const resolver = RestAPI2RouteSets.space.resolvers(this.v2ApiBase).hub;

        return bindResolver(resolver, resolverBinding.handler(({ params, remainingPath }) => {
            const hubId = params.hubId;
            const sth = manager.apiSthConnectionStore.getById(hubId);

            if (!sth || !sth.isConnectionActive || !sth.routeDomain) {
                return undefined;
            }

            return {
                redirect: {
                    routeDomain: sth.routeDomain,
                    targetPath: this.toImplementerPath(remainingPath)
                }
            };
        }, {
            id: "space.v2.hub.forward",
            description: "Resolve a selected Hub to its verser2 route domain for Hub-owned v2 routes."
        }), router);
    }

    attach() {
        registerHttpRoutes(this.manager.router, this.createV2Router());
        this.attachStorageCompatibilityProxy();
    }

    private attachStorageCompatibilityProxy() {
        const storageBase = `${this.v2ApiBase}/storage/objects`;
        const middleware = (req: ParsedMessage, res: ServerResponse, next: (err?: Error) => void) => this.handleStorageCompatibilityProxy(req, res, next);

        this.manager.router.use(storageBase, middleware);
        this.manager.router.use(`${storageBase}/*`, middleware);
    }

    private handleStorageCompatibilityProxy(req: ParsedMessage, res: ServerResponse, next: (err?: Error) => void) {
        const storageRouter = this.manager.apiS3Middleware?.router;

        if (!storageRouter?.lookup) {
            if (!res.headersSent) {
                res.writeHead?.(404, { "content-type": "application/json" });
            }

            res.end?.(JSON.stringify({ error: { message: "Storage proxy is not configured" } }));
            return;
        }

        const originalUrl = req.url;
        const storageBase = `${this.v2ApiBase}/storage/objects`;
        const legacyBase = `${this.manager.config.apiBase}/s3`;
        const suffix = String(req.url || storageBase).replace(storageBase, "") || "";

        req.url = `${legacyBase}${suffix}`;

        try {
            storageRouter.lookup(req, res, next);
        } finally {
            req.url = originalUrl;
        }
    }

    private getPaginated(req: RouteRequest, getter: (offset: number, limit: number) => unknown): unknown {
        const query = req.query as { offset?: string | number; limit?: string | number } | undefined;
        let offset = query?.offset !== undefined ? parseInt(String(query.offset), 10) : defaultOffset;
        let limit = query?.limit !== undefined ? parseInt(String(query.limit), 10) : defaultLimit;

        if (!this.manager.validateQueries(offset, limit)) {
            offset = defaultOffset;
            limit = defaultLimit;
        }

        return getter(offset, limit);
    }

    private rawRequest(req: RawHttpRouteRequest): ParsedMessage {
        if (!req.raw?.request) {
            throw new Error("Raw HTTP request is required for Manager v2 topic stream routes");
        }

        return req.raw.request;
    }

    private rawResponse(req: RawHttpRouteRequest): ServerResponse {
        if (!req.raw?.response) {
            throw new Error("Raw HTTP response is required for Manager v2 topic stream routes");
        }

        return req.raw.response;
    }

    private async handleAuditRequest(req: RawHttpRouteRequest) {
        await this.manager.auditor.setFlowing(true);
        req.raw.request.on("close", () => {
            this.manager.auditor.setFlowing(false).catch(() => undefined);
        });

        return this.manager.auditor.output;
    }

    private listResponse<TItem>(source: unknown, property: string, fromString: (value: string) => TItem): RestAPI2.ListResponse<TItem> {
        const value = Array.isArray(source) ? source : (source as Record<string, unknown> | undefined)?.[property];
        const items = Array.isArray(value) ? value : [];

        return {
            items: items.map(item => this.toListItem<TItem>(item, fromString))
        };
    }

    private entityListResponse(source: unknown): RestAPI2.ListResponse<RestAPI2.Entity> {
        const record = source as Record<string, unknown> | undefined;
        const explicit = record && Array.isArray(record.entities) ? record.entities : undefined;
        const sequences = record && Array.isArray(record.sequences) ? record.sequences.map(item => ({ ...this.toListItem<Record<string, unknown>>(item, id => ({ id })), type: "sequence" })) : [];
        const instances = record && Array.isArray(record.instances) ? record.instances.map(item => ({ ...this.toListItem<Record<string, unknown>>(item, id => ({ id })), type: "instance" })) : [];
        const items = explicit || [...sequences, ...instances];

        return {
            items: items.map(item => this.toListItem<RestAPI2.Entity>(item, id => ({ id })))
        };
    }

    private topicListResponse(source: unknown): RestAPI2.ListResponse<RestAPI2.Topic> {
        const items = Array.isArray(source) ? source : (source as { topics?: unknown[] } | undefined)?.topics || [];

        return {
            items: items.map(item => this.toTopicItem(item))
        };
    }

    private toTopicItem(item: unknown): RestAPI2.Topic {
        if (typeof item === "string") {
            return { name: item, contentType: "" };
        }

        const record = item as Record<string, unknown> | undefined;

        return {
            name: String(record?.name || record?.topic || record?.topicName || ""),
            contentType: String(record?.contentType || ""),
            direction: record?.direction as RestAPI2.Topic["direction"] | undefined
        };
    }

    private toListItem<TItem>(item: unknown, fromString: (value: string) => TItem): TItem {
        if (typeof item === "string") {
            return fromString(item);
        }

        return item as TItem;
    }

    private topicInfo(name: string): RestAPI2.Topic {
        const topics = this.manager.apiServiceDiscovery.list() as Array<Record<string, unknown>>;
        const topic = topics.find(item => item.name === name || item.topic === name || item.topicName === name);

        return {
            name,
            contentType: String(topic?.contentType || ""),
            direction: topic?.direction as RestAPI2.Topic["direction"] | undefined
        };
    }

    private async handleInventoryHubDelete(req: RouteRequest): Promise<RestAPI2.OpResponse<RestAPI2.DeleteHubResponse>> {
        const params = req.params as { hubId?: string } | undefined;
        const query = req.query as RestAPI2.DeleteHubQuery | undefined;
        const hubId = params?.hubId || "";
        const force = query?.force === true;
        const shouldDelete = query?.delete === true;

        if (!hubId) {
            return this.failedOperation("MISSING_HUB_ID", "Missing hub id parameter", hubId);
        }

        if (shouldDelete) {
            return this.deleteHub(hubId, force);
        }

        return this.disconnectHub(hubId, query?.reason);
    }

    private async deleteHub(hubId: string, force: boolean): Promise<RestAPI2.OpResponse<RestAPI2.DeleteHubResponse>> {
        try {
            await this.manager.apiSthConnectionStore.delete(hubId, force);

            return {
                operation: { id: hubId, status: "completed" },
                result: { hubId, deleted: true, disconnected: true }
            };
        } catch (error: any) {
            return this.failedOperation("DELETE_HUB_FAILED", error?.message || "Hub delete failed", hubId);
        }
    }

    private async disconnectHub(hubId: string, reason?: string): Promise<RestAPI2.OpResponse<RestAPI2.DeleteHubResponse>> {
        const hub = this.manager.apiSthConnectionStore.getById(hubId);

        if (!hub) {
            return this.failedOperation("HUB_NOT_FOUND", "Couldn't find Hub with a given ID", hubId);
        }

        if (hub.selfHosted === false) {
            return this.failedOperation("NATIVE_HUB", "Unable to disconnect native hub", hubId);
        }

        if (hub.disconnected) {
            return this.failedOperation("ALREADY_DISCONNECTED", "Hub with a given id is already disconnected", hubId);
        }

        if (hub.isConnectionActive) {
            await hub.disconnect(this.disconnectReason(reason));
        }

        return {
            operation: { id: hubId, status: "completed" },
            result: { hubId, deleted: false, disconnected: true }
        };
    }

    private storageSequenceList(): RestAPI2.ListResponse<RestAPI2.StoreItem> {
        const sequences: StoredSequenceInfo[] = this.manager.apiS3Middleware?.index?.sequences || [];

        return {
            items: sequences.map(sequence => ({
                path: String(sequence._filename || sequence.id || ""),
                size: typeof sequence.packageSize === "number" ? sequence.packageSize : undefined
            }))
        };
    }

    private async clearStorage(): Promise<RestAPI2.StoreClearResponse> {
        if (!this.manager.apiS3Middleware?.clearIndex) {
            return { cleared: false };
        }

        await this.manager.apiS3Middleware.clearIndex();

        return { cleared: true };
    }

    private mapManagerInstances(source: unknown): RestAPI2.Instance[] {
        const items = Array.isArray(source) ? source : (source as Record<string, unknown> | undefined)?.["instances"] ?? [];
        const instancesArray = Array.isArray(items) ? items : [];

        return instancesArray.map((inst: any) => {
            const hubId = inst.hubId;
            const instanceId = String(inst.id || "");
            const seqId = inst.sequenceId || inst.sequence?.id;
            const seqName = inst.sequence?.name ?? inst.sequence?.config?.name ?? inst.sequence?.config?.id ?? inst.sequenceName ?? seqId;
            const seqInfo: RestAPI2.Instance["sequence"] = seqId ? {
                id: seqId,
                name: seqName,
                hubId: hubId || seqId,
                location: inst.sequence?.location || hubId || seqId,
                apiBase: hubId ? `${this.v2ApiBase}/hubs/${hubId}/sequences/${seqId}` : `${this.v2ApiBase}/sequences/${seqId}`,
            } : undefined;

            const item: RestAPI2.Instance = {
                id: instanceId,
                instanceName: inst.instanceName,
                sequenceId: seqId,
                status: inst.status,
                hubId,
                location: inst.location || hubId,
                apiBase: hubId ? `${this.v2ApiBase}/hubs/${hubId}/instances/${instanceId}` : `${this.v2ApiBase}/instances/${instanceId}`,
                sequence: seqInfo,
            };

            return item;
        });
    }

    private mapManagerSequences(source: unknown): RestAPI2.Sequence[] {
        const items = Array.isArray(source) ? source : (source as Record<string, unknown> | undefined)?.["sequences"] ?? [];
        const seqArray = Array.isArray(items) ? items : [];

        return seqArray.map((seq: any) => {
            const seqId = String(seq.id || "");
            const hubId = seq.hubId;

            const item: RestAPI2.Sequence = {
                id: seqId,
                name: seq.name ?? seq.config?.name ?? seq.config?.id ?? seqId,
                status: seq.status,
                hubId,
                location: seq.location,
                apiBase: hubId ? `${this.v2ApiBase}/hubs/${hubId}/sequences/${seqId}` : `${this.v2ApiBase}/sequences/${seqId}`,
                instances: seq.instances,
            };

            return item;
        });
    }

    private failedOperation<TOutput>(code: string, message: string, id: string): RestAPI2.OpResponse<TOutput> {
        return {
            operation: { id: id || code, status: "failed" },
            error: { code, message }
        };
    }

    private toImplementerPath(remainingPath: string): string {
        return remainingPath === "/" ? this.v2ApiBase : `${this.v2ApiBase}${remainingPath}`;
    }

    private disconnectReason(reason?: string): DisconnectReason {
        return reason && isDisconnectReason(reason) ? reason : "id_drop";
    }
}
