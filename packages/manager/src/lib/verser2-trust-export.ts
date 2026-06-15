import { X509Certificate } from "crypto";
import { readFile } from "fs/promises";
import { ManagerConfiguration } from "@scramjet/types";

export type ManagerVerser2TrustExport = {
    ca: string;
    fingerprint256: string;
    expiresAt: string;
    hostUrl: string;
    routeDomains: {
        broker: string;
        guest: string;
    };
};

export async function getManagerVerser2TrustExport(config: ManagerConfiguration): Promise<ManagerVerser2TrustExport> {
    const trustFile = config.verser2.host.tls.caFile;

    if (!trustFile) {
        throw new Error("Manager verser2 trust export requires host.tls.caFile");
    }

    const ca = extractCertificatePemBundle(await readFile(trustFile, "utf8"));
    const certificate = new X509Certificate(ca);

    return {
        ca,
        fingerprint256: certificate.fingerprint256,
        expiresAt: new Date(certificate.validTo).toISOString(),
        hostUrl: config.verser2.host.publicUrl,
        routeDomains: {
            broker: config.verser2.localBroker.routeDomain,
            guest: config.verser2.localGuest.routeDomain
        }
    };
}

function extractCertificatePemBundle(contents: string): string {
    const blocks = contents.match(/-----BEGIN [^-]+-----[\s\S]*?-----END [^-]+-----/g) || [];

    if (!blocks.length) {
        throw new Error("Manager verser2 trust export requires certificate PEM material");
    }

    if (blocks.some(block => !block.startsWith("-----BEGIN CERTIFICATE-----"))) {
        throw new Error("Manager verser2 trust export refuses non-certificate PEM material");
    }

    return blocks.join("\n");
}
