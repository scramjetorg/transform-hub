import { After, Given, Then, When } from "@cucumber/cucumber";
import { strict as assert } from "assert";
import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import { X509Certificate } from "crypto";
import { chmodSync, existsSync, readFileSync, writeFileSync } from "fs";
import { getDefaultManagerConfig } from "@scramjet/config";
import { join } from "path";
import { createServer, type Server } from "net";
import { createVerserBroker, type VerserBroker } from "@signicode/verser2-guest-node";
import { Router } from "@scramjet/api-router";
import { startHostControlIngress, stopHostControlIngress } from "../../../packages/host/src/lib/control-ingress";
import { createCsrEnrollmentHttpsServer, CsrEnrollmentAuthority } from "../../../packages/manager/src/lib/csr-enrollment";
import { Manager } from "../../../packages/manager/src/lib/manager";
import { startManagerControlIngress, stopManagerControlIngress } from "../../../packages/manager/src/lib/manager-control-ingress";
import type { MtlsControlIngress } from "../../lib/scenario-isolation";
import { CustomWorld } from "../world";

type CommandResult = { code: number | null; output: string };
type ControlPlaneState = {
    tls?: MtlsControlIngress;
    brokers: VerserBroker[];
    close: Array<() => Promise<void>>;
    response?: { statusCode: number; body: string };
    releasedControlIngressPort?: number;
    concurrentListeners?: {
        defaultManagerPort: number;
        defaultControlIngressPort: number;
        controlIngressPort: number;
        hubRunnerPort: number;
        v1RouterAttached: boolean;
    };
    command?: CommandResult;
    enrollment?: {
        identityDir: string;
        requestFile: string;
        grantFile: string;
        caFile: string;
        caFingerprint: string;
        managerConfig: string;
        operatorFile: string;
        managerUrl: string;
    };
};

const root = join(process.cwd(), "..");
const binaries = {
    hubEnrollment: join(root, "dist/sth/bin/csr-enrollment.js"),
    managerEnrollment: join(root, "dist/manager/bin/csr-enrollment.js")
};

function state(world: CustomWorld): ControlPlaneState {
    if (!world.resources.controlPlaneMigration) {
        world.resources.controlPlaneMigration = { brokers: [], close: [] } as ControlPlaneState;
    }
    return world.resources.controlPlaneMigration as ControlPlaneState;
}

function isolation(world: CustomWorld) {
    assert.ok(world.scenarioIsolation, "ScenarioIsolation must be installed before control-plane setup");
    return world.scenarioIsolation;
}

function clientTls(tls: MtlsControlIngress, rejected = false) {
    const client = rejected ? tls.rejectedClient : tls.allowedClient;
    return { ca: readFileSync(client.caFile, "utf8"), cert: readFileSync(client.certFile, "utf8"), key: readFileSync(client.keyFile, "utf8") };
}

async function body(response: { statusCode: number; body: AsyncIterable<Buffer> }): Promise<{ statusCode: number; body: string }> {
    let value = "";
    for await (const chunk of response.body) value += chunk.toString();
    return { statusCode: response.statusCode, body: value };
}

async function connect(world: CustomWorld, url: string, tls: MtlsControlIngress, id: string, rejected = false): Promise<VerserBroker> {
    const broker = createVerserBroker({ hostUrl: url, brokerId: id, tls: clientTls(tls, rejected) });
    state(world).brokers.push(broker);
    await broker.connect();
    return broker;
}

async function expectRejectedConnection(world: CustomWorld, url: string, tls: MtlsControlIngress, id: string): Promise<void> {
    const broker = createVerserBroker({ hostUrl: url, brokerId: id, tls: clientTls(tls, true) });
    state(world).brokers.push(broker);
    await assert.rejects(broker.connect());
}

async function listen(server: Server, port: number): Promise<void> {
    await new Promise<void>((resolve, reject) => server.once("error", reject).listen(port, "127.0.0.1", resolve));
}

async function closeServer(server: Server): Promise<void> {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}

