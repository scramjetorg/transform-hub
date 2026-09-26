import { strict as assert } from "assert";
import { createServer } from "net";
import { readFileSync } from "fs";
import { createVerserBroker, type VerserBroker } from "@signicode/verser2-guest-node";
import { RouterDefinition } from "@scramjet/api-router";
import { publishedModule } from "./published-modules";
import type { MtlsControlIngress, ScenarioIsolation } from "./scenario-isolation";

const { startHostControlIngress, stopHostControlIngress } = publishedModule<{ startHostControlIngress: any; stopHostControlIngress: any }>("@scramjet/host");

export type HostControlIngressLifecycleResult = { reverseCloseCompleted: boolean; portRebound: boolean; errors: Error[] };

function clientTls(tls: MtlsControlIngress, rejected = false) {
    const client = rejected ? tls.rejectedClient : tls.allowedClient;
    return { ca: readFileSync(client.caFile, "utf8"), cert: readFileSync(client.certFile, "utf8"), key: readFileSync(client.keyFile, "utf8") };
}

const asError = (error: unknown) => error instanceof Error ? error : new Error(String(error));

async function timed<T>(operation: Promise<T>, label: string): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    try {
        return await Promise.race([operation, new Promise<T>((_, reject) => { timer = setTimeout(() => reject(new Error(`${label} timed out`)), 10_000); })]);
    } finally {
        if (timer) clearTimeout(timer);
    }
}

async function rebind(port: number): Promise<void> {
    const server = createServer();
    await timed(new Promise<void>((resolve, reject) => server.once("error", reject).listen(port, "127.0.0.1", resolve)), "Host control ingress rebind");
    await timed(new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())), "Host control ingress rebind close");
}

async function requestIdentity(broker: VerserBroker, targetId: string): Promise<void> {
    const response = await timed(broker.request({ targetId, method: "GET", path: "/api/v2/identity" }), "Host control identity request");
    for await (const _chunk of response.body) { /* drain response before closing */ }
    assert.strictEqual(response.statusCode, 200);
}

/** Internal Host-only lifecycle shared by diagnostics and the guarded warm-up. */
export async function runHostControlIngressLifecycle(isolation: ScenarioIsolation, suffix: string): Promise<HostControlIngressLifecycleResult> {
    const errors: Error[] = [];
    let reverseCloseCompleted = false;
    let portRebound = false;
    let tls: MtlsControlIngress | undefined;
    let broker: VerserBroker | undefined;
    let rejected: VerserBroker | undefined;
    let ingress: any;
    try {
        tls = await timed(isolation.createMtlsControlIngress(), "Host mTLS ingress creation");
        ingress = await timed(startHostControlIngress(tls.hostConfig(`cycle.host.${suffix}.guest`, `cycle.host.${suffix}.test`) as any, new RouterDefinition({ basePath: "/api/v2" }).get("/identity", { handler: () => ({ identity: "cycle-host" }) }), `cycle-host-${suffix}`), "Host control ingress start");
        assert.ok(ingress, "Host control ingress did not start");
        broker = createVerserBroker({ hostUrl: tls.publicUrl, brokerId: `cycle-host-allowed-${suffix}`, tls: clientTls(tls) });
        await timed(broker.connect(), "Allowed Host broker connect");
        await requestIdentity(broker, `cycle.host.${suffix}.guest`);
        rejected = createVerserBroker({ hostUrl: tls.publicUrl, brokerId: `cycle-host-rejected-${suffix}`, tls: clientTls(tls, true) });
        await assert.rejects(timed(rejected.connect(), "Rejected Host broker connect"));
        await timed(rejected.close("cycle rejected close"), "Rejected Host broker close");
        rejected = undefined;
        await timed(broker.close("cycle allowed close"), "Allowed Host broker close");
        broker = undefined;
        await timed(stopHostControlIngress(ingress), "Host control ingress stop");
        ingress = undefined;
        reverseCloseCompleted = true;
        await rebind(tls.port);
        portRebound = true;
    } catch (error) {
        errors.push(asError(error));
    } finally {
        await broker?.close("cycle final allowed close").catch(error => errors.push(asError(error)));
        await rejected?.close("cycle final rejected close").catch(error => errors.push(asError(error)));
        if (ingress) await stopHostControlIngress(ingress).catch((error: unknown) => errors.push(asError(error)));
    }
    return { reverseCloseCompleted, portRebound, errors };
}

export async function assertHostControlIngressLifecycle(isolation: ScenarioIsolation, suffix: string): Promise<void> {
    const result = await runHostControlIngressLifecycle(isolation, suffix);
    if (!result.reverseCloseCompleted || !result.portRebound || result.errors.length) {
        throw new Error(`Host control ingress warm-up failed: ${result.errors.map(error => error.message).join("; ") || "unhealthy closure or port rebind"}`);
    }
}
