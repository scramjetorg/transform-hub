import { execFileSync } from "child_process";
import { randomBytes } from "crypto";
import { strict as assert } from "assert";
import { mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from "fs";
import { join, relative } from "path";
import Dockerode from "dockerode";

const { getOwnership, ensureOwnershipPaths, ownershipEnv, allocateOwnedPort } = require("./ownership.js") as {
    getOwnership: (environment: NodeJS.ProcessEnv) => any;
    ensureOwnershipPaths: (ownership: any) => void;
    ownershipEnv: (ownership: any, environment: NodeJS.ProcessEnv) => NodeJS.ProcessEnv;
    allocateOwnedPort: (ownership: any) => Promise<{ port: number; release: () => Promise<void> }>;
};

type ScenarioLifecycle = {
    ownChild: (child: any, label: string, options?: { group?: boolean; onStop?: () => void }) => any;
    ownContainer: (containerId: string, label: string, stop: () => Promise<void>) => string;
    cleanup: () => Promise<void>;
};

type PortReservation = { port: number; release: () => Promise<void> };

export type MtlsClientCredentials = {
    caFile: string;
    certFile: string;
    keyFile: string;
};

export type Verser2TlsCredentials = {
    caFile: string;
    certFile: string;
    keyFile: string;
};

export type MtlsControlIngress = {
    identityDir: string;
    port: number;
    publicUrl: string;
    allowedFingerprint: string;
    server: {
        bindHost: string;
        bindPort: number;
        publicUrl: string;
        tls: { certFile: string; keyFile: string; clientAuthCaFile: string; mtlsRequired: true };
    };
    allowedClient: MtlsClientCredentials;
    rejectedClient: MtlsClientCredentials;
    hostConfig: (guestPeerId: string, routeDomain: string) => Record<string, unknown>;
    managerConfig: (guestPeerId: string, routeDomain: string) => Record<string, unknown>;
};

export type ScenarioIsolation = {
    root: string;
    home: string;
    profilesDir: string;
    configPath: string;
    artifactsDir: string;
    certificatesDir: string;
    environment: (overrides?: NodeJS.ProcessEnv) => NodeJS.ProcessEnv;
    writeProfile: (name: string, value: unknown, activeProfile?: string) => string;
    writeConfig: (value: unknown) => string;
    createArtifactDirectory: (name?: string) => string;
    reservePort: () => Promise<number>;
    ownChild: (child: any, label: string, options?: { group?: boolean; onStop?: () => void }) => any;
    ownContainer: (containerId: string, label: string, stop: () => Promise<void>) => string;
    createMtlsControlIngress: (options?: { bindHost?: string }) => Promise<MtlsControlIngress>;
    createVerser2TlsCredentials: () => Verser2TlsCredentials;
    requireDockerDiagnostics: () => void;
    requireMinioDiagnostics: () => void;
    cleanup: () => Promise<void>;
};

function safeName(value: string, kind: string): string {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,63}$/.test(value)) {
        throw new Error(`${kind} must contain only [a-zA-Z0-9_.-] and be at most 64 characters.`);
    }
    return value;
}

function assertOwnedPath(root: string, target: string): void {
    const pathFromRoot = relative(root, target);
    if (pathFromRoot.startsWith("..") || pathFromRoot === "") {
        throw new Error("Refusing to clean a path outside the scenario isolation directory.");
    }
}

function runOpenSsl(args: string[]): void {
    try {
        execFileSync("openssl", args, { stdio: "ignore" });
    } catch {
        throw new Error("mTLS setup requires the openssl executable, but it could not create the scenario-local test PKI.");
    }
}

function fingerprint(certFile: string): string {
    const output = execFileSync("openssl", ["x509", "-in", certFile, "-noout", "-fingerprint", "-sha256"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"]
    });
    const value = output.split("=")[1]?.trim();
    if (!value) throw new Error("Could not derive the allowed mTLS client certificate fingerprint.");
    return value;
}

function dockerResult(args: string[]): string | undefined {
    try {
        return execFileSync("docker", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 5000 });
    } catch {
        return undefined;
    }
}

async function assertDockerAvailable(): Promise<void> {
    try {
        await new Dockerode().info();
    } catch (error) {
        const detail = error instanceof Error ? ` (${error.message})` : "";
        throw new Error(
            "Docker daemon prerequisite unavailable: run the supported Docker BDD runner with /var/run/docker.sock mounted and a user permitted to access it." + detail
        );
    }
}

export async function assertMtlsAccepted<T>(requestFn: () => Promise<T>): Promise<T> {
    try {
        return await requestFn();
    } catch {
        throw new Error("Expected mTLS client admission, but the control ingress rejected the request.");
    }
}

export async function assertMtlsRejected(requestFn: () => Promise<unknown>): Promise<void> {
    try {
        await requestFn();
    } catch {
        return;
    }
    assert.fail("Expected mTLS client rejection, but the control ingress accepted the request.");
}

