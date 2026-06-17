import { z } from "zod";
import { RouteRequest, RouteResponse, RouteSchemas } from "./manifest";

export class RouteValidationError extends Error {
    constructor(readonly location: keyof RouteSchemas, readonly issues: z.ZodIssue[]) {
        super(`Invalid route ${location}`);
    }
}

function parseSchema<TSchema extends z.ZodTypeAny>(location: keyof RouteSchemas, schema: TSchema | undefined, value: unknown): z.infer<TSchema> | undefined {
    if (!schema) {
        return undefined;
    }

    const result = schema.safeParse(value);

    if (!result.success) {
        throw new RouteValidationError(location, result.error.issues);
    }

    return result.data;
}

export function validateRouteRequest<TSchemas extends RouteSchemas>(schemas: TSchemas, request: Partial<RouteRequest<TSchemas>>): RouteRequest<TSchemas> {
    return {
        params: parseSchema("params", schemas.params, request.params),
        query: parseSchema("query", schemas.query, request.query),
        headers: parseSchema("headers", schemas.headers, request.headers),
        body: parseSchema("body", schemas.body, request.body)
    } as RouteRequest<TSchemas>;
}

export function validateRouteResponse<TSchemas extends RouteSchemas>(schemas: TSchemas, response: unknown): RouteResponse<TSchemas> {
    return parseSchema("response", schemas.response, response) as RouteResponse<TSchemas>;
}