function runCommand(world: CustomWorld, binary: string, args: string[]): Promise<CommandResult> {
    assert.ok(existsSync(binary), `Expected built enrollment artifact: ${binary}`);
    const child = spawn(process.execPath, [binary, ...args], {
        cwd: root,
        env: isolation(world).environment({ NODE_OPTIONS: "--max-old-space-size=512" })
    });
    world.scenarioLifecycle.ownChild(child, `CSR enrollment: ${binary} ${args[0] || ""}`, { group: true });
    world.scenarioLifecycle.expect(child);
    return collect(child);
}

function collect(child: ChildProcessWithoutNullStreams): Promise<CommandResult> {
    return new Promise((resolve, reject) => {
        let output = "";
        child.stdout.on("data", chunk => { output += chunk.toString(); });
        child.stderr.on("data", chunk => { output += chunk.toString(); });
        child.once("error", reject);
        child.once("close", code => resolve({ code, output }));
    });
}

function runOpenSsl(args: string[]): void {
    const result = require("child_process").spawnSync("openssl", args, { stdio: "ignore" });
    if (result.status !== 0) throw new Error("CSR BDD setup requires openssl to create isolated enrollment artifacts");
}

After(async function(this: CustomWorld) {
    const current = this.resources.controlPlaneMigration as ControlPlaneState | undefined;
    if (!current) return;
    const errors: Error[] = [];
    for (const broker of current.brokers.splice(0).reverse()) {
        await broker.close("BDD control-plane cleanup").catch(error => errors.push(error instanceof Error ? error : new Error(String(error))));
    }
    for (const close of current.close.reverse()) {
        await close().catch(error => errors.push(error instanceof Error ? error : new Error(String(error))));
    }
    delete this.resources.controlPlaneMigration;
    if (errors.length) throw new Error(`Control-plane cleanup failed: ${errors.map(error => error.message).join("; ")}`);
});

Given("an isolated real Host control ingress with an allowed client fingerprint", async function(this: CustomWorld) {
    const tls = await isolation(this).createMtlsControlIngress();
    const ingress = await startHostControlIngress(
        tls.hostConfig("bdd.host.control.guest", "bdd.host.control.test") as any,
        Router.create({ basePath: "/api/v2" }).get("/identity", { handler: () => ({ identity: "host-control" }) }),
        "bdd-host"
    );
    assert.ok(ingress, "Host control ingress did not start");
    const current = state(this);
    current.tls = tls;
    current.close.push(() => stopHostControlIngress(ingress));
});

When("an external allowed mTLS broker requests the Host control route", async function(this: CustomWorld) {
    const current = state(this);
    assert.ok(current.tls, "Host TLS fixture is missing");
    const broker = await connect(this, current.tls.publicUrl, current.tls, "bdd-host-allowed");
    current.response = await body(await broker.request({ targetId: "bdd.host.control.guest", method: "GET", path: "/api/v2/identity" }));
});

Then("the Host control route responds with its v2 identity", function(this: CustomWorld) {
    assert.deepStrictEqual(state(this).response, { statusCode: 200, body: "{\"identity\":\"host-control\"}" });
});

Then("an external rejected mTLS broker cannot connect to the Host control ingress", async function(this: CustomWorld) {
    const current = state(this);
    assert.ok(current.tls, "Host TLS fixture is missing");
    await expectRejectedConnection(this, current.tls.publicUrl, current.tls, "bdd-host-rejected");
});

Given("an isolated real Manager control ingress with an allowed client fingerprint", async function(this: CustomWorld) {
    const tls = await isolation(this).createMtlsControlIngress();
    const ingress = await startManagerControlIngress(
        tls.managerConfig("bdd.manager.control.guest", "bdd.manager.control.test") as any,
        Router.create({ basePath: "/api/v2" }).get("/identity", { handler: () => ({ identity: "manager-control" }) }),
        undefined,
        [tls.allowedFingerprint]
    );
    assert.ok(ingress, "Manager control ingress did not start");
    const current = state(this);
    current.tls = tls;
    current.close.push(() => stopManagerControlIngress(ingress));
});

