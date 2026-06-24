import { RawHttpRouteRequest, RouteRequest, Router, RouterDefinition, bindResolver, bindRoutes, registerHttpRoutes, replacePathVersion, resolverBinding, routeBinding } from "@scramjet/api-router";
import { RestAPI2, RestAPI2RouteSets } from "@scramjet/rest-api2";

import { getMultiManagerVerser2TrustExport } from "../verser2-trust-export";
import type { MultiManager } from "../multi-manager";

export class MultiManagerAPIV2Handler {
    constructor(private multiManager: MultiManager) {}

    get v2ApiBase() {
        return replacePathVersion(this.multiManager.apiBase, "v2");
    }

    createV2Router(): RouterDefinition {
        const multiManager = this.multiManager;
        const routes = RestAPI2RouteSets.root.routes();
        const router = bindRoutes(routes, {
            version: routeBinding.handler<typeof routes.version>(() => ({
                service: multiManager.service,
                apiVersion: "v2",
                version: multiManager.version,
                build: multiManager.build,
            }), { id: "root.v2.version" }),
            info: routeBinding.handler<typeof routes.info>(() => ({
                apiBase: this.v2ApiBase,
                apiPort: multiManager.config.server.apiPort,
                id: multiManager.id,
                spacesCount: multiManager.managersStore.size,
            }), { id: "root.v2.info" }),
            load: routeBinding.handler<typeof routes.load>(async (): Promise<RestAPI2.LoadResponse<RestAPI2.Root>> => {
                const load = await multiManager.loadCheck.getLoadCheck() as { load?: number };

                return { load: load.load ?? 0 };
            }, { id: "root.v2.load" }),
            spaces: routeBinding.handler<typeof routes.spaces>(() => ({
                items: (multiManager.handleListManagersRequest() as unknown[]).map(manager => this.toSpaceItem(manager))
            }), { id: "root.v2.spaces" }),
            health: routeBinding.handler<typeof routes.health>(() => multiManager.getV2HealthCheckInfo(), { id: "root.v2.health" }),
            trust: routeBinding.handler<typeof routes.trust>((req: RouteRequest) => this.getTrustExport(req), { id: "root.v2.verser2.trust" }),
            audit: routeBinding.handler<typeof routes.audit>((req: RawHttpRouteRequest) => multiManager.commonAuditPipe(req.raw.request), { id: "root.v2.audit" })
        }, Router.create({ basePath: this.v2ApiBase }));
        const resolver = RestAPI2RouteSets.root.resolvers(this.v2ApiBase).space;

        return bindResolver(resolver, resolverBinding.handler(({ params, remainingPath }) => {
            const spaceId = params.spaceId;
            const manager = this.multiManager.managersStore.getById(spaceId);

            if (!manager?.router) {
                return undefined;
            }

            return {
                local: {
                    lookup: (req: unknown, res: unknown, next: (err?: Error) => void) => {
                        const request = req as { url?: string };
                        const originalUrl = request.url;

                        request.url = this.toManagerImplementerPath(remainingPath);

                        try {
                            return manager.router.lookup(req as any, res as any, next);
                        } finally {
                            request.url = originalUrl;
                        }
                    }
                }
            };
        }, {
            id: "root.v2.space.forward",
            description: "Resolve a selected Space to its verser2 route domain for Space-owned v2 routes."
        }), router);
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

    private toSpaceItem(manager: unknown): RestAPI2.Space {
        if (typeof manager === "string") {
            return { id: manager };
        }

        const record = manager as Record<string, unknown>;

        let hubs: number | undefined;

        if (typeof record.hubs === "number") {
            hubs = record.hubs;
        } else if (typeof record.hosts === "number") {
            hubs = record.hosts;
        }

        return {
            id: String(record.id || record.managerId || record.name || ""),
            hubs
        };
    }
}
