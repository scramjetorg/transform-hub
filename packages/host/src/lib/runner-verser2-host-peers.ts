import { Server, ServerResponse } from "http";
import { ParsedMessage, STHRunnerVerser2HostConfig, STHOutboundVerser2Config } from "@scramjet/types";
import { VerserHost } from "@signicode/verser2-host";
import { createVerser2RunnerBrokerTransport, Verser2RunnerBroker } from "./runner-transport";

type Closeable = { close?: () => Promise<void> };

export type SthLocalRunnerVerser2Peers = {
    broker: Verser2RunnerBroker;
    guest: Closeable;
};

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
