import { z } from "zod";
import type {
    InstanceManifestResponse,
    ManifestChange,
    ManifestDeclaration,
    ManifestDeclarationError,
    ManifestDeclareRequest,
    ManifestDeclareResult,
    ManifestField,
    ManifestJsonValue,
    ManifestReceipt,
    ManifestRpc,
    ManifestSchema,
    ManifestSequenceMetadata,
    ManifestTopic,
    SequenceManifestResponse
} from "@scramjet/runtime-types";

const jsonValueDtoSchema: z.ZodType<ManifestJsonValue> = z.lazy(() =>
    z.union([z.null(), z.boolean(), z.number().finite(), z.string(), z.array(jsonValueDtoSchema), z.record(z.string(), jsonValueDtoSchema)])
);

const manifestSchemaDtoSchema: z.ZodType<ManifestSchema> = z.union([z.boolean(), z.record(z.string(), jsonValueDtoSchema)]);

/** A JSON Schema document is preserved as author-supplied JSON data, not evaluated. */
export const ManifestJsonValueSchema: z.ZodType<ManifestJsonValue, z.ZodTypeDef, unknown> = safeSnapshotSchema(jsonValueDtoSchema);
export const ManifestSchemaSchema: z.ZodType<ManifestSchema, z.ZodTypeDef, unknown> = safeSnapshotSchema(manifestSchemaDtoSchema);

export const ManifestFieldSchema: z.ZodType<ManifestField, z.ZodTypeDef, unknown> = z.object({
    description: z.string().optional(),
    mediaType: z.string().optional(),
    schema: ManifestSchemaSchema.optional()
}).strict();

export const ManifestRpcSchema: z.ZodType<ManifestRpc, z.ZodTypeDef, unknown> = z.object({
    procedure: z.string(),
    description: z.string().optional(),
    contractIdentity: z.string().optional(),
    request: ManifestSchemaSchema.optional(),
    response: ManifestSchemaSchema.optional()
}).strict();

export const ManifestTopicSchema: z.ZodType<ManifestTopic, z.ZodTypeDef, unknown> = z.object({
    name: z.string(),
    direction: z.string(),
    description: z.string().optional(),
    mediaType: z.string().optional(),
    schema: ManifestSchemaSchema.optional()
}).strict();

const manifestDeclarationDtoSchema: z.ZodType<ManifestDeclaration, z.ZodTypeDef, unknown> = z.object({
    input: ManifestFieldSchema.optional(),
    output: ManifestFieldSchema.optional(),
    rpc: z.array(ManifestRpcSchema).optional(),
    topics: z.array(ManifestTopicSchema).optional()
}).strict();

/**
 * Makes a detached, own-data-only copy of a declaration and validates its DTO shape.
 * Throws ZodError issues with paths for malformed DTOs and non-JSON values.
 */
export function snapshotManifestDeclaration(input: unknown): ManifestDeclaration {
    return snapshotUsingSchema(input, manifestDeclarationDtoSchema);
}

/** Strict declaration schema that returns a detached JSON-safe snapshot. */
export const ManifestDeclarationSchema: z.ZodType<ManifestDeclaration, z.ZodTypeDef, unknown> = safeSnapshotSchema(manifestDeclarationDtoSchema);

export const ManifestReceiptSchema: z.ZodType<ManifestReceipt> = z.object({
    instanceId: z.string(),
    sequenceId: z.string(),
    revision: z.string()
}).strict();

export const ManifestSequenceMetadataSchema: z.ZodType<ManifestSequenceMetadata> = z.object({
    name: z.string().optional(),
    version: z.string().optional(),
    description: z.string().optional()
}).strict();

export const InstanceManifestResponseSchema: z.ZodType<InstanceManifestResponse, z.ZodTypeDef, unknown> = z.object({
    instanceId: z.string(),
    sequenceId: z.string(),
    revision: z.string().nullable(),
    manifest: ManifestDeclarationSchema.nullable(),
    sequence: ManifestSequenceMetadataSchema
}).strict();

export const SequenceManifestResponseSchema: z.ZodType<SequenceManifestResponse, z.ZodTypeDef, unknown> = z.object({
    sequenceId: z.string(),
    items: z.array(InstanceManifestResponseSchema)
}).strict();

export const ManifestDeclarationErrorSchema: z.ZodType<ManifestDeclarationError> = z.object({
    code: z.string(),
    message: z.string(),
    path: z.string().optional()
}).strict();

export const ManifestDeclareRequestSchema: z.ZodType<ManifestDeclareRequest, z.ZodTypeDef, unknown> = z.object({
    requestId: z.string(),
    declaration: ManifestDeclarationSchema
}).strict();

