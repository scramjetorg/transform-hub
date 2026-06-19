import { RouteRequest, Router, RouterDefinition, registerHttpRoutes, replacePathVersion } from "@scramjet/api-router";
import { RestAPI2, RestAPI2Routes, getRestAPI2Route } from "@scramjet/rest-api2";

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
        const contract = RestAPI2Routes.manager.router(this.v2ApiBase);
        const route = (method: "get", path: string) => getRestAPI2Route(contract, method, path);

        return Router.create({ basePath: this.v2ApiBase })
            .route({ ...route("get", "/version"),
                id: "manager.v2.version",
                handler: (): RestAPI2.VersionResponse<RestAPI2.Manager> => ({
                    version: manager.version
                })
            })
            .route({ ...route("get", "/config"),
                id: "manager.v2.config",
                handler: (): RestAPI2.ConfigResponse<RestAPI2.Manager> => ({ config: manager.publicConfig })
            })
            .route({ ...route("get", "/verser2/trust"),
                id: "manager.v2.verser2.trust",
                handler: () => getManagerVerser2TrustExport(manager.config)
            })
            .route({ ...route("get", "/load"),
                id: "manager.v2.load",
                handler: async (): Promise<RestAPI2.LoadResponse<RestAPI2.Manager>> => {
                    const load = await manager.apiLoadCheck.getLoadCheck();

                    return { load: (load as { load?: number }).load ?? 0 };
                }
            })
            .route({ ...route("get", "/list"),
                id: "manager.v2.list",
                handler: req => this.listResponse<RestAPI2.Hub>(this.getPaginated(req, manager.getList.bind(manager)), "hosts")
            })
            .route({ ...route("get", "/hubs"),
                id: "manager.v2.hubs",
                handler: req => this.listResponse<RestAPI2.Hub>(this.getPaginated(req, manager.getList.bind(manager)), "hosts")
            })
            .route({ ...route("get", "/instances"),
                id: "manager.v2.instances",
                handler: req => this.listResponse<RestAPI2.Instance>(this.getPaginated(req, manager.getInstances.bind(manager)), "instances")
            })
            .route({ ...route("get", "/sequences"),
                id: "manager.v2.sequences",
                handler: () => this.listResponse<RestAPI2.Sequence>(manager.getSequencesIds(), "sequences")
            })
            .route({ ...route("get", "/all_sequences"),
                id: "manager.v2.all_sequences",
                handler: req => this.listResponse<RestAPI2.Sequence>(this.getPaginated(req, manager.getSequences.bind(manager)), "sequences")
            })
            .route({ ...route("get", "/entities"),
                id: "manager.v2.entities",
                handler: () => this.entityListResponse(manager.getEntities())
            })
            .route({ ...route("get", "/topics"),
                id: "manager.v2.topics",
                handler: () => this.listResponse<RestAPI2.Topic>(manager.apiServiceDiscovery.list(), "topics")
            })
            .resolve("/hubs/:hubId", {
                id: "manager.v2.hub.forward",
                description: "Resolve a selected Hub to its verser2 route domain for Host-owned v2 routes.",
                schemas: contract.resolvers()[0].schemas,
                targetDefinitions: contract.resolvers()[0].targetDefinitions,
                handler: ({ params, remainingPath }) => {
                    const hubId = (params as { hubId: string }).hubId;
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
                }
            });
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

    private toImplementerPath(remainingPath: string): string {
        return remainingPath === "/" ? this.v2ApiBase : `${this.v2ApiBase}${remainingPath}`;
    }
}