When("an external allowed mTLS broker requests the Manager control route", async function(this: CustomWorld) {
    const current = state(this);
    assert.ok(current.tls, "Manager TLS fixture is missing");
    const broker = await connect(this, current.tls.publicUrl, current.tls, "bdd-manager-allowed");
    current.response = await body(await broker.request({ targetId: "bdd.manager.control.guest", method: "GET", path: "/api/v2/identity" }));
});

Then("the Manager control route responds with its v2 identity", function(this: CustomWorld) {
    assert.deepStrictEqual(state(this).response, { statusCode: 200, body: "{\"identity\":\"manager-control\"}" });
});

Then("an external rejected mTLS broker cannot connect to the Manager control ingress", async function(this: CustomWorld) {
    const current = state(this);
    assert.ok(current.tls, "Manager TLS fixture is missing");
    await expectRejectedConnection(this, current.tls.publicUrl, current.tls, "bdd-manager-rejected");
});

Given("an isolated production Manager control ingress with a routed Hub guest", async function(this: CustomWorld) {
    const tls = await isolation(this).createMtlsControlIngress();
    const manager = new Manager({
        id: "bdd-control-manager",
        logLevel: "error",
        verser2: {
            enabled: true,
            registration: { allowedClientFingerprints: [tls.allowedFingerprint] },
            controlIngress: tls.managerConfig("bdd.manager.routed.guest", "bdd.manager.routed.test")
        }
    } as any);
    await manager.main();
    const controlHost = (manager as any).controlIngressHost;
    assert.ok(controlHost, "Production Manager did not expose its control ingress");
    const guest = await controlHost.attachLocalGuest({
        guestId: "bdd.routed.hub.guest",
        routedDomains: ["bdd.routed.hub.test"],
        listener: (_request: unknown, response: { end: (body: string) => void }) => response.end(JSON.stringify({ servedBy: "routed-hub" }))
    });
    manager.apiSthConnectionStore.add({ id: "bdd-routed-hub", isConnectionActive: true, routeDomain: "bdd.routed.hub.test" } as any);
    const current = state(this);
    current.tls = tls;
    current.close.push(async () => {
        await guest.close("BDD control-plane cleanup");
        await manager.stop();
    });
});

When("an external allowed mTLS broker requests the routed Hub version", async function(this: CustomWorld) {
    const current = state(this);
    assert.ok(current.tls, "Manager TLS fixture is missing");
    const broker = await connect(this, current.tls.publicUrl, current.tls, "bdd-manager-routed-external");
    current.response = await body(await broker.request({ targetId: "bdd.manager.routed.guest", method: "GET", path: "/api/v2/hubs/bdd-routed-hub/version" }));
});

Then("the routed Hub version response is served through the Manager ingress", function(this: CustomWorld) {
    assert.deepStrictEqual(state(this).response, { statusCode: 200, body: "{\"servedBy\":\"routed-hub\"}" });
});

Given("an isolated production Manager whose control ingress local broker attachment fails", async function(this: CustomWorld) {
    const tls = await isolation(this).createMtlsControlIngress();
    let controlIngressPort = 0;
    class FailingBrokerManager extends Manager {
        protected async attachControlIngressBroker(host: any): Promise<any> {
            controlIngressPort = host.address.port;
            throw new Error("broker attach failed");
        }
    }
    const manager = new FailingBrokerManager({
        id: "bdd-control-ingress-rollback",
        logLevel: "error",
        verser2: {
            enabled: true,
            registration: { allowedClientFingerprints: [tls.allowedFingerprint] },
            controlIngress: tls.managerConfig("bdd.manager.rollback.guest", "bdd.manager.rollback.test")
        }
    } as any);
    state(this).close.push(() => manager.stop());
    await assert.rejects(manager.main(), { message: "broker attach failed" });
    assert.strictEqual(controlIngressPort, tls.port, "Manager did not start its scenario-owned control ingress before broker setup");
    state(this).releasedControlIngressPort = controlIngressPort;
});

Then("the failed Manager control ingress releases its listener", async function(this: CustomWorld) {
    const port = state(this).releasedControlIngressPort;
    assert.ok(port, "Failed Manager control ingress port is missing");
    const reusableListener = createServer();
    await listen(reusableListener, port);
    await closeServer(reusableListener);
});

