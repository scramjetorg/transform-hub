import test from "ava";
import { configService, defaultConfig, getDefaultConfig } from "@scramjet/manager-config";

test("getDefaultConfig returns a deep clone independent from the canonical defaults", t => {
    const clone = getDefaultConfig();

    // Clone has all the same values
    t.is(clone.id, defaultConfig.id);
    t.is(clone.verser2.enabled, defaultConfig.verser2.enabled);
    t.is(clone.verser2.host.bindPort, defaultConfig.verser2.host.bindPort);
    t.is(clone.verser2.localBroker.peerId, defaultConfig.verser2.localBroker.peerId);
    t.is(clone.verser2.localGuest.routeDomain, defaultConfig.verser2.localGuest.routeDomain);
    t.is(clone.verser2.timeouts.routeReadinessMs, defaultConfig.verser2.timeouts.routeReadinessMs);
    t.is(clone.verser2.leases.minimumWaitingLeases, defaultConfig.verser2.leases.minimumWaitingLeases);
    t.is(clone.sthController.unhealthyTimeoutMs, defaultConfig.sthController.unhealthyTimeoutMs);

    // Mutating the clone must not affect the source
    (clone as any).id = "mutated-manager";
    t.is(defaultConfig.id, "cpm-manager", "canonical defaults unmutated after clone id change");

    clone.verser2.host.bindPort = 9999;
    t.is(defaultConfig.verser2.host.bindPort, 2443, "canonical defaults unmutated after clone port change");

    clone.verser2.leases.minimumWaitingLeases = 42;
    t.is(defaultConfig.verser2.leases.minimumWaitingLeases, 1, "canonical defaults unmutated after clone lease change");
});

test("getDefaultConfig returns independent clones on each call", t => {
    const a = getDefaultConfig();
    const b = getDefaultConfig();

    t.not(a, b, "distinct object references");

    a.verser2.host.bindPort = 1111;
    t.is(b.verser2.host.bindPort, 2443, "second clone unaffected by mutation of first");
});

test("defaultConfig has required manager sections", t => {
    t.true("id" in defaultConfig);
    t.true("apiBase" in defaultConfig);
    t.true("logLevel" in defaultConfig);
    t.true("logColors" in defaultConfig);
    t.true("sthController" in defaultConfig);
    t.true("verser2" in defaultConfig);
});

test("defaultConfig.sthController has unhealthyTimeoutMs", t => {
    t.is(defaultConfig.sthController.unhealthyTimeoutMs, 61_000);
});

test("defaultConfig.verser2 has complete host configuration", t => {
    const host = defaultConfig.verser2.host;

    t.true("identityDir" in host);
    t.true("bindHost" in host);
    t.true("bindPort" in host);
    t.true("publicUrl" in host);
    t.true("tls" in host);
    t.is(host.bindPort, 2443);
    t.is(host.bindHost, "0.0.0.0");
    t.false(host.tls.mtlsRequired);
});

test("defaultConfig.verser2 has registration block", t => {
    const reg = defaultConfig.verser2.registration;

    t.true("allowedClientFingerprints" in reg);
    t.true(Array.isArray(reg.allowedClientFingerprints));
    t.is(reg.allowedClientFingerprints.length, 0);
});

test("defaultConfig.verser2 has localBroker and localGuest", t => {
    t.true("localBroker" in defaultConfig.verser2);
    t.is(defaultConfig.verser2.localBroker.peerId, "manager.cpm-manager.broker");
    t.is(defaultConfig.verser2.localBroker.routeDomain, "manager.cpm-manager.scramjet.internal");

    t.true("localGuest" in defaultConfig.verser2);
    t.is(defaultConfig.verser2.localGuest.peerId, "manager.cpm-manager.guest");
    t.is(defaultConfig.verser2.localGuest.routeDomain, "manager.cpm-manager.scramjet.internal");
});

test("defaultConfig.verser2 has timeouts and leases", t => {
    t.is(defaultConfig.verser2.timeouts.routeReadinessMs, 10_000);
    t.is(defaultConfig.verser2.timeouts.leaseAcquireMs, 10_000);
    t.is(defaultConfig.verser2.timeouts.requestMs, 30_000);
    t.is(defaultConfig.verser2.leases.minimumWaitingLeases, 1);
});

test("configService singleton is pre-initialized with defaults", t => {
    const svc = configService;

    t.is(svc.getConfig().id, "cpm-manager");
    t.is(svc.getConfig().verser2.host.bindPort, 2443);
});

test("configService.update deep-merges partial changes", t => {
    const svc = configService;
    const originalId = svc.getConfig().id;
    const originalPort = svc.getConfig().verser2.host.bindPort;

    // Use a unique temporary field mutation to avoid cross-test interference
    const tmpKey = `_test_tmp_${Date.now()}`;

    svc.update({ [(tmpKey as any)]: "temp-value" } as any);

    // The temp field should be present
    t.is((svc.getConfig() as any)[tmpKey], "temp-value");

    // Original fields should be preserved
    t.is(svc.getConfig().id, originalId);
    t.is(svc.getConfig().verser2.host.bindPort, originalPort);

    // Clean up
    delete (svc.getConfig() as any)[tmpKey];
    t.false(tmpKey in svc.getConfig());
});
