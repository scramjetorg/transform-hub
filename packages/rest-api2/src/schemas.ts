import { z } from "zod";

export const RestAPI2Schemas = {
    empty: z.object({}).passthrough(),
    list: z.object({ items: z.array(z.unknown()) }).passthrough(),
    stream: z.unknown(),
    query: {
        page: z.object({
            offset: z.union([z.string(), z.number()]).optional(),
            limit: z.union([z.string(), z.number()]).optional()
        }).passthrough().optional()
    },
    params: {
        manager: z.object({ managerId: z.string() }),
        hub: z.object({ hubId: z.string() }),
        sequence: z.object({ sequenceId: z.string() }),
        instance: z.object({ instanceId: z.string() }),
        fd: z.object({ fd: z.string() }),
        event: z.object({ name: z.string() }),
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
        })
    }
};
