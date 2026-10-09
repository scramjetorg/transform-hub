import type { HubInstanceRecord, HubSequenceRecord, HubTopicRecord } from "@scramjet/runtime-types";
import type { SequenceInfo } from "@scramjet/runtime-types";
import type { STHRestAPI } from "@scramjet/api-types";

export function projectSequence(sequence: SequenceInfo, hubId: string, v2ApiBase: string): HubSequenceRecord {
    return {
        id: String(sequence.id),
        name: sequence.name ?? sequence.config?.name ?? sequence.config?.id ?? String(sequence.id),
        status: (sequence as SequenceInfo & { status?: string }).status,
        hubId: (sequence as SequenceInfo & { hubId?: string }).hubId || hubId,
        location: sequence.location,
        apiBase: `${v2ApiBase}/sequences/${sequence.id}`,
        instances: sequence.instances
    };
}

export function projectInstance(instance: STHRestAPI.GetInstanceResponse, hubId: string, v2ApiBase: string): HubInstanceRecord {
    const id = String(instance.id);
    const source = instance as STHRestAPI.GetInstanceResponse & { sequenceId?: string; hubId?: string; location?: string };
    const sequenceId = source.sequenceId || instance.sequence?.id;
    const instanceHubId = source.hubId || hubId;
    return {
        id,
        instanceName: instance.instanceName,
        sequenceId,
        status: instance.status,
        hubId: instanceHubId,
        location: source.location || instanceHubId,
        apiBase: `${v2ApiBase}/instances/${id}`,
        sequence: instance.sequence ? {
            id: instance.sequence.id,
            name: instance.sequence.name || (instance.sequence as typeof instance.sequence & { config?: { name?: string; id?: string } }).config?.name || (instance.sequence as typeof instance.sequence & { config?: { id?: string } }).config?.id || instance.sequence.id,
            status: instance.sequence.status,
            hubId: instance.sequence.hubId || instanceHubId,
            location: instance.sequence.location,
            apiBase: `${v2ApiBase}/sequences/${instance.sequence.id}`
        } : sequenceId ? { id: sequenceId } : undefined
    };
}

export function projectTopic(name: string, contentType: string, origin: HubTopicRecord["origin"]): HubTopicRecord {
    return { name, contentType, origin };
}

type HostTopicListItem = { id?: unknown; name?: unknown; topic?: unknown; topicName?: unknown; contentType?: unknown; origin?: unknown };

/** Normalize both registry DTOs and live Topic objects exactly like the v2 topics projection. */
export function projectHostTopic(topic: unknown, hubId: string): HubTopicRecord {
    const item = typeof topic === "object" && topic !== null ? topic as HostTopicListItem : undefined;
    const methodId = item && typeof item.id === "function" ? item.id() : undefined;
    const id = item?.id;
    const topicValue = typeof id === "function" ? undefined : id && typeof id === "object" && "id" in id && typeof (id as { id?: unknown }).id === "function" ? (id as { id(): unknown }).id() : id;
    const name = String(methodId || item?.name || item?.topicName || item?.topic || topicValue || topic);
    const contentType = item?.contentType === undefined ? "" : String(item.contentType);
    let origin: HubTopicRecord["origin"] = { type: "hub", id: hubId };
    const candidate = item?.origin;
    if (candidate && typeof candidate === "object" && "type" in candidate && "id" in candidate) {
        const value = candidate as { type?: unknown; id?: unknown };
        if ((value.type === "hub" || value.type === "space") && typeof value.id === "string") origin = { type: value.type, id: value.id };
    } else if (item && typeof candidate === "function") {
        const value = (candidate as () => { type?: unknown; id?: unknown }).call(topic);
        if (value && (value.type === "hub" || value.type === "space") && typeof value.id === "string") origin = { type: value.type, id: value.id };
    }
    return projectTopic(name, contentType, origin);
}
