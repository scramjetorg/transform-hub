import { ParsedMessage, STHOutboundVerser2Config, STHRunnerVerser2HostConfig } from "@scramjet/api-types";
import { handleVerser2RequestBoundary } from "@scramjet/utility";
import { VerserHost } from "@signicode/verser2-host";
import { Server } from "http";
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
    upstreamPool: STHOutboundVerser2Config["upstreamPool"];
};

export function getRunnerVerser2HostUpstreamParams(
    verser2Config: Pick<STHOutboundVerser2Config, "enabled" | "hostUrl" | "tls" | "runnerHost" | "broker" | "guest" | "upstreamPool">
): RunnerVerser2HostUpstreamParams | null {
    if (!verser2Config.enabled || !verser2Config.hostUrl || !verser2Config.broker.targetDomain || !verser2Config.guest.routeDomain || !verser2Config.runnerHost?.enabled) {
        return null;
    }

    return {
        upstreamId: "manager",
        url: verser2Config.hostUrl,
        tls: createVerser2ClientTlsOptions(verser2Config.tls),
        upstreamPool: verser2Config.upstreamPool
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
        listener: (req, res) => handleVerser2RequestBoundary(
            req,
            res,
            () => apiServer.emit("request", req as ParsedMessage, res),
            console
        )
    });

    return { broker, guest };
}
