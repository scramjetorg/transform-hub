import { APIExpose } from "@scramjet/types";
import { RawHttpRouteRequest, Router, RouterDefinition, bindResolver, bindRoutes, registerHttpRoutes, replacePathVersion, routeBinding, resolverBinding } from "@scramjet/api-router";
import { RestAPI2, RestAPI2RouteSets } from "@scramjet/rest-api2";
import { onRequestDisconnect } from "@scramjet/utility";
import { createDefaultHealthComponents, degradedComponent, summarizeHealth } from "@scramjet/load-check";
import { PassThrough, Readable } from "stream";

import { IHost } from "../types";
import TopicId from "../serviceDiscovery/topicId";
import { isContentType } from "../serviceDiscovery/contentType";

type HostTopicListItem = {
    id?: unknown;
    name?: unknown;
    topic?: unknown;
    topicName?: unknown;
    contentType?: unknown;
};

type HasIdMethod = {
    id(): unknown;
};

function hasIdMethod(value: unknown): value is HasIdMethod {
    return Boolean(value && typeof value === "object" && "id" in value && typeof Object.getOwnPropertyDescriptor(value, "id")?.value === "function");
}

export class HostAPIV2Handler {
    constructor(
        private api: APIExpose,
        private host: IHost,
        private version: string
    ) {}

    get v2ApiBase() {
        return replacePathVersion(this.host.apiBase, "v2");
    }

    createHubRouter(): RouterDefinition {
        const host = this.host;
        const routes = RestAPI2RouteSets.hub.hubRoutes();

        return bindRoutes(routes, {
            load: (): RestAPI2.LoadResponse<RestAPI2.Hub> => ({
                load: (host.loadCheck.getLoadCheck() as any)?.load ?? 0
            }),
            version: (): RestAPI2.VersionResponse<RestAPI2.Hub> => ({
                version: this.version
            }),
            config: (): RestAPI2.ConfigResponse<RestAPI2.Hub> => ({
                config: host.publicConfig
            }),
            health: async (): Promise<RestAPI2.HealthCheckInfo<RestAPI2.Hub>> => {
                const scope = { id: String((host as any).config?.host?.id || "hub"), status: "ok" };
                const sequenceStorage = (host as any).config?.sequencesRoot;
                const components = await createDefaultHealthComponents({
                    current: { name: "hub", healthy: true, scope, details: host.getStatus() },
                    processMemoryLimitBytes: host.loadCheck.constants.SAFE_OPERATION_LIMIT || undefined,
                    osDiskPaths: [sequenceStorage].filter(Boolean),
                    extraComponents: [host.runnerVerser2UpstreamHealth || degradedComponent("hub.upstream", false, { configured: false })]
                });

                return summarizeHealth(scope, components, { status: host.getStatus() });
            },
            status: (): RestAPI2.StatusResponse => ({
                status: "ok",
                details: host.getStatus()
            }),
            sequences: (): RestAPI2.ListResponse<RestAPI2.Sequence> => ({
                items: (host.getSequences() as any[]).map(sequence => ({ id: String(sequence.id), status: sequence.status }))
            }),
            instances: (): RestAPI2.ListResponse<RestAPI2.Instance> => ({
                items: (host.getInstances() as any[]).map(instance => ({ id: String(instance.id), sequenceId: instance.sequenceId, status: instance.status }))
            }),
            entities: (): RestAPI2.ListResponse<RestAPI2.Entity> => ({
                items: [
                    ...(host.getSequences() as any[]).map(sequence => ({ id: String(sequence.id), type: "sequence" })),
                    ...(host.getInstances() as any[]).map(instance => ({ id: String(instance.id), type: "instance" }))
                ]
            }),
            topics: (): RestAPI2.ListResponse<RestAPI2.Topic> => ({
                items: this.hostTopics().map(topic => this.hostTopic(topic))
            }),
            createTopic: routeBinding.handler<typeof routes.createTopic>(({ body, headers }) => this.createTopic(body, headers)),
            deleteTopic: routeBinding.handler<typeof routes.deleteTopic>(({ params }) => this.deleteTopic(params.name)),
            topicRead: routeBinding.handler<typeof routes.topicRead>(req => this.topicRead(req.params.name, req.headers)),
            topicWrite: routeBinding.handler<typeof routes.topicWrite>(req => this.topicWrite(req.params.name, this.rawReadable(req), req.headers)),
            logs: () => host.commonLogsPipe.getOut(),
            audit: routeBinding.handler<typeof routes.audit>(req => this.handleAuditRequest(req), { id: "hub.v2.audit" })
        });
    }

