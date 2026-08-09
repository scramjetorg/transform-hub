import { HttpMethod, RouteDefinition } from "./manifest";
import { RouterDefinition } from "./router";

type Constructor<T = any> = new (...args: any[]) => T;
type DecoratedRouteDefinition = Omit<RouteDefinition, "handler"> & {
    createHandler(instance: Record<string | symbol, Function>): RouteDefinition["handler"];
};

const classBasePaths = new WeakMap<Function, string>();
const methodRoutes = new WeakMap<Function, DecoratedRouteDefinition[]>();

export function Api(basePath = "/"): ClassDecorator {
    return target => {
        classBasePaths.set(target, basePath);
    };
}

export function Route(method: HttpMethod, path: string, definition: Omit<RouteDefinition, "method" | "path" | "handler"> = {}): MethodDecorator {
    return (target, propertyKey) => {
        const ctor = target.constructor;
        const routes = methodRoutes.get(ctor) || [];

        routes.push({
            ...definition,
            method,
            path,
            createHandler: (instance: Record<string | symbol, Function>) => instance[propertyKey].bind(instance)
        });
        methodRoutes.set(ctor, routes);
    };
}

export function Get(path: string, definition?: Omit<RouteDefinition, "method" | "path" | "handler">): MethodDecorator {
    return Route("get", path, definition);
}

export function Post(path: string, definition?: Omit<RouteDefinition, "method" | "path" | "handler">): MethodDecorator {
    return Route("post", path, definition);
}

export function collectDecoratedRoutes(target: Constructor | object): RouterDefinition {
    const isConstructor = typeof target === "function";
    const ctor = isConstructor ? target : target.constructor;
    const instance = isConstructor ? new (target as Constructor)() : target;
    const router = new RouterDefinition({ basePath: classBasePaths.get(ctor) || "/" });

    for (const route of methodRoutes.get(ctor) || []) {
        const { createHandler, ...definition } = route;

        router.route({
            ...definition,
            handler: createHandler(instance as Record<string | symbol, Function>)
        });
    }

    return router;
}
