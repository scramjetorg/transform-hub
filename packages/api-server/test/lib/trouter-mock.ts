import EventEmitter = require("events");
import { SinonSandbox } from "sinon";
import { CeroRouter } from "../../src";

export function routerMock(sandbox: SinonSandbox): CeroRouter {
    return Object.assign(new EventEmitter(), {
        add: sandbox.stub(),
        use: sandbox.stub(),
        lookup: sandbox.stub(),
        find: sandbox.stub(),
        get: sandbox.stub(),
        head: sandbox.stub(),
        patch: sandbox.stub(),
        connect: sandbox.stub(),
        delete: sandbox.stub(),
        trace: sandbox.stub(),
        post: sandbox.stub(),
        put: sandbox.stub(),
        options: sandbox.stub(),
        all: sandbox.stub()
    });
}
