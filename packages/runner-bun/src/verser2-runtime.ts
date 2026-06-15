import {
    createVerserBroker,
    createVerserBunGuest,
    VerserBroker,
    VerserBunGuest,
    VerserBunGuestRequestHandler
} from "@signicode/verser2-guest-bun";
import { RunnerBunVerser2RuntimeConfig } from "./boot-config";

type BunGuestFactory = typeof createVerserBunGuest;
type BunBrokerFactory = typeof createVerserBroker;

function tlsOptions(config: RunnerBunVerser2RuntimeConfig): Record<string, unknown> | undefined {
    const tls = config.tls;

    if (!tls) {
        return undefined;
    }

    const result: Record<string, unknown> = {};

    if (tls.caFile) result.caFile = tls.caFile;
    if (tls.certFile) result.certFile = tls.certFile;
    if (tls.keyFile) result.keyFile = tls.keyFile;
    if (tls.pfxFile) result.pfxFile = tls.pfxFile;
    if (tls.passphrase) result.passphrase = tls.passphrase;

    return Object.keys(result).length > 0 ? result : undefined;
}

export class BunSequenceApiExposure {
    private handler?: VerserBunGuestRequestHandler;
    private guest?: VerserBunGuest;

    get attachedHandler(): VerserBunGuestRequestHandler | undefined {
        return this.handler;
    }

    attach(handler: VerserBunGuestRequestHandler): VerserBunGuestRequestHandler {
        this.handler = handler;
        this.guest?.attach(handler);
        return handler;
    }

    use(handler: VerserBunGuestRequestHandler): VerserBunGuestRequestHandler {
        return this.attach(handler);
    }

    bindGuest(guest: VerserBunGuest, domain: string): VerserBunGuest {
        this.guest = guest;
        if (this.handler) {
            guest.attach(this.handler, domain);
        }
        return guest;
    }
}

export function createBunSequenceGuest(
    config: RunnerBunVerser2RuntimeConfig,
    handler: VerserBunGuestRequestHandler | undefined,
    guestFactory: BunGuestFactory = createVerserBunGuest
): VerserBunGuest {
    const guest = guestFactory({
        hostUrl: config.hostUrl,
        guestId: config.runnerGuestId,
        routedDomains: [config.runnerRouteDomain],
        minWaitingStreams: config.minWaitingStreams || 1,
        leaseAcquireTimeoutMs: config.leaseAcquireTimeoutMs,
        tls: tlsOptions(config)
    });

    if (handler) {
        guest.attach(handler, config.runnerRouteDomain);
    }

    return guest;
}

export async function startBunSequenceGuest(
    config: RunnerBunVerser2RuntimeConfig | undefined,
    exposure: BunSequenceApiExposure | undefined,
    guestFactory: BunGuestFactory = createVerserBunGuest
): Promise<VerserBunGuest | undefined> {
    if (!config || !exposure) {
        return undefined;
    }

    const guest = createBunSequenceGuest(config, undefined, guestFactory);

    exposure.bindGuest(guest, config.runnerRouteDomain);
    await guest.connect();
    return guest;
}

export async function createBunHubFetch(
    config: RunnerBunVerser2RuntimeConfig | undefined,
    brokerFactory: BunBrokerFactory = createVerserBroker
): Promise<{ broker: VerserBroker; fetch: unknown; close: () => Promise<void> } | undefined> {
    if (!config) {
        return undefined;
    }

    const broker = brokerFactory({
        hostUrl: config.hostUrl,
        brokerId: config.hubBrokerId,
        leaseAcquireTimeoutMs: config.leaseAcquireTimeoutMs,
        tls: tlsOptions(config)
    });

    await broker.connect();

    return {
        broker,
        fetch: broker.createFetch(),
        close: () => broker.close("runner-bun shutdown")
    };
}