    createSequenceRouter(): RouterDefinition {
        const host = this.host;
        const sequenceId = (params: { sequenceId: string }) => params.sequenceId;
        const routes = RestAPI2RouteSets.hub.sequenceRoutes();

        return bindRoutes(routes, {
            sendSequence: routeBinding.contractOnly("Sequence upload stream remains handled by v1 compatibility surface."),
            updateSequence: routeBinding.contractOnly("Sequence update stream remains handled by v1 compatibility surface."),
            deleteSequence: async ({ params, headers }): Promise<RestAPI2.OpResponse<RestAPI2.DeleteSequenceResponse>> => {
                const id = sequenceId(params);
                const force = Boolean((headers as Record<string, unknown> | undefined)?.["x-seq-kill-inst"]);

                if (!id) {
                    return this.failedOperation("MISSING_SEQUENCE_ID", "Missing sequence id parameter", id);
                }

                try {
                    await host.deleteSequence(id, force);

                    return this.completedOperation(id, { sequenceId: id, deleted: true });
                } catch (error) {
                    return this.failedOperation("DELETE_SEQUENCE_FAILED", this.errorMessage(error), id);
                }
            },
            startSequence: async ({ params, body }): Promise<RestAPI2.OpResponse<RestAPI2.StartSequenceResponse>> => {
                const id = sequenceId(params);

                if (!id) {
                    return this.failedOperation("MISSING_SEQUENCE_ID", "Missing sequence id parameter", id);
                }

                try {
                    const instance = await host.startSequence(id, body as any);
                    const instanceId = "id" in instance ? String(instance.id) : "";

                    return this.completedOperation(instanceId || id, { instance: { id: instanceId } });
                } catch (error) {
                    return this.failedOperation("START_SEQUENCE_FAILED", this.errorMessage(error), id);
                }
            },
            getSequence: ({ params }): RestAPI2.SequenceResponse => {
                const id = sequenceId(params);
                const sequence = host.getSequence(id) as any;

                return { sequence: { id: String(sequence?.id || id), status: sequence?.status } };
            },
            getSequenceInstances: ({ params }): RestAPI2.ListResponse<RestAPI2.Instance> => ({
                items: (host.getSequenceInstances(sequenceId(params)) as any[]).map(instance => ({
                    id: String(instance.id),
                    sequenceId: instance.sequenceId,
                    status: instance.status
                }))
            })
        });
    }

    createV2Router(): RouterDefinition {
        const router = Router.create({ basePath: this.v2ApiBase })
            .mount("/", this.createHubRouter())
            .mount("/sequences", this.createSequenceRouter());
        const resolver = RestAPI2RouteSets.hub.resolvers().instance;

        return bindResolver(resolver, resolverBinding.handler(({ params }) => {
            const instance = this.host.instancesStore.getByNameOrId(params.instanceId);

            return instance?.v2Router ? { local: instance.v2Router } : undefined;
        }), router);
    }

    attach() {
        registerHttpRoutes(this.api, this.createV2Router());
    }

    private completedOperation<TOutput>(id: string, result: TOutput): RestAPI2.OpResponse<TOutput> {
        return {
            operation: { id, status: "completed" },
            result
        };
    }

    private handleAuditRequest(req: RawHttpRouteRequest): Readable {
        this.host.heartBeatInterval.ref();

        const ret = new PassThrough();
        const out = this.host.auditor.getOutputStream(req.raw.request, req.raw.response);

        out.pipe(ret);

        const unpipe = () => {
            this.host.heartBeatInterval.unref();
            out.unpipe(ret);
            ret.end();
        };

        onRequestDisconnect(req.raw.request, unpipe);

        return ret;
    }

    private hostTopics(): unknown[] {
        const serviceDiscovery: { getTopics?: () => unknown[] } = this.host.serviceDiscovery;

        return serviceDiscovery.getTopics?.() || [];
    }

    private hostTopic(topic: unknown): RestAPI2.Topic {
        return {
            name: this.hostTopicName(topic),
            contentType: this.hostTopicContentType(topic)
        };
    }

    private hostTopicName(topic: unknown): string {
        if (typeof topic !== "object" || topic === null) {
            return String(topic);
        }

        const item = topic as HostTopicListItem;

        return String(this.topicValue(item.id) || item.name || item.topicName || item.topic || topic);
    }

