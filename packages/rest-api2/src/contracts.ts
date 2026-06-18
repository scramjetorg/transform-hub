export namespace RestAPI2 {
    export type ScopeName = "mmgr" | "mgr" | "hub" | "seq" | "inst" | "audit" | "stdio" | "rpc";

    export type OperationId = `${Uppercase<string>} /api/v2${string}` | `${Uppercase<string>} <${string}>`;

    export type Empty = Record<string, never>;

    export type IdParams<TScope extends string = string> = {
        scope: TScope;
        managerId?: string;
        hubId?: string;
        sequenceId?: string;
        instanceId?: string;
        topic?: string;
        auditId?: string;
    };

    export type PageInfo = {
        offset?: number;
        limit?: number;
        total?: number;
        next?: string;
    };

    export type Links = Record<string, string>;

    export type StreamRange = {
        unit: "time" | "span";
        start: number | "*";
        end: number | "*";
    };

    export type StreamInfo = {
        range?: StreamRange;
        live?: boolean;
        itemType?: string;
    };

    export type StreamDescriptor<TItem = unknown> = {
        item?: TItem;
        mediaType?: string;
        streamable: true | "always";
        range?: StreamRange;
    };

    export type ListQuery<TItem = unknown> = {
        filter?: Partial<TItem>;
        sort?: string;
        page?: Pick<PageInfo, "offset" | "limit">;
        range?: StreamRange;
    };

    export type ListResponse<TItem> = {
        items: TItem[];
        page?: PageInfo;
        stream?: StreamInfo;
        links?: Links;
    };

    export type Operation = {
        id: string;
        status: "pending" | "running" | "completed" | "failed";
    };

    export type ErrorBody = {
        code: string;
        message: string;
        details?: unknown;
    };

    export type OpResponse<TOutput> = {
        operation: Operation;
        result?: TOutput;
        error?: ErrorBody;
    };

    export type NoContent<Status extends number> = {
        status: Status;
    };

    export type BinaryChunk = Uint8Array;
    export type StdIOChunk = Uint8Array;

    export type MultiManager = {
        id: string;
        apiBase: string;
        managers?: number;
    };

    export type Manager = {
        id: string;
        hubs?: number;
    };

    export type Hub = {
        id: string;
        status?: string;
    };

    export type Sequence = {
        id: string;
        status?: string;
    };

    export type Instance = {
        id: string;
        sequenceId?: string;
        status?: string;
    };

    export type Entity = { id: string; type?: string };
    export type Topic = { name: string; direction?: "input" | "output" | "duplex" };
    export type StoreItem = { path: string; size?: number };
    export type LogRecord = { time: number; level: string; message: string; meta?: unknown };
    export type AuditRecord = { id: string; time: number; event: string; meta?: unknown };

    export type TrustExport<TScope = unknown> = { scope: TScope; keys: unknown[] };
    export type HealthCheckInfo<TScope = unknown> = { scope?: TScope; healthy: boolean; details?: unknown };
    export type VersionResponse<TScope = unknown> = { scope?: TScope; version: string };
    export type InfoResponse<TScope = unknown> = { scope?: TScope; info: unknown };
    export type ConfigResponse<TScope = unknown> = { scope?: TScope; config: unknown };
    export type LoadResponse<TScope = unknown> = { scope?: TScope; load: number };
    export type StatusResponse = { status: string; details?: unknown };

    export type ManagersQuery = ListQuery<Manager>;
    export type ManagersResponse = ListResponse<Manager>;
    export type ManagerParams = IdParams<"mgr">;
    export type HubParams = IdParams<"hub">;
    export type InstancesQuery = ListQuery<Instance>;
    export type SequencesQuery = ListQuery<Sequence>;
    export type LogFilters = { level?: string; from?: number; to?: number };
    export type LogFilter = LogFilters;
    export type TopicParams = IdParams<"topic">;
    export type TopicInformation = Topic;

    export type StartManagerPayload = { config?: unknown };
    export type StartManagerResponse = { manager: Manager };
    export type DeleteManagerPayload = { force?: boolean; timeout?: number };
    export type DeleteManagerResponse = { managerId: string; stopped: boolean };
    export type RegisterHubPayload = { hub: Hub; connection?: unknown };
    export type RegisterHubResponse = { hub: Hub };
    export type DeleteHubPayload = { force?: boolean };
    export type DeleteHubResponse = { hubId: string; deleted: boolean };
    export type DisconnectHubPayload = { hubIds?: string[]; reason?: string };
    export type DisconnectHubResponse = { disconnected: string[] };

    export type SendSequencePayload = { source: unknown; config?: unknown };
    export type SendSequenceResponse = { sequence: Sequence };
    export type DeleteSequencePayload = { force?: boolean; deleteInstances?: boolean };
    export type DeleteSequenceResponse = { sequenceId: string; deleted: boolean };
    export type StartSequencePayload = { args?: unknown[]; config?: unknown };
    export type StartSequenceResponse = { instance: Instance };
    export type SequencePayload = IdParams<"seq">;
    export type SequenceResponse = { sequence: Sequence };
    export type SequenceInstancesPayload = IdParams<"seq"> & ListQuery<Instance>;

    export type InstanceResponse = { instance: Instance };
    export type InstanceStreamPayload = IdParams<"inst"> & { range?: StreamRange };
    export type MonitoringMessage = { time: number; metrics: unknown };
    export type HealthPayload = IdParams<"inst">;
    export type EventMessageData = unknown;
    export type EventPayload = IdParams<"inst"> & { name: string };
    export type EventResponse = { event: unknown };
    export type NextEventResponse = { event: unknown };
    export type EventMessage = IdParams<"inst"> & { name: string; data: unknown };
    export type SendEventResponse = { delivered: boolean };
    export type DeleteInstancePayload = { mode: "stop" | "kill"; timeout?: number; reason?: string };
    export type DeleteInstanceResponse = { instanceId: string; mode: "stop" | "kill"; accepted: boolean };
    export type InstanceParametersPatch = { monitoringRate?: number; logLevel?: string; parameters?: Record<string, unknown> };
    export type InstanceParametersResponse = { instance: Instance; parameters: Record<string, unknown> };

    export type TopicCreatePayload = { topic: Topic };
    export type TopicCreateResponse = { topic: Topic };
    export type TopicDeletePayload = TopicParams;
    export type TopicDeleteResponse = { topic: string; deleted: boolean };
    export type TopicStreamPayload = TopicParams & { range?: StreamRange };
    export type TopicChunk = unknown;
    export type TopicStreamResponse = { accepted: boolean };

    export type StoreItemPayload = { path: string };
    export type StoreItemResponse = { item: StoreItem };
    export type DeleteStoreItemPayload = StoreItemPayload;
    export type DeleteStoreItemResponse = { path: string; deleted: boolean };
    export type StoreClearPayload = ManagerParams & { force?: boolean };
    export type StoreClearResponse = { cleared: boolean };

    export type AuditRecordParams = IdParams<"audit">;
    export type AuditQuery = IdParams & ListQuery<AuditRecord>;
    export type AuditQueryResponse = ListResponse<AuditRecord>;
    export type Params<TScope> = IdParams<string> & { scope?: TScope };
    export type StdIODescriptorList = { channels: Array<{ fd: 0 | 1 | 2; readable: boolean; writable: boolean }> };
    export type RpcRequest = { method: string; path: string; headers?: Record<string, string>; body?: unknown };
    export type RpcResponse = { status: number; headers: Record<string, string>; body?: unknown };
    export type RouteOwner = "mmgr" | "mgr" | "host";
    export type RouteOwnership = {
        owner: RouteOwner;
        operationId: OperationId;
        publicPath: string;
        mountPath?: string;
        implementerPath: string;
    };
    export type ForwardingRoute = RouteOwnership & { path?: string };
    export type ForwardingResolution = { route: ForwardingRoute; action: "local" | "forward" | "redirect"; target?: string };

    export type ClientRequest<TOperation extends OperationId = OperationId, TBody = unknown> = {
        operationId: TOperation;
        params?: unknown;
        query?: unknown;
        headers?: Record<string, string>;
        body?: TBody;
    };

    export type ClientResponse<TOperation extends OperationId = OperationId, TBody = unknown> = {
        operationId: TOperation;
        status: number;
        headers: Record<string, string>;
        body: TBody;
    };

    export type ClientTransport = {
        request<TBody = unknown>(request: ClientRequest): Promise<ClientResponse<OperationId, TBody>>;
    };

    export type Client = {
        request<TBody = unknown, TOperation extends OperationId = OperationId>(request: ClientRequest<TOperation>): Promise<ClientResponse<TOperation, TBody>>;
    };
}
