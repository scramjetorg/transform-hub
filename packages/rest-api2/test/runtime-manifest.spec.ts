import test from "ava";
import type {
    InstanceManifestResponse as RuntimeInstanceManifestResponse,
    ManifestChange as RuntimeManifestChange,
    ManifestDeclaration as RuntimeManifestDeclaration,
    ManifestReceipt as RuntimeManifestReceipt,
    SequenceManifestResponse as RuntimeSequenceManifestResponse
} from "@scramjet/runtime-types";
import type { RestAPI2 } from "../src/contracts";
import {
    INSTANCE_MANIFEST_ENDPOINT,
    InstanceManifestResponseSchema,
    ManifestChangeSchema,
    ManifestDeclarationSchema,
    ManifestDeclareRequestSchema,
    ManifestDeclareResultSchema,
    ManifestReceiptSchema,
    ManifestSchemaSchema,
    SequenceManifestResponseSchema,
    SEQUENCE_MANIFEST_ENDPOINT,
    isManifestDeclaration,
    snapshotManifestDeclaration
} from "../src";

test("manifest declaration accepts the complete issue-shaped public interface", (t) => {
    const declaration: RuntimeManifestDeclaration = {
        input: {
            description: "Orders to process",
            mediaType: "application/json",
            schema: {
                $schema: "https://json-schema.org/draft/2020-12/schema",
                $id: "https://example.test/order.schema.json",
                type: "object",
                properties: {
                    orderId: { type: "string", "x-display-order": ["second", "first"] },
                    priority: { type: "integer", minimum: 1, "x-vendor": { retained: true } }
                },
                required: ["orderId", "priority"],
                $defs: { base: { type: "string" } },
                allOf: [{ $ref: "#/$defs/base" }]
            }
        },
        output: {
            description: "Processed order",
            mediaType: "application/json",
            schema: { type: "object", properties: { accepted: { type: "boolean" } } }
        },
        rpc: [{
            procedure: "orders.lookup",
            description: "Look up an order",
            contractIdentity: "orders.lookup.v1",
            request: { type: "object", properties: { orderId: { type: "string" } }, additionalProperties: false },
            response: { type: "array", prefixItems: [{ type: "string" }, { type: "integer" }], minItems: 2, maxItems: 2 }
        }],
        topics: [{
            name: "orders.completed",
            direction: "output",
            description: "Completed orders",
            mediaType: "application/json",
            schema: { type: "array", items: { $ref: "#/$defs/order" } }
        }]
    };
    const apiDeclaration: RestAPI2.ManifestDeclaration = declaration;
    const parsed = ManifestDeclarationSchema.safeParse(apiDeclaration);

    t.true(parsed.success);
    if (parsed.success) t.deepEqual(parsed.data, declaration);
    t.true(isManifestDeclaration(declaration));
});

test("JSON Schema booleans, extension keywords, references, nested data, and array order are preserved", (t) => {
    const declaration = {
        input: { schema: false },
        output: { schema: true },
        rpc: [{ procedure: "ordered", request: { type: "array", items: { enum: ["z", "a", 3, null] } } }],
        topics: [{ name: "items", direction: "duplex", schema: { $ref: "other.json#/$defs/item", "x-order": [3, 1, 2] } }]
    };
    const snapshot = snapshotManifestDeclaration(declaration);

    t.deepEqual(snapshot, declaration);
    t.not(snapshot, declaration);
    t.not(snapshot.rpc, declaration.rpc);
    t.not(snapshot.topics?.[0].schema, declaration.topics?.[0].schema);
    t.deepEqual(snapshot.rpc?.[0].request, { type: "array", items: { enum: ["z", "a", 3, null] } });
    t.deepEqual(snapshot.topics?.[0].schema, { $ref: "other.json#/$defs/item", "x-order": [3, 1, 2] });
    t.true(ManifestSchemaSchema.safeParse(false).success);
    t.true(ManifestSchemaSchema.safeParse(true).success);
});

test("JSON Schema toJSON property names and own __proto__ keys survive exported schemas", (t) => {
    const toJSONSchema = { type: "object", properties: { toJSON: { type: "string" } } };
    const toJSONSnapshot = ManifestDeclarationSchema.parse({ output: { schema: toJSONSchema } });
    t.deepEqual(toJSONSnapshot.output?.schema, toJSONSchema);

    const declaration = JSON.parse('{"output":{"schema":{"type":"object","properties":{"__proto__":{"type":"string"}}}}}');
    const expectedSchema = JSON.parse('{"type":"object","properties":{"__proto__":{"type":"string"}}}');
    const declarationSnapshot = ManifestDeclarationSchema.parse(declaration);
    const standaloneSchemaSnapshot = ManifestSchemaSchema.parse(declaration.output.schema);
    const response = InstanceManifestResponseSchema.parse({
        instanceId: "instance-1",
        sequenceId: "sequence-1",
        revision: "revision-1",
        manifest: declaration,
        sequence: {}
    });

    t.deepEqual(declarationSnapshot.output?.schema, expectedSchema);
    t.deepEqual(standaloneSchemaSnapshot, expectedSchema);
    t.deepEqual(response.manifest?.output?.schema, expectedSchema);
    t.true(Object.prototype.hasOwnProperty.call((declarationSnapshot.output?.schema as any).properties, "__proto__"));
    t.true(Object.prototype.hasOwnProperty.call((response.manifest?.output?.schema as any).properties, "__proto__"));
});

