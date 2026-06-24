import { X509Certificate } from "crypto";
import { readFile } from "fs/promises";
import { ManagerConfiguration, ManagerVerser2Config } from "@scramjet/api-types";

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
