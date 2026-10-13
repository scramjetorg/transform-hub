import type { InstanceManifestResponse } from "./runtime-manifest";

export type HubSequenceRecord = {
    id: string;
    name?: string;
    status?: string;
    hubId?: string;
    location?: string;
    apiBase?: string;
    instances?: string[];
};

export type HubInstanceRecord = {
    id: string;
    instanceName?: string;
    sequenceId?: string;
    status?: string;
    hubId?: string;
    location?: string;
    apiBase?: string;
    sequence?: {
        id: string;
        name?: string;
        status?: string;
        hubId?: string;
        location?: string;
        apiBase?: string;
    };
};

export type HubTopicRecord = {
    name: string;
    contentType: string;
    origin?: { type: "hub" | "space"; id: string };
    direction?: "input" | "output" | "duplex";
};

export type HubSequenceSnapshotRecord = HubSequenceRecord & { manifests: InstanceManifestResponse[] };
