import test from "ava";

import {
    createRunnerVerser2GuestOptions,
    RunnerVerser2Transport
} from "../../src/transport/verser2-runner-transport";

import { PassThrough, Writable } from "stream";

const INSTANCE_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

function config() {
    return {
        kind: "verser2" as const,
        hostUrl: "http://verser2.local",
        routeDomain: `runner.${INSTANCE_ID}.scramjet.internal`,
        guestId: `runner.${INSTANCE_ID}.guest`,
        hubBrokerId: `runner.${INSTANCE_ID}.hub.broker`,
        minWaitingStreams: 2,
        leaseAcquireTimeoutMs: 1234,
        tls: { caFile: "/tmp/ca.pem" }
    };
}

test("maps runner configuration to a guest contract without opening a listener", t => {
    t.deepEqual(createRunnerVerser2GuestOptions(config()), {
        hostUrl: "http://verser2.local",
        guestId: `runner.${INSTANCE_ID}.guest`,
        routedDomains: [`runner.${INSTANCE_ID}.scramjet.internal`],
        minWaitingStreams: 2,
        leaseAcquireTimeoutMs: 1234,
        tls: { caFile: "/tmp/ca.pem" }
    });
});

test("does not publish the guest route before runtime readiness", async t => {
    let created = false;
    const transport = new RunnerVerser2Transport({
        config: config(),
        instanceId: INSTANCE_ID,
        createGuest: () => {
            created = true;
            const guest = {
                attach: () => guest,
                connect: async () => undefined,
                close: async () => undefined
            };
            return guest;
        }
    });

    await transport.init({ connectGuest: false });
    t.false(created);
    await transport.connectGuest();
    t.true(created);
    await transport.disconnect(true);
});

test("preserves an explicit runner route domain when the guest ID differs", t => {
    const explicitConfig = {
        ...config(),
        guestId: "custom.runner.guest",
        routeDomain: "runner.explicit.scramjet.internal"
    };
    const options = createRunnerVerser2GuestOptions(explicitConfig);

    t.is(options.guestId, "custom.runner.guest");
    t.deepEqual(options.routedDomains, ["runner.explicit.scramjet.internal"]);
});

test("graceful disconnect waits for active routed response streams to drain", async t => {
    const transport = new RunnerVerser2Transport({ config: config(), instanceId: INSTANCE_ID });
    const source = new PassThrough();
    const body: Buffer[] = [];
    const response = new Writable({
        emitClose: false,
        write: (chunk, _encoding, callback) => {
            body.push(Buffer.from(chunk));
            callback();
        }
    }) as Writable & {
        writeHead: (status: number, headers?: Record<string, string>) => void;
        flushHeaders: () => void;
    };
    response.writeHead = () => undefined;
    response.flushHeaders = () => undefined;

    (transport as any).pipeResponse(response, source);
    let disconnected = false;
    const disconnect = transport.disconnect(false).then(() => { disconnected = true; });

    await new Promise(resolve => setImmediate(resolve));
    t.false(disconnected);

    source.end("drained");
    await disconnect;
    t.true(disconnected);
    t.is(Buffer.concat(body).toString(), "drained");
});
