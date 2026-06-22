import test from "ava";
import { EventEmitter } from "events";
import { PassThrough } from "stream";

import type { HubClient, SpaceClient } from "@scramjet/rest-api2";

import { RunnerAppContext } from "../src/runner-app-context";

test("RunnerAppContext exposes injected v2 fluent hub and space clients", t => {
    const v1Hub = { getStatus: async () => ({ legacy: true }) };
    const v1Space = { getHosts: async () => [] };
    const v2Hub = { status: { get: async () => ({ body: { status: "ok" } }) } } as unknown as HubClient;
    const v2Space = { hubs: { get: async () => ({ body: { items: [] } }) } } as unknown as SpaceClient;
    const context = new RunnerAppContext(
        {},
        new PassThrough(),
        new EventEmitter(),
        {
            keepAliveIssued: () => undefined,
            sendStop: () => undefined,
            sendKeepAlive: () => undefined,
            sendEvent: () => undefined,
        },
        v1Hub as any,
        v1Space as any,
        v2Hub,
        v2Space,
        "instance-1",
        "ERROR",
        { use: () => undefined } as any,
        {} as any
    );

    const hubClient: HubClient = context.hubClient();
    const spaceClient: SpaceClient = context.spaceClient();

    t.is(hubClient, v2Hub);
    t.is(spaceClient, v2Space);
    t.not(context.hubClient(), context.hub as any);
    t.not(context.spaceClient(), context.space as any);
});
