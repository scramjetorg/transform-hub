import type { STHConfiguration } from "@scramjet/api-types";
import { decodeVerser2ConnectionBundle } from "../verser2-connection-bundle";

export interface ManagerBinding {
    brokerId: string;
    guestPeerId: string;
    guestRouteDomain: string;
    federationHost: string;
}

const nonEmpty = (value: unknown) => typeof value === "string" && value.trim().length > 0;
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Apply the trusted semantic upstream projection to the already merged STH configuration. */
export function applyManagerConnectionBundle(config: STHConfiguration, verser2Defaults: unknown, federationHost: string): STHConfiguration {
    const manager = config.manager;
    const rawBundle = manager?.connectionBundle;
    const binding = manager?.binding as ManagerBinding | undefined;
    if (!rawBundle) {
        if (binding) throw new Error("manager.binding requires manager.connectionBundle");
        return config;
    }
    if (!binding || ![binding.brokerId, binding.guestPeerId, binding.guestRouteDomain, binding.federationHost].every(nonEmpty)) {
        throw new Error("manager.connectionBundle requires complete manager.binding");
    }

    const bundle = decodeVerser2ConnectionBundle(rawBundle);
    if (binding.brokerId !== bundle.brokerId) throw new Error("manager.binding.brokerId must match manager.connectionBundle.brokerId");
    if (binding.federationHost !== federationHost) throw new Error("manager.binding.federationHost does not match resolved runner Host identity");
    if ([config.cpmUrl, config.cpmId, config.platform?.api, config.platform?.apiKey, config.platform?.space].some(nonEmpty)) {
        throw new Error("manager.connectionBundle cannot be combined with CPM/platform legacy configuration");
    }

    const defaults = verser2Defaults as Record<string, any>;
    const current = config.verser2 as Record<string, any>;
    const projection: Record<string, any> = {
        enabled: true,
        hostUrl: bundle.publicEndpoint.url,
        broker: { peerId: binding.brokerId, targetDomain: bundle.ingress.routeDomain },
        guest: { peerId: binding.guestPeerId, routeDomain: binding.guestRouteDomain },
        tls: { ...(current.tls || {}) },
        enrollment: defaults.enrollment
    };
    for (const key of ["ca", "caFile", "certFile", "keyFile", "pfxFile", "passphrase"]) delete projection.tls[key];
    const allowed = new Set(["enabled", "hostUrl", "broker", "guest", "tls", "enrollment", "runnerHost"]);
    for (const key of Object.keys(current)) {
        if (!allowed.has(key) && !equal(current[key], defaults[key])) throw new Error(`manager.connectionBundle cannot be combined with upstream verser2 setting: ${key}`);
    }
    const defaultsTls = defaults.tls || {};
    const expectedCredentials: Record<string, unknown> = bundle.credentials && "certFile" in bundle.credentials
        ? { certFile: bundle.credentials.certFile, keyFile: bundle.credentials.keyFile }
        : bundle.credentials && "pfxFile" in bundle.credentials ? { pfxFile: bundle.credentials.pfxFile } : {};
    for (const key of new Set([...Object.keys(current.tls || {}), ...Object.keys(defaultsTls), ...Object.keys(expectedCredentials)])) {
        if (!equal(current.tls?.[key], defaultsTls[key]) && !equal(current.tls?.[key], expectedCredentials[key])) {
            throw new Error(`manager.connectionBundle cannot be combined with upstream verser2 TLS setting: ${key}`);
        }
    }
    for (const [key, expected] of [["enabled", true], ["hostUrl", bundle.publicEndpoint.url]] as const) {
        if (!equal(current[key], defaults[key]) && !equal(current[key], expected)) throw new Error(`Conflicting upstream verser2 ${key}`);
    }
    for (const group of ["broker", "guest"] as const) {
        const fields = group === "broker" ? { peerId: binding.brokerId, targetDomain: bundle.ingress.routeDomain } : { peerId: binding.guestPeerId, routeDomain: binding.guestRouteDomain };
        for (const [field, expected] of Object.entries(fields)) {
            if (!equal(current[group]?.[field], defaults[group]?.[field]) && !equal(current[group]?.[field], expected)) throw new Error(`Conflicting upstream verser2 ${group}.${field}`);
        }
    }
    if (!equal(current.enrollment, defaults.enrollment)) throw new Error("manager.connectionBundle cannot be combined with upstream verser2 enrollment settings");

    return { ...config, verser2: { ...current, ...projection, broker: projection.broker, guest: projection.guest, tls: { ...current.tls, caFile: undefined, ...expectedCredentials } } };
}
