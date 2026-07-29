import { createV2HttpDispatcher } from "@scramjet/api-server";
import { STHRunnerVerser2HostConfig } from "@scramjet/api-types";
import { RouterDefinition } from "@scramjet/api-router";
import { createVerserHost, VerserHost, VerserHostOptions } from "@signicode/verser2-host";
import { deriveSthRunnerVerser2HostIdentity, resolveSthRunnerVerser2HostConfig } from "./runner-verser2-host-config";

export type HostControlIngressConfig = STHRunnerVerser2HostConfig & { guest: { peerId: string; routeDomain: string } };
type ControlHost = Pick<VerserHost, "start" | "attachLocalGuest"> & { stop?: () => Promise<void>; close?: () => Promise<void> };

const DEFAULT_CONTROL_INGRESS_PORT = 2444;
const LEGACY_RUNNER_CONTROL_INGRESS_PORT = 2446;

/**
 * Keeps the documented default topology conflict-free for existing Hub
 * configurations that explicitly retain the former runner Host port (2444).
 *
 * Only the default control-ingress endpoint is moved; custom ingress endpoints
 * are left unchanged.
 */
export function resolveLegacyRunnerControlIngressConflict(
    runnerHost: STHRunnerVerser2HostConfig | undefined,
    controlIngress: HostControlIngressConfig | undefined
): HostControlIngressConfig | undefined {
    if (
        !runnerHost?.enabled ||
        !controlIngress?.enabled ||
        runnerHost.host.bindPort !== DEFAULT_CONTROL_INGRESS_PORT ||
        controlIngress.host.bindPort !== DEFAULT_CONTROL_INGRESS_PORT ||
        controlIngress.host.bindHost !== "127.0.0.1" ||
        controlIngress.host.publicUrl !== "https://127.0.0.1:2444"
    ) {
        return controlIngress;
    }

    return {
        ...controlIngress,
        host: {
            ...controlIngress.host,
            bindPort: LEGACY_RUNNER_CONTROL_INGRESS_PORT,
            publicUrl: "https://127.0.0.1:2446"
        }
    };
}

export async function createHostControlIngressOptions(config: HostControlIngressConfig, hostId?: string): Promise<VerserHostOptions> {
    if (!config.host.tls.mtlsRequired) throw new Error("Host control ingress must require mTLS");
    const resolved = await resolveSthRunnerVerser2HostConfig(deriveSthRunnerVerser2HostIdentity(config, hostId));
    const tls = resolved.host.tls;
    const clientAuthCaFile = tls.clientAuthCaFile || resolved.caFile;
    if (!clientAuthCaFile) throw new Error("Host control ingress mTLS requires a client authentication CA");
    return {
        hostId: `${config.guest.peerId}.host`, host: resolved.host.bindHost, port: resolved.host.bindPort,
        tls: {
            certFile: tls.certFile, keyFile: tls.keyFile, pfxFile: tls.pfxFile, passphrase: tls.passphrase,
            clientAuth: {
                caFile: clientAuthCaFile,
                authorizeRegistration: (context: any) => context.metadata?.local === true
                    ? { action: "allow" }
                    : !context.certificate
                    ? { action: "close", reason: "client certificate required" }
                    : config.registration.allowedClientFingerprints.length && !config.registration.allowedClientFingerprints.some(fingerprint => fingerprint.replace(/^sha256:/i, "").replace(/:/g, "").toLowerCase() === String(context.certificate.fingerprint256 || "").replace(/^sha256:/i, "").replace(/:/g, "").toLowerCase())
                      ? { action: "close", reason: "client fingerprint not allowed" }
                      : { action: "allow" }
            }
        } as any
    };
}

export async function startHostControlIngress(config: HostControlIngressConfig | undefined, router: RouterDefinition, hostId?: string, factory: (options: VerserHostOptions) => ControlHost = createVerserHost): Promise<ControlHost | undefined> {
    if (!config?.enabled) return undefined;
    const host = factory(await createHostControlIngressOptions(config, hostId));
    try {
        await host.start();
        const dispatcher = createV2HttpDispatcher(router);
        await host.attachLocalGuest({
            guestId: config.guest.peerId,
            routedDomains: [config.guest.routeDomain],
            listener: (req, res) => dispatcher.listener(req as any, res as any)
        });
        return host;
    } catch (error) {
        await stopHostControlIngress(host);
        throw error;
    }
}

export async function stopHostControlIngress(host: ControlHost | undefined): Promise<void> {
    await (host?.stop?.() || host?.close?.());
}
