import { APIExpose, APIRoute, HttpMethod, Middleware, StreamConfig } from "@scramjet/types";

export type RecordedRoute = {
    kind: string;
    method?: HttpMethod;
    path: string;
    options?: StreamConfig | boolean;
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

    use(path: string) {
        this.record("use", path);
    }

    get(path: string) {
        this.record("get", path, "get");
    }

    op(method: HttpMethod, path: string) {
        this.record("op", path, method);
    }

    upstream(path: string, _stream: unknown, options?: StreamConfig) {
        this.record("upstream", path, "get", options);
    }

    downstream(path: string, _stream: unknown, options?: StreamConfig) {
        this.record("downstream", path, options?.method || "post", options);
    }

    duplex(path: string) {
        this.record("duplex", path);
    }

    forward(path: string) {
        this.record("forward", path);
    }

    create(path: string, _handler: Middleware) {
        this.record("create", path, "post");
    }

    delete(path: string, _handler: Middleware) {
        this.record("delete", path, "delete");
    }

    update(path: string, _handler: Middleware) {
        this.record("update", path, "put");
    }

    read(path: string, _handler: Middleware) {
        this.record("read", path, "get");
    }

    all(path: string, _handler: Middleware) {
        this.record("all", path);
    }

    head(path: string, _handler: Middleware) {
        this.record("head", path, "head");
    }

    patch(path: string, _handler: Middleware) {
        this.record("patch", path, "patch");
    }

    options(path: string, _handler: Middleware) {
        this.record("options", path);
    }

    connect(path: string, _handler: Middleware) {
        this.record("connect", path, "connect");
    }

    trace(path: string, _handler: Middleware) {
        this.record("trace", path, "trace");
    }

    decorate(path: string) {
        this.record("decorate", path);
    }

    lookup() {}

    private record(kind: string, path: string, method?: HttpMethod, options?: StreamConfig | boolean) {
        this.routes.push({ kind, method, path, options });
    }
}
