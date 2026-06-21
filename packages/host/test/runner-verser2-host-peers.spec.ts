import test from "ava";
import { PassThrough } from "stream";
import { createServer } from "http";
import { STHConfiguration, STHRunnerVerser2HostConfig } from "@scramjet/types";
import { attachSthLocalRunnerVerser2Peers } from "../src/lib/runner-verser2-host-peers";

const runnerHostConfig: STHRunnerVerser2HostConfig = {
    enabled: true,
    identityDir: "/tmp/sth-runner-host",
    ca: "-----BEGIN CERTIFICATE-----\nsth-local\n-----END CERTIFICATE-----",
    host: {
        bindHost: "127.0.0.1",
        bindPort: 2444,
        publicUrl: "https://sth-local.example:2444",
        tls: { mtlsRequired: false }
    },
    registration: {
        allowedClientFingerprints: []
    },
    localBroker: { peerId: "sth.runner.broker" }
};

const verser2Config: Pick<STHConfiguration["verser2"], "guest"> = {
    guest: { peerId: "sth.guest", routeDomain: "sth.local.scramjet.internal" }
};

test("attachSthLocalRunnerVerser2Peers exposes runner Broker and local STH API Guest", async t => {
    const brokerOptions: unknown[] = [];
    const guestOptions: any[] = [];
    const apiServer = createServer((req, res) => {
        t.is(req.url, "/api/v1/status");
        res.statusCode = 204;
        res.end();
    });
    const host = {
        attachLocalBroker: async (options: unknown) => {
            brokerOptions.push(options);
            return {
                close: async () => undefined,
                getRoutes: () => [],
                request: async () => ({ requestId: "req-1", statusCode: 200, headers: {}, body: new PassThrough() })
            };
        },
        attachLocalGuest: async (options: unknown) => {
            guestOptions.push(options);
            return { close: async () => undefined };
        }
    };

    await attachSthLocalRunnerVerser2Peers(host as any, runnerHostConfig, verser2Config, apiServer);

    t.deepEqual(brokerOptions, [{ brokerId: "sth.runner.broker" }]);
    t.is(guestOptions.length, 1);
    t.is(guestOptions[0].guestId, "sth.guest");
    t.deepEqual(guestOptions[0].routedDomains, ["sth.local.scramjet.internal"]);

    const req = new PassThrough() as any;
    const res = new PassThrough() as any;
    const finished = new Promise<number>(resolve => res.on("finish", () => resolve(res.statusCode)));

    req.method = "GET";
    req.url = "/api/v1/status";
    guestOptions[0].listener(req, res);

    t.is(await finished, 204);
});

test("attachSthLocalRunnerVerser2Peers adapts local guest responses without flushHeaders", async t => {
    const guestOptions: any[] = [];
    const apiServer = createServer((_req, res) => {
        res.writeHead(200, { "content-type": "text/plain" });
        res.flushHeaders();
        res.end("ok");
    });
    const host = {
        attachLocalBroker: async () => ({
            close: async () => undefined,
            getRoutes: () => [],
            request: async () => ({ requestId: "req-1", statusCode: 200, headers: {}, body: new PassThrough() })
        }),
        attachLocalGuest: async (options: unknown) => {
            guestOptions.push(options);
            return { close: async () => undefined };
        }
    };

    await attachSthLocalRunnerVerser2Peers(host as any, runnerHostConfig, verser2Config, apiServer);

    const req = new PassThrough() as any;
    const res = new PassThrough() as any;
    let startCalls = 0;

    req.method = "GET";
    req.url = "/api/v1/topic/messages";
    res.started = false;
    res.start = () => {
        startCalls += 1;
        res.started = true;
    };
    res.writeHead = (statusCode: number, headers: Record<string, string>) => {
        res.statusCode = statusCode;
        res.headers = headers;
        return res;
    };

    const finished = new Promise<string>(resolve => {
        const chunks: Buffer[] = [];

        res.on("data", (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
        res.on("finish", () => resolve(Buffer.concat(chunks).toString("utf8")));
    });

    guestOptions[0].listener(req, res);

    t.is(await finished, "ok");
    t.is(startCalls, 1);
    t.is(res.statusCode, 200);
    t.deepEqual(res.headers, { "content-type": "text/plain" });
});
