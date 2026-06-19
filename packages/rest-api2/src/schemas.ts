import { z } from "zod";

// ============================================================
// Individual DTO schemas based on contracts.ts
// ============================================================

export const PageInfo = z.object({
    offset: z.coerce.number().int().min(0).optional(),
    limit: z.coerce.number().int().min(1).optional(),
    total: z.coerce.number().int().min(0).optional(),
    next: z.string().optional()
});

export const StreamRange = z.object({
    unit: z.union([z.literal("time"), z.literal("span")]),
    start: z.union([z.number(), z.literal("*")]),
    end: z.union([z.number(), z.literal("*")])
});

export const StreamInfo = z.object({
    range: StreamRange.optional(),
    live: z.boolean().optional(),
    itemType: z.string().optional()
});

export const Operation = z.object({
    id: z.string(),
    status: z.union([
        z.literal("pending"),
        z.literal("running"),
        z.literal("completed"),
        z.literal("failed")
    ])
});

export const ErrorBody = z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional()
});

export const Manager = z.object({
    id: z.string(),
    hubs: z.number().int().min(0).optional()
});

export const Hub = z.object({
    id: z.string(),
    status: z.string().optional()
});

export const Sequence = z.object({
    id: z.string(),
    status: z.string().optional()
});

export const Instance = z.object({
    id: z.string(),
    sequenceId: z.string().optional(),
    status: z.string().optional()
});

export const Entity = z.object({
    id: z.string(),
    type: z.string().optional()
});

export const Topic = z.object({
    name: z.string(),
    contentType: z.string(),
    direction: z
        .union([z.literal("input"), z.literal("output"), z.literal("duplex")])
        .optional()
});

export const StoreItem = z.object({
    path: z.string(),
    size: z.number().int().min(0).optional()
});

export const LogRecord = z.object({
    time: z.number(),
    level: z.string(),
    message: z.string(),
    meta: z.unknown().optional()
});

export const AuditRecord = z.object({
    id: z.string(),
    time: z.number(),
    event: z.string(),
    meta: z.unknown().optional()
});

export const MonitoringMessage = z.object({
    time: z.number(),
    metrics: z.unknown()
});

export const TrustExport = z.object({
    ca: z.string(),
    fingerprint256: z.string(),
    expiresAt: z.string(),
    hostUrl: z.string(),
    routeDomains: z.object({
        broker: z.string(),
        guest: z.string()
    })
});

export const HealthStatus = z.union([z.literal("healthy"), z.literal("degraded"), z.literal("unhealthy")]);

export function healthComponent<TScope extends z.ZodTypeAny = z.ZodUnknown>(scopeSchema: TScope = z.unknown() as unknown as TScope) {
    return z.object({
        name: z.string(),
        healthy: z.boolean(),
        status: HealthStatus,
        scope: scopeSchema.optional(),
        details: z.unknown().optional()
    });
}

export function healthCheckInfo<TScope extends z.ZodTypeAny, TComponent extends z.ZodTypeAny = ReturnType<typeof healthComponent>>(
    scopeSchema: TScope,
    componentSchema: TComponent = healthComponent(scopeSchema) as unknown as TComponent
) {
    return z.object({
        scope: scopeSchema.optional(),
        healthy: z.boolean(),
        status: HealthStatus,
        components: z.array(componentSchema),
        details: z.unknown().optional()
    });
}

export const HealthCheckInfo = healthCheckInfo(z.unknown());

export const VersionResponse = z.object({
    scope: z.unknown().optional(),
    version: z.string()
});

export const InfoResponse = z.object({
    scope: z.unknown().optional(),
    info: z.unknown()
});

export const ConfigResponse = z.object({
    scope: z.unknown().optional(),
    config: z.unknown()
});

export const LoadResponse = z.object({
    scope: z.unknown().optional(),
    load: z.number()
});

export const StatusResponse = z.object({
    status: z.string(),
    details: z.unknown().optional()
});

export const StdIODescriptor = z.object({
    fd: z.union([z.literal(0), z.literal(1), z.literal(2)]),
    readable: z.boolean(),
    writable: z.boolean()
});

export const StdIODescriptorList = z.object({
    channels: z.array(StdIODescriptor)
});

// ============================================================
// FD param schemas – coerce string "0"/"1"/"2" to number,
// reject arbitrary strings.
// ============================================================

/**
 * Preprocesses the raw (string) path param into a number, then
 * validates it is one of the allowed fd values.
 *
 * @param allowed - Tuple of allowed file descriptor values.
 * @returns A Zod pipeline that coerces the input and validates against the allowed values.
 */
function coerceFd(allowed: readonly [number, ...number[]]) {
    if (allowed.length === 1) {
        return z.coerce.number().int().pipe(z.literal(allowed[0]));
    }

    const [first, second, ...rest] = allowed.map((v) => z.literal(v)) as [
        z.ZodLiteral<number>,
        z.ZodLiteral<number>,
        ...z.ZodLiteral<number>[]
    ];

    return z.coerce.number().int().pipe(z.union([first, second, ...rest]));
}

export const readableFdParam = z.object({ fd: coerceFd([1, 2]) });
export const writableFdParam = z.object({ fd: coerceFd([0]) });
export const anyFdParam = z.object({ fd: coerceFd([0, 1, 2]) });

// ============================================================
// Payload / Response DTO schemas
// ============================================================

