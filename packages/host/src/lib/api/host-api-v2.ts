import { APIExpose, OpResponse, ParsedMessage } from "@scramjet/types";
import { Router, RouterDefinition, registerHttpRoutes, replacePathVersion } from "@scramjet/api-router";
import { RestAPI2 } from "@scramjet/rest-api2";
import { z } from "zod";
import { ReasonPhrases } from "http-status-codes";

import { IHost } from "../types";

export type HostAPIV2Support = {
    handleDeleteSequence(req: ParsedMessage): Promise<OpResponse<Record<string, unknown>>>;
    handleStartSequence(req: ParsedMessage): Promise<OpResponse<Record<string, unknown>>>;
    toRestOperation<TOutput>(response: OpResponse<Record<string, unknown>>, result: TOutput): RestAPI2.OpResponse<TOutput>;
};

export class HostAPIV2Handler {
    constructor(
        private api: APIExpose,
        private host: IHost,
        private version: string,
        private support: HostAPIV2Support
    ) {}

    get v2ApiBase() {
        return replacePathVersion(this.host.apiBase, "v2");
    }

    createHubRouter(): RouterDefinition {
        const host = this.host;
        const objectResponse = z.object({}).passthrough();
        const listResponse = z.object({ items: z.array(z.unknown()) }).passthrough();

        return Router.create()
            .route(Router.get("/load", {
                schemas: { response: objectResponse },
                handler: (): RestAPI2.LoadResponse<RestAPI2.Hub> => ({
                    load: (host.loadCheck.getLoadCheck() as any)?.load ?? 0
                })
            }))
            .route(Router.get("/version", {
                schemas: { response: objectResponse },
                handler: (): RestAPI2.VersionResponse<RestAPI2.Hub> => ({
                    version: this.version
                })
            }))
            .route(Router.get("/config", {
                schemas: { response: objectResponse },
                handler: (): RestAPI2.ConfigResponse<RestAPI2.Hub> => ({
                    config: host.publicConfig
                })
            }))
            .route(Router.get("/status", {
                schemas: { response: objectResponse },
                handler: (): RestAPI2.StatusResponse => ({
                    status: "ok",
                    details: host.getStatus()
                })
            }))
            .route(Router.get("/sequences", {
                schemas: { response: listResponse },
                handler: (): RestAPI2.ListResponse<RestAPI2.Sequence> => ({
                    items: (host.getSequences() as any[]).map(sequence => ({ id: String(sequence.id), status: sequence.status }))
                })
            }))
            .route(Router.get("/instances", {
                schemas: { response: listResponse },
                handler: (): RestAPI2.ListResponse<RestAPI2.Instance> => ({
                    items: (host.getInstances() as any[]).map(instance => ({ id: String(instance.id), sequenceId: instance.sequenceId, status: instance.status }))
                })
            }))
            .route(Router.get("/entities", {
                schemas: { response: listResponse },
                handler: (): RestAPI2.ListResponse<RestAPI2.Entity> => ({
                    items: [
                        ...(host.getSequences() as any[]).map(sequence => ({ id: String(sequence.id), type: "sequence" })),
                        ...(host.getInstances() as any[]).map(instance => ({ id: String(instance.id), type: "instance" }))
                    ]
                })
            }))
            .route(Router.get("/topics", {
                schemas: { response: listResponse },
                handler: (): RestAPI2.ListResponse<RestAPI2.Topic> => ({
                    items: ((host.serviceDiscovery as any)?.getTopics?.() || []).map((topic: any) => ({
                        name: String(topic.id?.() || topic.id || topic.name || topic)
                    }))
                })
            }))
            .route(Router.get("/logs", {
                kind: "upstream",
                schemas: { response: z.unknown() },
                handler: () => host.commonLogsPipe.getOut()
            }))
            .route(Router.get("/audit", {
                kind: "upstream",
                schemas: { response: z.unknown() }
            }));
    }

    createSequenceRouter(): RouterDefinition {
        const host = this.host;
        const objectResponse = z.object({}).passthrough();
        const listResponse = z.object({ items: z.array(z.unknown()) }).passthrough();
        const sequenceId = (params: unknown) => String((params as { sequenceId?: string } | undefined)?.sequenceId || "");

        return Router.create()
            .route(Router.route("post", "/", {
                kind: "downstream",
                schemas: { response: objectResponse }
            }))
            .route(Router.route("put", "/:sequenceId", {
                kind: "downstream",
                schemas: { response: objectResponse }
            }))
            .route(Router.route("delete", "/:sequenceId", {
                schemas: { response: objectResponse },
                handler: async ({ params, headers }): Promise<RestAPI2.OpResponse<RestAPI2.DeleteSequenceResponse>> => {
                    const id = sequenceId(params);
                    const response = await this.support.handleDeleteSequence({ params: { id }, headers } as unknown as ParsedMessage);

                    return this.support.toRestOperation(response, { sequenceId: id, deleted: response.opStatus === ReasonPhrases.OK });
                }
            }))
            .route(Router.post("/:sequenceId/instances", {
                schemas: { response: objectResponse },
                handler: async ({ params, body, headers }): Promise<RestAPI2.OpResponse<RestAPI2.StartSequenceResponse>> => {
                    const id = sequenceId(params);
                    const response = await this.support.handleStartSequence({ params: { id }, body, headers } as unknown as ParsedMessage);

                    return this.support.toRestOperation(response, { instance: { id: String((response as { id?: string }).id || "") } });
                }
            }))
            .route(Router.get("/:sequenceId", {
                schemas: { response: objectResponse },
                handler: ({ params }): RestAPI2.SequenceResponse => {
                    const id = sequenceId(params);
                    const sequence = host.getSequence(id) as any;

                    return { sequence: { id: String(sequence?.id || id), status: sequence?.status } };
                }
            }))
            .route(Router.get("/:sequenceId/instances", {
                schemas: { response: listResponse },
                handler: ({ params }): RestAPI2.ListResponse<RestAPI2.Instance> => ({
                    items: (host.getSequenceInstances(sequenceId(params)) as any[]).map(instance => ({
                        id: String(instance.id),
                        sequenceId: instance.sequenceId,
                        status: instance.status
                    }))
                })
            }));
    }

    createV2Router(): RouterDefinition {
        return Router.create({ basePath: this.v2ApiBase })
            .mount("/", this.createHubRouter())
            .mount("/sequences", this.createSequenceRouter())
            .resolve("/instances/:instanceId", {
                schemas: { params: z.object({ instanceId: z.string() }) },
                handler: ({ params }) => {
                    const instance = this.host.instancesStore.getByNameOrId(params.instanceId);

                    return instance?.v2Router ? { local: instance.v2Router } : undefined;
                }
            });
    }

    attach() {
        registerHttpRoutes(this.api, this.createV2Router());
    }
}
