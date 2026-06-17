import { MaybePromise } from "@scramjet/types";
import { RouteDefinition, RouteRequest } from "./manifest";

export type RouteHookContext = {
    route: RouteDefinition;
    request: RouteRequest;
    response?: unknown;
    error?: unknown;
    state: Record<string, unknown>;
};

export type RouteHook = {
    name?: string;
    before?(context: RouteHookContext): MaybePromise<void | unknown>;
    after?(context: RouteHookContext): MaybePromise<void | unknown>;
    error?(context: RouteHookContext): MaybePromise<void | unknown>;
    finally?(context: RouteHookContext): MaybePromise<void>;
};

export type RoutePipeline = {
    hooks?: RouteHook[];
};

export async function executeRoutePipeline<TResponse>(
    route: RouteDefinition,
    request: RouteRequest,
    handler: (context: RouteHookContext) => MaybePromise<TResponse>,
    { hooks = [] }: RoutePipeline = {}
): Promise<TResponse> {
    const context: RouteHookContext = { route, request, state: {} };

    try {
        for (const hook of hooks) {
            const response = await hook.before?.(context);

            if (response !== undefined) {
                context.response = response;
                return response as TResponse;
            }
        }

        context.response = await handler(context);

        for (const hook of hooks) {
            const response = await hook.after?.(context);

            if (response !== undefined) {
                context.response = response;
            }
        }

        return context.response as TResponse;
    } catch (error) {
        context.error = error;

        for (const hook of hooks) {
            const response = await hook.error?.(context);

            if (response !== undefined) {
                context.response = response;
                return response as TResponse;
            }
        }

        throw error;
    } finally {
        for (const hook of hooks) {
            await hook.finally?.(context);
        }
    }
}

export function headerHook(headers: Record<string, string>): RouteHook {
    return {
        name: "headers",
        after(context) {
            context.state.headers = {
                ...(context.state.headers as Record<string, string> | undefined),
                ...headers
            };
        }
    };
}
