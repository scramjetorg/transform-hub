import { APIExpose, APIRoute, ForwardStrategy, HttpMethod, Middleware, StreamConfig } from "@scramjet/types";

export type RecordedRoute = {
    kind: string;
    method?: HttpMethod;
    path: string;
    options?: StreamConfig | boolean;
    handler?: unknown;
    handlers?: unknown[];
    strategy?: ForwardStrategy;
};

export class RouteRecorder {
    readonly routes: RecordedRoute[] = [];

    asApiExpose(): APIExpose {
        return this as unknown as APIExpose;
    }

    asApiRoute(): APIRoute {
        return this as unknown as APIRoute;
    }

    has(kind: string, path: string, method?: HttpMethod) {
        return this.routes.some(route => {
            return route.kind === kind && route.path === path && (method === undefined || route.method === method);
        });
    }

    find(kind: string, path: string, method?: HttpMethod) {
        return this.routes.find(route => {
            return route.kind === kind && route.path === path && (method === undefined || route.method === method);
        });
    }

    require(kind: string, path: string, method?: HttpMethod) {
        const route = this.find(kind, path, method);

        if (!route) {
            throw new Error(`Route not recorded: ${kind} ${method || ""} ${path}`.trim());
        }

        return route;
    }

    use(path: string, ...middlewares: Middleware[]) {
        this.record("use", path, undefined, undefined, middlewares[0], middlewares);
    }

    get(path: string, handler?: unknown) {
        this.record("get", path, "get", undefined, handler);
    }

    op(method: HttpMethod, path: string, handler?: unknown, comm?: unknown, rawBody?: boolean) {
        this.record("op", path, method, rawBody, handler, comm === undefined ? undefined : [handler, comm]);
    }

    upstream(path: string, stream: unknown, options?: StreamConfig) {
        this.record("upstream", path, "get", options, stream);
    }

    downstream(path: string, stream: unknown, options?: StreamConfig) {
        this.record("downstream", path, options?.method || "post", options, stream);
    }

    duplex(path: string, handler?: unknown) {
        this.record("duplex", path, undefined, undefined, handler);
    }

    forward(path: string, _urls?: string[], strategy?: ForwardStrategy) {
        this.record("forward", path, undefined, undefined, undefined, undefined, strategy);
    }

    create(path: string, handler: Middleware) {
        this.record("create", path, "post", undefined, handler);
    }

    delete(path: string, handler: Middleware) {
        this.record("delete", path, "delete", undefined, handler);
    }

    update(path: string, handler: Middleware) {
        this.record("update", path, "put", undefined, handler);
    }

    read(path: string, handler: Middleware) {
        this.record("read", path, "get", undefined, handler);
    }

    all(path: string, handler: Middleware) {
        this.record("all", path, undefined, undefined, handler);
    }

    head(path: string, handler: Middleware) {
        this.record("head", path, "head", undefined, handler);
    }

    patch(path: string, handler: Middleware) {
        this.record("patch", path, "patch", undefined, handler);
    }

    options(path: string, handler: Middleware) {
        this.record("options", path, undefined, undefined, handler);
    }

    connect(path: string, handler: Middleware) {
        this.record("connect", path, "connect", undefined, handler);
    }

    trace(path: string, handler: Middleware) {
        this.record("trace", path, "trace", undefined, handler);
    }

    decorate(path: string, ...decorators: unknown[]) {
        this.record("decorate", path, undefined, undefined, decorators[0], decorators);
    }

    lookup() {}

    private record(
        kind: string,
        path: string,
        method?: HttpMethod,
        options?: StreamConfig | boolean,
        handler?: unknown,
        handlers?: unknown[],
        strategy?: ForwardStrategy
    ) {
        this.routes.push({ kind, method, path, options, handler, handlers, strategy });
    }
}
