import { strict as assert } from "assert";
import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import { createVerserHost } from "@signicode/verser2-host";
import { createV2HttpDispatcher } from "@scramjet/api-server";
import { Router } from "@scramjet/api-router";
import { publishedModule } from "./published-modules";
import { getSiCommand } from "./utils";
import type { MtlsControlIngress } from "./scenario-isolation";
import type { CustomWorld } from "../step-definitions/world";

export type CliResult = { code: number | null; output: string };
export type IngressName = "platform" | "space" | "hub" | "nonmtls";
export type ProfileName = IngressName | "rejected" | "missing" | "native";
export type IngressState = {
    requests: Record<IngressName, number>;
    profiles: Partial<Record<ProfileName, string>>;
    close: Array<() => Promise<void>>;
    result?: CliResult;
    completionResults?: CliResult[];
    nativeRequests: Array<{ path: string; body: string }>;
    nativeActiveRequests: number;
    nativeWaitStarted: boolean;
    legacyRequests: number;
    sessionFile?: string;
};

const CLI_TIMEOUT_MS = 30000;
const cli = getSiCommand({ useBddConfig: false });
const { createVerser2HostOptions } = publishedModule<{ createVerser2HostOptions: any }>("@scramjet/multi-manager");
const { startManagerControlIngress, stopManagerControlIngress } = publishedModule<{ startManagerControlIngress: any; stopManagerControlIngress: any }>("@scramjet/manager");
const { startHostControlIngress, stopHostControlIngress } = publishedModule<{ startHostControlIngress: any; stopHostControlIngress: any }>("@scramjet/host");

export function ingressState(world: CustomWorld): IngressState {
    if (!world.resources.cliIngress) {
        world.resources.cliIngress = {
            requests: { platform: 0, space: 0, hub: 0, nonmtls: 0 },
            profiles: {},
            close: [],
            nativeRequests: [],
            nativeActiveRequests: 0,
            nativeWaitStarted: false,
            legacyRequests: 0
        } as IngressState;
    }
    return world.resources.cliIngress as IngressState;
}

function profile(endpoint: string, ingress: { level: "platform" | "space" | "hub"; serviceId: string; routeDomain: string }, tls: { caFile: string; certFile?: string; keyFile?: string }, target?: { spaceId?: string; hubId?: string }, brokerId = `bdd-${ingress.level}-cli`) {
    return {
        configVersion: 1, apiUrl: "http://127.0.0.1:1/api/v1", middlewareApiUrl: "", env: "development", scope: "", token: "",
        log: { debug: false, format: "pretty" },
        verser2: { endpoint, brokerId, ingress: { level: ingress.level, expectedId: ingress.serviceId, routeDomain: ingress.routeDomain }, target, tls, timeoutMs: 5000 }
    };
}

function versionRouter(name: IngressName, state: IngressState, identity: { level: string; serviceId: string; routeDomain: string }, namedPath?: string) {
    let router = Router.create({ basePath: "/api/v2" }).get("/ingress/identity", { handler: () => identity }).get("/version", { handler: () => { state.requests[name]++; return { ingress: name, request: "raw" }; } });
    if (namedPath) router = router.get(namedPath, { handler: () => { state.requests[name]++; return { ingress: name, request: "named" }; } });
    return router;
}

function mtlsTls(material: MtlsControlIngress) {
    return { caFile: material.allowedClient.caFile, certFile: material.allowedClient.certFile, keyFile: material.allowedClient.keyFile };
}

function collectCliResult(child: ChildProcessWithoutNullStreams, args: string[]): Promise<CliResult> {
    let output = "";
    child.stdout.on("data", chunk => { output += chunk.toString(); });
    child.stderr.on("data", chunk => { output += chunk.toString(); });
    return new Promise((resolve, reject) => {
        let finished = false;
        const finish = (callback: () => void) => { if (finished) return; finished = true; clearTimeout(timeout); callback(); };
        const timeout = setTimeout(() => { child.kill("SIGTERM"); setTimeout(() => child.kill("SIGKILL"), 1000).unref(); finish(() => reject(new Error(`Real CLI timed out after ${CLI_TIMEOUT_MS}ms: ${args.join(" ")}\n${output}`))); }, CLI_TIMEOUT_MS);
        child.once("error", error => finish(() => reject(new Error(`Real CLI could not start: ${error.message}`))));
        child.once("close", code => finish(() => resolve({ code, output })));
    });
}

export function startCli(world: CustomWorld, args: string[], overrides: NodeJS.ProcessEnv = {}, command = cli) {
    const isolation = world.scenarioIsolation;
    assert.ok(isolation, "ScenarioIsolation must be installed before invoking the CLI");
    const child = spawn("/usr/bin/env", [...command, ...args], { cwd: process.cwd(), env: isolation.environment({ NODE_OPTIONS: "--max-old-space-size=512", ...overrides }) });
    world.scenarioLifecycle.ownChild(child, `cli ingress: ${args.join(" ")}`, { group: true });
    world.scenarioLifecycle.expect(child);
    return { child, result: collectCliResult(child, args) };
}

export async function invoke(world: CustomWorld, args: string[], overrides: NodeJS.ProcessEnv = {}, command = cli): Promise<CliResult> {
    return await startCli(world, args, overrides, command).result;
}

