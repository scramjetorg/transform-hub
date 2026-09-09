type RecordedRoute = { kind: string; method?: string; path: string; options?: any; handler?: any; handlers?: any[] };

/** Minimal route sink used by BDD to inspect production router registration. */
export class RouteRecorder {
    readonly routes: RecordedRoute[] = [];
    asApiRoute(): any { return this; }
    use(path: string, ...handlers: any[]) { this.record("use", path, undefined, undefined, handlers[0], handlers); }
    get(path: string, handler?: any) { this.record("get", path, "get", undefined, handler); }
    op(method: string, path: string, handler?: any, comm?: any, rawBody?: boolean) {
        this.record("op", path, method, rawBody, handler, comm === undefined ? undefined : [handler, comm]);
    }
    upstream(path: string, handler: any, options?: any) { this.record("upstream", path, "get", options, handler); }
    downstream(path: string, handler: any, options?: any) { this.record("downstream", path, options?.method || "post", options, handler); }
    find(kind: string, path: string, method?: string) { return this.routes.find(route => route.kind === kind && route.path === path && (method === undefined || route.method === method)); }
    require(kind: string, path: string, method?: string) {
        const route = this.find(kind, path, method);
        if (!route) throw new Error(`Route not recorded: ${kind} ${method || ""} ${path}`.trim());
        return route;
    }
    private record(kind: string, path: string, method?: string, options?: any, handler?: any, handlers?: any[]) {
        this.routes.push({ kind, path, method, options, handler, handlers });
    }
}
