import { STHConfiguration } from "@scramjet/api-types";
import { X509Certificate } from "crypto";

export type ManagerTrustBootstrapMaterial = {
    ca: string;
    fingerprint256: string;
    hostUrl?: string;
    routeDomains?: {
        guest?: string;
    };
};

export type ManagerTrustBootstrapOptions = {
    pinnedFingerprint256?: string;
};

function normalizeFingerprint(value: string | undefined): string | undefined {
    const normalized = value?.replace(/:/g, "").trim().toUpperCase();

    return normalized || undefined;
}

export function applyManagerTrustBootstrap(config: STHConfiguration, material: ManagerTrustBootstrapMaterial, options: ManagerTrustBootstrapOptions = {}): STHConfiguration {
    const pinned = normalizeFingerprint(options.pinnedFingerprint256);
    const computed = new X509Certificate(material.ca).fingerprint256;
    const received = normalizeFingerprint(computed);
    const reported = normalizeFingerprint(material.fingerprint256);

    if (reported && reported !== received) {
        throw new Error("Manager verser2 trust fingerprint metadata mismatch");
    }

    if (pinned && pinned !== received) {
        throw new Error("Manager verser2 trust fingerprint mismatch");
    }

    return {
        ...config,
        verser2: {
            ...config.verser2,
            ...(material.hostUrl ? { hostUrl: material.hostUrl } : {}),
            broker: {
                ...config.verser2.broker,
                ...(material.routeDomains?.guest ? { targetDomain: material.routeDomains.guest } : {})
            },
            tls: {
                ...config.verser2.tls,
                ca: material.ca
            }
        }
    };
}
