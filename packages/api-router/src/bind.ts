import {
    ResolverDefinition,
    ResolverHandlerFor,
    RouteDefinition,
    RouteHandlerFor
} from "./manifest";
import { RouterDefinition, createRouter } from "./router";

export type TypedRouteSet = Record<string, RouteDefinition>;

export type TypedResolverSet = Record<string, ResolverDefinition>;

export type RouteBindingSkip = {
    readonly type: "skip";
    readonly reason?: string;
};

export type RouteBindingContractOnly = {
    readonly type: "contract-only";
    readonly reason?: string;
};

export type RouteBindingHandler<TContract extends RouteDefinition> = RouteHandlerFor<TContract> | {
    readonly handler: RouteHandlerFor<TContract>;
    readonly id?: string;
    readonly description?: string;
};

export type RouteBinding<TContract extends RouteDefinition> = RouteBindingHandler<TContract> | RouteBindingSkip | RouteBindingContractOnly;

export type RouteBindings<TSet extends TypedRouteSet> = {
    [K in keyof TSet]: RouteBinding<TSet[K]>;
};

export type ExactRouteBindings<TSet extends TypedRouteSet, TBindings extends RouteBindings<TSet>> = TBindings & Record<Exclude<keyof TBindings, keyof TSet>, never>;

export type ResolverBindingHandler<TContract extends ResolverDefinition> = ResolverHandlerFor<TContract> | {
    readonly handler: ResolverHandlerFor<TContract>;
    readonly id?: string;
    readonly description?: string;
};

export type ResolverBindings<TSet extends TypedResolverSet> = {
    [K in keyof TSet]: ResolverBindingHandler<TSet[K]>;
};

export type ExactResolverBindings<TSet extends TypedResolverSet, TBindings extends ResolverBindings<TSet>> = TBindings & Record<Exclude<keyof TBindings, keyof TSet>, never>;

export const routeBinding = {
    skip(reason?: string): RouteBindingSkip {
        return { type: "skip", reason };
    },
    contractOnly(reason?: string): RouteBindingContractOnly {
        return { type: "contract-only", reason };
    },
    handler<TContract extends RouteDefinition>(handler: RouteHandlerFor<TContract>, options: { id?: string; description?: string } = {}): RouteBindingHandler<TContract> {
        return { ...options, handler };
    }
};

export const resolverBinding = {
    handler<TContract extends ResolverDefinition>(handler: ResolverHandlerFor<TContract>, options: { id?: string; description?: string } = {}): ResolverBindingHandler<TContract> {
        return { ...options, handler };
    }
};

function isRouteBindingSkip(binding: RouteBinding<RouteDefinition>): binding is RouteBindingSkip {
    return typeof binding === "object" && binding !== null && "type" in binding && binding.type === "skip";
}

function isRouteBindingContractOnly(binding: RouteBinding<RouteDefinition>): binding is RouteBindingContractOnly {
    return typeof binding === "object" && binding !== null && "type" in binding && binding.type === "contract-only";
}

function normalizeRouteBinding<TContract extends RouteDefinition>(binding: RouteBindingHandler<TContract>): {
    handler: RouteHandlerFor<TContract>;
    overrides: { id?: string; description?: string };
} {
    if (typeof binding === "function") {
        return { handler: binding, overrides: {} };
    }

    return {
        handler: binding.handler,
        overrides: {
            id: binding.id,
            description: binding.description
        }
    };
}

function normalizeResolverBinding<TContract extends ResolverDefinition>(binding: ResolverBindingHandler<TContract>): {
    handler: ResolverHandlerFor<TContract>;
    overrides: { id?: string; description?: string };
} {
    if (typeof binding === "function") {
        return { handler: binding, overrides: {} };
    }

    return {
        handler: binding.handler,
        overrides: {
            id: binding.id,
            description: binding.description
        }
    };
}

function compactOverrides<T extends { id?: string; description?: string }>(overrides: T): Partial<T> {
    return Object.fromEntries(Object.entries(overrides).filter(([, value]) => value !== undefined)) as unknown as Partial<T>;
}

export function bindRoutes<TSet extends TypedRouteSet, TBindings extends RouteBindings<TSet>>(
    contractSet: TSet,
    handlers: ExactRouteBindings<TSet, TBindings>,
    router: RouterDefinition = createRouter()
): RouterDefinition {
    for (const key of Object.keys(contractSet) as Array<keyof TSet>) {
        const binding = handlers[key];

        if (isRouteBindingSkip(binding)) {
            continue;
        }

        if (isRouteBindingContractOnly(binding)) {
            router.route(contractSet[key]);
            continue;
        }

        const route = contractSet[key];
        const { handler: routeHandler, overrides } = normalizeRouteBinding(binding);

        router.route({
            ...route,
            ...compactOverrides(overrides),
            handler: routeHandler as RouteDefinition["handler"]
        });
    }

    return router;
}

export function bindResolvers<TSet extends TypedResolverSet, TBindings extends ResolverBindings<TSet>>(
    contractSet: TSet,
    handlers: ExactResolverBindings<TSet, TBindings>,
    router: RouterDefinition = createRouter()
): RouterDefinition {
    for (const key of Object.keys(contractSet) as Array<keyof TSet>) {
        const resolver = contractSet[key];
        const binding = handlers[key];
        const { handler: resolverHandler, overrides } = normalizeResolverBinding(binding);

        router.resolve(resolver.path, {
            ...resolver,
            ...compactOverrides(overrides),
            handler: resolverHandler as ResolverDefinition["handler"]
        });
    }

    return router;
}

export function bindResolver<TContract extends ResolverDefinition>(
    resolver: TContract,
    binding: ResolverBindingHandler<TContract>,
    router: RouterDefinition = createRouter()
): RouterDefinition {
    const { handler: resolverHandler, overrides } = normalizeResolverBinding(binding);

    return router.resolve(resolver.path, {
        ...resolver,
        ...compactOverrides(overrides),
        handler: resolverHandler as ResolverDefinition["handler"]
    });
}
