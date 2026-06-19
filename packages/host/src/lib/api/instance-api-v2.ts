import { IObjectLogger, ParsedMessage } from "@scramjet/types";
import { Router, RouterDefinition } from "@scramjet/api-router";
import { RestAPI2, RestAPI2Routes, getRestAPI2Route } from "@scramjet/rest-api2";
import { HostError } from "@scramjet/model";
import { IncomingHttpHeaders } from "http";
import EventEmitter from "events";

import { ICSI } from "../types";

export class InstanceAPIV2 {
    constructor(
        private csi: ICSI,
        private logger: IObjectLogger,
        private localEmitter?: EventEmitter & { lastEvents?: { [evname: string]: any } }
    ) {}

    createRouter(): RouterDefinition {
        const contract = RestAPI2Routes.instance.router();
        const route = (method: "get" | "post" | "put" | "patch" | "delete", path: string) => getRestAPI2Route(contract, method, path);
        const router = Router.create()
            .route({ ...route("get", "/"),
                handler: () => this.handleInfo()
            })
            .route({ ...route("delete", "/"),
                handler: ({ body }) => this.handleDelete({ body } as ParsedMessage)
            })
            .route({ ...route("patch", "/"),
                handler: ({ body }) => this.handlePatch({ body } as ParsedMessage)
            })
            .route({ ...route("get", "/stdio"),
                handler: () => this.handleStdio()
            })
            .route({ ...route("get", "/health"),
                handler: (): RestAPI2.HealthCheckInfo<RestAPI2.Instance> => ({
                    scope: { id: this.csi.id, status: this.csi.status },
                    healthy: this.csi.isRunning,
                    details: this.csi.lastStats
                })
            })
            .route({ ...route("get", "/output"),
                handler: () => this.csi.getOutputStream()
            })
            .route({ ...route("get", "/logs"),
                handler: () => this.csi.getLogStream()
            })
            .route({ ...route("get", "/monitoring"),
                handler: () => this.csi.getMonitoringStream()
            })
            .route({ ...route("get", "/stdio/:fd"),
                handler: ({ params }) => this.getReadableStdio(Number((params as { fd?: string }).fd))
            })
            .route({ ...route("post", "/input"),
                handler: ({ headers }) => this.handleInput({ headers: headers || {} })
            })
            .route({ ...route("put", "/stdio/:fd"),
                handler: ({ params, headers }) => this.handleStdioInput(Number((params as { fd?: string }).fd), { headers: headers || {} })
            })
            .route({ ...route("get", "/events/:name"),
                handler: ({ params }) => this.handleEvent(String((params as { name?: string }).name || ""), false)
            })
            .route({ ...route("get", "/events/:name/once"),
                handler: ({ params }) => this.handleEvent(String((params as { name?: string }).name || ""), true)
            })
            .route({ ...route("post", "/events"),
                handler: ({ body }) => this.handleSendEvent(body)
            })
            .route(route("post", "/rpc/*"));

        return router;
    }

    private handleInfo(): RestAPI2.InstanceResponse {
        const info = this.csi.getInfo();

        return {
            instance: {
                id: String(info.id || this.csi.id),
                sequenceId: info.sequence?.id,
                status: info.status
            }
        };
    }

    private async handleDelete(req: ParsedMessage): Promise<RestAPI2.OpResponse<RestAPI2.DeleteInstanceResponse>> {
        const payload = (req.body || { mode: "stop" }) as Partial<RestAPI2.DeleteInstancePayload>;
        const mode = payload.mode || "stop";

        if (mode !== "stop" && mode !== "kill") {
            return this.failedOperation("INVALID_DELETE_MODE", `Unsupported delete mode: ${mode}`);
        }

        if (payload.timeout !== undefined && typeof payload.timeout !== "number") {
            return this.failedOperation("INVALID_TIMEOUT", "Delete timeout must be a number");
        }

        this.logger.debug("Instance v2 delete", this.csi.id, mode);

        if (mode === "kill") {
            await this.csi.kill({ removeImmediately: true });
        } else {
            await this.csi.stop({ timeout: payload.timeout || 7000, canCallKeepalive: false });
        }

        return {
            operation: { id: this.csi.id, status: "completed" },
            result: { instanceId: this.csi.id, mode, accepted: true }
        };
    }

