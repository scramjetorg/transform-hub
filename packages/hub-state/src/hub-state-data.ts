import type { HubCursor, HubInventoryCheckpoint, HubStateMutation } from "@scramjet/runtime-types";

export function copy<T>(value: T): T {
    return copyJson(value, new Set<object>()) as T;
}

function copyJson(value: unknown, ancestors: Set<object>): unknown {
    if (value === null || typeof value === "string" || typeof value === "boolean") return value;
    if (typeof value === "number") {
        if (!Number.isFinite(value)) throw new TypeError("Hub state values must contain finite JSON numbers");
        return value;
    }
    if (typeof value !== "object") throw new TypeError("Hub state values must be JSON data");
    if (ancestors.has(value)) throw new TypeError("Hub state values cannot be cyclic");
    ancestors.add(value);
    try {
        if (Array.isArray(value)) {
            if (Object.getPrototypeOf(value) !== Array.prototype || Reflect.ownKeys(value).some((key) => key !== "length" && (typeof key !== "string" || !/^(0|[1-9]\d*)$/.test(key)))) {
                throw new TypeError("Hub state arrays must be plain JSON arrays");
            }
            const descriptors = Object.getOwnPropertyDescriptors(value);
            const result: unknown[] = [];
            for (let index = 0; index < value.length; index++) {
                const descriptor = descriptors[String(index)];
                if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) throw new TypeError("Hub state arrays must not contain holes or accessors");
                result.push(copyJson(descriptor.value, ancestors));
            }
            return result;
        }
        const prototype = Object.getPrototypeOf(value);
        if (prototype !== Object.prototype && prototype !== null) throw new TypeError("Hub state objects must be plain JSON objects");
        const result: Record<string, unknown> = {};
        const descriptors = Object.getOwnPropertyDescriptors(value);
        for (const key of Reflect.ownKeys(descriptors)) {
            if (typeof key !== "string") throw new TypeError("Hub state objects cannot contain symbol keys");
            const descriptor = descriptors[key];
            if (!("value" in descriptor) || !descriptor.enumerable) throw new TypeError("Hub state objects must not contain accessors");
            // Optional public DTO properties are routinely present with value `undefined`.
            // JSON serialization omits those object keys, so materialization must do the same.
            if (descriptor.value === undefined) continue;
            Object.defineProperty(result, key, { value: copyJson(descriptor.value, ancestors), enumerable: true, configurable: true, writable: true });
        }
        return result;
    } finally {
        ancestors.delete(value);
    }
}

export function isObject(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }

export function validMutation(mutation: unknown): mutation is HubStateMutation {
    if (!isObject(mutation)) return false;
    switch (mutation.kind) {
        case "sequence": return (mutation.action === "upsert" && typeof mutation.sequenceId === "string" && isObject(mutation.value) && validSequenceInstances(mutation.value)) ||
            (mutation.action === "remove" && typeof mutation.sequenceId === "string" && mutation.value === null) ||
            (mutation.action === "manifest" && typeof mutation.sequenceId === "string" && typeof mutation.instanceId === "string" && isObject(mutation.manifestChange));
        case "instance": return typeof mutation.instanceId === "string" && typeof mutation.sequenceId === "string" &&
            ((mutation.action === "upsert" && isObject(mutation.value)) || (mutation.action === "remove" && mutation.value === null));
        case "topic": return typeof mutation.topic === "string" && ((mutation.action === "upsert" && isObject(mutation.value)) || (mutation.action === "remove" && mutation.value === null));
        case "health": return mutation.action === "upsert" && isObject(mutation.value);
        default: return false;
    }
}

function validSequenceInventory(sequences: unknown[]): boolean {
    const ids = new Set<string>();
    return sequences.every((sequence) => {
        if (!isObject(sequence) || typeof sequence.id !== "string" || !Array.isArray(sequence.manifests) || !validSequenceInstances(sequence) || ids.has(sequence.id)) return false;
        ids.add(sequence.id);
        const instances = new Set<string>();
        return sequence.manifests.every((manifest) => {
            if (!isObject(manifest) || typeof manifest.instanceId !== "string" || manifest.sequenceId !== sequence.id || instances.has(manifest.instanceId)) return false;
            instances.add(manifest.instanceId);
            return true;
        });
    });
}

function validSequenceInstances(sequence: Record<string, unknown>): boolean {
    return sequence.instances === undefined || Array.isArray(sequence.instances) && sequence.instances.every((instance) => typeof instance === "string");
}

export function validInventoryAssociations(inventory: HubInventoryCheckpoint): boolean {
    const sequenceIds = new Set<string>();
    if (!validSequenceInventory(inventory.sequences)) return false;
    for (const sequence of inventory.sequences) sequenceIds.add(sequence.id);
    const instanceIds = new Set<string>();
    for (const instance of inventory.instances) {
        if (!isObject(instance) || typeof instance.id !== "string" || instanceIds.has(instance.id)) return false;
        instanceIds.add(instance.id);
        if (instance.sequenceId !== undefined && typeof instance.sequenceId !== "string") return false;
    }
    const topicNames = new Set<string>();
    for (const topic of inventory.topics) {
        if (!isObject(topic) || typeof topic.name !== "string" || topicNames.has(topic.name)) return false;
        topicNames.add(topic.name);
    }
    return isObject(inventory.health);
}

export function validCursor(cursor: unknown): cursor is HubCursor {
    return isObject(cursor) && typeof cursor.hubId === "string" && !!cursor.hubId && typeof cursor.epoch === "string" && !!cursor.epoch && Number.isSafeInteger(cursor.position) && (cursor.position as number) >= 0;
}

export function validMutationAssociations(mutation: HubStateMutation): boolean {
    if (mutation.kind === "sequence" && mutation.action === "upsert") return mutation.value.id === mutation.sequenceId;
    if (mutation.kind === "sequence" && mutation.action === "manifest") {
        const change = mutation.manifestChange;
        return change.instanceId === mutation.instanceId && change.sequenceId === mutation.sequenceId;
    }
    if (mutation.kind === "instance" && mutation.action === "upsert") {
        return mutation.value.id === mutation.instanceId && (mutation.value.sequenceId === undefined || mutation.value.sequenceId === mutation.sequenceId);
    }
    if (mutation.kind === "topic" && mutation.action === "upsert") return mutation.value.name === mutation.topic;
    return true;
}
