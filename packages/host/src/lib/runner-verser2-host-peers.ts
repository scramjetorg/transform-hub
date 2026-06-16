import { Server, ServerResponse } from "http";
import { ParsedMessage, STHRunnerVerser2HostConfig, STHOutboundVerser2Config } from "@scramjet/types";
import { VerserHost } from "@signicode/verser2-host";
import { createVerser2ClientTlsOptions } from "./cpm-connector";
import { createVerser2RunnerBrokerTransport, Verser2RunnerBroker } from "./runner-transport";

type Closeable = { close?: () => Promise<void> };

export type SthLocalRunnerVerser2Peers = {
    broker: Verser2RunnerBroker;
    guest: Closeable;
};

export type RunnerVerser2HostUpstreamParams = {
    upstreamId: string;
    url: string;
    tls: ReturnType<typeof createVerser2ClientTlsOptions>;
};

/**
 * Returns upstream federation params for connecting the STH-local runner verser2 Host
 * to the Manager/MultiManager Host, or `null` when either the runner Host is disabled
 * or the STH is not configured with a Manager/CPM connection.
 *
 * The result is designed to be passed directly to `runnerVerser2Host.connectUpstream()`.
 */
export function getRunnerVerser2HostUpstreamParams(
    verser2Config: Pick<STHOutboundVerser2Config, "hostUrl" | "tls" | "runnerHost">,
    isCpmConfigured: boolean
): RunnerVerser2HostUpstreamParams | null {
    if (!verser2Config.runnerHost?.enabled || !isCpmConfigured) {
        return null;
    }

    return {
        upstreamId: "manager",
        url: verser2Config.hostUrl,
        tls: createVerser2ClientTlsOptions(verser2Config.tls)
    };
}

export async function attachSthLocalRunnerVerser2Peers(
    host: Pick<VerserHost, "attachLocalBroker" | "attachLocalGuest">,
    runnerHostConfig: STHRunnerVerser2HostConfig,
    verser2Config: Pick<STHOutboundVerser2Config, "guest">,
    apiServer: Server
): Promise<SthLocalRunnerVerser2Peers> {
    const broker = createVerser2RunnerBrokerTransport(
        await host.attachLocalBroker({ brokerId: runnerHostConfig.localBroker.peerId })
    );
    const guest = await host.attachLocalGuest({
        guestId: verser2Config.guest.peerId,
        routedDomains: [verser2Config.guest.routeDomain],
        listener: (req, res) => apiServer.emit("request", req as ParsedMessage, res as ServerResponse)
    });

    return { broker, guest };
}