Given("an isolated production Manager control ingress and Hub runner listener", async function(this: CustomWorld) {
    const tls = await isolation(this).createMtlsControlIngress();
    const config = getDefaultManagerConfig();
    const defaultManagerPort = config.verser2.host.bindPort;
    const defaultControlIngressPort = config.verser2.controlIngress!.host.bindPort;
    const hubRunnerPort = await isolation(this).reservePort();
    const hubRunnerListener = createServer();
    await listen(hubRunnerListener, hubRunnerPort);
    const manager = new Manager({
        ...config,
        id: "bdd-control-ingress-concurrent",
        logLevel: "error",
        verser2: {
            ...config.verser2,
            registration: { allowedClientFingerprints: [tls.allowedFingerprint] },
            controlIngress: tls.managerConfig("bdd.manager.concurrent.guest", "bdd.manager.concurrent.test")
        }
    } as any);
    const current = state(this);
    current.tls = tls;
    current.close.push(async () => {
        await manager.stop();
        await closeServer(hubRunnerListener);
    });
    await manager.main();
    const controlIngressHost = (manager as any).controlIngressHost;
    assert.ok(controlIngressHost, "Production Manager did not expose its control ingress");
    current.concurrentListeners = {
        defaultManagerPort,
        defaultControlIngressPort,
        controlIngressPort: controlIngressHost.address.port,
        hubRunnerPort,
        v1RouterAttached: Boolean((manager as any).router)
    };
});

Then("the Manager ingress and Hub runner listener bind without a port collision", function(this: CustomWorld) {
    const listeners = state(this).concurrentListeners;
    assert.ok(listeners, "Concurrent listener state is missing");
    assert.strictEqual(listeners.defaultManagerPort, 2443);
    assert.strictEqual(listeners.defaultControlIngressPort, 2444);
    assert.notStrictEqual(listeners.defaultManagerPort, listeners.defaultControlIngressPort);
    assert.strictEqual(listeners.controlIngressPort, state(this).tls?.port);
    assert.notStrictEqual(listeners.controlIngressPort, listeners.hubRunnerPort);
    assert.ok(listeners.v1RouterAttached, "Manager v1 router was not retained after control ingress startup");
});

