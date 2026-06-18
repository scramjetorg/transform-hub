import { RouteRequest, Router, RouterDefinition, registerHttpRoutes, replacePathVersion } from "@scramjet/api-router";
import { RestAPI2 } from "@scramjet/rest-api2";
import { z } from "zod";

import { getManagerVerser2TrustExport } from "../verser2-trust-export";
import type { Manager } from "../manager";

const defaultLimit = 100;
const defaultOffset = 0;

export class ManagerAPIV2Handler {
    constructor(private manager: Manager) {}

    get v2ApiBase() {
        return replacePathVersion(this.manager.config.apiBase, "v2");
    }

    createV2Router(): RouterDefinition {
        const manager = this.manager;
        const objectResponse = z.object({}).passthrough();
        const listResponse = z.object({ items: z.array(z.unknown()) }).passthrough();
        const querySchema = z.object({
            offset: z.union([z.string(), z.number()]).optional(),
            limit: z.union([z.string(), z.number()]).optional()
        }).passthrough().optional();

        return Router.create({ basePath: this.v2ApiBase })
            .route(Router.get("/version", {
                id: "manager.v2.version",
                schemas: { response: objectResponse },
                handler: (): RestAPI2.VersionResponse<RestAPI2.Manager> => ({
                    version: manager.version
                })
            }))
            .route(Router.get("/config", {
                id: "manager.v2.config",
                schemas: { response: objectResponse },
                handler: (): RestAPI2.ConfigResponse<RestAPI2.Manager> => ({ config: manager.publicConfig })
            }))
            .route(Router.get("/verser2/trust", {
                id: "manager.v2.verser2.trust",
                schemas: { response: objectResponse },
                handler: () => getManagerVerser2TrustExport(manager.config)
            }))
            .route(Router.get("/load", {
                id: "manager.v2.load",
                schemas: { response: objectResponse },
                handler: async (): Promise<RestAPI2.LoadResponse<RestAPI2.Manager>> => {
                    const load = await manager.apiLoadCheck.getLoadCheck();

                    return { load: (load as { load?: number }).load ?? 0 };
                }
            }))
            .route(Router.get("/list", {
                id: "manager.v2.list",
                schemas: { query: querySchema, response: listResponse },
                handler: req => this.listResponse<RestAPI2.Hub>(this.getPaginated(req, manager.getList.bind(manager)), "hosts")
            }))
            .route(Router.get("/instances", {
                id: "manager.v2.instances",
                schemas: { query: querySchema, response: listResponse },
                handler: req => this.listResponse<RestAPI2.Instance>(this.getPaginated(req, manager.getInstances.bind(manager)), "instances")
            }))
            .route(Router.get("/sequences", {
                id: "manager.v2.sequences",
                schemas: { response: listResponse },
                handler: () => this.listResponse<RestAPI2.Sequence>(manager.getSequencesIds(), "sequences")
            }))
            .route(Router.get("/all_sequences", {
                id: "manager.v2.all_sequences",
                schemas: { query: querySchema, response: listResponse },
                handler: req => this.listResponse<RestAPI2.Sequence>(this.getPaginated(req, manager.getSequences.bind(manager)), "sequences")
            }))
            .route(Router.get("/entities", {
                id: "manager.v2.entities",
                schemas: { response: listResponse },
                handler: () => this.entityListResponse(manager.getEntities())
            }))
            .route(Router.get("/topics", {
                id: "manager.v2.topics",
                schemas: { response: listResponse },
                handler: () => this.listResponse<RestAPI2.Topic>(manager.apiServiceDiscovery.list(), "topics")
            }));
    }

    attach() {
        registerHttpRoutes(this.manager.router, this.createV2Router());
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

    private listResponse<TItem>(source: unknown, property: string): RestAPI2.ListResponse<TItem> {
        const value = Array.isArray(source) ? source : (source as Record<string, unknown> | undefined)?.[property];
        const items = Array.isArray(value) ? value : [];

        return {
            items: items.map(item => this.toListItem<TItem>(item))
        };
    }

    private entityListResponse(source: unknown): RestAPI2.ListResponse<RestAPI2.Entity> {
        const record = source as Record<string, unknown> | undefined;
        const explicit = record && Array.isArray(record.entities) ? record.entities : undefined;
        const sequences = record && Array.isArray(record.sequences) ? record.sequences.map(item => ({ ...this.toListItem<Record<string, unknown>>(item), type: "sequence" })) : [];
        const instances = record && Array.isArray(record.instances) ? record.instances.map(item => ({ ...this.toListItem<Record<string, unknown>>(item), type: "instance" })) : [];
        const items = explicit || [...sequences, ...instances];

        return {
            items: items.map(item => this.toListItem<RestAPI2.Entity>(item))
        };
    }

    private toListItem<TItem>(item: unknown): TItem {
        if (typeof item === "string") {
            return { id: item } as unknown as TItem;
        }

        return item as TItem;
    }
}
