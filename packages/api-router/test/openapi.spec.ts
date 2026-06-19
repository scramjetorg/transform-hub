import test from "ava";
import { execFileSync } from "child_process";
import { resolve } from "path";
import { z } from "zod";

import { ApiClientRequest, Router, createApiClient, generateOpenApi, loadManifestFromSchemaModule } from "../src";

test("generates OpenAPI 3.1 paths from route manifest", t => {
    const manifest = Router.create({ basePath: "/api/v2" })
        .route(Router.get("/sequence/:id", {
            description: "Get sequence",
            tags: ["sequence"],
            schemas: {
                params: z.object({ id: z.string() }),
                query: z.object({ verbose: z.boolean().optional() }),
                response: z.object({ id: z.string(), running: z.boolean() })
            }
        }))
        .collect();
    const doc = generateOpenApi(manifest, { title: "Test API", version: "2.0.0" });
    const operation = doc.paths["/api/v2/sequence/:id"].get as any;

    t.is(doc.openapi, "3.1.0");
    t.deepEqual(doc.info, { title: "Test API", version: "2.0.0" });
    t.is(operation.operationId, "GET /api/v2/sequence/:id");
    t.deepEqual(operation.tags, ["sequence"]);
    t.is(operation.parameters[0].in, "path");
    t.is(operation.responses[200].content["application/json"].schema.type, "object");
});

test("loads manifests from schema-mode module shapes", t => {
    const manifest = Router.create({ basePath: "/api/v2" }).get("/health").collect();

    t.is(loadManifestFromSchemaModule({ manifest }), manifest);
    t.deepEqual(loadManifestFromSchemaModule({ collect: () => manifest }), manifest);
    t.deepEqual(loadManifestFromSchemaModule({ default: { collect: () => manifest } }), manifest);
    t.deepEqual(loadManifestFromSchemaModule({ default: manifest }), manifest);
    t.throws(() => loadManifestFromSchemaModule({}), { message: "Schema module does not export a route manifest" });
});

test("generates OpenAPI paths for resolver-expanded virtual routes", t => {
    const target = Router.create({ basePath: "/api/v2" }).get("/load", {
        schemas: { response: z.object({ load: z.number() }) }
    });
    const manifest = Router.create({ basePath: "/api/v2" })
        .resolve("/hubs/:hubId", {
            schemas: { params: z.object({ hubId: z.string() }) },
            targetDefinitions: { owner: "host", definitions: target, implementerBasePath: "/api/v2" },
            handler: () => undefined
        })
        .collect({ expandResolvers: true });
    const doc = generateOpenApi(manifest);
    const operation = doc.paths["/api/v2/hubs/:hubId/load"].get as any;

    t.is(operation.operationId, "GET /api/v2/hubs/:hubId/load");
    t.deepEqual(operation.parameters.map((parameter: any) => parameter.name), ["hubId"]);
});

test("schema-mode fixture manifest can construct a client", async t => {
    const module = await import("./fixtures/schema-api");
    const manifest = loadManifestFromSchemaModule(module);
    const client = createApiClient(manifest, {
        async request<T>(request: ApiClientRequest) {
            return { status: 200, headers: {}, body: { route: request.route.id } as unknown as T };
        }
    });

    t.deepEqual((await client.request("GET /api/v2/health")).body, { route: "GET /api/v2/health" });
});

test("CLI generator emits OpenAPI JSON for schema-mode fixture", t => {
    const bin = resolve(__dirname, "../src/bin/generate.ts");
    const fixture = resolve(__dirname, "fixtures/schema-api.ts");
    const output = execFileSync(process.execPath, ["-r", "ts-node/register", bin, fixture], { encoding: "utf8" });
    const doc = JSON.parse(output);

    t.is(doc.openapi, "3.1.0");
    t.truthy(doc.paths["/api/v2/health"].get);
});
