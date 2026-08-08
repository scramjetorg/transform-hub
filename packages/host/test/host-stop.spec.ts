import test from "ava";
import { EventEmitter } from "events";
import { CSIController } from "../src/lib/csi-controller";
import { Host } from "../src/lib/host";
import { InstancesStore } from "../src/lib/instance-store";
import { InstanceStatus } from "@scramjet/symbols";

function createController(remove: () => Promise<void>): CSIController {
    const controller = new CSIController(
        {
            id: "docker-instance",
            sequenceInfo: { id: "sequence" },
            payload: { appConfig: {}, args: [], system: {}, limits: {} }
        } as any,
        { sendControlMessage: async () => undefined } as any,
        {
            runtimeAdapter: "docker",
            timings: { instanceLifetimeExtensionDelay: 0 },
            docker: { runner: { maxMem: 64 } },
            host: { apiBase: "/api/v1" }
        } as any,
        {} as any,
        "docker" as any,
        new InstancesStore(),
        {} as any
    );

    (controller as any).status = InstanceStatus.KILLING;
    (controller as any)._instanceAdapter = { remove };
    return controller;
}

function createHost(controller: CSIController): Host {
    const host = Object.create(Host.prototype) as Host & { cleanup: () => Promise<void> };
    const instances = new InstancesStore();
    instances.set(controller.id, controller as any);
    Object.assign(host, {
        _stopping: false,
        config: { killOnExit: true },
        instancesStore: instances,
        cleanup: async () => undefined,
        logger: { trace: () => undefined, info: () => undefined }
    });
    return host;
}

test("Host.stop succeeds when Docker removal observes an already-gone container", async t => {
    const controller = createController(async () => {
        const alreadyGone = Object.assign(new Error("container is gone"), { statusCode: 404 });
        // DockerodeDockerHelper normalizes this race before CSI sees it.
        if (alreadyGone.statusCode === 404) return;
        throw alreadyGone;
    });

    await createHost(controller).stop();
    t.is(controller.status, InstanceStatus.KILLING);
});

test("Host.stop rejects genuine Docker removal failures", async t => {
    const error = Object.assign(new Error("permission denied"), { statusCode: 403 });
    const controller = createController(async () => { throw error; });

    await t.throwsAsync(createHost(controller).stop(), { is: error });
});

test("Host.cleanup disposes its S3 client before disconnecting from CPM", async t => {
    const calls: string[] = [];
    const server = new EventEmitter() as EventEmitter & { close: () => void };
    server.close = () => server.emit("close");
    const host = Object.create(Host.prototype) as Host & Record<string, any>;
    Object.assign(host, {
        _cleaning: false,
        config: { killOnExit: true },
        logger: { info: () => undefined, debug: () => undefined, trace: () => undefined, warn: () => undefined },
        instancesStore: new InstancesStore(),
        sequenceStore: { clear: () => undefined },
        stopControlIngress: async () => undefined,
        s3Client: { dispose: () => calls.push("s3") },
        cpmConnector: {
            disconnect: async () => calls.push("cpm")
        },
        api: { server }
    });

    await host.cleanup();

    t.deepEqual(calls, ["s3", "cpm"]);
    t.is(host.s3Client, undefined);
});
