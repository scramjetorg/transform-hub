import { strict as assert } from "assert";
import { execFileSync, spawn, spawnSync } from "child_process";
import { chownSync, cpSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import { X509Certificate } from "crypto";
import { isAbsolute, join, relative, resolve, sep } from "path";
import type { CustomWorld } from "../step-definitions/world";
import { getDefaultManagerConfig } from "@scramjet/config";
import { resolveBddBin } from "./published-artifacts";

const root = join(__dirname, "..", "..", "examples", "native-onboarding-poc", "compose");
const compose = join(root, "compose.yaml");
const multiManagerVersion = JSON.parse(
    readFileSync(join(__dirname, "..", "..", "packages", "multi-manager", "package.json"), "utf8")
).version;
const cleanupPollTimeoutMs = 5_000;
const cleanupPollIntervalMs = 100;
const commandDiagnosticLimit = 8_192;
const proofBudgetMs = 30_000;
const teardownBudgetMs = 12_000;
const operationTimeoutMs = 5_000;
const nativeClientLabel = "com.scramjet.native-proof.client=true";

type CaptureCommand = { at: string; durationMs: number; command: string; args: string[]; exitCode: number | null; stdout: string; stderr: string };
type NativeComposeCapture = { captureName: string; startedAt: string; finishedAt?: string; project?: string; scenario: string; images?: { multimanager: string; sth: string }; commands: CaptureCommand[]; logs: Array<{ at: string; source: string; value: string }>; cleanup?: unknown; exit?: { status: string; code?: number | null; error?: string } };
let activeCapture: NativeComposeCapture | undefined;
let activeWorkDeadline: number | undefined;

function clippedTimeout(localLimit: number, deadline = activeWorkDeadline): number {
    const timeout = Math.min(localLimit, deadline === undefined ? localLimit : deadline - Date.now());
    if (timeout <= 0) throw new Error("Native Compose proof work deadline elapsed (teardown window reserved)");
    return timeout;
}

function captureName(): string | undefined {
    const name = process.env.SCRAMJET_BDD_NATIVE_COMPOSE_CAPTURE;
    return name && /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(name) ? name : undefined;
}

function redact(value: string): string {
    return value.replace(/\x1b\[[0-?]*[ -\/]*[@-~]/g, "")
        .replace(/-----BEGIN [^-]+-----[\s\S]*?-----END [^-]+-----/g, "[REDACTED PEM]")
        .replace(/(\"?(?:key|secret|token|password|credential|privateKey|certificate|certFile|keyFile|caFile)\"?\s*[:=]\s*)(\"[^\"]*\"|[^,\s}]+)/gi, "$1[REDACTED]");
}

function bounded(value: unknown): string { return boundedCommandOutput(redact(typeof value === "string" ? value : value == null ? "" : String(value))); }
function safeArgs(args: string[]): string[] {
    const sensitive = /(?:key|cert|certificate|ca|bundle|config|request|output|identity|credential|token|secret|password)/i;
    return args.map((arg, index) => index && sensitive.test(args[index - 1]) ? "[REDACTED ARG]" : redact(arg));
}
function recordCommand(command: string, args: string[], started: number, result: { status: number | null; stdout?: string | Buffer; stderr?: string | Buffer }): void {
    activeCapture?.commands.push({ at: new Date(started).toISOString(), durationMs: Date.now() - started, command, args: safeArgs(args), exitCode: result.status, stdout: bounded(result.stdout), stderr: bounded(result.stderr) });
}
function captureLog(source: string, value: string): void { activeCapture?.logs.push({ at: new Date().toISOString(), source, value: bounded(value) }); }
function writeCapture(): void {
    if (!activeCapture) return;
    activeCapture.finishedAt = new Date().toISOString();
    const dir = join(process.cwd(), ".work", "native-compose-diagnostics");
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    const target = join(dir, `${activeCapture.captureName}.json`);
    const temporary = `${target}.${process.pid}.${Date.now()}.tmp`;
    writeFileSync(temporary, JSON.stringify(activeCapture, null, 2), { mode: 0o600 });
    renameSync(temporary, target);
    activeCapture = undefined;
}

function execute(command: string, args: string[], options: { cwd?: string; env?: NodeJS.ProcessEnv; timeout?: number }): string {
    const started = Date.now();
    const result = spawnSync(command, args, { ...options, timeout: options.timeout === undefined ? undefined : clippedTimeout(options.timeout), encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    recordCommand(command, args, started, result);
    if (result.error || result.status !== 0) {
        const error = result.error ? result.error.message : `${command} exited with code ${result.status}`;
        throw new Error(`${error}\nstdout:\n${bounded(result.stdout)}\nstderr:\n${bounded(result.stderr)}`);
    }
    return result.stdout || "";
}

function boundedCommandOutput(output: unknown): string {
    const text = Buffer.isBuffer(output) ? output.toString("utf8") : typeof output === "string" ? output : "";
    return text.length > commandDiagnosticLimit
        ? `${text.slice(0, commandDiagnosticLimit)}\n... output truncated ...`
        : text;
}

function run(args: string[], env: NodeJS.ProcessEnv, timeout = 5_000): string {
    return execute("docker", ["compose", "-f", compose, ...args], { cwd: root, env, timeout });
}

function nativeCliArgs(
    project: string,
    siBin: string,
    args: string[],
    env: NodeJS.ProcessEnv,
    timeout = operationTimeoutMs,
    selectProfile = true,
): string[] {
    const hostname = process.env.HOSTNAME;
    assert.ok(hostname, "BDD container hostname is required for the native CLI client");
    const runId = env.SCRAMJET_BDD_RUN_ID;
    const chunkId = env.SCRAMJET_BDD_CHUNK_ID;
    const labelledBddContainers = runId && chunkId
        ? dockerList(["ps", "-q", "--filter", `label=scramjet.bdd.run-id=${runId}`, "--filter", `label=scramjet.bdd.chunk-id=${chunkId}`])
        : [];
    const volumeSource = labelledBddContainers[0] || hostname;
    assert.ok(volumeSource, "BDD container volume source is required for the native CLI client");
    const uid = typeof process.getuid === "function" ? process.getuid() : 0;
    const gid = typeof process.getgid === "function" ? process.getgid() : 0;
    const image = env.BDD_NODE_IMAGE || process.env.BDD_NODE_IMAGE || "transform-hub-bdd-bun:dev";
    const clientHome = "/work-tmp/native-compose-client-home";
    const cliArgs = [
            "run", "--label", nativeClientLabel,
            "--network", `${project}-network`,
            "--volumes-from", volumeSource,
            "--user", `${uid}:${gid}`,
            // Do not expose the BDD container's home/configuration to the client.
            // Each CLI process uses the same imported native-compose profile.
            "--env", `HOME=${clientHome}`,
            "--env", "SI_CONFIG_PATH=",
            "--env", "SCRAMJET_BDD_CONFIG_PATH=",
            "--env", "SCRAMJET_BDD_NATIVE_HUB_CONFIG=",
            "--rm", image, siBin, ...args
        ];
    if (selectProfile) cliArgs.splice(cliArgs.indexOf("--env"), 0, "--env", "SI_CONFIG=native-compose");
    if (activeCapture && !cliArgs.includes("--verbose")) cliArgs.push("--verbose");
    return cliArgs;
}

function runNativeCli(project: string, siBin: string, args: string[], env: NodeJS.ProcessEnv, timeout = operationTimeoutMs): string {
    const boundedTimeout = clippedTimeout(timeout);
    return execute("docker", nativeCliArgs(project, siBin, args, env, boundedTimeout), { cwd: root, env, timeout: boundedTimeout });
}

function startNativeCli(project: string, siBin: string, args: string[], env: NodeJS.ProcessEnv, timeout: number, stdoutSuccess?: (stdout: string) => boolean): Promise<{ stdout: string; stderr: string; status: number | null }> {
    const command = "docker";
    const boundedTimeout = clippedTimeout(timeout);
    const cliArgs = nativeCliArgs(project, siBin, args, env, boundedTimeout);
    const started = Date.now();
    const child = spawn(command, cliArgs, { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const append = (current: string, chunk: Buffer): string => boundedCommandOutput(current + chunk.toString("utf8"));
    return new Promise((resolve, reject) => {
        let successMatched = false;
        let settled = false;
        const timer = setTimeout(() => {
            settled = true;
            child.kill("SIGTERM");
            reject(new Error(`Timed out waiting for native client instance output after ${timeout}ms\nstdout:\n${bounded(stdout)}\nstderr:\n${bounded(stderr)}`));
        }, boundedTimeout);
        child.stdout.on("data", (chunk: Buffer) => {
            stdout = append(stdout, chunk);
            if (!settled && stdoutSuccess?.(stdout)) {
                successMatched = true;
                settled = true;
                clearTimeout(timer);
                resolve({ status: 0, stdout, stderr });
                child.kill("SIGTERM");
            }
        });
        child.stderr.on("data", (chunk: Buffer) => { stderr = append(stderr, chunk); });
        child.once("error", error => { clearTimeout(timer); if (!settled) { settled = true; reject(error); } });
        child.once("close", (status) => {
            clearTimeout(timer);
            const result = { status, stdout, stderr };
            recordCommand(command, cliArgs, started, result);
            if (successMatched || settled) return;
            settled = true;
            if (status !== 0) reject(new Error(`Native client instance output exited with code ${status}\nstdout:\n${bounded(stdout)}\nstderr:\n${bounded(stderr)}`));
            else resolve(result);
        });
    });
}

function runOfflineCli(bin: string, args: string[], timeout = operationTimeoutMs): string {
    const commandArgs = [...args];
    if (activeCapture && /(?:scramjet|si)(?:[-.]|$)/i.test(bin) && !commandArgs.includes("--verbose")) commandArgs.push("--verbose");
    return execute(process.execPath, [bin, ...commandArgs], { cwd: root, timeout: clippedTimeout(timeout) });
}

function composeFailureDiagnostics(env: NodeJS.ProcessEnv, remaining: () => number): string {
    const capture = (args: string[]): string => {
        try {
            return boundedCommandOutput(run(args, env, remaining()));
        } catch (error) {
            const commandError = error as Error & { stdout?: string | Buffer; stderr?: string | Buffer };
            return boundedCommandOutput(
                `${error instanceof Error ? error.message : String(error)}\nstdout:\n${boundedCommandOutput(commandError.stdout)}\nstderr:\n${boundedCommandOutput(commandError.stderr)}`
            );
        }
    };

    return [
        "MultiManager compose logs (tail 100):",
        capture(["logs", "--tail", "100", "multimanager"]),
        "STH compose logs (tail 100):",
        capture(["logs", "--tail", "100", "sth"]),
        "Compose process status:",
        capture(["ps", "--format", "json"])
    ].join("\n");
}

type ComposeResources = { containers: string[]; networks: string[]; volumes: string[] };

export type NativeComposeResult = {
    output: string;
    cleaned: boolean;
    cleanupDiagnostics: string;
    separateIdentities: boolean;
    typedRpcOutput?: { ready: boolean; value: string };
    managedManagerRuntime?: boolean;
};

function dockerList(args: string[], deadline = Date.now() + cleanupPollTimeoutMs): string[] {
    const timeout = Math.min(deadline - Date.now(), activeWorkDeadline === undefined ? Infinity : activeWorkDeadline - Date.now());
    if (timeout <= 0) throw new Error("Native Compose proof deadline elapsed before Docker cleanup polling");
    return execFileSync("docker", args, {
        encoding: "utf8",
        timeout,
        stdio: ["ignore", "pipe", "pipe"]
    }).split(/\r?\n/).filter(Boolean);
}

function instanceId(output: string): string {
    try {
        const parsed = JSON.parse(output) as unknown;
        const visit = (value: unknown): string | undefined => {
            if (!value || typeof value !== "object") return undefined;
            const record = value as Record<string, unknown>;
            if (typeof record.id === "string") return record.id;
            for (const child of Object.values(record)) {
                const found = visit(child);
                if (found) return found;
            }
            return undefined;
        };
        const id = visit(parsed);
        assert.ok(id, `No instance id in CLI response: ${output}`);
        return id;
    } catch (error) {
        if (error instanceof assert.AssertionError) throw error;

        // `sequence deploy` uses console.dir by default.  Keep this fallback
        // limited to the known result.instance.id object path and a bounded
        // command-output prefix; do not scan arbitrary output for IDs.
        const boundedOutput = output.slice(0, commandDiagnosticLimit);
        const ids: string[] = [];
        const pattern = /(?:^|\n)\s*result\s*:\s*\{[\s\S]{0,2048}?\binstance\s*:\s*\{\s*id\s*:\s*(['"])([^'"\r\n]+)\1/g;
        for (const match of boundedOutput.matchAll(pattern)) ids.push(match[2]);
        assert.equal(ids.length, 1, `No instance id in CLI response: ${output}`);
        return ids[0];
    }
}

function waitForInstance(project: string, siBin: string, env: NodeJS.ProcessEnv, id: string): void {
    const deadline = Math.min(Date.now() + 5_000, activeWorkDeadline ?? Infinity);
    let last = "";
    while (Date.now() < deadline) {
        try {
            last = runNativeCli(project, siBin, ["instance", "info", id], env, operationTimeoutMs);
            return;
        } catch (error) {
            last = error instanceof Error ? error.message : String(error);
            Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, Math.min(150, Math.max(0, deadline - Date.now())));
        }
    }
    throw new Error(`Timed out waiting for instance ${id}: ${last}`);
}

function waitForNativeHubHealth(project: string, siBin: string, env: NodeJS.ProcessEnv): void {
    const deadline = Math.min(Date.now() + 5_000, activeWorkDeadline ?? Infinity);
    let lastResponse = "";
    let lastError = "";
    while (Date.now() < deadline) {
        try {
            const processTimeout = Math.max(1, Math.min(operationTimeoutMs, deadline - Date.now()));
            const response = runNativeCli(project, siBin, ["api", "get", "/health", "--output", "json", "--timeout", "1000"], env, processTimeout);
            lastResponse = response;
            const parsed = JSON.parse(response) as { components?: unknown };
            const healthy = Array.isArray(parsed.components) && parsed.components.some(component => {
                if (!component || typeof component !== "object") return false;
                const value = component as { name?: unknown; status?: unknown; details?: { connected?: unknown } };
                return value.name === "hub.upstream" && value.status === "healthy" && value.details?.connected === true;
            });
            if (healthy) return;
            lastError = "hub.upstream is not healthy and connected";
        } catch (error) {
            lastError = error instanceof Error ? error.message : String(error);
        }
    }
    throw new Error(`Timed out waiting for routed Hub health after 5000ms: ${lastError}\nLast response:\n${boundedCommandOutput(lastResponse)}`);
}

function cleanupNativeClients(deadline: number): { cleaned: boolean; diagnostics: string } {
    let clientContainers = dockerList(["ps", "-aq", "--filter", `label=${nativeClientLabel}`], deadline);
    for (const container of clientContainers) {
        const timeout = Math.min(operationTimeoutMs, deadline - Date.now());
        if (timeout <= 0) break;
        try { execFileSync("docker", ["rm", "-f", container], { encoding: "utf8", timeout, stdio: ["ignore", "pipe", "pipe"] }); } catch { /* verify below */ }
    }
    while (clientContainers.length && Date.now() < deadline) {
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, cleanupPollIntervalMs);
        clientContainers = dockerList(["ps", "-aq", "--filter", `label=${nativeClientLabel}`], deadline);
    }
    return { cleaned: clientContainers.length === 0, diagnostics: `native-client-containers=[${clientContainers.join(",")}]` };
}

function composeResources(project: string, deadline: number): ComposeResources {
    const outerBddRunner = process.env.HOSTNAME;
    const containers = dockerList(["ps", "-aq", "--filter", `label=com.docker.compose.project=${project}`], deadline)
        .filter(id => !outerBddRunner || !(id.startsWith(outerBddRunner) || outerBddRunner.startsWith(id)));
    return {
        containers,
        networks: dockerList(["network", "ls", "-q", "--filter", `label=com.docker.compose.project=${project}`], deadline),
        volumes: dockerList(["volume", "ls", "-q", "--filter", `label=com.docker.compose.project=${project}`], deadline)
    };
}

function cleanupDetails(resources: ComposeResources): string {
    return `containers=[${resources.containers.join(",")}], networks=[${resources.networks.join(",")}], volumes=[${resources.volumes.join(",")}]`;
}

function waitForComposeCleanup(project: string, deadline: number): { cleaned: boolean; diagnostics: string } {
    let resources: ComposeResources;
    try { resources = composeResources(project, deadline); }
    catch (error) { return { cleaned: false, diagnostics: `Compose cleanup polling not performed: ${error instanceof Error ? error.message : String(error)}` }; }
    while ((resources.containers.length || resources.networks.length || resources.volumes.length) && Date.now() < deadline) {
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, cleanupPollIntervalMs);
        try { resources = composeResources(project, deadline); }
        catch (error) { return { cleaned: false, diagnostics: `Compose cleanup polling stopped: ${error instanceof Error ? error.message : String(error)}; ${cleanupDetails(resources)}` }; }
    }
    return { cleaned: !resources.containers.length && !resources.networks.length && !resources.volumes.length, diagnostics: cleanupDetails(resources) };
}

export async function runNativeComposeProof(world: CustomWorld): Promise<NativeComposeResult> {
    const requestedCapture = captureName();
    if (process.env.SCRAMJET_BDD_NATIVE_COMPOSE_CAPTURE && !requestedCapture) {
        throw new Error("SCRAMJET_BDD_NATIVE_COMPOSE_CAPTURE must be a simple capture name (letters, numbers, ., _, or -)");
    }
    assert.ok(existsSync(compose), `Missing canonical Compose file: ${compose}`);
    const yaml = readFileSync(compose, "utf8");
    const mmConfig = readFileSync(join(root, "config", "mm.json"), "utf8");
    const sthConfig = readFileSync(join(root, "config", "sth.json"), "utf8");
    assert.match(mmConfig, /2443/);
    assert.doesNotMatch(yaml, /ports\s*:/);
    assert.match(readFileSync(join(root, "config", "mm.json"), "utf8"), /"mtlsRequired"\s*:\s*true/);
    assert.doesNotMatch(yaml, /password|token|secret|credential/i);
    assert.match(yaml, /com\.scramjet\.native-proof/);
    const bootstrap = readFileSync(join(root, "bootstrap.sh"), "utf8");
    assert.match(bootstrap, /ca\.pem/);
    assert.doesNotMatch(bootstrap, /make_cert (sth|si)/);
    assert.match(mmConfig, /issued-store/);
    assert.doesNotMatch(mmConfig, /redemption|grant|listener/i);
    assert.match(sthConfig, /sth-identity/);
    assert.match(readFileSync(join(root, "sequence", "index.js"), "utf8"), /rpc\(/);

    const project = `scramjet-native-compose-${process.pid}-${Date.now()}`;
    activeCapture = requestedCapture ? {
        captureName: requestedCapture,
        startedAt: new Date().toISOString(),
        project,
        scenario: "E2E-021-native-compose",
        commands: [],
        logs: [],
        images: { multimanager: envImage(process.env.SCRAMJET_MM_COMPOSE_IMAGE || process.env.MM_COMPOSE_IMAGE || `scramjetorg/multimanager:${multiManagerVersion}`), sth: envImage(process.env.STH_COMPOSE_IMAGE || "scramjetorg/sth:dev") }
    } : undefined;
    const state = world.scenarioIsolation?.createArtifactDirectory("native-compose-state");
    assert.ok(state, "scenario state directory is required");
    const hostTmpDir = process.env.SCRAMJET_BDD_HOST_TMP_DIR;
    assert.ok(hostTmpDir && isAbsolute(hostTmpDir), "Docker BDD host temporary directory is required");
    const stateRelativePath = relative("/work-tmp", resolve(state));
    assert.ok(stateRelativePath && !stateRelativePath.startsWith(`..${sep}`) && stateRelativePath !== "..", `Compose state must be below /work-tmp: ${state}`);
    const hostState = join(hostTmpDir, stateRelativePath);
    const runtimeUid = typeof process.getuid === "function" ? process.getuid() : undefined;
    const runtimeGid = typeof process.getgid === "function" ? process.getgid() : undefined;
    assert.ok(runtimeUid !== undefined && runtimeUid > 0, "Native Compose runtime must use the non-root scenario UID");
    assert.ok(runtimeGid !== undefined && runtimeGid > 0, "Native Compose runtime must use the non-root scenario GID");
    const sequencesState = join(state, "sequences");
    mkdirSync(sequencesState, { recursive: true, mode: 0o700 });
    chownSync(sequencesState, runtimeUid, runtimeGid);
    const env = world.scenarioIsolation?.environment({
        COMPOSE_PROJECT_NAME: project,
        // The Compose client is in the BDD container, but bind mounts are
        // resolved by the host daemon.  The runner mounts /work-tmp at the
        // same host tmpDir, so this preserves the scenario-unique path on
        // both sides without exposing credentials.
        COMPOSE_STATE_DIR: hostState,
        COMPOSE_RUNTIME_UID: String(runtimeUid),
        COMPOSE_RUNTIME_GID: String(runtimeGid),
        MM_COMPOSE_IMAGE: process.env.SCRAMJET_MM_COMPOSE_IMAGE || process.env.MM_COMPOSE_IMAGE || `scramjetorg/multimanager:${multiManagerVersion}`,
        STH_COMPOSE_IMAGE: process.env.STH_COMPOSE_IMAGE || "scramjetorg/sth:dev"
    }) || process.env;
    if (activeCapture) activeCapture.images = { multimanager: envImage(env.MM_COMPOSE_IMAGE || ""), sth: envImage(env.STH_COMPOSE_IMAGE || "") };
    execFileSync("sh", [join(root, "bootstrap.sh"), state], { cwd: root, timeout: 5_000, stdio: "ignore" });
    const sthRegistrations = [
        { principal: "sth", role: "broker", peerId: "compose-sth.broker", routedDomains: [] },
        { principal: "sth", role: "guest", peerId: "compose-sth.guest", routedDomains: ["sth.compose-sth.scramjet.internal"] }
    ];
    const siRegistrations = [{ principal: "si", role: "broker", peerId: "compose-si.broker", routedDomains: [] }];
    const mmBrokerPeerId = configuredBrokerPeerId(mmConfig);
    const sthClaim = {
        realm: "compose-realm",
        space: "compose-space",
        hub: "compose-sth",
        federationHost: "sth.compose-sth.runner.broker.host",
        broker: "compose-sth.broker",
        guestRoute: "sth.compose-sth.scramjet.internal"
    };
    const registrationsPath = join(state, "sth-registrations.json");
    const siRegistrationsPath = join(state, "si-registrations.json");
    writeFileSync(registrationsPath, JSON.stringify(sthRegistrations));
    writeFileSync(siRegistrationsPath, JSON.stringify(siRegistrations));
    const sthClaimPath = join(state, "sth-claim.json");
    writeFileSync(sthClaimPath, JSON.stringify(sthClaim));
    const configuredMm = JSON.parse(mmConfig) as any;
    const childManagerConfig = getDefaultManagerConfig() as any;
    childManagerConfig.id = "compose-space";
    childManagerConfig.hubId = "compose-sth";
    childManagerConfig.s3 = {
        bucket: "/tmp/native-compose-manager-store",
        bucketLimit: 5 * 1024 * 1024 * 1024
    };
    childManagerConfig.verser2.localBroker = {
        peerId: "manager.compose-space.broker",
        routeDomain: "manager.compose-space.scramjet.internal"
    };
    childManagerConfig.verser2.localGuest = {
        peerId: "manager.compose-space.guest",
        routeDomain: "manager.compose-space.scramjet.internal"
    };
    configuredMm.manager = childManagerConfig;
    // MultiManager passes its top-level disk settings into managed Managers;
    // keep that inherited value identical to the shared child configuration.
    configuredMm.s3 = {
        endPoint: "",
        accessKey: "",
        secretKey: "",
        bucket: childManagerConfig.s3.bucket,
        port: 9000,
        useSSL: false,
        region: "",
        bucketLimit: childManagerConfig.s3.bucketLimit
    };
    configuredMm.csrEnrollment.policy.allowed = [...sthRegistrations, ...siRegistrations];
    writeFileSync(join(state, "mm.json"), JSON.stringify(configuredMm));
    const signingMm = JSON.parse(JSON.stringify(configuredMm));
    signingMm.verser2.csrEnrollment = {
        ...signingMm.csrEnrollment,
        issuer: {
            caFile: join(state, "ca.pem"),
            certFile: join(state, "ca.pem"),
            keyFile: join(state, "ca.key")
        },
        issuedStore: join(state, "issued-store")
    };
    const signingMmPath = join(state, "mm-sign.json");
    writeFileSync(signingMmPath, JSON.stringify(signingMm));
    try {
        run(["config"], env);
    } catch (error) {
        activeCapture && (activeCapture.exit = { status: "failure", error: bounded(error instanceof Error ? error.message : String(error)) });
        writeCapture();
        throw error;
    }
    if (process.env.SCRAMJET_NATIVE_COMPOSE_LIVE !== "1") {
        activeCapture && (activeCapture.exit = { status: "success", code: 0 });
        writeCapture();
        return { output: "compose config validated; live lane disabled", cleaned: true, cleanupDiagnostics: "live lane disabled", separateIdentities: true };
    }
    let output = "";
    let typedRpcOutput: { ready: boolean; value: string } | undefined;
    let managedManagerRuntime = false;
    let downError = "";
    let proofError: Error | undefined;
    const proofDeadline = Date.now() + proofBudgetMs;
    const workDeadline = proofDeadline - teardownBudgetMs;
    activeWorkDeadline = workDeadline;
    const remaining = () => {
        return clippedTimeout(operationTimeoutMs, workDeadline);
    };
    const teardownRemaining = () => Math.max(0, proofDeadline - Date.now());
    try {
        run(["up", "-d", "multimanager"], env, remaining());
        managedManagerRuntime = /multimanager/.test(run(["ps", "--format", "json"], env, remaining()));
        assert.equal(managedManagerRuntime, true, "Compose MultiManager runtime did not start");

        const sthBin = resolveBddBin("@scramjet/sth", "sth-csr-enrollment");
        const managerBin = resolveBddBin("@scramjet/manager", "manager-csr-enrollment");
        const sequenceBin = resolveBddBin("@scramjet/cli", "si");
        const caFingerprint = new X509Certificate(readFileSync(join(state, "ca.pem"))).fingerprint256;
        const sthRequest = join(state, "sth.csr.json");
        const siRequest = join(state, "si.csr.json");
        runOfflineCli(sthBin, ["v2", "generate", "--identity-dir", join(state, "sth-identity"), "--principal", "sth", "--registrations", registrationsPath, "--claim", sthClaimPath, "--output", sthRequest]);
        runOfflineCli(sequenceBin, ["identity", "enroll", "generate", "--identity-dir", join(state, "si-identity"), "--registrations", siRegistrationsPath, "--output", siRequest]);
        const sign = (request: string, expected: string, output: string) => {
            runOfflineCli(managerBin, ["v2", "sign", "--manager-config", signingMmPath, "--request", request, "--expected-registrations", expected, "--output", output]);
            const certificate = output.replace(/\.json$/, ".pem");
            writeFileSync(certificate, (JSON.parse(readFileSync(output, "utf8")) as { certificatePem: string }).certificatePem, { mode: 0o600 });
            return certificate;
        };
        const sthCertificate = sign(sthRequest, registrationsPath, join(state, "sth-issued.json"));
        const siCertificate = sign(siRequest, siRegistrationsPath, join(state, "si-issued.json"));
        runOfflineCli(sthBin, ["v2", "install", "--identity-dir", join(state, "sth-identity"), "--request", sthRequest, "--certificate", sthCertificate, "--ca-file", join(state, "ca.pem"), "--ca-fingerprint", caFingerprint]);
        runOfflineCli(sequenceBin, ["identity", "enroll", "install", "--identity-dir", join(state, "si-identity"), "--request", siRequest, "--certificate", siCertificate, "--ca-file", join(state, "ca.pem"), "--ca-fingerprint", caFingerprint]);
        // Export the trusted MM profile on the host, then import it in the
        // private STH container.  Only the semantic bundle crosses the
        // boundary; the caller and STH retain distinct mTLS identities.
        const bundleBin = resolveBddBin("@scramjet/multi-manager", "multi-manager");
        const hostMmConfig = JSON.parse(mmConfig) as { verser2: { host: { tls: { caFile: string; certFile: string; keyFile: string } } }; csrEnrollment: { issuedStore: string; policy: { allowed: unknown[] } }; manager?: unknown };
        hostMmConfig.manager = childManagerConfig;
        hostMmConfig.csrEnrollment.issuedStore = join(state, "issued-store");
        hostMmConfig.csrEnrollment.policy.allowed = [...sthRegistrations, ...siRegistrations];
        hostMmConfig.verser2.host.tls.caFile = join(state, "ca.pem");
        hostMmConfig.verser2.host.tls.certFile = join(state, "mm.pem");
        hostMmConfig.verser2.host.tls.keyFile = join(state, "mm.key");
        const hostMmConfigPath = join(state, "mm-host.json");
        writeFileSync(hostMmConfigPath, JSON.stringify(hostMmConfig));
        const exportBundle = (principal: "si" | "sth", brokerId: string, identityDir: string, credentialRoot = "/work-tmp/" + relative("/work-tmp", resolve(state, identityDir))) => {
            const text = execFileSync(process.execPath, [bundleBin, "native-bundle", "--config", hostMmConfigPath, "--profile-name", "native-compose", "--space", "compose-space", "--hub", "compose-sth", "--format", "json", "--broker-id", brokerId, "--principal", principal, "--client-cert-file", join(state, identityDir, "client.cert.pem"), "--client-key-file", join(state, identityDir, "client.key.pem")], { encoding: "utf8", timeout: remaining() });
            const value = JSON.parse(text) as { credentials?: { certFile?: string; keyFile?: string }; brokerId?: string };
            assert.equal(value.brokerId, brokerId);
            if (value.credentials) {
                assert.equal(resolve(value.credentials.certFile || ""), resolve(state, identityDir, "client.cert.pem"));
                assert.equal(resolve(value.credentials.keyFile || ""), resolve(state, identityDir, "client.key.pem"));
                value.credentials.certFile = join(credentialRoot, "client.cert.pem");
                value.credentials.keyFile = join(credentialRoot, "client.key.pem");
            }
            return value;
        };
        assert.equal(configuredBrokerPeerId(JSON.stringify(hostMmConfig)), mmBrokerPeerId, "bundle export must not mutate the running MM broker identity");
        const bundle = exportBundle("si", siRegistrations[0].peerId, "si-identity");
        const bundlePath = join(state, "si-bundle.json");
        writeFileSync(bundlePath, Buffer.from(JSON.stringify(bundle), "utf8").toString("base64url"));
        const sthBundle = exportBundle("sth", sthRegistrations[0].peerId, "sth-identity", "/run/scramjet/sth-identity");
        const sthIssued = JSON.parse(readFileSync(join(state, "sth-issued.json"), "utf8")) as { registrations: typeof sthRegistrations };
        assert.deepEqual(sthIssued.registrations, sthRegistrations);
        assert.deepEqual(JSON.parse(readFileSync(join(state, "si-issued.json"), "utf8")).registrations, siRegistrations);
        const sthConfigObject = JSON.parse(sthConfig) as Record<string, any>;
        // The trusted bundle supplies the upstream transport projection; do
        // not leave legacy endpoint, peer, or TLS values in the Compose file.
        delete sthConfigObject.verser2;
        sthConfigObject.manager = {
            connectionBundle: sthBundle,
            binding: {
                brokerId: sthIssued.registrations.find(registration => registration.role === "broker")!.peerId,
                guestPeerId: sthIssued.registrations.find(registration => registration.role === "guest")!.peerId,
                guestRouteDomain: sthIssued.registrations.find(registration => registration.role === "guest")!.routedDomains[0],
                federationHost: sthClaim.federationHost
            }
        };
        assert.equal(sthConfigObject.manager.binding.brokerId, sthClaim.broker);
        assert.equal(sthConfigObject.manager.binding.guestRouteDomain, sthClaim.guestRoute);
        writeFileSync(join(state, "sth.json"), JSON.stringify(sthConfigObject));
        assert.equal(configuredBrokerPeerId(readFileSync(join(state, "mm.json"), "utf8")), mmBrokerPeerId, "runtime MultiManager broker config must remain unchanged");
        run(["up", "-d", "sth"], env, remaining());
        mkdirSync(join(state, "native-compose-client-home"), { recursive: true, mode: 0o700 });

        const providerArchive = join(state, "provider.tar.gz");
        const callerArchive = join(state, "caller.tar.gz");
        const packageSource = (name: string) => {
            const source = join(state, `pack-${name}`);
            cpSync(join(root, name), source, { recursive: true });
            const packagePath = join(source, "package.json");
            const packageJson = JSON.parse(readFileSync(packagePath, "utf8")) as Record<string, unknown>;
            packageJson.engines = { node: "*" };
            writeFileSync(packagePath, JSON.stringify(packageJson));
            return source;
        };
        const pack = (source: string, archive: string) => {
            try {
                execFileSync(sequenceBin, ["sequence", "pack", source, "-o", archive], { cwd: root, timeout: remaining(), encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
            } catch (error) {
                const packError = error as Error & { stdout?: string | Buffer; stderr?: string | Buffer };
                throw new Error(`Failed to pack ${source}: ${error instanceof Error ? error.message : String(error)}\nstdout:\n${boundedCommandOutput(packError.stdout)}\nstderr:\n${boundedCommandOutput(packError.stderr)}`);
            }
        };
        pack(packageSource("provider"), providerArchive);
        pack(packageSource("caller"), callerArchive);
        execute("docker", nativeCliArgs(project, sequenceBin, ["config", "native", "import", "--bundle-file", "/work-tmp/" + relative("/work-tmp", bundlePath), "--profile", "native-compose", "--overwrite"], env, remaining(), false), { cwd: root, env, timeout: remaining() });
        waitForNativeHubHealth(project, sequenceBin, env);
        // The public SI ingress has no registration authority.  Exercise the
        // public v2 path with the SI identity and require a not-found response;
        // the successful registration is only the STH federation-host guest.
        let publicRegistrationError = "";
        try {
            runNativeCli(project, sequenceBin, ["api", "post", "/api/v2/_internal/sth/registration", "--json", JSON.stringify({ id: "compose-sth" }), "--no-confirm"], env, remaining());
        } catch (error) {
            publicRegistrationError = error instanceof Error ? error.message : String(error);
        }
        assert.match(publicRegistrationError, /API returned 404/, "public SI-facing registration path must not dispatch registration");
        runNativeCli(project, sequenceBin, ["config", "set", "log", "--format", "json"], env, remaining());
        const clientProfileDiagnostic = runNativeCli(project, sequenceBin, ["config", "effective"], env, remaining());
        const effectiveProfile = JSON.parse(clientProfileDiagnostic) as { configured?: { transportMode?: string; verser2?: { endpoint?: string; brokerId?: string; tls?: { certFile?: string } } } };
        assert.equal(effectiveProfile.configured?.transportMode, "native", "the SI client must not fall back to HTTP");
        assert.equal(effectiveProfile.configured?.verser2?.endpoint, "https://multimanager:2443", "native client sessions must use the sole client-facing port");
        assert.equal(effectiveProfile.configured?.verser2?.brokerId, siRegistrations[0].peerId);
        assert.equal(effectiveProfile.configured?.verser2?.tls?.certFile, "/work-tmp/" + relative("/work-tmp", resolve(state, "si-identity", "client.cert.pem")), "output and info sessions must reuse the issued SI identity");
        runNativeCli(project, sequenceBin, ["config", "set", "log", "--format", "pretty"], env, remaining());
        process.stderr.write(`[native-compose] client profile=native-compose\n${boundedCommandOutput(clientProfileDiagnostic)}\n`);
        const providerId = instanceId(runNativeCli(project, sequenceBin, ["sequence", "deploy", "/work-tmp/" + relative("/work-tmp", providerArchive)], env, remaining()));
        waitForInstance(project, sequenceBin, env, providerId);
        const callerId = instanceId(runNativeCli(project, sequenceBin, ["sequence", "deploy", "/work-tmp/" + relative("/work-tmp", callerArchive), "--config-string", JSON.stringify({ providerId })], env, remaining()));
        let outputOutcome: Awaited<ReturnType<typeof startNativeCli>> | { error: unknown };
        const typedResponsePattern = /\{\s*"ready"\s*:\s*true\s*,\s*"value"\s*:\s*"([^"]+)"\s*\}/;
        const outputPromise = startNativeCli(project, sequenceBin, ["api", "get", `/api/v2/instances/${encodeURIComponent(callerId)}/output`, "--stream", "--output", "raw", "--timeout", "5000"], env, remaining(), stdout => typedResponsePattern.test(stdout))
            .then(result => ({ ...result }), error => ({ error }));
        waitForInstance(project, sequenceBin, env, callerId);
        outputOutcome = await outputPromise;
        if ("error" in outputOutcome) throw outputOutcome.error;
        const stdout = outputOutcome.stdout;
        const match = stdout.match(typedResponsePattern);
        assert.ok(match, `Typed RPC response was not observed: ${stdout}`);
        typedRpcOutput = { ready: true, value: match[1] };
        output = `native-compose client profile=native-compose\n${boundedCommandOutput(clientProfileDiagnostic)}\n${run(["ps", "--format", "json"], env, remaining())}`;
    } catch (error) {
        const originalError = error instanceof Error ? error : new Error(String(error));
        let diagnostics = "Compose failure diagnostics unavailable";
        try {
            diagnostics = composeFailureDiagnostics(env, remaining);
        } catch (diagnosticError) {
            diagnostics += `: ${diagnosticError instanceof Error ? diagnosticError.message : String(diagnosticError)}`;
        }
        proofError = new Error(`${originalError.message}\nNative Compose failure diagnostics:\n${diagnostics}`);
    } finally {
        if (proofError) {
            for (const service of ["multimanager", "sth"]) {
                if (Date.now() >= workDeadline) break;
                try {
                    const logs = run(["logs", "--tail", "100", service], env, clippedTimeout(operationTimeoutMs, workDeadline));
                    captureLog(`compose.${service}`, logs);
                } catch (error) {
                    captureLog(`compose.${service}.error`, error instanceof Error ? error.message : String(error));
                }
            }
            if (Date.now() < workDeadline) try {
                captureLog("compose.ps.before-teardown", run(["ps", "--format", "json"], env, clippedTimeout(operationTimeoutMs, workDeadline)));
            } catch (error) { captureLog("compose.ps.before-teardown.error", error instanceof Error ? error.message : String(error)); }
        }
        try {
            const timeout = Math.min(5_000, teardownRemaining());
            if (timeout <= 0) throw new Error("Native Compose proof deadline elapsed; docker compose down skipped");
            activeWorkDeadline = undefined;
            run(["down", "--volumes", "--remove-orphans", "--timeout", "2"], env, timeout);
        } catch (error) {
            downError = error instanceof Error ? error.message : String(error);
        }
    }
    activeWorkDeadline = undefined;
    let clients: { cleaned: boolean; diagnostics: string };
    try {
        clients = Date.now() < proofDeadline
            ? cleanupNativeClients(Math.min(proofDeadline, Date.now() + 3_000))
            : { cleaned: false, diagnostics: "Native Compose proof deadline elapsed; client cleanup not performed" };
    } catch (error) {
        clients = { cleaned: false, diagnostics: `Native client cleanup stopped: ${error instanceof Error ? error.message : String(error)}` };
    }
    let cleanup: { cleaned: boolean; diagnostics: string };
    try {
        cleanup = Date.now() < proofDeadline
            ? waitForComposeCleanup(project, Math.min(proofDeadline, Date.now() + 3_000))
            : { cleaned: false, diagnostics: "Native Compose proof deadline elapsed; Compose resources unverified" };
    } catch (error) {
        cleanup = { cleaned: false, diagnostics: `Compose resources unverified: ${error instanceof Error ? error.message : String(error)}` };
    }
    activeCapture && (activeCapture.cleanup = { downError: downError ? bounded(downError) : undefined, clients: clients.diagnostics, compose: cleanup.diagnostics, cleaned: clients.cleaned && cleanup.cleaned });
    activeCapture && (activeCapture.exit = proofError ? { status: "failure", error: bounded(proofError.message) } : { status: "success", code: 0 });
    writeCapture();
    if (proofError) throw proofError;
    return {
        output,
        cleaned: clients.cleaned && cleanup.cleaned,
        cleanupDiagnostics: `${downError ? `docker compose down failed: ${downError}; ` : ""}${clients.diagnostics}; ${cleanup.diagnostics}`,
        separateIdentities: true,
        typedRpcOutput,
        managedManagerRuntime
    };
}

function configuredBrokerPeerId(config: string): string {
    return (JSON.parse(config) as { verser2: { localBroker: { peerId: string } } }).verser2.localBroker.peerId;
}

function envImage(value: string): string { return value.replace(/[^A-Za-z0-9._:@/-]/g, "[REDACTED]"); }