export const ManifestDeclareResultSchema: z.ZodType<ManifestDeclareResult> = z.union([
    z.object({
        requestId: z.string(),
        accepted: z.literal(true),
        receipt: ManifestReceiptSchema
    }).strict(),
    z.object({
        requestId: z.string(),
        accepted: z.literal(false),
        error: ManifestDeclarationErrorSchema
    }).strict()
]);

export const ManifestChangeSchema: z.ZodType<ManifestChange, z.ZodTypeDef, unknown> = z.object({
    action: z.union([z.literal("published"), z.literal("updated"), z.literal("removed")]),
    instanceId: z.string(),
    sequenceId: z.string(),
    revision: z.string().nullable(),
    previousRevision: z.string().nullable(),
    manifest: ManifestDeclarationSchema.nullable(),
    sequence: ManifestSequenceMetadataSchema,
    reason: z.union([
        z.literal("instance-ended"),
        z.literal("instance-deleted"),
        z.literal("instance-replaced"),
        z.literal("host-stopped")
    ]).optional()
}).strict();

export function isManifestDeclaration(input: unknown): input is ManifestDeclaration {
    return ManifestDeclarationSchema.safeParse(input).success;
}

function copyJsonValue(value: unknown, path: (string | number)[], ancestors: Set<object>): ManifestJsonValue {
    const reject = (message: string): never => {
        throw new z.ZodError([{ code: z.ZodIssueCode.custom, path, message }]);
    };

    if (value === null || typeof value === "string" || typeof value === "boolean") return value;
    if (typeof value === "number") return Number.isFinite(value) ? value : reject("Expected a finite JSON number");
    if (typeof value !== "object") return reject(`Expected JSON data; received ${typeof value}`);
    if (ancestors.has(value)) return reject("Cyclic values are not valid JSON");
    ancestors.add(value);

    try {
        if (Array.isArray(value)) {
            if (Object.getPrototypeOf(value) !== Array.prototype) return reject("Expected a plain JSON array");
            const ownKeys = Reflect.ownKeys(value);
            if (ownKeys.some((key) => {
                if (key === "length") return false;
                if (typeof key !== "string" || !/^(0|[1-9]\d*)$/.test(key)) return true;
                const index = Number(key);
                return !Number.isInteger(index) || index < 0 || index >= value.length || String(index) !== key;
            })) {
                return reject("JSON arrays cannot have symbol or non-index properties");
            }
            const descriptors = Object.getOwnPropertyDescriptors(value);
            const result: ManifestJsonValue[] = [];
            for (let index = 0; index < value.length; index++) {
                const descriptor = descriptors[String(index)];
                if (!descriptor) return reject("Sparse arrays are not valid JSON data");
                if (!("value" in descriptor) || !descriptor.enumerable) return reject("JSON arrays cannot contain accessors or non-enumerable values");
                result.push(copyJsonValue(descriptor.value, [...path, index], ancestors));
            }
            return result;
        }

        const prototype = Object.getPrototypeOf(value);
        if (prototype !== Object.prototype && prototype !== null) {
            return reject("Expected a plain JSON object");
        }

        const descriptors = Object.getOwnPropertyDescriptors(value);
        const result: Record<string, ManifestJsonValue> = {};
        for (const key of Reflect.ownKeys(descriptors)) {
            if (typeof key !== "string") return reject("JSON objects cannot contain symbol keys");
            const descriptor = descriptors[key];
            if (!("value" in descriptor) || !descriptor.enumerable) return reject("JSON objects cannot contain accessors or non-enumerable values");
            Object.defineProperty(result, key, {
                value: copyJsonValue(descriptor.value, [...path, key], ancestors),
                enumerable: true,
                configurable: true,
                writable: true
            });
        }
        return result;
    } finally {
        ancestors.delete(value);
    }
}

function snapshotUsingSchema<T>(input: unknown, schema: z.ZodTypeAny): T {
    const copy = copyJsonValue(input, [], new Set<object>());
    schema.parse(copy);
    return copy as unknown as T;
}

function safeSnapshotSchema<T>(schema: z.ZodTypeAny): z.ZodType<T, z.ZodTypeDef, unknown> {
    return z.unknown().transform((input, context) => {
        try {
            return snapshotUsingSchema<T>(input, schema);
        } catch (error) {
            if (error instanceof z.ZodError) {
                for (const issue of error.issues) {
                    context.addIssue({ ...issue, path: [...context.path, ...issue.path] });
                }
            } else {
                context.addIssue({ code: z.ZodIssueCode.custom, message: error instanceof Error ? error.message : String(error) });
            }
            return z.NEVER;
        }
    });
}
