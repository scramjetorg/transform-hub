import EventEmitter = require("events");
import { SinonSandbox } from "sinon";

export function serverMock(sandbox: SinonSandbox) {
    return Object.assign(new EventEmitter(), {
        setTimeout: sandbox.stub(),
        address: sandbox.stub().returns(null),
        getConnections: sandbox.stub(),

        close: sandbox.stub().returnsThis(),
        listen: sandbox.stub().returnsThis(),
        ref: sandbox.stub().returnsThis(),
        unref: sandbox.stub().returnsThis(),
        addListener: sandbox.stub().returnsThis(),
        emit: sandbox.stub().returnsThis(),
        on: sandbox.stub().returnsThis(),
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
