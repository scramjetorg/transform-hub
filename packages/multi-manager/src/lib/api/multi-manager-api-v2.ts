import { RawHttpRouteRequest, RouteRequest, Router, RouterDefinition, bindResolver, bindRoutes, registerHttpRoutes, replacePathVersion, resolverBinding, routeBinding } from "@scramjet/api-router";
import { RestAPI2, RestAPI2RouteSets } from "@scramjet/rest-api2";
import { createDefaultHealthComponents, summarizeHealth } from "@scramjet/load-check";

import { getMultiManagerVerser2TrustExport } from "../verser2-trust-export";
import type { MultiManager } from "../multi-manager";

export class MultiManagerAPIV2Handler {
    constructor(private multiManager: MultiManager) {}

    get v2ApiBase() {
        return replacePathVersion(this.multiManager.apiBase, "v2");
    }

    createV2Router(): RouterDefinition {
        const multiManager = this.multiManager;
        const routes = RestAPI2RouteSets.multiManager.routes();
        const router = bindRoutes(routes, {
            version: routeBinding.handler<typeof routes.version>(() => ({
                service: multiManager.service,
                apiVersion: "v2",
                version: multiManager.version,
                build: multiManager.build,
            }), { id: "multi-manager.v2.version" }),
            info: routeBinding.handler<typeof routes.info>(() => ({
                apiBase: this.v2ApiBase,
                apiPort: multiManager.config.server.apiPort,
                id: multiManager.id,
                managersCount: multiManager.managersStore.size,
            }), { id: "multi-manager.v2.info" }),
            load: routeBinding.handler<typeof routes.load>(async (): Promise<RestAPI2.LoadResponse<RestAPI2.MultiManager>> => {
                const load = await multiManager.loadCheck.getLoadCheck() as { load?: number };

                return { load: load.load ?? 0 };
            }, { id: "multi-manager.v2.load" }),
            list: routeBinding.handler<typeof routes.list>(() => ({
                items: (multiManager.handleListManagersRequest() as unknown[]).map(manager => this.toMultiManagerItem(manager))
            }), { id: "multi-manager.v2.list" }),
            health: routeBinding.handler<typeof routes.health>(() => this.toHealthCheckInfo(multiManager.healthCheck.getHealthCheckInfo()), { id: "multi-manager.v2.health" }),
            trust: routeBinding.handler<typeof routes.trust>((req: RouteRequest) => this.getTrustExport(req), { id: "multi-manager.v2.verser2.trust" }),
            audit: routeBinding.handler<typeof routes.audit>((req: RawHttpRouteRequest) => multiManager.commonAuditPipe(req.raw.request), { id: "multi-manager.v2.audit" })
        }, Router.create({ basePath: this.v2ApiBase }));
        const resolver = RestAPI2RouteSets.multiManager.resolvers(this.v2ApiBase).manager;

        return bindResolver(resolver, resolverBinding.handler(({ params, remainingPath }) => {
            const managerId = params.managerId;
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
        }, {
            id: "multi-manager.v2.manager.forward",
            description: "Resolve a selected Manager to its verser2 route domain for Manager-owned v2 routes."
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

    private toMultiManagerItem(manager: unknown): RestAPI2.MultiManager {
        if (typeof manager === "string") {
            return { id: manager, apiBase: this.v2ApiBase };
        }

        const record = manager as Record<string, unknown>;

        return {
            id: String(record.id || record.managerId || record.name || ""),
            apiBase: String(record.apiBase || this.v2ApiBase),
            managers: typeof record.managers === "number" ? record.managers : undefined
        };
    }

    private async toHealthCheckInfo(info: unknown): Promise<RestAPI2.HealthCheckInfo<RestAPI2.MultiManager>> {
        const record = info as Record<string, unknown>;
        const scope = { id: this.multiManager.id, apiBase: this.v2ApiBase, managers: this.multiManager.managersStore.size };
        const currentHealthy = Object.values((record.modules as Record<string, boolean> | undefined) || { server: true }).every(Boolean);
        const components = await createDefaultHealthComponents({
            current: { name: "multi-manager", healthy: currentHealthy, scope, details: info },
            processMemoryLimitBytes: this.multiManager.loadCheck?.constants?.SAFE_OPERATION_LIMIT || undefined,
            osDiskPaths: this.multiManager.loadCheck?.config?.fsPaths
        });

        return summarizeHealth(scope, components, info);
    }
}