    private async handlePatch(req: ParsedMessage): Promise<RestAPI2.OpResponse<RestAPI2.InstanceParametersResponse>> {
        const patch = (req.body || {}) as RestAPI2.InstanceParametersPatch;
        const parameters = { ...patch.parameters || {} };

        if (patch.monitoringRate !== undefined && typeof patch.monitoringRate !== "number") {
            return this.failedOperation("INVALID_MONITORING_RATE", "Monitoring rate must be a number");
        }

        if (patch.logLevel !== undefined && typeof patch.logLevel !== "string") {
            return this.failedOperation("INVALID_LOG_LEVEL", "Log level must be a string");
        }

        if (patch.logLevel !== undefined) {
            await this.csi.set({ logLevel: patch.logLevel as any });
            parameters.logLevel = patch.logLevel;
        } else if (patch.parameters) {
            await this.csi.set(patch.parameters as any);
        }

        return {
            operation: { id: this.csi.id, status: "completed" },
            result: { instance: { id: this.csi.id }, parameters }
        };
    }

    private handleStdio(): RestAPI2.StdIODescriptorList {
        return {
            channels: [
                { fd: 0, readable: false, writable: true },
                { fd: 1, readable: true, writable: false },
                { fd: 2, readable: true, writable: false }
            ]
        };
    }

    private async handleInput(req: { headers: IncomingHttpHeaders }) {
        if (!this.csi.apiInputEnabled) {
            return this.failedInputResponse("INPUT_DISABLED", "Input provided in other way");
        }

        try {
            return this.csi.getInput(req.headers["content-type"]);
        } catch (error) {
            const hostError = error as HostError;

            return this.failedInputResponse(
                hostError.code || "INVALID_INPUT",
                hostError.message || "Invalid input stream request"
            );
        }
    }

    private getReadableStdio(fd: number) {
        const [, stdout, stderr] = this.csi.getStdio();

        if (fd === 1) return stdout;
        if (fd === 2) return stderr;

        return this.failedOperation("INVALID_STDIO_FD", `File descriptor ${fd} is not readable`);
    }

    private handleStdioInput(fd: number, req: { headers: IncomingHttpHeaders }) {
        if (fd !== 0) {
            return this.failedOperation("INVALID_STDIO_FD", `File descriptor ${fd} is not writable`);
        }

        return this.handleInput(req);
    }

    private failedInputResponse(code: string, message: string): RestAPI2.OpResponse<Record<string, never>> {
        return {
            operation: { id: this.csi.id, status: "failed" },
            error: { code, message }
        };
    }

    private failedOperation(code: string, message: string): RestAPI2.OpResponse<any> {
        return {
            operation: { id: this.csi.id, status: "failed" },
            error: { code, message }
        };
    }

    private async handleEvent(name: string, waitForNext: boolean): Promise<RestAPI2.EventResponse | RestAPI2.NextEventResponse> {
        if (!name) {
            return { event: undefined };
        }

        if (!waitForNext && this.localEmitter?.lastEvents?.[name]) {
            return { event: this.localEmitter.lastEvents[name] };
        }

        return { event: await this.csi.awaitEvent(name) };
    }

    private async handleSendEvent(body: unknown): Promise<RestAPI2.OpResponse<RestAPI2.SendEventResponse>> {
        const payload = (body || {}) as { name?: string; eventName?: string; message?: unknown; data?: unknown };
        const eventName = payload.eventName || payload.name;

        if (!eventName) {
            return {
                operation: { id: this.csi.id, status: "failed" },
                error: { code: "EVENT_NAME_MISSING", message: "Invalid format, eventName missing." }
            };
        }

        await this.csi.emitEvent({ eventName, source: "api", message: payload.message ?? payload.data });

        return {
            operation: { id: this.csi.id, status: "completed" },
            result: { delivered: true }
        };
    }
}
