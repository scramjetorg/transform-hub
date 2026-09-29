import { AsyncLocalStorage } from "async_hooks";

export type VerifiedFederationPrincipal = {
    principal?: string;
    claim?: { realm: string; space: string; hub: string; federationHost: string; broker: string; guestRoute: string };
};

const storage = new AsyncLocalStorage<VerifiedFederationPrincipal | undefined>();

export function withVerifiedFederationPrincipal<T>(principal: VerifiedFederationPrincipal | undefined, callback: () => T): T {
    return storage.run(principal, callback);
}

export function verifiedFederationPrincipal(): VerifiedFederationPrincipal | undefined {
    return storage.getStore();
}
