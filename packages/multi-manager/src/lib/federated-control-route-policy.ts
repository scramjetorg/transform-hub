import { normalizeVerserRouteDomain } from "@signicode/verser-common";

export type FederatedControlRoutePair = {
    previousAdvertisedDomain: string;
    nextSelectedDomain: string;
};

type IssuedHostBinding = { federationHost: string; guestRoute: string };
type ManagerRoutes = { ingress: string; egress: string; sth?: string; issuedSthHosts: Map<string, IssuedHostBinding> };

function normalizedDomain(domain: string): string {
    const normalized = normalizeVerserRouteDomain(domain);
    if (!normalized || !/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(normalized) || normalized.includes("..") || normalized.includes(".-") || normalized.includes("-.")) {
        throw new TypeError("Invalid Verser route domain");
    }
    return normalized;
}

/** Small, deny-first policy for the managed control-plane route pairs. */
export class FederatedControlRoutePolicy {
    private readonly managers = new Map<string, ManagerRoutes>();

    registerManager(managerId: string, ingress: string, egress: string): void {
        const existing = this.managers.get(managerId);
        this.managers.set(managerId, {
            ingress: normalizedDomain(ingress),
            egress: normalizedDomain(egress),
            sth: existing?.sth,
            issuedSthHosts: existing?.issuedSthHosts || new Map()
        });
    }

    registerSth(managerId: string, route: string): void {
        const manager = this.managers.get(managerId);
        if (manager) manager.sth = normalizedDomain(route);
    }

    removeSth(managerId: string, route?: string): void {
        const manager = this.managers.get(managerId);
        if (manager && (!route || manager.sth === normalizedDomain(route))) delete manager.sth;
    }

    registerIssuedSthHost(managerId: string, hubId: string, federationHost: string, guestRoute: string): () => void {
        const manager = this.managers.get(managerId);
        if (!manager) throw new Error("Manager route policy is not registered");
        const binding: IssuedHostBinding = { federationHost: normalizedDomain(federationHost), guestRoute: normalizedDomain(guestRoute) };
        manager.issuedSthHosts.set(hubId, binding);
        return () => {
            if (manager.issuedSthHosts.get(hubId) === binding) manager.issuedSthHosts.delete(hubId);
        };
    }

    removeManager(managerId: string): void {
        this.managers.delete(managerId);
    }

    authorize(pair: FederatedControlRoutePair): { decision: "allow" | "deny"; cacheTtlMs: 0 } {
        let previous: string;
        let next: string;
        try {
            previous = normalizedDomain(pair.previousAdvertisedDomain);
            next = normalizedDomain(pair.nextSelectedDomain);
        } catch {
            return { decision: "deny", cacheTtlMs: 0 };
        }

        for (const manager of this.managers.values()) {
            if (previous === manager.ingress && next === manager.ingress) return { decision: "allow", cacheTtlMs: 0 };
            if (manager.sth && previous === manager.sth && next === manager.ingress) return { decision: "allow", cacheTtlMs: 0 };
            if (manager.sth && previous === manager.egress && next === manager.sth) return { decision: "allow", cacheTtlMs: 0 };
            if (next === manager.ingress && [...manager.issuedSthHosts.values()].some(binding => binding.federationHost === previous)) return { decision: "allow", cacheTtlMs: 0 };
        }
        return { decision: "deny", cacheTtlMs: 0 };
    }
}
