import { APIRoute, IObjectLogger, NextCallback, ParsedMessage } from "@scramjet/types";
import { ServerResponse } from "http";
import { IInstanceStore } from "./instance-store";
import { getRouter } from "@scramjet/api-server";

export class RPCService {
    private handlers: Map<string, string> = new Map();
    private router: APIRoute;

    constructor(
        private logger: IObjectLogger,
        private sequenceStore: IInstanceStore,
    ) {
        this.router = getRouter();
    }

    registerHandler(path: string, instanceId: string): void {
        this.handlers.set(path, instanceId);
        throw new Error("Method not implemented.");
    }

    handleRequest(request: ParsedMessage, response: ServerResponse, next: NextCallback): void {
        return this.router.lookup(request, response, next);
    }
}