import { APIExpose } from "@scramjet/types";
import { Router, RouterDefinition, registerHttpRoutes, replacePathVersion } from "@scramjet/api-router";
import { RestAPI2, RestAPI2Routes, getRestAPI2Route } from "@scramjet/rest-api2";
import { z } from "zod";

import { IHost } from "../types";

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
        const hubContract = RestAPI2Routes.host.hubRouter();
        const route = (method: "get", path: string) => getRestAPI2Route(hubContract, method, path);

        return Router.create()
            .route({ ...route("get", "/load"),
                handler: (): RestAPI2.LoadResponse<RestAPI2.Hub> => ({
                    load: (host.loadCheck.getLoadCheck() as any)?.load ?? 0
                })
            })
            .route({ ...route("get", "/version"),
                handler: (): RestAPI2.VersionResponse<RestAPI2.Hub> => ({
                    version: this.version
                })
            })
            .route({ ...route("get", "/config"),
                handler: (): RestAPI2.ConfigResponse<RestAPI2.Hub> => ({
                    config: host.publicConfig
                })
            })
            .route({ ...route("get", "/status"),
                handler: (): RestAPI2.StatusResponse => ({
                    status: "ok",
                    details: host.getStatus()
                })
            })
            .route({ ...route("get", "/sequences"),
                handler: (): RestAPI2.ListResponse<RestAPI2.Sequence> => ({
                    items: (host.getSequences() as any[]).map(sequence => ({ id: String(sequence.id), status: sequence.status }))
                })
            })
            .route({ ...route("get", "/instances"),
                handler: (): RestAPI2.ListResponse<RestAPI2.Instance> => ({
                    items: (host.getInstances() as any[]).map(instance => ({ id: String(instance.id), sequenceId: instance.sequenceId, status: instance.status }))
                })
            })
            .route({ ...route("get", "/entities"),
                handler: (): RestAPI2.ListResponse<RestAPI2.Entity> => ({
                    items: [
                        ...(host.getSequences() as any[]).map(sequence => ({ id: String(sequence.id), type: "sequence" })),
                        ...(host.getInstances() as any[]).map(instance => ({ id: String(instance.id), type: "instance" }))
                    ]
                })
            })
            .route({ ...route("get", "/topics"),
                handler: (): RestAPI2.ListResponse<RestAPI2.Topic> => ({
                    items: ((host.serviceDiscovery as any)?.getTopics?.() || []).map((topic: any) => ({
                        name: String(topic.id?.() || topic.id || topic.name || topic)
                    }))
                })
            })
            .route({ ...route("get", "/logs"),
                handler: () => host.commonLogsPipe.getOut()
            })
            .route(route("get", "/audit"));
    }

    createSequenceRouter(): RouterDefinition {
        const host = this.host;
        const sequenceId = (params: unknown) => String((params as { sequenceId?: string } | undefined)?.sequenceId || "");
        const sequenceContract = RestAPI2Routes.host.sequenceRouter();
        const route = (method: "get" | "post" | "put" | "delete", path: string) => getRestAPI2Route(sequenceContract, method, path);

        return Router.create()
            .route(route("post", "/"))
            .route(route("put", "/:sequenceId"))
            .route({ ...route("delete", "/:sequenceId"),
                handler: async ({ params, headers }): Promise<RestAPI2.OpResponse<RestAPI2.DeleteSequenceResponse>> => {
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
                }
            })
            .route({ ...route("post", "/:sequenceId/instances"),
                handler: async ({ params, body }): Promise<RestAPI2.OpResponse<RestAPI2.StartSequenceResponse>> => {
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
                }
            })
            .route({ ...route("get", "/:sequenceId"),
                handler: ({ params }): RestAPI2.SequenceResponse => {
                    const id = sequenceId(params);
                    const sequence = host.getSequence(id) as any;

                    return { sequence: { id: String(sequence?.id || id), status: sequence?.status } };
                }
            })
            .route({ ...route("get", "/:sequenceId/instances"),
                handler: ({ params }): RestAPI2.ListResponse<RestAPI2.Instance> => ({
                    items: (host.getSequenceInstances(sequenceId(params)) as any[]).map(instance => ({
                        id: String(instance.id),
                        sequenceId: instance.sequenceId,
                        status: instance.status
                    }))
                })
            });
    }

    createV2Router(): RouterDefinition {
        return Router.create({ basePath: this.v2ApiBase })
            .mount("/", this.createHubRouter())
            .mount("/sequences", this.createSequenceRouter())
            .resolve("/instances/:instanceId", {
                schemas: { params: z.object({ instanceId: z.string() }) },
                targetDefinitions: {
                    owner: "inst",
                    definitions: RestAPI2Routes.instance.router(),
                    mountPath: "/instances/:instanceId",
                    implementerBasePath: "/"
                },
                handler: ({ params }) => {
                    const instance = this.host.instancesStore.getByNameOrId(params.instanceId);

                    return instance?.v2Router ? { local: instance.v2Router } : undefined;
                }
            });
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
