import test from "ava";
import { PassThrough } from "stream";
import { APIExpose } from "@scramjet/api-types";
import { CeroError } from "@scramjet/api-server";
import { ObjLogger } from "@scramjet/obj-logger";
import { ReasonPhrases } from "http-status-codes";
import TopicRouter from "../../src/lib/serviceDiscovery/topicRouter";
import { ServiceDiscovery } from "../../src/lib/serviceDiscovery/sd-adapter";

const api = {
    get() { },
    op() { },
    downstream() { },
    upstream() { }
} as unknown as APIExpose;

function createDelayedRouter(topic: string) {
    const serviceDiscovery = new ServiceDiscovery(new ObjLogger({}), "test-host");
    let releaseUpdate!: () => void;
    const update = new Promise<void>(resolve => { releaseUpdate = resolve; });
    serviceDiscovery.cpmConnector = {
        connected: true,
        sendTopicInfo: () => update
    } as any;

    const router = new TopicRouter(new ObjLogger({}), api, "", serviceDiscovery);
    const request = new PassThrough() as any;
    request.headers = { "content-type": "text/plain" };
    request.params = { topic };

    return { request, releaseUpdate, router };
}

test("topic downstream completes a short request after service discovery update", async t => {
    const { request, releaseUpdate, router } = createDelayedRouter("short-upload");

    let settled = false;
    const response = router.topicDownstream(request).then(value => {
        settled = true;
        return value;
    });

    request.end("short payload");
    await new Promise<void>(resolve => setImmediate(resolve));

    t.false(settled);
    releaseUpdate();
    t.is((await response).opStatus, ReasonPhrases.OK);
});

test("topic downstream rejects an aborted request during service discovery update", async t => {
    const { request, releaseUpdate, router } = createDelayedRouter("aborted-upload");
    const response = router.topicDownstream(request);

    request.emit("aborted");

    const error = await t.throwsAsync(response);
    releaseUpdate();
    request.emit("close");

    t.true(error instanceof CeroError);
    t.is((error as CeroError).type, "DOWNSTREAM_REQUEST_ERROR");
});

test("topic downstream rejects a premature close during service discovery update", async t => {
    const { request, releaseUpdate, router } = createDelayedRouter("premature-close");
    const response = router.topicDownstream(request);

    request.emit("close");

    const error = await t.throwsAsync(response);
    releaseUpdate();

    t.true(error instanceof CeroError);
    t.is((error as CeroError).type, "DOWNSTREAM_REQUEST_ERROR");
});