test("manifest DTO guards reject malformed fields and unknown envelope data instead of stripping it", (t) => {
    for (const invalid of [
        null,
        [],
        { input: "not-a-field" },
        { output: { mediaType: 42 } },
        { rpc: [{ description: "missing procedure" }] },
        { topics: [{ name: "t", direction: 4 }] },
        { privateConfig: { password: "private" } },
        { handlers: [] },
        { validators: [] }
    ]) {
        t.false(ManifestDeclarationSchema.safeParse(invalid).success, JSON.stringify(invalid));
    }
    const schemaExtensionsAreNotFiltered = ManifestDeclarationSchema.safeParse({
        rpc: [{ procedure: "p", request: { schema: { type: "string" } } }]
    });
    t.true(schemaExtensionsAreNotFiltered.success);
});

test("manifest JSON guard rejects values JSON.stringify could omit, coerce, or execute", (t) => {
    const cycle: Record<string, unknown> = {};
    cycle.loop = cycle;
    let getterCalls = 0;
    let toJSONCalls = 0;
    const getterValue = Object.defineProperty({}, "secret", {
        enumerable: true,
        get() {
            getterCalls++;
            return "must not be read";
        }
    });
    const customToJSON = {
        toJSON() {
            toJSONCalls++;
            return { type: "string" };
        }
    };
    const classValue = new (class SchemaValue { type = "string"; })();
    const invalidSchemaValues = [
        undefined,
        () => "callable",
        Symbol("schema"),
        1n,
        Number.NaN,
        Number.POSITIVE_INFINITY,
        cycle,
        getterValue,
        customToJSON,
        classValue,
        ["present", undefined]
    ];

    for (const value of invalidSchemaValues) {
        t.false(ManifestDeclarationSchema.safeParse({ output: { schema: value } }).success);
    }
    t.is(getterCalls, 0);
    t.is(toJSONCalls, 0);
    t.false(ManifestDeclarationSchema.safeParse({ output: { schema: { nested: { value: Number.NEGATIVE_INFINITY } } } }).success);

    const pathError = ManifestDeclarationSchema.safeParse({ output: { schema: { nested: undefined } } });
    t.false(pathError.success);
    if (!pathError.success) t.deepEqual(pathError.error.issues[0].path, ["output", "schema", "nested"]);
});

test("manifest arrays reject digit-only keys that are not actual in-range array indices", (t) => {
    const values = ["present"];
    Object.defineProperty(values, "4294967295", {
        value: () => "executable",
        enumerable: true,
        configurable: true,
        writable: true
    });

    t.false(ManifestDeclarationSchema.safeParse({ output: { schema: { enum: values } } }).success);
});

test("manifest request, receipt, result, instance/collection, and committed audit schemas match shared DTOs", (t) => {
    const declaration: RuntimeManifestDeclaration = {
        rpc: [{ procedure: "check", request: { type: "string" }, response: false }]
    };
    const receipt: RuntimeManifestReceipt = { instanceId: "instance-1", sequenceId: "sequence-1", revision: "revision-1" };
    const instanceResponse: RuntimeInstanceManifestResponse = {
        instanceId: receipt.instanceId,
        sequenceId: receipt.sequenceId,
        revision: receipt.revision,
        manifest: declaration,
        sequence: { name: "example", version: "1.2.3", description: "Public package metadata" }
    };
    const sequenceResponse: RuntimeSequenceManifestResponse = { sequenceId: receipt.sequenceId, items: [instanceResponse] };
    const auditChange: RuntimeManifestChange = {
        action: "published",
        instanceId: receipt.instanceId,
        sequenceId: receipt.sequenceId,
        revision: receipt.revision,
        previousRevision: null,
        manifest: declaration,
        sequence: instanceResponse.sequence
    };
    const typedInstanceResponse: RestAPI2.InstanceManifestResponse = instanceResponse;
    const typedSequenceResponse: RestAPI2.SequenceManifestResponse = sequenceResponse;
    const typedReceipt: RestAPI2.ManifestReceipt = receipt;
    const typedAuditChange: RestAPI2.ManifestChange = auditChange;

    t.true(ManifestReceiptSchema.safeParse(typedReceipt).success);
    t.true(ManifestDeclareRequestSchema.safeParse({ requestId: "request-1", declaration }).success);
    t.true(ManifestDeclareResultSchema.safeParse({ requestId: "request-1", accepted: true, receipt }).success);
    t.true(ManifestDeclareResultSchema.safeParse({ requestId: "request-1", accepted: false, error: { code: "INVALID_MANIFEST", message: "Invalid schema", path: "output.schema" } }).success);
    t.true(InstanceManifestResponseSchema.safeParse(typedInstanceResponse).success);
    t.true(SequenceManifestResponseSchema.safeParse(typedSequenceResponse).success);
    t.true(ManifestChangeSchema.safeParse(typedAuditChange).success);
    t.false(ManifestDeclareResultSchema.safeParse({ requestId: "request-1", accepted: false, receipt }).success);
    t.false(InstanceManifestResponseSchema.safeParse({ ...instanceResponse, sequence: { privateConfig: "not-public" } }).success);
    t.is(INSTANCE_MANIFEST_ENDPOINT, "/instances/:instanceId/manifest");
    t.is(SEQUENCE_MANIFEST_ENDPOINT, "/sequences/:sequenceId/manifest");
});