export const SendSequencePayload = z.object({
    source: z.unknown(),
    config: z.unknown().optional()
});

export const DeleteSequenceResponse = z.object({
    sequenceId: z.string(),
    deleted: z.boolean()
});

export const StartSequencePayload = z.object({
    args: z.array(z.unknown()).optional(),
    config: z.unknown().optional()
});

export const StartSequenceResponse = z.object({
    instance: Instance
});

export const SequenceResponse = z.object({
    sequence: Sequence
});

export const InstanceResponse = z.object({
    instance: Instance
});

export const DeleteInstancePayload = z.object({
    mode: z.union([z.literal("stop"), z.literal("kill")]),
    timeout: z.number().int().min(0).optional(),
    reason: z.string().optional()
});

export const DeleteInstanceResponse = z.object({
    instanceId: z.string(),
    mode: z.union([z.literal("stop"), z.literal("kill")]),
    accepted: z.boolean()
});

export const InstanceParametersPatch = z.object({
    monitoringRate: z.number().min(0).optional(),
    logLevel: z.string().optional(),
    parameters: z.record(z.string(), z.unknown()).optional()
});

export const InstanceParametersResponse = z.object({
    instance: Instance,
    parameters: z.record(z.string(), z.unknown())
});

const queryBoolean = z.preprocess(value => {
    if (value === "true" || value === "1") return true;
    if (value === "false" || value === "0") return false;

    return value;
}, z.boolean());

export const DeleteHubQuery = z.object({
    force: queryBoolean.optional(),
    delete: queryBoolean.optional(),
    disconnect: queryBoolean.optional(),
    reason: z.string().optional()
});

export const DeleteHubResponse = z.object({
    hubId: z.string(),
    deleted: z.boolean(),
    disconnected: z.boolean().optional()
});

export const StoreItemPayload = z.object({
    path: z.string().optional(),
    directory: z.string().optional(),
    filename: z.string().optional()
}).passthrough();

export const StoreClearQuery = z.object({
    force: queryBoolean.optional()
}).passthrough();

export const StoreClearResponse = z.object({
    cleared: z.boolean()
});

export const TopicCreatePayload = z.object({
    topic: Topic
});

export const TopicCreateResponse = z.object({
    topic: Topic
});

export const TopicDeleteResponse = z.object({
    topic: z.string(),
    deleted: z.boolean()
});

export const TopicStreamResponse = z.object({
    accepted: z.boolean()
});

export const HttpHeaders = z.record(z.string(), z.union([z.string(), z.array(z.string()), z.undefined()]));

export const EventResponse = z.object({
    event: z.unknown()
});

export const EventMessage = z.object({
    managerId: z.string().optional(),
    hubId: z.string().optional(),
    sequenceId: z.string().optional(),
    instanceId: z.string().optional(),
    topic: z.string().optional(),
    auditId: z.string().optional(),
    name: z.string(),
    data: z.unknown()
});

export const SendEventResponse = z.object({
    delivered: z.boolean()
});

export const RpcRequest = z.object({
    method: z.string(),
    path: z.string(),
    headers: z.record(z.string(), z.string()).optional(),
    body: z.unknown().optional()
});

export const RpcResponse = z.object({
    status: z.number().int(),
    headers: z.record(z.string(), z.string()),
    body: z.unknown().optional()
});

export const MultiManager = z.object({
    id: z.string(),
    apiBase: z.string(),
    managers: z.number().int().min(0).optional()
});

// ============================================================
// Factory functions for generic response containers
// ============================================================

export function opResponse<T extends z.ZodTypeAny>(resultSchema: T) {
    return z.object({
        operation: Operation,
        result: resultSchema.optional(),
        error: ErrorBody.optional()
    });
}

export function listResponse<T extends z.ZodTypeAny>(itemSchema: T) {
    return z.object({
        items: z.array(itemSchema),
        page: PageInfo.optional(),
        stream: StreamInfo.optional(),
        links: z.record(z.string(), z.string()).optional()
    });
}

// ============================================================
// RestAPI2Schemas – keep the existing export shape compatible
// so that routes.ts continues to work unchanged.
// ============================================================

export const RestAPI2Schemas = {
    empty: z.object({}).passthrough(),
    list: z.object({ items: z.array(z.unknown()) }).passthrough(),
    stream: z.unknown(),
    query: {
        page: z
            .object({
                offset: z.coerce.number().int().min(0).optional(),
                limit: z.coerce.number().int().min(1).optional()
            })
            .passthrough()
            .optional()
    },
    headers: {
        http: HttpHeaders
    },
    params: {
        manager: z.object({ managerId: z.string() }),
        hub: z.object({ hubId: z.string() }),
        sequence: z.object({ sequenceId: z.string() }),
        instance: z.object({ instanceId: z.string() }),
        fd: anyFdParam,
        event: z.object({ name: z.string() }),
        topic: z.object({ name: z.string() }),
        trustManager: z.object({ id: z.string().optional() }).optional()
    },
    multiManager: {
        version: z.object({
            service: z.string(),
            apiVersion: z.literal("v2"),
            version: z.string(),
            build: z.string()
        }),
        info: z.object({
            apiBase: z.string(),
            apiPort: z.number(),
            id: z.string(),
            managersCount: z.number()
        }),
        load: z.unknown(),
        list: z.object({ items: z.array(z.unknown()) }).passthrough()
    }
};
