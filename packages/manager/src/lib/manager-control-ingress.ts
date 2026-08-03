import { createV2HttpDispatcher } from "@scramjet/api-server";
import { ManagerVerser2Config } from "@scramjet/api-types";
import { RouterDefinition } from "@scramjet/api-router";
import { createVerserHost, VerserHost, VerserHostOptions } from "@signicode/verser2-host";
import { mkdir, stat, writeFile } from "fs/promises";
import { join } from "path";
import { generate } from "selfsigned";

type ControlIngress = NonNullable<ManagerVerser2Config["controlIngress"]>;
type ControlHost = Pick<VerserHost, "start" | "attachLocalGuest"> & { stop?: () => Promise<void>; close?: () => Promise<void> };

async function resolveTls(ingress: ControlIngress) {
    const tls = ingress.host.tls;
    if ((tls.certFile && tls.keyFile) || tls.pfxFile) {
        for (const file of [tls.keyFile, tls.pfxFile].filter(Boolean) as string[]) {
            if (process.platform !== "win32" && ((await stat(file)).mode & 0o777) !== 0o600) throw new Error(`control ingress private credential file must use 0600 permissions: ${file}`);
        }
        return tls;
    }
    if (!ingress.host.identityDir) throw new Error("control ingress requires TLS identity files or host.identityDir");

    await mkdir(ingress.host.identityDir, { recursive: true, mode: 0o700 });
    const certFile = join(ingress.host.identityDir, "server-cert.pem");
    const keyFile = join(ingress.host.identityDir, "server-key.pem");
    const caFile = join(ingress.host.identityDir, "ca.pem");
    try {
        await stat(certFile);
        await stat(keyFile);
        await stat(caFile);
    } catch {
        const ca = await generate([{ name: "commonName", value: "Scramjet Manager control ingress CA" }], { keySize: 2048 });
        const server = await generate([{ name: "commonName", value: new URL(ingress.host.publicUrl).hostname }], {
            keySize: 2048,
            ca: { key: ca.private, cert: ca.cert }
        });
        await Promise.all([
            writeFile(caFile, ca.cert, { mode: 0o644 }), writeFile(certFile, server.cert, { mode: 0o644 }), writeFile(keyFile, server.private, { mode: 0o600 })
        ]);
    }
    return { ...tls, certFile, keyFile, caFile };
}

export async function createManagerControlIngressOptions(ingress: ControlIngress, allowedClientFingerprints: string[] = []): Promise<VerserHostOptions> {
    if (!ingress.host.tls.mtlsRequired) throw new Error("control ingress must require mTLS");
    const tls = await resolveTls(ingress);
    const clientAuthCaFile = tls.clientAuthCaFile || tls.caFile;
    if (!clientAuthCaFile) throw new Error("control ingress mTLS requires a client authentication CA");
    return {
        hostId: `${ingress.guest.peerId}.host`, host: ingress.host.bindHost, port: ingress.host.bindPort,
        tls: {
            certFile: tls.certFile, keyFile: tls.keyFile, pfxFile: tls.pfxFile, passphrase: tls.passphrase,
            clientAuth: {
                caFile: clientAuthCaFile,
                authorizeRegistration: (context: any) => context.metadata?.local === true
                    ? { action: "allow" }
                    : !context.certificate
                    ? { action: "close", reason: "client certificate required" }
                    : allowedClientFingerprints.length && !allowedClientFingerprints.some(fingerprint => fingerprint.replace(/^sha256:/i, "").replace(/:/g, "").toLowerCase() === String(context.certificate.fingerprint256 || "").replace(/^sha256:/i, "").replace(/:/g, "").toLowerCase())
                      ? { action: "close", reason: "client fingerprint not allowed" }
                      : { action: "allow" }
            }
        } as any
    };
}

export async function startManagerControlIngress(
    ingress: ControlIngress | undefined,
    router: RouterDefinition,
    factory: (options: VerserHostOptions) => ControlHost = createVerserHost,
    allowedClientFingerprints: string[] = []
): Promise<ControlHost | undefined> {
    if (!ingress?.enabled) return undefined;
    const host = factory(await createManagerControlIngressOptions(ingress, allowedClientFingerprints));
    try {
        await host.start();
        const dispatcher = createV2HttpDispatcher(router);
        await host.attachLocalGuest({ guestId: ingress.guest.peerId, routedDomains: [ingress.guest.routeDomain], listener: (req, res) => dispatcher.listener(req as any, res as any) });
        return host;
    } catch (error) {
        await stopManagerControlIngress(host);
        throw error;
    }
}

export async function stopManagerControlIngress(host: ControlHost | undefined): Promise<void> {
    await (host?.stop?.() || host?.close?.());
}