export function createScenarioIsolation(lifecycle: ScenarioLifecycle, environment: NodeJS.ProcessEnv = process.env): ScenarioIsolation {
    const ownership = getOwnership(environment);
    ensureOwnershipPaths(ownership);
    const root = mkdtempSync(join(ownership.tempPath, "scenario-"));
    const home = join(root, "home");
    const profilesDir = join(home, ".si", "profiles");
    const configPath = join(root, "config", "config.json");
    const artifactsDir = join(root, "artifacts");
    const certificatesDir = join(root, "certificates");
    const reservations: PortReservation[] = [];
    let requireDocker = false;
    let cleaned = false;

    for (const directory of [home, profilesDir, join(root, "config"), artifactsDir, certificatesDir]) {
        mkdirSync(directory, { recursive: true, mode: 0o700 });
    }

    const createMtlsControlIngress = async (options: { bindHost?: string } = {}): Promise<MtlsControlIngress> => {
        const bindHost = options.bindHost || "127.0.0.1";
        const pkiDir = mkdtempSync(join(certificatesDir, "control-ingress-"));
        const caFile = join(pkiDir, "ca.pem");
        const caKeyFile = join(pkiDir, "ca-key.pem");
        const serverCertFile = join(pkiDir, "server-cert.pem");
        const serverKeyFile = join(pkiDir, "server-key.pem");
        const serverCsrFile = join(pkiDir, "server.csr");
        const serverExtFile = join(pkiDir, "server.ext");
        const createClient = (name: string): MtlsClientCredentials => {
            const keyFile = join(pkiDir, `${name}-key.pem`);
            const csrFile = join(pkiDir, `${name}.csr`);
            const certFile = join(pkiDir, `${name}-cert.pem`);
            const extFile = join(pkiDir, `${name}.ext`);
            runOpenSsl(["genrsa", "-out", keyFile, "2048"]);
            runOpenSsl(["req", "-new", "-key", keyFile, "-out", csrFile, "-subj", `/CN=${name}`]);
            writeFileSync(extFile, "basicConstraints=CA:FALSE\nextendedKeyUsage=clientAuth\nkeyUsage=digitalSignature,keyEncipherment\n", { mode: 0o600 });
            runOpenSsl(["x509", "-req", "-in", csrFile, "-CA", caFile, "-CAkey", caKeyFile, "-CAcreateserial", "-out", certFile, "-days", "1", "-sha256", "-extfile", extFile]);
            return { caFile, certFile, keyFile };
        };

        runOpenSsl(["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", caKeyFile, "-out", caFile, "-days", "1", "-subj", "/CN=bdd-control-ingress-ca"]);
        runOpenSsl(["genrsa", "-out", serverKeyFile, "2048"]);
        runOpenSsl(["req", "-new", "-key", serverKeyFile, "-out", serverCsrFile, "-subj", "/CN=localhost"]);
        writeFileSync(serverExtFile, "subjectAltName=DNS:localhost\n", { mode: 0o600 });
        runOpenSsl(["x509", "-req", "-in", serverCsrFile, "-CA", caFile, "-CAkey", caKeyFile, "-CAcreateserial", "-out", serverCertFile, "-days", "1", "-sha256", "-extfile", serverExtFile]);

        const allowedClient = createClient("allowed-client");
        const rejectedClient = createClient("rejected-client");
        for (const privateFile of [caKeyFile, serverKeyFile, allowedClient.keyFile, rejectedClient.keyFile]) {
            try { require("fs").chmodSync(privateFile, 0o600); } catch { /* mode checks are platform-specific */ }
        }
        const port = await isolation.reservePort();
        const publicUrl = `https://localhost:${port}`;
        const server = {
            bindHost,
            bindPort: port,
            publicUrl,
            tls: { certFile: serverCertFile, keyFile: serverKeyFile, clientAuthCaFile: caFile, mtlsRequired: true as const }
        };
        const allowedFingerprint = fingerprint(allowedClient.certFile);
        return {
            identityDir: pkiDir,
            port,
            publicUrl,
            allowedFingerprint,
            server,
            allowedClient,
            rejectedClient,
            hostConfig: (guestPeerId, routeDomain) => ({
                enabled: true,
                identityDir: pkiDir,
                caFile,
                host: server,
                registration: { allowedClientFingerprints: [allowedFingerprint] },
                localBroker: { peerId: `${guestPeerId}.broker` },
                guest: { peerId: guestPeerId, routeDomain }
            }),
            managerConfig: (guestPeerId, routeDomain) => ({
                enabled: true,
                host: { identityDir: pkiDir, ...server },
                guest: { peerId: guestPeerId, routeDomain }
            })
        };
    };

    const createVerser2TlsCredentials = (): Verser2TlsCredentials => {
        const pkiDir = mkdtempSync(join(certificatesDir, "verser2-"));
        const caFile = join(pkiDir, "ca.pem");
        const caKeyFile = join(pkiDir, "ca-key.pem");
        const certFile = join(pkiDir, "server-cert.pem");
        const keyFile = join(pkiDir, "server-key.pem");
        const csrFile = join(pkiDir, "server.csr");
        const extFile = join(pkiDir, "server.ext");

        runOpenSsl(["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", caKeyFile, "-out", caFile, "-days", "1", "-subj", "/CN=bdd-verser2-ca"]);
        runOpenSsl(["genrsa", "-out", keyFile, "2048"]);
        runOpenSsl(["req", "-new", "-key", keyFile, "-out", csrFile, "-subj", "/CN=localhost"]);
        writeFileSync(extFile, "subjectAltName=DNS:localhost,IP:127.0.0.1\n", { mode: 0o600 });
        runOpenSsl(["x509", "-req", "-in", csrFile, "-CA", caFile, "-CAkey", caKeyFile, "-CAcreateserial", "-out", certFile, "-days", "1", "-sha256", "-extfile", extFile]);
        for (const privateFile of [caKeyFile, keyFile]) {
            try { require("fs").chmodSync(privateFile, 0o600); } catch { /* mode checks are platform-specific */ }
        }

        return { caFile, certFile, keyFile };
    };

    const isolation: ScenarioIsolation = {
        root,
        home,
        profilesDir,
        configPath,
        artifactsDir,
        certificatesDir,
        environment: (overrides = {}) => ({
            ...ownershipEnv(ownership, environment),
            ...overrides,
            HOME: home,
            SCRAMJET_BDD_CONFIG_PATH: configPath,
        }),
        writeProfile: (name, value, activeProfile = name) => {
            const profileName = safeName(name, "Profile name");
            const activeName = safeName(activeProfile, "Active profile name");
            const profilePath = join(profilesDir, `${profileName}.json`);
            writeFileSync(profilePath, JSON.stringify(value, null, 2), { mode: 0o600 });
            writeFileSync(join(home, ".si", "si-config.json"), JSON.stringify({ profile: activeName }), { mode: 0o600 });
            return profilePath;
        },
        writeConfig: (value) => {
            writeFileSync(configPath, JSON.stringify(value, null, 2), { mode: 0o600 });
            return configPath;
        },
        createArtifactDirectory: (name = "artifact") => {
            const directory = join(artifactsDir, `${safeName(name, "Artifact name")}-${randomBytes(4).toString("hex")}`);
            assertOwnedPath(root, directory);
            mkdirSync(directory, { recursive: true, mode: 0o700 });
            return directory;
        },
        reservePort: async () => {
            const reservation = await allocateOwnedPort(ownership);
            reservations.push(reservation);
            return reservation.port;
        },
        ownChild: (child, label, options = {}) => lifecycle.ownChild(child, label, { group: options.group ?? true, onStop: options.onStop }),
        ownContainer: (containerId, label, stop) => lifecycle.ownContainer(containerId, label, stop),
        createMtlsControlIngress,
        createVerser2TlsCredentials,
        requireDockerDiagnostics: () => { requireDocker = true; },
        requireMinioDiagnostics: () => { requireDocker = true; },
        cleanup: async () => {
            if (cleaned) return;
            cleaned = true;
            const errors: Error[] = [];
            const containerArgs = ["ps", "-a", "--filter", `label=scramjet.bdd.owner=${ownership.owner}`, "--format", "{{.ID}}"];
            const beforeContainers = requireDocker ? dockerResult(containerArgs)?.split(/\r?\n/).filter(Boolean) : [];
            try {
                await lifecycle.cleanup();
            } catch (error) {
                errors.push(error instanceof Error ? error : new Error(String(error)));
            }
            for (const reservation of reservations.reverse()) {
                await reservation.release().catch(error => errors.push(error instanceof Error ? error : new Error(String(error))));
            }
            if (requireDocker) {
                const remaining = dockerResult(containerArgs)?.split(/\r?\n/).filter(Boolean) || [];
                if (remaining.length > 0) {
                    errors.push(new Error(`Docker cleanup diagnostics: ${remaining.length} owner-labeled container(s) remain after scenario cleanup.`));
                } else if (beforeContainers && beforeContainers.length > 0 && process.env.SCRAMJET_TEST_LOG) {
                    process.stderr.write(`[bdd-isolation] cleaned ${beforeContainers.length} owner-labeled Docker container(s).\n`);
                }
            }
            try {
                assertOwnedPath(ownership.tempPath, root);
                rmSync(root, { recursive: true, force: true });
            } catch (error) {
                errors.push(error instanceof Error ? error : new Error(String(error)));
            }
            if (errors.length > 0) throw new Error(`Scenario isolation cleanup failed: ${errors.map(error => error.message).join("; ")}`);
        }
    };
    return isolation;
}

export async function assertMinioPrerequisite(assertDocker: () => void | Promise<void> = assertDockerAvailable): Promise<void> {
    // @minio-s3 scenarios create, wait for, and remove their own MinIO
    // container. Requiring an externally provisioned BDD_MINIO_ENDPOINT made
    // these scenarios impossible to run in the supported Docker BDD runner.
    await assertDocker();
}

export async function assertDockerPrerequisite(): Promise<void> {
    await assertDockerAvailable();
}

export function privateCredentialMode(path: string): number {
    return statSync(path).mode & 0o777;
}
