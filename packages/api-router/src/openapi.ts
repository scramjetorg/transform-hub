import { z } from "zod";
import { RouteManifest, RouteManifestEntry, RouteSchemas } from "./manifest";

export type OpenApiDocument = {
    openapi: "3.1.0";
    info: { title: string; version: string };
    paths: Record<string, Record<string, unknown>>;
};

type JsonSchema = Record<string, unknown>;

function objectToJsonSchema(schema: z.ZodObject<any>): JsonSchema {
    const properties: Record<string, JsonSchema> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(schema.shape)) {
        // eslint-disable-next-line no-use-before-define
        properties[key] = zodToJsonSchema(value as z.ZodTypeAny) || {};

        if (!(value instanceof z.ZodOptional)) {
            required.push(key);
        }
    }

    const requiredSchema = required.length ? { required } : {};

    return { type: "object", properties, ...requiredSchema };
}

function zodToJsonSchema(schema: z.ZodTypeAny | undefined): JsonSchema | undefined {
    if (!schema) {
        return undefined;
    }

    if (schema instanceof z.ZodString) {
        return { type: "string" };
    }
    if (schema instanceof z.ZodNumber) {
        return { type: "number" };
    }
    if (schema instanceof z.ZodBoolean) {
        return { type: "boolean" };
    }
    if (schema instanceof z.ZodArray) {
        return { type: "array", items: zodToJsonSchema(schema.element) || {} };
    }
    if (schema instanceof z.ZodObject) {
        return objectToJsonSchema(schema);
    }
    if (schema instanceof z.ZodOptional) {
        return zodToJsonSchema(schema.unwrap());
    }

    return {};
}

function parametersFromSchemas(schemas: RouteSchemas | undefined): unknown[] {
    const parameters: unknown[] = [];
    const params = zodToJsonSchema(schemas?.params);
    const query = zodToJsonSchema(schemas?.query);
    const headers = zodToJsonSchema(schemas?.headers);

    for (const [source, location] of [[params, "path"], [query, "query"], [headers, "header"]] as const) {
        const properties = source?.properties as Record<string, JsonSchema> | undefined;

        for (const [name, schema] of Object.entries(properties || {})) {
            parameters.push({ name, in: location, required: location === "path", schema });
        }
    }

    return parameters;
}

function operationFromRoute(route: RouteManifestEntry): Record<string, unknown> {
    const requestBody = zodToJsonSchema(route.schemas?.body);
    const response = zodToJsonSchema(route.schemas?.response) || {};
    const requestBodySchema = requestBody ? { requestBody: { content: { "application/json": { schema: requestBody } } } } : {};

    return {
        operationId: route.id,
        description: route.description,
        tags: route.tags,
        parameters: parametersFromSchemas(route.schemas),
        ...requestBodySchema,
        responses: {
            200: {
                description: "OK",
                content: { "application/json": { schema: response } }
            }
        }
    };
}

export function generateOpenApi(manifest: RouteManifest, { title = "Scramjet API", version = "1.0.0" } = {}): OpenApiDocument {
    const paths: OpenApiDocument["paths"] = {};

    for (const route of manifest.routes) {
        paths[route.fullPath] ||= {};
        paths[route.fullPath][route.method] = operationFromRoute(route);
    }

    return {
        openapi: "3.1.0",
        info: { title, version },
        paths
    };
}
