/** JSON values accepted in a user-supplied JSON Schema document. */
export type ManifestJsonValue = null | boolean | number | string | ManifestJsonValue[] | { [key: string]: ManifestJsonValue };

export type ManifestSchema = boolean | { [key: string]: ManifestJsonValue };

export type ManifestField = {
    description?: string;
    mediaType?: string;
    schema?: ManifestSchema;
};

export type ManifestRpc = {
    procedure: string;
    description?: string;
    contractIdentity?: string;
    request?: ManifestSchema;
    response?: ManifestSchema;
};

export type ManifestTopic = {
    name: string;
    direction: string;
    description?: string;
    mediaType?: string;
    schema?: ManifestSchema;
};

/** Public declaration metadata only; schemas are descriptive, not enforcement. */
export type ManifestDeclaration = {
    input?: ManifestField;
    output?: ManifestField;
    rpc?: ManifestRpc[];
    topics?: ManifestTopic[];
};

export type ManifestReceipt = { instanceId: string; sequenceId: string; revision: string };

export type ManifestSequenceMetadata = { name?: string; version?: string; description?: string };

export type InstanceManifestResponse = {
    instanceId: string;
    sequenceId: string;
    revision: string | null;
    manifest: ManifestDeclaration | null;
    sequence: ManifestSequenceMetadata;
};

export type SequenceManifestResponse = { sequenceId: string; items: InstanceManifestResponse[] };

export type ManifestDeclarationError = { code: string; message: string; path?: string };
export type ManifestDeclareRequest = { requestId: string; declaration: ManifestDeclaration };
export type ManifestDeclareResult =
    | { requestId: string; accepted: true; receipt: ManifestReceipt }
    | { requestId: string; accepted: false; error: ManifestDeclarationError };

export type ManifestChange = {
    action: "published" | "updated" | "removed";
    instanceId: string;
    sequenceId: string;
    revision: string | null;
    previousRevision: string | null;
    manifest: ManifestDeclaration | null;
    sequence: ManifestSequenceMetadata;
    reason?: "instance-ended" | "instance-deleted" | "instance-replaced" | "host-stopped";
};
