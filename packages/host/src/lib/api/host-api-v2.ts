import { APIExpose } from "@scramjet/api-types";
import {
    RawHttpRouteRequest,
    Router,
    RouterDefinition,
    bindResolver,
    bindRoutes,
    registerHttpRoutes,
    replacePathVersion,
    routeBinding,
    resolverBinding
} from "@scramjet/api-router";
import { RestAPI2, RestAPI2RouteSets } from "@scramjet/rest-api2";
import { onRequestDisconnect } from "@scramjet/utility";
import { createDefaultHealthComponents, degradedComponent, summarizeHealth } from "@scramjet/load-check";
import { HostError, IDProvider } from "@scramjet/model";
import { PassThrough, Readable } from "stream";

import { IHost } from "../types";
import TopicId from "../serviceDiscovery/topicId";
import { isContentType } from "../serviceDiscovery/contentType";
import { TOPIC_CONTENT_TYPE_MISMATCH, topicError } from "../serviceDiscovery/topic-errors";
import { projectHostTopic, projectInstance, projectSequence } from "./hub-inventory";
import { createHubEventWatchStream } from "../hub-event-watch";

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
            ingressIdentity: routeBinding.handler<typeof routes.ingressIdentity>(() => ({
                level: "hub",
                serviceId: String((host as any).config?.host?.id),
                routeDomain: (host as any).config?.verser2?.controlIngress?.enabled
                    ? (host as any).config.verser2.controlIngress.guest.routeDomain
                    : (host as any).config?.verser2?.guest?.routeDomain
            }), { id: "hub.v2.ingress.identity" }),
            load: (): RestAPI2.LoadResponse<RestAPI2.Hub> => ({
                load: (host.loadCheck.getLoadCheck() as any)?.load ?? 0
            }),
            version: (): RestAPI2.VersionResponse<RestAPI2.Hub> => ({
                version: this.version
            }),
            config: (): RestAPI2.ConfigResponse<RestAPI2.Hub> => ({
                config: host.publicConfig
            }),
            logLevel: routeBinding.handler<typeof routes.logLevel>(({ body }) => {
                const id = String((host as any).config?.host?.id || "hub");
                host.setLogLevel(body.logLevel);

                return {
                    operation: { id, status: "completed" },
                    result: { logLevel: body.logLevel }
                };
            }, { id: "hub.v2.log-level" }),
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
                items: (host.getSequences() as any[]).map((sequence) => projectSequence(sequence, String((host as any).config?.host?.id), this.v2ApiBase))
            }),
            instances: (): RestAPI2.ListResponse<RestAPI2.Instance> => ({
                items: (host.getInstances() as any[]).map((instance) => projectInstance(instance, String((host as any).config?.host?.id), this.v2ApiBase))
            }),
            entities: (): RestAPI2.ListResponse<RestAPI2.Entity> => ({
                items: [
                    ...(host.getSequences() as any[]).map((sequence) => ({ id: String(sequence.id), type: "sequence" })),
                    ...(host.getInstances() as any[]).map((instance) => ({ id: String(instance.id), type: "instance" }))
                ]
            }),
            topics: (): RestAPI2.ListResponse<RestAPI2.Topic> => ({
                items: this.hostTopics().map((topic) => this.hostTopic(topic))
            }),
            createTopic: routeBinding.handler<typeof routes.createTopic>(({ body, headers }) => this.createTopic(body, headers)),
            deleteTopic: routeBinding.handler<typeof routes.deleteTopic>(({ params }) => this.deleteTopic(params.name)),
            topicRead: routeBinding.handler<typeof routes.topicRead>((req) => this.topicRead(req.params.name, req.headers)),
            topicWrite: routeBinding.handler<typeof routes.topicWrite>((req) => this.topicWrite(req.params.name, this.rawReadable(req), req.headers)),
            logs: () => host.commonLogsPipe.getOut(),
            audit: routeBinding.handler<typeof routes.audit>((req) => this.handleAuditRequest(req), { id: "hub.v2.audit" }),
            watchEvents: routeBinding.handler<typeof routes.watchEvents>((req) => {
                req.raw.response?.setHeader("content-type", "application/x-ndjson");
                req.raw.response?.setHeader("cache-control", "no-store, no-transform");
                return createHubEventWatchStream(host.hubState, req.query.kind, req, host.logger);
            }, { id: "hub.v2.watch-events" })
        });
    }

    createSequenceRouter(): RouterDefinition {
        const host = this.host;
        const sequenceId = (params: { sequenceId: string }) => params.sequenceId;
        const routes = RestAPI2RouteSets.hub.sequenceRoutes();

        return bindRoutes(routes, {
            sendSequence: routeBinding.handler<typeof routes.sendSequence>((req) => {
                return this.handleNewSequence(req);
            }),
            updateSequence: routeBinding.handler<typeof routes.updateSequence>((req) => {
                return this.handleUpdateSequence(req, sequenceId(req.params));
            }),
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
                items: (host.getSequenceInstances(sequenceId(params)) as any[]).map((instance) => ({
                    id: String(instance.id),
                    sequenceId: instance.sequenceId,
                    status: instance.status
                }))
            }),
            manifest: ({ params }): RestAPI2.SequenceManifestResponse | { opStatus: "Not Found"; error: string } => {
                const sequence = host.getSequence(sequenceId(params));
                if (!("id" in sequence)) {
                    return { opStatus: "Not Found", error: `Sequence ${sequenceId(params)} not found` };
                }

                return {
                    sequenceId: sequence.id,
                    items: host.instancesStore.getSequenceManifests(sequence.id)
                };
            }
        });
    }

    createV2Router(): RouterDefinition {
        const router = Router.create({ basePath: this.v2ApiBase }).mount("/", this.createHubRouter()).mount("/sequences", this.createSequenceRouter());
        const resolver = RestAPI2RouteSets.hub.resolvers().instance;

        return bindResolver(
            resolver,
            resolverBinding.handler(({ params }) => {
                const instance = this.host.instancesStore.getByNameOrId(params.instanceId);

                return instance?.v2Router ? { local: instance.v2Router } : undefined;
            }),
            router
        );
    }

    attach() {
        this.api.get(
            `${this.v2ApiBase}/hubs`,
            (): RestAPI2.ListResponse<RestAPI2.Hub> => ({
                items: [
                    {
                        id: String((this.host as any).config?.host?.id || "hub"),
                        status: "ok"
                    }
                ]
            })
        );

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
        return projectHostTopic(topic, String((this.host as any).config?.host?.id || "hub"));
    }

    private createTopic(body: RestAPI2.TopicCreatePayload, headers?: Record<string, unknown>): RestAPI2.OpResponse<RestAPI2.TopicCreateResponse> {
        const name = body?.topic?.name || "";
        const contentType = body?.topic?.contentType || this.headerValue(headers, "content-type") || "application/x-ndjson";

        if (!TopicId.validate(name)) return this.failedOperation("INVALID_TOPIC", "Topic id incorrect format", name);
        if (!isContentType(contentType)) return this.failedOperation("INVALID_CONTENT_TYPE", "Unsupported content-type", name);
        if (body?.topic?.origin && body.topic.origin.type !== "hub") {
            return this.failedOperation("INVALID_TOPIC_ORIGIN", "Hub topics must have hub origin", name);
        }

        try {
            const topic = this.host.serviceDiscovery.createTopicIfNotExist({ topic: new TopicId(name), contentType });
            const origin = projectHostTopic(topic, String((this.host as any).config?.host?.id || "hub")).origin;

            return this.completedOperation(name, { topic: { name, contentType, origin } });
        } catch (error) {
            return this.failedOperation((error as { code?: string }).code || "TOPIC_CREATE_FAILED", this.errorMessage(error), name);
        }
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
        if (topic.contentType !== contentType) throw topicError(TOPIC_CONTENT_TYPE_MISMATCH, "Content-type mismatch");

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
        if (topic.contentType !== contentType) return this.failedOperation(TOPIC_CONTENT_TYPE_MISMATCH, "Content-type mismatch", name);

        topic.acceptPipe(request);
        await this.host.serviceDiscovery.update({
            provides: name,
            contentType,
            topicName: name,
            status: "add"
        });
        const streamError = await this.waitForStreamEnd(request);
        if (streamError) {
            const code = (streamError as { code?: string }).code;
            return this.failedOperation(code === "TOPIC_DISCONNECTED" || code === "TOPIC_DELETED" ? code : "TOPIC_WRITE_FAILED", this.errorMessage(streamError), name);
        }

        return this.completedOperation(name, { accepted: true });
    }

    private rawReadable(req: RawHttpRouteRequest): Readable {
        if (!req.raw?.request) {
            throw new Error("Raw HTTP request is required for Host v2 topic stream routes");
        }

        return req.raw.request;
    }

    /**
     * Host v2 sequence routes are downstream routes: the package must remain the
     * original request stream so adapters can consume it incrementally.  Do not
     * buffer or parse it through the v2 JSON body contract.
     */
    private async handleNewSequence(req: RawHttpRouteRequest): Promise<RestAPI2.OpResponse<RestAPI2.SequenceResponse>> {
        const id = IDProvider.generate();

        if (this.host.sequenceStore.getById(id)) {
            this.discardRequestBody(req);
            return this.failedOperation("SEQUENCE_EXISTS", `Sequence with id ${id} already exists`, id, "Method Not Allowed");
        }

        return this.receiveSequence(req, id, false, "SEQUENCE_UPLOAD_FAILED");
    }

    private async handleUpdateSequence(req: RawHttpRouteRequest, id: string): Promise<RestAPI2.OpResponse<RestAPI2.SequenceResponse>> {
        if (!id) {
            this.discardRequestBody(req);
            return this.failedOperation("MISSING_SEQUENCE_ID", "Missing sequence id parameter", id, "Bad Request");
        }

        const existingSequence = this.host.sequenceStore.getById(id);
        if (!existingSequence) {
            this.discardRequestBody(req);
            return this.failedOperation("SEQUENCE_NOT_FOUND", `Sequence with id: ${id} not found`, id, "Not Found");
        }

        if (existingSequence.instances.length) {
            this.discardRequestBody(req);
            return this.failedOperation("SEQUENCE_IN_USE", "Can't update sequence with instances", id, "Conflict");
        }

        return this.receiveSequence(req, id, true, "SEQUENCE_UPDATE_FAILED");
    }

    private async receiveSequence(
        req: RawHttpRouteRequest,
        id: string,
        override: boolean,
        failureCode: string
    ): Promise<RestAPI2.OpResponse<RestAPI2.SequenceResponse>> {
        let stream: Readable;
        try {
            stream = this.rawReadable(req);
        } catch (error) {
            return this.failedOperation("INVALID_SEQUENCE_SOURCE", this.errorMessage(error), id, "Bad Request");
        }

        const stopWatching = this.destroyOnInterruptedUpload(stream);
        try {
            const sequence = await this.host.addSequence(id, stream, override, (stream as { socket?: any }).socket);

            return this.completedOperation(sequence.id, { sequence: { id: sequence.id } });
        } catch (error) {
            this.terminateUnfinishedUpload(stream);
            if (error instanceof HostError && error.code === "SEQUENCE_IDENTIFICATION_FAILED") {
                return this.failedOperation(error.code, error.message, id, "Bad Request");
            }
            if (error instanceof HostError && error.code === "SEQUENCE_EXISTS") {
                return this.failedOperation(error.code, error.message, id, "Method Not Allowed");
            }

            return this.failedOperation(failureCode, this.errorMessage(error), id, "Unprocessable Entity");
        } finally {
            stopWatching();
        }
    }

    /**
     * An adapter may reject before it begins to read a downstream request. Do
     * not leave that paused request attached to the direct ingress connection.
     */
    private terminateUnfinishedUpload(stream: Readable): void {
        if (!(stream as { readableEnded?: boolean }).readableEnded && !stream.destroyed) {
            stream.destroy();
        }
    }

    /** Destroy a stalled adapter read when its client abandons an unfinished upload. */
    private destroyOnInterruptedUpload(stream: Readable): () => void {
        const interrupt = () => {
            if (!(stream as { readableEnded?: boolean }).readableEnded && !stream.destroyed) {
                stream.destroy(new Error("Sequence upload request disconnected"));
            }
        };
        const onClose = () => {
            if (!(stream as { readableEnded?: boolean }).readableEnded) interrupt();
        };

        stream.once("aborted", interrupt);
        stream.once("close", onClose);

        return () => {
            stream.removeListener("aborted", interrupt);
            stream.removeListener("close", onClose);
        };
    }

    private headerValue(headers: Record<string, unknown> | undefined, name: string): string | undefined {
        const value = headers?.[name];

        if (Array.isArray(value)) {
            return String(value[0]);
        }

        return value === undefined ? undefined : String(value);
    }

    private async waitForStreamEnd(stream: Readable): Promise<Error | undefined> {
        if ((stream as { readableEnded?: boolean }).readableEnded) return;

        return await new Promise<Error | undefined>((resolve) => {
            let settled = false;
            const finish = (error?: Error) => {
                if (settled) return;
                settled = true;
                stream.removeListener("close", onClose);
                stream.removeListener("end", onEnd);
                stream.removeListener("error", onError);
                resolve(error);
            };
            const onClose = () => {
                // A close without end is a disconnect, not a successful write.
                finish((stream as { readableEnded?: boolean }).readableEnded ? undefined : topicError("TOPIC_DISCONNECTED", "Topic request disconnected"));
            };
            const onEnd = () => finish();
            const onError = (error: unknown) => finish(error instanceof Error ? error : new Error(String(error)));

            stream.once("close", onClose);
            stream.once("end", onEnd);
            stream.once("error", onError);
        });
    }

    private failedOperation<TOutput>(code: string, message: string, id: string, opStatus?: string): RestAPI2.OpResponse<TOutput> {
        return {
            operation: { id: id || code, status: "failed" },
            error: { code, message },
            ...(opStatus
                ? { opStatus }
                : code === "TOPIC_NOT_FOUND"
                ? { opStatus: "Not Found" }
                : code === "TOPIC_CONTENT_TYPE_MISMATCH"
                  ? { opStatus: "Conflict" }
                  : code === "INVALID_CONTENT_TYPE"
                    ? { opStatus: "Unsupported Media Type" }
                    : code === "TOPIC_DISCONNECTED"
                      ? { opStatus: "Service Unavailable" }
                      : code === "TOPIC_DELETED"
                        ? { opStatus: "Gone" }
                        : {})
        };
    }

    /** Terminate a body rejected before a downstream sequence handler consumes it. */
    private discardRequestBody(req: unknown): void {
        const body = (req as any)?.raw?.request || (req as any)?.raw;
        if (body && !body.readableEnded && !body.destroyed && typeof body.destroy === "function") body.destroy();
    }

    private errorMessage(error: unknown): string {
        return error instanceof Error ? error.message : String(error);
    }
}
