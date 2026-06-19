import { z } from "zod";
import { CollectManifestOptions, ResolverDefinition, ResolverManifestEntry, ResolverTargetDefinition, RouteDefinition, RouteManifest, RouteManifestEntry, RouteSchemas, joinPaths, normalizePath, routeId } from "./manifest";
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

    route<TSchemas extends RouteSchemas>(definition: RouteDefinition<TSchemas>): this {
        const routeHooks = definition.hooks || [];

        this.routes.push({
            ...definition,
            path: normalizePath(definition.path),
            kind: definition.kind || "request",
            hooks: [...this.hooks, ...routeHooks]
        });

        return this;
    }

    get<TSchemas extends RouteSchemas>(path: string, definition: Omit<RouteDefinition<TSchemas>, "method" | "path"> = {}): this {
        return this.route({ ...definition, method: "get", path });
    }

    post<TSchemas extends RouteSchemas>(path: string, definition: Omit<RouteDefinition<TSchemas>, "method" | "path"> = {}): this {
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

    collect(options: CollectManifestOptions = {}): RouteManifest {
        const seen = new Set<string>();
        const collectedRoutes = this.collectedRoutes();
        const routes = collectedRoutes.map(({ entry }) => entry);
        const resolvers = this.collectedResolvers().map(({ entry }) => entry);

        if (options.expandResolvers) {
            routes.push(...this.expandResolverRoutes(resolvers, options, options.maxResolverDepth || 8));
        }

        const checkedRoutes = routes.map(entry => {
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
            routes: checkedRoutes,
            resolvers
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

    private expandResolverRoutes(resolvers: ResolverManifestEntry[], options: CollectManifestOptions, depth: number): RouteManifestEntry[] {
        if (depth <= 0) {
            return [];
        }

        return resolvers.flatMap(resolver => {
            let targets: ResolverTargetDefinition[] = [];

            if (Array.isArray(resolver.targetDefinitions)) {
                targets = resolver.targetDefinitions;
            } else if (resolver.targetDefinitions) {
                targets = [resolver.targetDefinitions];
            }

            return targets.flatMap(target => this.expandTargetRoutes(resolver, target, options, depth));
        });
    }

    private expandTargetRoutes(
        resolver: ResolverManifestEntry,
        target: ResolverTargetDefinition,
        options: CollectManifestOptions,
        depth: number
    ): RouteManifestEntry[] {
        const targetManifest = "collect" in target.definitions
            ? target.definitions.collect({ ...options, expandResolvers: true, maxResolverDepth: depth - 1 })
            : target.definitions;
        const publicBasePath = normalizePath(target.publicBasePath || resolver.fullPath);
        const implementerBasePath = normalizePath(target.implementerBasePath || targetManifest.basePath);
        const mountPath = normalizePath(target.mountPath || resolver.path);

        return targetManifest.routes.map(route => {
            const relativeTargetPath = this.relativePath(route.fullPath, implementerBasePath);
            const fullPath = joinPaths(publicBasePath, relativeTargetPath);
            const schemas = this.mergeResolverSchemas(resolver.schemas, route.schemas);

            return {
                ...route,
                id: routeId(route.method, fullPath),
                fullPath,
                schemas,
                implementerPath: route.implementerPath || relativeTargetPath,
                mountPath,
                virtual: true,
                owner: target.owner,
                target: {
                    mountPath,
                    publicBasePath,
                    implementerBasePath,
                    implementerFullPath: route.fullPath
                }
            };
        });
    }

    private relativePath(fullPath: string, basePath: string): string {
        const full = normalizePath(fullPath);
        const base = normalizePath(basePath);

        if (full === base) {
            return "/";
        }

        return full.startsWith(`${base}/`) ? normalizePath(full.slice(base.length)) : full;
    }

    private mergeResolverSchemas(resolverSchemas: RouteSchemas | undefined, routeSchemas: RouteSchemas | undefined): RouteSchemas | undefined {
        const params = this.mergeObjectSchemas(resolverSchemas?.params, routeSchemas?.params);

        return {
            ...routeSchemas,
            params: params || routeSchemas?.params || resolverSchemas?.params
        };
    }

    private mergeObjectSchemas(left: z.ZodTypeAny | undefined, right: z.ZodTypeAny | undefined): z.ZodTypeAny | undefined {
        if (left instanceof z.ZodObject && right instanceof z.ZodObject) {
            return z.object({ ...left.shape, ...right.shape });
        }

        return right || left;
    }
}

export function createRouter(options?: RouterOptions): RouterDefinition {
    return new RouterDefinition(options);
}
