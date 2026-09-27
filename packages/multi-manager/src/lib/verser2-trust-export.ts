import { X509Certificate } from "crypto";
import { readFile } from "fs/promises";
import { ManagerConfiguration, ManagerVerser2Config } from "@scramjet/api-types";
import { encodeVerser2ConnectionBundle, Verser2ConnectionBundle } from "@scramjet/config";
import { isAbsolute } from "path";
import { resolveManagerVerser2HostConfig } from "./verser2-host-identity";

export type MultiManagerVerser2TrustExport = {
    ca: string;
    fingerprint256: string;
    expiresAt: string;
    hostUrl: string;
    routeDomains: {
        broker: string;
        guest: string;
    };
};

function extractCertificatePemBundle(contents: string): string {
    const blocks = contents.match(/-----BEGIN [^-]+-----[\s\S]*?-----END [^-]+-----/g) || [];

    if (!blocks.length) {
        throw new Error("MultiManager verser2 trust export requires certificate PEM material");
    }

    if (blocks.some(block => !block.startsWith("-----BEGIN CERTIFICATE-----"))) {
        throw new Error("MultiManager verser2 trust export refuses non-certificate PEM material");
    }

    return blocks.join("\n");
}

export async function getMultiManagerVerser2TrustExport(
    verser2: ManagerVerser2Config,
    manager?: Pick<ManagerConfiguration, "verser2">
): Promise<MultiManagerVerser2TrustExport> {
    const trustFile = verser2.host.tls.caFile;

    if (!trustFile) {
        throw new Error("MultiManager verser2 trust export requires host.tls.caFile");
    }

    const ca = extractCertificatePemBundle(await readFile(trustFile, "utf8"));
    const certificate = new X509Certificate(ca);

    return {
        ca,
        fingerprint256: certificate.fingerprint256,
        expiresAt: new Date(certificate.validTo).toISOString(),
        hostUrl: verser2.host.publicUrl,
        routeDomains: {
            broker: verser2.localBroker.routeDomain,
            guest: manager?.verser2.localGuest.routeDomain || verser2.localGuest.routeDomain
        }
    };
}

export type NativeBundleOptions = {
    profileName: string;
    space?: string;
    hub?: string;
    clientCertFile?: string;
    clientKeyFile?: string;
    clientPfxFile?: string;
    passphraseReference?: string;
};

function validId(value: string): boolean {
    return /^[A-Za-z0-9._-]+$/.test(value);
}

function validReference(value: string): boolean {
    return (isAbsolute(value) && !value.includes("://")) || /^env:\/\/[A-Za-z_][A-Za-z0-9_]*$/.test(value);
}

function selectedManager(config: MultiManagerConfigLike, options: NativeBundleOptions): ManagerConfiguration | undefined {
    const managers = config.manager === undefined ? [] : Array.isArray(config.manager) ? config.manager : [config.manager];
    const selected = managers.filter((manager): manager is ManagerConfiguration => typeof manager === "object" && manager !== null);
    if (!options.space && !options.hub) return undefined;
    // A Manager is identified by its space. The hub is a route target within
    // that Manager and must not be used to select the Manager identity.
    const id = options.space;
    const manager = selected.find(candidate => candidate.id === id || candidate.spaceId === options.space && candidate.hubId === options.hub || candidate.hubId === options.hub);
    if (!manager) throw new Error(`No configured Manager matches ${options.hub ? `hub ${options.hub}` : `space ${options.space}`}`);
    return manager;
}

type MultiManagerConfigLike = { id?: string; manager?: string | ManagerConfiguration | ManagerConfiguration[]; verser2: ManagerVerser2Config };

/** Create the public, importable native connection artifact without reading identity private material. */
export async function createMultiManagerNativeBundle(config: MultiManagerConfigLike, options: NativeBundleOptions): Promise<Verser2ConnectionBundle> {
    if (!validId(options.profileName)) throw new Error("Invalid profile name");
    if (options.space && !validId(options.space) || options.hub && !validId(options.hub)) throw new Error("Invalid target id");
    if (options.hub && !options.space) throw new Error("--hub requires --space");
    if (options.clientPfxFile && (options.clientCertFile || options.clientKeyFile)) throw new Error("PFX credentials cannot be combined with client certificate/key credentials");
    if ((options.clientCertFile && !options.clientKeyFile) || (!options.clientCertFile && options.clientKeyFile)) throw new Error("Client certificate and key must be provided together");
    if (options.passphraseReference && !validReference(options.passphraseReference)) throw new Error("Invalid passphrase reference");
    if (options.passphraseReference && !options.clientPfxFile && !options.clientCertFile) throw new Error("Passphrase reference requires client credentials");
    for (const [label, value] of [["client certificate", options.clientCertFile], ["client key", options.clientKeyFile], ["client PFX", options.clientPfxFile]] as const) {
        if (value && !validReference(value)) throw new Error(`Invalid ${label} reference`);
    }

    const level = options.hub ? "space" : "platform";
    if (level === "platform" && (!config.id || !config.id.trim())) {
        throw new Error("Cannot create platform bundle without a configured MultiManager service ID");
    }
    const manager = selectedManager(config, options);
    const resolvedVerser2 = await resolveManagerVerser2HostConfig(config.verser2, "MultiManager");
    const trust = await getMultiManagerVerser2TrustExport(resolvedVerser2, manager);
    const endpoint = new URL(trust.hostUrl);
    const target = options.space && !options.hub ? { spaceId: options.space } : options.space && options.hub ? { hubId: options.hub } : undefined;
    const expectedId = options.hub ? options.space! : config.id!;
    const bundle: Verser2ConnectionBundle = {
        kind: "scramjet.connection-bundle",
        version: 1,
        profileName: options.profileName,
        transport: "verser2",
        publicEndpoint: { url: trust.hostUrl, port: Number(endpoint.port || 443), role: "control" },
        brokerId: resolvedVerser2.localBroker.peerId,
        ingress: { level, expectedId, routeDomain: trust.routeDomains.guest },
        ...(target ? { target } : {}),
        trust: { caPem: trust.ca, sha256Fingerprint: trust.fingerprint256.replace(/:/g, ""), expiresAt: trust.expiresAt },
        ...(options.clientPfxFile ? { credentials: { pfxFile: options.clientPfxFile, ...(options.passphraseReference ? { passphraseReference: options.passphraseReference } : {}) } } : options.clientCertFile ? { credentials: { certFile: options.clientCertFile, keyFile: options.clientKeyFile!, ...(options.passphraseReference ? { passphraseReference: options.passphraseReference } : {}) } } : {})
    };
    encodeVerser2ConnectionBundle(bundle);
    return bundle;
}
