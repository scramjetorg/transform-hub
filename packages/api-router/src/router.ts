import { RouteDefinition, RouteManifest, RouteManifestEntry, joinPaths, normalizePath, routeId } from "./manifest";
import { RouteHook } from "./hooks";

export type RouterOptions = {
    basePath?: string;
    hooks?: RouteHook[];
};

export class DuplicateRouteError extends Error {
    constructor(id: string) {
        super(`Duplicate route definition: ${id}`);
    }
}

export class RouterDefinition {
    private readonly routes: RouteDefinition[] = [];
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

    collect(): RouteManifest {
        const seen = new Set<string>();
        const routes = this.routes.map<RouteManifestEntry>(definition => {
            const fullPath = joinPaths(this.basePath, definition.path);
            const id = definition.id || routeId(definition.method, fullPath);

            if (seen.has(id)) {
                throw new DuplicateRouteError(id);
            }

            seen.add(id);

            const manifest = { ...definition };

            delete manifest.handler;

            return {
                ...manifest,
                id,
                fullPath
            };
        });

        return {
            basePath: this.basePath,
            routes
        };
    }

    definitions(): RouteDefinition[] {
        return [...this.routes];
    }
}

export function createRouter(options?: RouterOptions): RouterDefinition {
    return new RouterDefinition(options);
}
