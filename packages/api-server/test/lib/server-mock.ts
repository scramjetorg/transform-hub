import EventEmitter = require("events");
import { RequestListener, Server, IncomingMessage, ServerResponse } from "http";
import { Socket } from "net";
import { StringDecoder } from "string_decoder";
import { SinonSandbox } from "sinon";
import { HTTPMethod } from "trouter";
import { Readable, PassThrough } from "stream";

export type AnyHandler = (...z: any[]) => void;

export interface PlayMethods {
    request: (req: IncomingMessage, res: ServerResponse) => void;
}

export type MockedResponse = ServerResponse & {
    fullBody?: Promise<string>
};

export type ServerWithPlayMethods = Server & PlayMethods;

export function mockRequestResponse(method: HTTPMethod, url: string, _body?: Readable) {
    const body = _body || Readable.from([]);
    const sockerOverride = Object.assign(body, new Socket(), { ...body });
    const request = new IncomingMessage(sockerOverride);
    const response: MockedResponse = new ServerResponse(request);
    const reader = new StringDecoder();
    const pt = new PassThrough() as unknown as Socket;

    response.assignSocket(pt);
    const orgEnd = response.end;

    response.end = (...args: [any?, any?]) => {
        console.log("pt end", args);
        pt.end(...args);
        return orgEnd.call(response, ...args);
    };

    response.fullBody = new Promise(res => {

        pt.on("data", data => {
            console.log("data");
            reader.write(data);
        });
        pt.on("end", () => {
            res(reader.end());
        });
    });

    request.method = method;
    request.url = url;

    return { request, response };
}

export function mockServer(sandbox: SinonSandbox): Server & PlayMethods {
    const requestListeners: RequestListener[] = [];

    return Object.assign(new EventEmitter(), {
        async request(req: IncomingMessage, res: ServerResponse) {
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
