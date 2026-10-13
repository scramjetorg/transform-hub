import { RunnerMessageCode } from "@scramjet/symbols";

/** Compatibility mirror of the runtime-neutral shared manifest contract. */
export type ManifestJsonValue = null | boolean | number | string | ManifestJsonValue[] | { [key: string]: ManifestJsonValue };
export type ManifestSchema = boolean | { [key: string]: ManifestJsonValue };
export type ManifestField = { description?: string; mediaType?: string; schema?: ManifestSchema };
export type ManifestRpc = {
    procedure: string;
    description?: string;
    contractIdentity?: string;
    request?: ManifestSchema;
    response?: ManifestSchema;
};
export type ManifestTopic = { name: string; direction: string; description?: string; mediaType?: string; schema?: ManifestSchema };
export type ManifestDeclaration = { input?: ManifestField; output?: ManifestField; rpc?: ManifestRpc[]; topics?: ManifestTopic[] };
export type ManifestReceipt = { instanceId: string; sequenceId: string; revision: string };
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
    sequence: { name?: string; version?: string; description?: string };
    reason?: "instance-ended" | "instance-deleted" | "instance-replaced" | "host-stopped";
};

export type ManifestDeclareMessageData = ManifestDeclareRequest;
export type ManifestResultMessageData = ManifestDeclareResult;

export type ManifestDeclareMessage = { msgCode: RunnerMessageCode.MANIFEST_DECLARE } & ManifestDeclareMessageData;
export type ManifestResultMessage = { msgCode: RunnerMessageCode.MANIFEST_RESULT } & ManifestResultMessageData;
