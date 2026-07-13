import { HostError } from "@scramjet/model";
import { IObjectLogger } from "@scramjet/runtime-types";
import { APIRoute, IDuplexStream, ParsedMessage } from "@scramjet/api-types";
import { EventMessageData } from "@scramjet/runtime-types";
import { ICommunicationHandler, STHRestAPI } from "@scramjet/api-types";
import { OpResponse } from "../types/from-types";
import { InstanceStatus, RunnerMessageCode } from "@scramjet/symbols";
import { ReasonPhrases } from "http-status-codes";
import { development } from "@scramjet/config";
import { ICSI } from "../types";
import { isSetSequenceEndpointPayloadDTO } from "@scramjet/utility";
import { IncomingHttpHeaders, ServerResponse } from "http";
import { DataStream } from "scramjet";
import EventEmitter from "events";
import { ReReadable } from "rereadable-stream";
import { normalizeRpcForwardPath, stripRpcExposePath } from "./host-api";

/** Retained public v1 instance API compatibility boundary; do not remove while v1 clients are supported. */
export class InstanceAPI {
    constructor(
        private csi: ICSI,
        private logger: IObjectLogger,
        private localEmitter: EventEmitter & { lastEvents: { [evname: string]: any } }
    ) {
    }

    attach(router: APIRoute, communicationHandler: ICommunicationHandler) {
        router.get("/", () => this.csi.getInfo());

        /**
         * @experimental
         */
        router.duplex("/inout", this.handleInOut.bind(this));

        const stdio = this.csi.getStdio();

        router.upstream("/stdout", stdio[1]);
        router.upstream("/stderr", stdio[2]);
        router.downstream("/stdin", stdio[0], { end: true });

        const logStream = this.csi.getLogStream();

        this.logger.addSerializedLoggerSource(logStream);

        const logHistory = new ReReadable({ objectMode: true, length: 10_000 });

        logHistory.tail(0).resume(); // resume stream

        this.logger.pipe(logHistory, { stringified: true });

        router.upstream("/log", () => logHistory.rewind());

        if (development()) {
            router.upstream("/monitoring", this.csi.getMonitoringStream());
        }

        router.upstream("/output", this.csi.getOutputStream(), { encoding: this.csi.outputEncoding });
        router.downstream("/input", this.handleInput.bind(this), { checkContentType: false, end: true, encoding: "binary" });

        // monitoring data
        router.get("/health", RunnerMessageCode.MONITORING, communicationHandler);

        // We are not able to obtain all necessary information for this endpoint yet, disabling it for now
        // router.get("/status", RunnerMessageCode.STATUS, communicationHandler);

        router.upstream("/events/:name", this.handleEvents.bind(this));

        router.get("/event/:name", this.handleOneEvent.bind(this));
        router.get("/once/:name", this.handleOnce.bind(this));

        // operations
        router.op("post", "/_monitoring_rate", RunnerMessageCode.MONITORING_RATE, communicationHandler);
        router.op("post", "/_event", this.handleEvent.bind(this), communicationHandler);

        router.op("post", "/_stop", this.handleStop.bind(this), communicationHandler);
        router.op("post", "/_kill", this.handleKill.bind(this), communicationHandler);

        router.op("post", "/set", this.handleSet.bind(this));

        router.use("/rpc", async (req, res, next) => {
            const rpcPath = req.url?.startsWith("/rpc") ? req.url.slice("/rpc".length) || "/" : req.url || "/";
            const apiVersion = this.csi.expose?.path?.startsWith("/api/v1") ? "v1" : undefined;
            const url = stripRpcExposePath(
                normalizeRpcForwardPath(rpcPath, this.csi.expose?.path, apiVersion),
                this.csi.expose?.path
            );

            if (await this.csi.forwardRpcRequest?.(req, res, url)) {
                return;
            }

            next();
        });

        router.forward("/rpc", [], (req) => {
            const url = req.url!.slice(this.csi.expose?.path?.length || 0);

            this.logger.debug("RPC direct request", req.url, url, this.csi.id, this.csi.rpcUrl);

            return [this.csi.rpcUrl, url] as [string, string];
        });
    }

    private async handleOneEvent(req: ParsedMessage) {
        const name = req.params?.name;

        if (!name)
            throw new HostError("EVENT_NAME_MISSING");

        if (name && this.localEmitter.lastEvents[name]) {
            return this.localEmitter.lastEvents[name];
        }

        return this.csi.awaitEvent(name);
    }

