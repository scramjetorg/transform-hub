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
        const routes = RestAPI2RouteSets.manager.routes();
        const router = bindRoutes(routes, {
            version: routeBinding.handler<typeof routes.version>(() => ({
                version: manager.version
            }), { id: "manager.v2.version" }),
            config: routeBinding.handler<typeof routes.config>(() => ({ config: manager.publicConfig }), { id: "manager.v2.config" }),
            trust: routeBinding.handler<typeof routes.trust>(() => getManagerVerser2TrustExport(manager.config), { id: "manager.v2.verser2.trust" }),
            load: routeBinding.handler<typeof routes.load>(async (): Promise<RestAPI2.LoadResponse<RestAPI2.Manager>> => {
                const load = await manager.apiLoadCheck.getLoadCheck();

                return { load: (load as { load?: number }).load ?? 0 };
            }, { id: "manager.v2.load" }),
            list: routeBinding.handler<typeof routes.list>(req => this.listResponse<RestAPI2.Hub>(this.getPaginated(req, manager.getList.bind(manager)), "hosts", id => ({ id })), { id: "manager.v2.list" }),
            hubs: routeBinding.handler<typeof routes.hubs>(req => this.listResponse<RestAPI2.Hub>(this.getPaginated(req, manager.getList.bind(manager)), "hosts", id => ({ id })), { id: "manager.v2.hubs" }),
            instances: routeBinding.handler<typeof routes.instances>(req => this.listResponse<RestAPI2.Instance>(this.getPaginated(req, manager.getInstances.bind(manager)), "instances", id => ({ id })), { id: "manager.v2.instances" }),
            sequences: routeBinding.handler<typeof routes.sequences>(() => this.listResponse<RestAPI2.Sequence>(manager.getSequencesIds(), "sequences", id => ({ id })), { id: "manager.v2.sequences" }),
            allSequences: routeBinding.handler<typeof routes.allSequences>(req => this.listResponse<RestAPI2.Sequence>(this.getPaginated(req, manager.getSequences.bind(manager)), "sequences", id => ({ id })), { id: "manager.v2.all_sequences" }),
            entities: routeBinding.handler<typeof routes.entities>(() => this.entityListResponse(manager.getEntities()), { id: "manager.v2.entities" }),
            topics: routeBinding.handler<typeof routes.topics>(() => this.listResponse<RestAPI2.Topic>(manager.apiServiceDiscovery.list(), "topics", name => ({ name })), { id: "manager.v2.topics" }),
            topicInfo: routeBinding.handler<typeof routes.topicInfo>(({ params }) => this.topicInfo(params.name), { id: "manager.v2.topic.info" }),
            topicRead: routeBinding.handler<typeof routes.topicRead>(req => manager.handleTopicUpstreamRequest(this.rawRequest(req), this.rawResponse(req)), { id: "manager.v2.topic.read" }),
            topicWrite: routeBinding.handler<typeof routes.topicWrite>(req => manager.handleTopicDownstreamRequest(this.rawRequest(req), this.rawResponse(req)), { id: "manager.v2.topic.write" }),
            logs: routeBinding.handler<typeof routes.logs>(() => manager.apiCommonLogsPipe.getOut(), { id: "manager.v2.logs" }),
            deleteHub: routeBinding.handler<typeof routes.deleteHub>(req => this.handleInventoryHubDelete(req), { id: "manager.v2.inventory.hub.delete" }),
            storageSequences: routeBinding.handler<typeof routes.storageSequences>(() => this.storageSequenceList(), { id: "manager.v2.storage.sequences" }),
            storageObjectRead: routeBinding.skip("Storage object read requires storage service extraction; do not proxy v2 through legacy v1 storage router."),
            storageObjectWrite: routeBinding.skip("Storage object write requires storage service extraction; do not proxy v2 through legacy v1 storage router."),
            storageObjectDelete: routeBinding.skip("Storage object delete requires storage service extraction; do not proxy v2 through legacy v1 storage router."),
            storageClear: routeBinding.handler<typeof routes.storageClear>(() => this.clearStorage(), { id: "manager.v2.storage.clear" })
        }, Router.create({ basePath: this.v2ApiBase }));
        const resolver = RestAPI2RouteSets.manager.resolvers(this.v2ApiBase).hub;

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
            id: "manager.v2.hub.forward",
            description: "Resolve a selected Hub to its verser2 route domain for Host-owned v2 routes."
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
