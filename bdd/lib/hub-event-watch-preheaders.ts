import { strict as assert } from "node:assert";
import { createReadStream } from "node:fs";
import { randomUUID } from "node:crypto";
import { resolveFixturePackagePath } from "./fixture-package-path.js";
import { assertManifestProductPath } from "./runtime-manifest-artifacts";
import { startHostedHealthyIdleRelay } from "./hub-event-watch";
import type { HubWatchRelaySelection } from "./hub-event-watch-relay";
import type { CustomWorld } from "../step-definitions/world";

type PreheaderWorld = CustomWorld & { resources: CustomWorld["resources"] & { hubWatchPreheaders?: Record<string, any>; hubWatchRelay?: any; runtimeManifestHost?: any } };

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** Real hosted Node Agent cancellation while the relay holds origin response headers. */
export async function proveHostedWatchPreheaderCancellation(world: PreheaderWorld): Promise<Record<string, any>> {
    if (!world.resources.hubWatchRelay) await startHostedHealthyIdleRelay(world);
    const relayResources = world.resources.hubWatchRelay;
    const relay = relayResources.relay;
    const state = world.resources.runtimeManifestHost;
    assert.ok(relay && state);
    const runId = relayResources.runId;
    const { HostClient } = require(state.artifacts.modules.apiClient) as typeof import("@scramjet/api-client");
    const host = new HostClient(state.apiBaseUrl);
    let observer: any;
    let sequenceId: string | undefined;
    const command = (body: Record<string, unknown>) => observer.sendEvent("hub-watch-action", JSON.stringify({ runId, commandId: randomUUID(), ...body }));
    const event = async <T>(name: string, send: () => Promise<unknown>): Promise<T> => {
        const pending = observer.getEvent(name);
        await send();
        const response = await pending as { event?: { message?: unknown }; message?: unknown };
        return (response?.event?.message ?? response?.message ?? response) as T;
    };
    const ack = async (watchId: string) => {
        const commandId = randomUUID();
        return event<Record<string, any>>(`hub-watch-ack-${commandId}`, () => command({ action: "ack", read: false, watchId, commandId }));
    };
    const observe = async (watchId: string, predicate: (record: any, ack: any) => boolean) => {
        const end = Date.now() + 15_000;
        while (Date.now() < end) {
            const response = await ack(watchId);
            const record = (response.history || []).find((item: any) => item.watchId === watchId && predicate(item, response));
            if (record) return { record, response };
            await wait(30);
        }
        assert.fail(`timed out waiting for observer state on ${watchId}`);
    };
    const hostWatchLog = async (message: "acquired" | "released", id?: string, baseline = new Set<string>()): Promise<string> => {
        const end = Date.now() + 15_000;
        while (Date.now() < end) {
            for (const line of state.hostUtils.output.split("\n")) {
                if (!line.includes("DEBUG") || !line.includes("Hub event watch")) continue;
                const watchId = line.match(/\bwatchId:\s*(['"])(.*?)\1/)?.[2];
                const text = line.match(/\bmessage:\s*(['"])(.*?)\1/)?.[2];
                if (watchId && text === message && (id ? id === watchId : !baseline.has(watchId))) return watchId;
            }
            await wait(25);
        }
        assert.fail(`Host did not report ${message} for watch ${id || "(new)"}`);
    };
    const evidence: any[] = [];
    let proofComplete = false;
    try {
        const uploaded = await host.sendSequence(createReadStream(resolveFixturePackagePath("data/sequences/bdd-packages/hub-event-watch-observer.tar.gz")));
        sequenceId = uploaded.id;
        observer = await uploaded.start({ appConfig: { runId }, args: [] });
        const readyResponse = await observer.getEvent("hub-watch-observer-ready") as { event?: { message?: any }; message?: any };
        const ready = readyResponse?.event?.message ?? readyResponse?.message ?? readyResponse;
        assert.equal(ready.runId, runId);
        assert.equal(ready.provenance?.runtime?.name, "node");
        for (const name of ["runner-node", "rest-api2", "api-router"] as const) {
            const modulePath = ready.provenance?.productModulePaths?.[name];
            assert.ok(modulePath, `observer provenance must include ${name}`);
            assertManifestProductPath(state.artifacts, `@scramjet/${name}`, modulePath, `pre-header observer ${name}`);
        }
        const sourceId = `runner.${observer.id}.hub.broker`;

        const controlId = `${runId}-preheaders-control`;
        const controlBaseline = new Set<string>(state.hostUtils.output.split("\n").flatMap((line: string): string[] => { const id = line.match(/\bwatchId:\s*(['"])(.*?)\1/)?.[2]; return id ? [id] : []; }));
        await command({ action: "open", kind: "topic", watchId: controlId, consume: true, commandId: randomUUID() });
        await observe(controlId, record => record.type === "snapshot");
        const controlServerId = await hostWatchLog("acquired", undefined, controlBaseline);
        assert.ok(!controlBaseline.has(controlServerId));
        const controlPending = randomUUID();
        await command({ action: "pending-read", watchId: controlId, commandId: controlPending });
        await observe(controlId, record => record.type === "pending-ready" && record.commandId === controlPending);

        for (const kind of ["abort", "close"] as const) {
            const watchId = `${runId}-preheaders-${kind}`;
            const openCommandId = randomUUID();
            const before = new Set<string>(state.hostUtils.output.split("\n").flatMap((line: string): string[] => { const id = line.match(/\bwatchId:\s*(['"])(.*?)\1/)?.[2]; return id ? [id] : []; }));
            const selection: HubWatchRelaySelection = { runId, watchId, openCommandId, sourceId, path: "/api/v2/events/watch?kind=sequence", kind: "sequence", targetId: relayResources.targetId, routeDomain: relayResources.routeDomain };
            const priorRelayWatches = relay.snapshot().watches.length;
            relay.selectWatch(selection);
            relay.setMode("holdResponseHeaders");
            await command({ action: "open", kind: "sequence", watchId, consume: true, ...(kind === "abort" ? { signal: true } : {}), commandId: openCommandId });
            const deadline = Date.now() + 15_000;
            let held: any;
            while (Date.now() < deadline) {
                held = relay.snapshot().watches.slice(priorRelayWatches).find((item: any) => item.sourceId === sourceId && item.path === selection.path && item.heldResponseHeaders);
                if (held) break;
                await wait(20);
            }
            assert.ok(held, "relay must capture actual upstream response headers before cancellation");
            const serverId = await hostWatchLog("acquired", undefined, before);
            assert.ok(!before.has(serverId));
            const pendingCommandId = randomUUID();
            await command({ action: "pending-read", watchId, commandId: pendingCommandId });
            const pending = await observe(watchId, record => record.type === "pending-ready" && record.commandId === pendingCommandId);
            assert.equal(pending.response.hasPendingRead, true);
            assert.equal(pending.response.connectionHealth?.state, "opening");
            assert.equal(pending.response.history.some((record: any) => record.watchId === watchId && record.type === "snapshot"), false);
            assert.equal(held.responseHeadersCaptured, 1);
            assert.equal(held.forwardedBytes, 0);
            const terminalCommandId = randomUUID();
            await command({ action: kind, watchId, repeat: kind === "close", commandId: terminalCommandId });
            const terminal = await observe(watchId, record => kind === "abort"
                ? record.type === "error" && record.error?.name === "AbortError"
                : record.type === "closed" && record.commandId === terminalCommandId);
            if (kind === "abort") assert.equal(terminal.record.error?.name, "AbortError");
            else {
                assert.equal(terminal.record.actualState, "closed");
                assert.equal(terminal.record.pendingRead?.kind, "done");
            }
            await hostWatchLog("released", serverId);
            const closeDeadline = Date.now() + 10_000;
            let closed: any;
            while (Date.now() < closeDeadline) {
                closed = relay.snapshot().watches.find((item: any) => item.connectionId === held.connectionId && item.streamId === held.streamId);
                if (closed?.upstreamClosed && closed?.downstreamClosed) break;
                await wait(20);
            }
            assert.ok(closed?.upstreamClosed && closed?.downstreamClosed, "real downstream cancellation must close both relay stream references");
            assert.equal(closed.downstreamRstCode, 8, "client-originated HTTP/2 CANCEL must be observed");
            assert.equal(closed.resetInitiator, "client");
            assert.equal(closed.forwardedBytes, 0);
            assert.equal(closed.responseBytes, 0);
            assert.equal(closed.responseHeadersForwarded, 0);
            assert.equal(closed.applicationStatus, 200);
            assert.equal(closed.contentType, "application/x-ndjson");
            assert.equal(closed.reset, false, "the relay must not inject a reset");
            if (kind === "close") {
                assert.equal(terminal.record.actualSamePromise, true, "repeated close must reuse the original close promise");
            }
            assert.equal(serverId, await hostWatchLog("released", serverId));
            evidence.push({ kind, terminal: terminal.record.type, sourceId, connectionId: closed.connectionId, requestId: closed.requestId,
                streamId: closed.streamId, rstCode: closed.downstreamRstCode, responseHeadersCaptured: closed.responseHeadersCaptured,
                forwardedResponseHeaders: closed.responseHeadersForwarded, originStatus: closed.applicationStatus, originContentType: closed.contentType,
                responseBytes: closed.responseBytes, forwardedBytes: closed.forwardedBytes,
                upstreamClosed: closed.upstreamClosed, downstreamClosed: closed.downstreamClosed, resetInitiator: closed.resetInitiator, serverId });
            relay.setMode("pass");
        }

        const rest = require(state.artifacts.modules.restApi2) as typeof import("@scramjet/rest-api2");
        const api = rest.createHubClient({ transport: rest.createHttpClientTransport({ baseUrl: new URL(state.apiBaseUrl).origin, fetch }), basePath: "/api/v2" });
        const topic = `preheaders-${runId}`;
        const createReadId = randomUUID();
        await command({ action: "pending-read", watchId: controlId, commandId: createReadId });
        await observe(controlId, record => record.type === "pending-ready" && record.commandId === createReadId);
        assert.equal((await api.createTopic.post({ body: { topic: { name: topic, contentType: "application/x-ndjson" } }, headers: { "content-type": "application/json" } })).status, 200);
        await observe(controlId, record => record.type === "change" && record.event?.action === "upsert" && record.event?.topic === topic);
        const deleteReadId = randomUUID();
        await command({ action: "pending-read", watchId: controlId, commandId: deleteReadId });
        await observe(controlId, record => record.type === "pending-ready" && record.commandId === deleteReadId);
        assert.equal((await api.deleteTopic.delete({ params: { name: topic }, headers: { "content-type": "application/json" } })).status, 200);
        await observe(controlId, record => record.type === "change" && record.event?.action === "remove" && record.event?.topic === topic);
        const probeId = randomUUID();
        const probe = await event<{ status: number }>(`hub-watch-probe-${probeId}`, () => command({ action: "probe", commandId: probeId }));
        assert.equal(probe.status, 200);
        await command({ action: "close", watchId: controlId, commandId: randomUUID() });
        await hostWatchLog("released", controlServerId);
        await event("hub-watch-finished", () => command({ action: "finish", commandId: randomUUID() }));
        proofComplete = true;
        const relayAfterProof = relay.snapshot();
        assert.ok(relayAfterProof.sessionPairs >= 1, "control H2 session must survive both selected-stream resets");
        assert.equal(relayAfterProof.mode, "pass", "the relay must not be left in a fault mode after the cases");
        const result = { runId, sourceId, observerProvenance: ready.provenance, cases: evidence, controlServerId, probeStatus: probe.status, sessionPairsDuringControl: relayAfterProof.sessionPairs, safePreteardownChainComplete: true };
        world.resources.hubWatchPreheaders = result;
        process.stdout.write(`[hub-event-watch-preheaders.result] ${JSON.stringify(result)}\n`);
        return result;
    } finally {
        if (observer && proofComplete) { try { await observer.stop(1_000, false); } catch { /* observer has completed */ } }
        if (sequenceId && proofComplete) { try { await host.deleteSequence(sequenceId); } catch { /* owned Host teardown */ } }
        host.dispose();
    }
}
