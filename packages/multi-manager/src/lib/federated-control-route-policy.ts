export type FederatedControlRoutePair = {
    previousAdvertisedDomain: string;
    nextSelectedDomain: string;
};

type ManagerRoutes = { ingress: string; egress: string; sth?: string };

/** Small, deny-first policy for the two managed control-plane route pairs. */
export class FederatedControlRoutePolicy {
    private readonly managers = new Map<string, ManagerRoutes>();

    registerManager(managerId: string, ingress: string, egress: string): void {
        this.managers.set(managerId, { ingress, egress });
    }

    registerSth(managerId: string, route: string): void {
        const manager = this.managers.get(managerId);
        if (manager) manager.sth = route;
    }

    removeSth(managerId: string, route?: string): void {
        const manager = this.managers.get(managerId);
        if (manager && (!route || manager.sth === route)) delete manager.sth;
    }

    removeManager(managerId: string): void {
        this.managers.delete(managerId);
    }

    authorize(pair: FederatedControlRoutePair): { decision: "allow" | "deny"; cacheTtlMs: 0 } {
        for (const manager of this.managers.values()) {
            if (pair.previousAdvertisedDomain === manager.ingress && pair.nextSelectedDomain === manager.ingress) return { decision: "allow", cacheTtlMs: 0 };
            if (manager.sth && pair.previousAdvertisedDomain === manager.egress && pair.nextSelectedDomain === manager.sth) return { decision: "allow", cacheTtlMs: 0 };
        }
        return { decision: "deny", cacheTtlMs: 0 };
    }
}