    private async handleOnce(req: ParsedMessage) {
        const name = req.params?.name;

        if (!name)
            throw new HostError("EVENT_NAME_MISSING");

        return this.csi.awaitEvent(name);
    }

    private async handleEvents(req: ParsedMessage, res: ServerResponse) {
        const name = req.params?.name;

        if (!name) {
            throw new HostError("EVENT_NAME_MISSING");
        }
        const out = new DataStream();
        const handler = (data: EventMessageData) => {
            if (typeof data !== "object") {
                out.write(data);

                return;
            }

            const { message } = data;

            out.write(message ? message : {});
        };

        const clean = () => {
            this.logger.debug(`Event stream "${name}" disconnected`);

            this.localEmitter.off(name, handler);
        };

        this.logger.debug("Event stream connected", name);

        this.localEmitter.on(name, handler);

        res.on("error", clean);
        res.on("end", clean);

        return out.JSONStringify();
    }

    private async handleSet(req: ParsedMessage) {
        const { body } = req;

        if (isSetSequenceEndpointPayloadDTO(body)) {
            this.logger.debug("Setting instance", body);

            await this.csi.set(body);
        }

        return { opStatus: ReasonPhrases.OK };
    }

    private async handleInput(req: { headers: IncomingHttpHeaders }) {
        if (this.csi.apiInputEnabled) {
            const contentType = req.headers["content-type"];

            try {
                return this.csi.getInput(contentType);
            } catch (e: any) {
                switch ((e as HostError).code) {
                    case "INVALID_CONTENT_TYPE":
                        return { opStatus: ReasonPhrases.NOT_ACCEPTABLE, error: e.message };
                    default:
                        return { opStatus: ReasonPhrases.BAD_REQUEST, error: e.message };
                }
            }
        }

        return { opStatus: ReasonPhrases.METHOD_NOT_ALLOWED, error: "Input provided in other way" };
    }

    private async handleEvent(event: ParsedMessage): Promise<OpResponse<STHRestAPI.SendEventResponse>> {
        const [, { eventName, message }] = event.body;

        if (typeof eventName !== "string")
            return { opStatus: ReasonPhrases.BAD_REQUEST, error: "Invalid format, eventName missing." };

        await this.csi.emitEvent({ eventName, source: "api", message });
        return { opStatus: ReasonPhrases.OK, accepted: ReasonPhrases.OK };
    }

    private async handleInOut(duplex: IDuplexStream, _headers: IncomingHttpHeaders) {
        const input = await this.handleInput({ headers: _headers });

        if ("opStatus" in input) {
            return input;
        }

        duplex.input.pipe(input, { end: false });
        this.csi.getOutputStream().pipe(duplex.output);
        return {};
    }

    private async handleStop(req: ParsedMessage): Promise<OpResponse<STHRestAPI.SendStopInstanceResponse>> {
        const { body: { timeout, canCallKeepalive } = { timeout: 7000, canCallKeepalive: false } } = req;

        if (typeof timeout !== "number") {
            return { opStatus: ReasonPhrases.BAD_REQUEST, error: "Invalid timeout format" };
        }
        if (typeof canCallKeepalive !== "boolean") {
            return { opStatus: ReasonPhrases.BAD_REQUEST, error: "Invalid canCallKeepalive format" };
        }

        await this.csi.stop({ timeout, canCallKeepalive });

        return { opStatus: ReasonPhrases.ACCEPTED, ...this.csi.getInfo() };
    }

    private async handleKill(req: ParsedMessage): Promise<OpResponse<STHRestAPI.SendKillInstanceResponse>> {
        const { body: { removeImmediately = false } = { removeImmediately: false } } = req;

        if (typeof removeImmediately !== "boolean")
            return { opStatus: ReasonPhrases.BAD_REQUEST, error: "Invalid removeImmediately format" };

        if (![InstanceStatus.STARTING, InstanceStatus.RUNNING].includes(this.csi.status) && !removeImmediately) {
            return { opStatus: ReasonPhrases.BAD_REQUEST, error: "Instance not running" };
        }

        try {
            await this.csi.kill({ removeImmediately });
        } catch (e: any) {
            this.logger.debug("Error while killing instance", e);
            return { opStatus: ReasonPhrases.INTERNAL_SERVER_ERROR, error: e.message };
        }

        return {
            opStatus: ReasonPhrases.ACCEPTED,
            ...this.csi.getInfo()
        };
    }
}
