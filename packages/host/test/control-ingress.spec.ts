import baseTest from "ava";
const { createAvaMemoryGuard } = require("../../../scripts/lib/ava-memory-guard");
const test: typeof baseTest = createAvaMemoryGuard(baseTest);
import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { Router } from "@scramjet/api-router";
import { createV2HttpDispatcher } from "@scramjet/api-server";
import { createHostControlIngressOptions, resolveLegacyRunnerControlIngressConflict, startHostControlIngress, stopHostControlIngress } from "../src/lib/control-ingress";
import { HostAPIV2Handler } from "../src/lib/api/host-api-v2";

const config = () => ({ enabled: true, identityDir: mkdtempSync(join(tmpdir(), "host-control-")), host: { bindHost: "127.0.0.1", bindPort: 0, publicUrl: "https://localhost:2444", tls: { mtlsRequired: true } }, registration: { allowedClientFingerprints: [] }, localBroker: { peerId: "host.control.broker" }, guest: { peerId: "host.control.guest", routeDomain: "host.control.test" } });
test.before(async () => {
    // Preload the Host module so the ~113 MB module-load cost is paid
    // before any guarded test baseline measurement.
    require("../src/lib/host");
});

test("Host control ingress defaults to certificate-only admission", async t => {
    const options = await createHostControlIngressOptions(config() as any, "host-a");
    t.truthy((options.tls as any).clientAuth.caFile);
    t.deepEqual((options.tls as any).clientAuth.authorizeRegistration({}), { action: "close", reason: "client certificate required" });
    t.deepEqual((options.tls as any).clientAuth.authorizeRegistration({ metadata: { local: true } }), { action: "allow" });
});

test("Host control ingress enforces configured certificate fingerprints", async t => {
    const ingress = config();
    (ingress.registration.allowedClientFingerprints as string[]) = ["AA:BB"];
    const options = await createHostControlIngressOptions(ingress as any, "host-a");
    const authorize = (options.tls as any).clientAuth.authorizeRegistration;
    t.deepEqual(authorize({ certificate: { fingerprint256: "CC:DD" } }), { action: "close", reason: "client fingerprint not allowed" });
    t.deepEqual(authorize({ certificate: { fingerprint256: "AA:BB" } }), { action: "allow" });
});

test("legacy runner port relocates only the default mTLS control ingress", t => {
    const ingress = config();
    ingress.host.bindPort = 2444;
    ingress.host.publicUrl = "https://127.0.0.1:2444";
    const runnerHost = {
        ...ingress,
        host: { ...ingress.host, bindPort: 2444, publicUrl: "https://127.0.0.1:2444", tls: { mtlsRequired: false } }
    };

    const relocated = resolveLegacyRunnerControlIngressConflict(runnerHost as any, ingress as any);

    t.is(relocated!.host.bindPort, 2446);
    t.is(relocated!.host.publicUrl, "https://127.0.0.1:2446");
    t.true(relocated!.host.tls.mtlsRequired);
    t.is(resolveLegacyRunnerControlIngressConflict(runnerHost as any, {
        ...ingress,
        host: { ...ingress.host, bindHost: "0.0.0.0" }
    } as any)!.host.bindPort, 2444);
});

test("Host control ingress attaches its v2-only guest and stops", async t => {
    const calls: string[] = [];
    const fake = { start: async () => { calls.push("start"); }, attachLocalGuest: async (guest: any) => { calls.push(guest.routedDomains[0]); return {}; }, stop: async () => { calls.push("stop"); } };
    const router = Router.create({ basePath: "/api/v2" }).get("/health", { handler: () => ({ ok: true }) });
    const host = await startHostControlIngress(config() as any, router, "host-a", () => fake as any);
    await stopHostControlIngress(host);
    t.deepEqual(calls, ["start", "host.control.test", "stop"]);
});

test("Host control ingress rolls its host back when guest attach fails", async t => {
    const calls: string[] = [];
    const fake = { start: async () => { calls.push("start"); }, attachLocalGuest: async () => { throw new Error("attach failed"); }, stop: async () => { calls.push("stop"); } };
    const router = Router.create({ basePath: "/api/v2" }).get("/health", { handler: () => ({ ok: true }) });
    await t.throwsAsync(startHostControlIngress(config() as any, router, "host-a", () => fake as any), { message: "attach failed" });
    t.deepEqual(calls, ["start", "stop"]);
});

test("Host control ingress cleanup clears the reference before stopping", async t => {
    const host: any = Object.create(require("../src/lib/host").Host.prototype);
    const calls: string[] = [];
    host.controlIngressHost = { stop: async () => { calls.push("stop"); } };
    await host.stopControlIngress();
    await host.stopControlIngress();
    t.deepEqual(calls, ["stop"]);
    t.is(host.controlIngressHost, undefined);
});

test("Host v2 router is fully dispatchable by the control ingress", t => {
    const host: any = {
        apiBase: "/api/v1", config: { host: { id: "host-a" }, verser2: { guest: { routeDomain: "host.test" }, controlIngress: { enabled: true, guest: { routeDomain: "host.control.test" } } } },
        loadCheck: { getLoadCheck: () => ({ load: 0 }), constants: { SAFE_OPERATION_LIMIT: 0 } },
        commonLogsPipe: { getOut: () => ({}) }, getStatus: () => ({}), getSequences: () => [], getInstances: () => [],
        instancesStore: { getByNameOrId: () => undefined }, serviceDiscovery: { getTopics: () => [] }
    };
    const router = new HostAPIV2Handler({} as any, host, "test").createV2Router();
    t.notThrows(() => createV2HttpDispatcher(router));
});