Given("isolated CSR enrollment artifacts backed by a production Manager enrollment server", async function(this: CustomWorld) {
    const isolated = isolation(this);
    const artifacts = isolated.createArtifactDirectory("csr-enrollment");
    const caKeyFile = join(artifacts, "manager-ca.key.pem");
    const caFile = join(artifacts, "manager-ca.cert.pem");
    const serverKeyFile = join(artifacts, "server.key.pem");
    const serverCsrFile = join(artifacts, "server.csr.pem");
    const serverCertFile = join(artifacts, "server.cert.pem");
    const serverExtFile = join(artifacts, "server.ext");
    const grantsDir = join(artifacts, "grants");
    const managerConfig = join(artifacts, "manager.json");
    const operatorFile = join(artifacts, "operator.secret");
    runOpenSsl(["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-subj", "/CN=bdd-manager-ca", "-days", "2", "-addext", "basicConstraints=critical,CA:TRUE", "-addext", "keyUsage=critical,keyCertSign,cRLSign", "-keyout", caKeyFile, "-out", caFile]);
    chmodSync(caKeyFile, 0o600);
    runOpenSsl(["req", "-newkey", "rsa:2048", "-nodes", "-subj", "/CN=127.0.0.1", "-keyout", serverKeyFile, "-out", serverCsrFile]);
    writeFileSync(serverExtFile, "basicConstraints=critical,CA:FALSE\nsubjectAltName=IP:127.0.0.1\n", { mode: 0o600 });
    runOpenSsl(["x509", "-req", "-in", serverCsrFile, "-CA", caFile, "-CAkey", caKeyFile, "-CAcreateserial", "-days", "1", "-extfile", serverExtFile, "-out", serverCertFile]);
    const enrollmentConfig = { enabled: true, operatorApproval: "bdd-local-approval", storageDir: grantsDir, caKeyFile, caCertFile: caFile };
    writeFileSync(managerConfig, JSON.stringify({ csrEnrollment: enrollmentConfig }), { mode: 0o600 });
    writeFileSync(operatorFile, "bdd-local-approval\n", { mode: 0o600 });
    const authority = new CsrEnrollmentAuthority(enrollmentConfig);
    const server = createCsrEnrollmentHttpsServer(authority, { key: readFileSync(serverKeyFile), cert: readFileSync(serverCertFile) });
    const port = await isolated.reservePort();
    await new Promise<void>((resolve, reject) => server.once("error", reject).listen(port, "127.0.0.1", resolve));
    state(this).close.push(async () => await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
    state(this).enrollment = {
        identityDir: join(artifacts, "hub-identity"),
        requestFile: join(artifacts, "request.json"),
        grantFile: join(artifacts, "grant.json"),
        caFile,
        caFingerprint: new X509Certificate(readFileSync(caFile, "utf8")).fingerprint256,
        managerConfig,
        operatorFile,
        managerUrl: `https://127.0.0.1:${port}`
    };
});

When("the CSR enrollment command artifacts generate, approve, and redeem a Hub request", async function(this: CustomWorld) {
    const enrollment = state(this).enrollment;
    assert.ok(enrollment, "CSR enrollment fixture is missing");
    let result = await runCommand(this, binaries.hubEnrollment, ["generate", "--identity-dir", enrollment.identityDir, "--hub-id", "bdd-hub", "--output", enrollment.requestFile]);
    assert.strictEqual(result.code, 0, result.output);
    result = await runCommand(this, binaries.managerEnrollment, ["approve", "--manager-config", enrollment.managerConfig, "--request", enrollment.requestFile, "--operator-approval-file", enrollment.operatorFile, "--grant-output", enrollment.grantFile]);
    assert.strictEqual(result.code, 0, result.output);
    result = await runCommand(this, binaries.hubEnrollment, ["redeem", "--identity-dir", enrollment.identityDir, "--request", enrollment.requestFile, "--grant-file", enrollment.grantFile, "--manager-url", enrollment.managerUrl, "--ca-file", enrollment.caFile, "--ca-fingerprint", enrollment.caFingerprint]);
    assert.strictEqual(result.code, 0, result.output);
    state(this).command = result;
});

Then("the Hub enrollment certificate is installed with the pinned Manager CA", function(this: CustomWorld) {
    const enrollment = state(this).enrollment;
    assert.ok(enrollment, "CSR enrollment fixture is missing");
    assert.ok(existsSync(join(enrollment.identityDir, "client.cert.pem")), "Hub enrollment certificate was not installed");
    assert.ok(readFileSync(enrollment.requestFile, "utf8").includes("BEGIN CERTIFICATE REQUEST"));
    assert.ok(!readFileSync(enrollment.requestFile, "utf8").includes("PRIVATE KEY"));
    assert.ok(!state(this).command?.output.includes("bdd-local-approval"));
});

When("the Manager CSR enrollment artifact receives an unknown protected option", async function(this: CustomWorld) {
    state(this).command = await runCommand(this, binaries.managerEnrollment, ["approve", "--unknown=BDD_PROTECTED_VALUE"]);
});

Then("the CSR enrollment artifact reports a safe usage error", function(this: CustomWorld) {
    const result = state(this).command;
    assert.strictEqual(result?.code, 1, result?.output);
    assert.match(result?.output || "", /Usage error: Unknown option/);
    assert.ok(!result?.output.includes("BDD_PROTECTED_VALUE"));
});

When("the Hub CSR enrollment artifact has an operational failure", async function(this: CustomWorld) {
    state(this).command = await runCommand(this, binaries.hubEnrollment, ["redeem", "--identity-dir", "/missing", "--request", "/missing", "--grant-file", "/missing", "--manager-url", "https://localhost", "--ca-file", "/missing", "--ca-fingerprint", "00"]);
});

Then("the CSR enrollment artifact reports a generic operational error", function(this: CustomWorld) {
    const result = state(this).command;
    assert.strictEqual(result?.code, 1, result?.output);
    assert.strictEqual(result?.output, "CSR enrollment command failed\n");
});