export async function startMtlsIngresses(world: CustomWorld, options: { identitySuffix?: string } = {}): Promise<void> {
    const isolation = world.scenarioIsolation;
    assert.ok(isolation, "ScenarioIsolation must be installed before creating ingress fixtures");
    const state = ingressState(world);
    const suffix = options.identitySuffix ? `-${options.identitySuffix}` : "";
    const tls = await isolation.createMtlsControlIngress();
    const managerPort = await isolation.reservePort();
    const hubPort = await isolation.reservePort();
    const identity = (level: "platform" | "space" | "hub", serviceId: string, routeDomain: string) => ({ level, serviceId, routeDomain });
    const names = {
        platformBroker: `bdd${suffix}.platform.broker`, platformGuest: `bdd${suffix}.platform.guest`, platformDomain: `bdd.platform${suffix}.test`, platformService: `platform${suffix}`,
        spaceBroker: `bdd${suffix}.space.broker`, spaceGuest: `bdd${suffix}.space.guest`, spaceDomain: `bdd.space${suffix}.test`, spaceService: `space-a${suffix}`,
        hubBroker: `bdd${suffix}.hub.broker`, hubGuest: `bdd${suffix}.hub.guest`, hubDomain: `bdd.hub${suffix}.test`, hubService: `hub-a${suffix}`,
    };
    const platformConfig: any = { enabled: true, identityDir: tls.identityDir, host: tls.server, registration: { allowedClientFingerprints: [tls.allowedFingerprint] }, localBroker: { peerId: names.platformBroker, routeDomain: names.platformDomain }, localGuest: { peerId: names.platformGuest, routeDomain: names.platformDomain }, guest: { peerId: names.platformGuest, routeDomain: names.platformDomain } };
    const platformHost = createVerserHost(createVerser2HostOptions(platformConfig));
    await platformHost.start();
    const platformGuest = await platformHost.attachLocalGuest({ guestId: names.platformGuest, routedDomains: [names.platformDomain], listener: createV2HttpDispatcher(versionRouter("platform", state, identity("platform", names.platformService, names.platformDomain), `/spaces/space-a${suffix}/version`)).listener as any });
    state.close.push(async () => { await platformGuest.close("bdd cleanup").catch(() => undefined); await platformHost.close().catch(() => undefined); });
    const managerConfig: any = { enabled: true, host: { ...tls.server, bindPort: managerPort, publicUrl: `https://localhost:${managerPort}`, identityDir: tls.identityDir }, guest: { peerId: names.spaceGuest, routeDomain: names.spaceDomain } };
    const managerHost = await startManagerControlIngress(managerConfig, versionRouter("space", state, identity("space", names.spaceService, names.spaceDomain), `/hubs/hub-a${suffix}/version`), undefined, [tls.allowedFingerprint]);
    state.close.push(() => stopManagerControlIngress(managerHost).catch(() => undefined));
    const hubConfig: any = { enabled: true, identityDir: tls.identityDir, host: { ...tls.server, bindPort: hubPort, publicUrl: `https://localhost:${hubPort}` }, caFile: tls.allowedClient.caFile, registration: { allowedClientFingerprints: [tls.allowedFingerprint] }, localBroker: { peerId: names.hubBroker, routeDomain: names.hubDomain }, localGuest: { peerId: names.hubGuest, routeDomain: names.hubDomain }, guest: { peerId: names.hubGuest, routeDomain: names.hubDomain } };
    const hubHost = await startHostControlIngress(hubConfig, versionRouter("hub", state, identity("hub", names.hubService, names.hubDomain)), names.hubService);
    state.close.push(() => stopHostControlIngress(hubHost).catch(() => undefined));
    const profileName = (name: string) => `${name}${suffix}`;
    state.profiles.platform = isolation.writeProfile(profileName("platform"), profile(tls.publicUrl, identity("platform", names.platformService, names.platformDomain), mtlsTls(tls), { spaceId: `space-a${suffix}` }, `bdd-platform-cli${suffix}`), profileName("platform"));
    state.profiles.space = isolation.writeProfile(profileName("space"), profile(`https://localhost:${managerPort}`, identity("space", names.spaceService, names.spaceDomain), mtlsTls(tls), { hubId: names.hubService }, `bdd-space-cli${suffix}`), profileName("platform"));
    state.profiles.hub = isolation.writeProfile(profileName("hub"), profile(`https://localhost:${hubPort}`, identity("hub", names.hubService, names.hubDomain), mtlsTls(tls), undefined, `bdd-hub-cli${suffix}`), profileName("platform"));
    state.profiles.rejected = isolation.writeProfile(profileName("rejected"), profile(`https://localhost:${managerPort}`, identity("space", names.spaceService, names.spaceDomain), { ...mtlsTls(tls), certFile: tls.rejectedClient.certFile, keyFile: tls.rejectedClient.keyFile }, { hubId: names.hubService }, `bdd-rejected-cli${suffix}`), profileName("platform"));
    state.profiles.missing = isolation.writeProfile(profileName("missing"), profile(`https://localhost:${hubPort}`, identity("hub", names.hubService, names.hubDomain), { caFile: tls.allowedClient.caFile, certFile: tls.allowedClient.certFile, keyFile: `${isolation.artifactsDir}/missing-client-key.pem` }, undefined, `bdd-missing-cli${suffix}`), profileName("platform"));
}

export async function cleanupCliIngress(world: CustomWorld): Promise<void> {
    const state = world.resources.cliIngress as IngressState | undefined;
    if (!state) return;
    const errors: Error[] = [];
    for (const close of [...state.close].reverse()) await close().catch(error => errors.push(error instanceof Error ? error : new Error(String(error))));
    if (errors.length) throw new Error(`CLI ingress cleanup failed: ${errors.map(error => error.message).join("; ")}`);
}
