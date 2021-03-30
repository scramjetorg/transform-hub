import EventEmitter = require("events");
import { RequestListener, Server, IncomingMessage, ServerResponse } from "http";
import { Socket } from "node:net";
import { Readable } from "node:stream";
import { SinonSandbox } from "sinon";
import { HTTPMethod } from "trouter";

type AnyHandler = (...z: any[]) => void;

interface PlayMethods {
    request: RequestListener
}

export function mockRequestResponse(method: HTTPMethod, url: string, body: Readable) {
    const sockerOverride = Object.assign(body, new Socket(), { ...body });
    const request = new IncomingMessage(sockerOverride);
    const response = new ServerResponse(request);

    request.method = method;
    request.url = url;

    return { request, response };
}

export function mockServer(sandbox: SinonSandbox): Server & PlayMethods {
    const requestListeners: RequestListener[] = [];

    return Object.assign(new EventEmitter(), {
        request(req: IncomingMessage, res: ServerResponse) {
            requestListeners.forEach(listener => listener(req, res));
        },

        setTimeout: sandbox.stub(),
        address: sandbox.stub().returns(null),
        getConnections: sandbox.stub(),

        close: sandbox.stub().returnsThis(),
        listen: sandbox.stub().returnsThis(),
        ref: sandbox.stub().returnsThis(),
        unref: sandbox.stub().returnsThis(),
        addListener: sandbox.stub().returnsThis(),
        emit: sandbox.stub().returnsThis(),
        on: sandbox.fake(function(this: Server & PlayMethods, ev: string, _handler: AnyHandler) {
            if (ev === "request") {
                requestListeners.push(_handler);
            }

            return this;
        }),
        once: sandbox.stub().returnsThis(),
        prependListener: sandbox.stub().returnsThis(),
        prependOnceListener: sandbox.stub().returnsThis(),

        maxConnections: 10,
        connections: 0,
        listening: false,
        maxHeadersCount: null,
        timeout: 0,
        headersTimeout: 0,
        keepAliveTimeout: 0,
        requestTimeout: 0
    });
}
