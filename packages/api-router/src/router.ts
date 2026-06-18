import { ResolverDefinition, ResolverManifestEntry, RouteDefinition, RouteManifest, RouteManifestEntry, RouteSchemas, joinPaths, normalizePath, routeId } from "./manifest";
import { RouteHook } from "./hooks";

export type RouterOptions = {
    basePath?: string;
    hooks?: RouteHook[];
};

export type RouterMount = {
    path: string;
    // eslint-disable-next-line no-use-before-define
    router: RouterDefinition;
    hooks: RouteHook[];
};

export type CollectedRoute = {
    route: RouteDefinition;
    entry: RouteManifestEntry;
};

export type CollectedResolver = {
    resolver: ResolverDefinition;
    entry: ResolverManifestEntry;
};

export class DuplicateRouteError extends Error {
    constructor(id: string) {
        super(`Duplicate route definition: ${id}`);
    }
}

export class RouterDefinition {
    private readonly routes: RouteDefinition[] = [];
    private readonly mounts: RouterMount[] = [];
    private readonly resolverDefinitions: ResolverDefinition[] = [];
    readonly basePath: string;
    private readonly hooks: RouteHook[];

    constructor({ basePath = "/", hooks = [] }: RouterOptions = {}) {
        this.basePath = normalizePath(basePath);
        this.hooks = hooks;
    }

    route(definition: RouteDefinition): this {
        const routeHooks = definition.hooks || [];

        this.routes.push({
            ...definition,
            path: normalizePath(definition.path),
            kind: definition.kind || "request",
            hooks: [...this.hooks, ...routeHooks]
        });

        return this;
    }

    get(path: string, definition: Omit<RouteDefinition, "method" | "path"> = {}): this {
        return this.route({ ...definition, method: "get", path });
    }

    post(path: string, definition: Omit<RouteDefinition, "method" | "path"> = {}): this {
        return this.route({ ...definition, method: "post", path });
    }

    mount(path: string, router: RouterDefinition, options: { hooks?: RouteHook[] } = {}): this {
        this.mounts.push({
            path: normalizePath(path),
            router,
            hooks: options.hooks || []
        });

        return this;
    }

    resolve<TSchemas extends RouteSchemas>(path: string, definition: Omit<ResolverDefinition<TSchemas>, "path">): this {
        this.resolverDefinitions.push({
            ...definition,
            path: normalizePath(path)
        } as ResolverDefinition);

        return this;
    }

    collect(): RouteManifest {
        const seen = new Set<string>();
        const collectedRoutes = this.collectedRoutes();
        const routes = collectedRoutes.map(({ entry }) => {
            const pathKey = routeId(entry.method, entry.fullPath);

            if (seen.has(entry.id) || seen.has(pathKey)) {
                throw new DuplicateRouteError(entry.id);
            }

            seen.add(entry.id);
            seen.add(pathKey);

            return entry;
        });

        return {
            basePath: this.basePath,
            routes,
            resolvers: this.collectedResolvers().map(({ entry }) => entry)
        };
    }

    definitions(): RouteDefinition[] {
        return [...this.routes];
    }

    mounted(): RouterMount[] {
        return [...this.mounts];
    }

    resolvers(): ResolverDefinition[] {
        return [...this.resolverDefinitions];
    }

    collectedRoutes(): CollectedRoute[] {
        return this.collectRoutes(this.basePath, [], undefined);
    }

    collectedResolvers(): CollectedResolver[] {
        return this.collectResolvers(this.basePath, undefined);
    }

    private collectRoutes(basePath: string, inheritedHooks: RouteHook[], mountPath: string | undefined): CollectedRoute[] {
        const routes = this.routes.map<CollectedRoute>(definition => {
            const fullPath = joinPaths(basePath, definition.path);
            const id = definition.id || routeId(definition.method, fullPath);
            const definitionHooks = definition.hooks || [];
            const route = {
                ...definition,
                hooks: [...inheritedHooks, ...definitionHooks]
            };
            const manifest = { ...route };

            delete manifest.handler;

            return {
                route,
                entry: {
                    ...manifest,
                    id,
                    fullPath,
                    implementerPath: definition.path,
                    mountPath
                }
            };
        });
        const mountedRoutes = this.mounts.flatMap(mount => {
            const mountedBase = joinPaths(basePath, mount.path);
            const childBase = joinPaths(mountedBase, mount.router.basePath);
            const childHooks = [...inheritedHooks, ...this.hooks, ...mount.hooks];

            return mount.router.collectRoutes(childBase, childHooks, joinPaths(basePath, mount.path));
        });

        return [...routes, ...mountedRoutes];
    }

    private collectResolvers(basePath: string, mountPath: string | undefined): CollectedResolver[] {
        const resolvers = this.resolverDefinitions.map<CollectedResolver>(definition => {
            const fullPath = joinPaths(basePath, definition.path);
            const id = definition.id || `RESOLVE ${fullPath}`;
            const manifest = {
                id: definition.id,
                path: definition.path,
                description: definition.description,
                schemas: definition.schemas,
                targetDefinitions: definition.targetDefinitions
            };

            return {
                resolver: definition,
                entry: {
                    ...manifest,
                    id,
                    fullPath,
                    implementerPath: definition.path,
                    mountPath
                }
            };
        });
        const mountedResolvers = this.mounts.flatMap(mount => {
            const mountedBase = joinPaths(basePath, mount.path);
            const childBase = joinPaths(mountedBase, mount.router.basePath);

            return mount.router.collectResolvers(childBase, joinPaths(basePath, mount.path));
        });

        return [...resolvers, ...mountedResolvers];
    }
}

export function createRouter(options?: RouterOptions): RouterDefinition {
    return new RouterDefinition(options);
}