    private hostTopicContentType(topic: unknown): string {
        if (typeof topic !== "object" || topic === null) {
            return "";
        }

        const item = topic as HostTopicListItem;

        return item.contentType === undefined ? "" : String(item.contentType);
    }

    private topicValue(value: unknown): unknown {
        if (typeof value === "function") {
            return value();
        }

        if (hasIdMethod(value)) {
            return value.id();
        }

        return value;
    }

    private createTopic(body: RestAPI2.TopicCreatePayload, headers?: Record<string, unknown>): RestAPI2.OpResponse<RestAPI2.TopicCreateResponse> {
        const name = body?.topic?.name || "";
        const contentType = this.headerValue(headers, "content-type") || "application/x-ndjson";

        if (!TopicId.validate(name)) return this.failedOperation("INVALID_TOPIC", "Topic id incorrect format", name);
        if (!isContentType(contentType)) return this.failedOperation("INVALID_CONTENT_TYPE", "Unsupported content-type", name);

        this.host.serviceDiscovery.createTopicIfNotExist({ topic: new TopicId(name), contentType });

        return this.completedOperation(name, { topic: { name, contentType } });
    }

    private deleteTopic(name: string): RestAPI2.OpResponse<RestAPI2.TopicDeleteResponse> {
        if (!TopicId.validate(name)) return this.failedOperation("INVALID_TOPIC", "Topic id incorrect format", name);

        const deleted = Boolean(this.host.serviceDiscovery.deleteTopic(new TopicId(name)));

        if (!deleted) return this.failedOperation("TOPIC_NOT_FOUND", `Topic ${name} not found`, name);

        return this.completedOperation(name, { topic: name, deleted });
    }

    private async topicRead(name: string, headers?: Record<string, unknown>) {
        const contentType = this.headerValue(headers, "content-type") || "application/x-ndjson";

        if (!TopicId.validate(name)) return this.failedOperation("INVALID_TOPIC", "Topic id incorrect format", name);
        if (!isContentType(contentType)) return this.failedOperation("INVALID_CONTENT_TYPE", "Unsupported content-type", name);

        const topic = this.host.serviceDiscovery.createTopicIfNotExist({ topic: new TopicId(name), contentType });

        await this.host.serviceDiscovery.update({
            requires: name,
            contentType,
            topicName: name,
            status: "add"
        });

        return topic;
    }

    private async topicWrite(name: string, request: Readable, headers?: Record<string, unknown>): Promise<RestAPI2.OpResponse<RestAPI2.TopicStreamResponse>> {
        const contentType = this.headerValue(headers, "content-type") || "";

        if (!TopicId.validate(name)) return this.failedOperation("INVALID_TOPIC", "Topic id incorrect format", name);
        if (!isContentType(contentType)) return this.failedOperation("INVALID_CONTENT_TYPE", "Unsupported content-type", name);

        const topic = this.host.serviceDiscovery.createTopicIfNotExist({ topic: new TopicId(name), contentType });

        topic.acceptPipe(request);
        await this.host.serviceDiscovery.update({
            provides: name,
            contentType,
            topicName: name,
            status: "add"
        });
        await this.waitForStreamEnd(request);

        return this.completedOperation(name, { accepted: true });
    }

    private rawReadable(req: RawHttpRouteRequest): Readable {
        if (!req.raw?.request) {
            throw new Error("Raw HTTP request is required for Host v2 topic stream routes");
        }

        return req.raw.request;
    }

    private headerValue(headers: Record<string, unknown> | undefined, name: string): string | undefined {
        const value = headers?.[name];

        if (Array.isArray(value)) {
            return String(value[0]);
        }

        return value === undefined ? undefined : String(value);
    }

    private async waitForStreamEnd(stream: Readable): Promise<void> {
        if ((stream as { readableEnded?: boolean }).readableEnded) return;

        await new Promise<void>(resolve => {
            stream.once("close", resolve);
            stream.once("end", resolve);
            stream.once("error", resolve);
        });
    }

    private failedOperation<TOutput>(code: string, message: string, id: string): RestAPI2.OpResponse<TOutput> {
        return {
            operation: { id: id || code, status: "failed" },
            error: { code, message }
        };
    }

    private errorMessage(error: unknown): string {
        return error instanceof Error ? error.message : String(error);
    }
}
