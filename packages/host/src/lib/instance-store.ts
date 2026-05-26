import { ICSI } from "./types";

export class InstancesStore extends Map<string, ICSI> {
    private exposePathMap: Map<string, Set<string>> = new Map();
    private reservedIds: Set<string> = new Set();
    /** stable name -> instanceId */
    private nameMap: Map<string, string> = new Map();

    /** reverse mapping for cleanup: instanceId -> stable name */
    private nameReverse: Map<string, string> = new Map();

    get length() {
        return this.size;
    }

    registerRpc(path: string, instanceId: string) {
        if (!this.exposePathMap.has(path)) {
            this.exposePathMap.set(path, new Set());
        }
        this.exposePathMap.get(path)?.add(instanceId);
    }

    map<X>(mapper: (csiController: ICSI) => X): X[] {
        const values = this.values();

        return Array.from(values).map(mapper);
    }

    getByInstanceId(instanceId: string): ICSI | undefined {
        return this.get(instanceId);
    }

    reserveId(instanceId: string) {
        if (this.has(instanceId) || this.reservedIds.has(instanceId)) {
            return false;
        }

        this.reservedIds.add(instanceId);

        return true;
    }

    releaseId(instanceId: string) {
        this.reservedIds.delete(instanceId);
    }

    hasReservedId(instanceId: string): boolean {
        return this.reservedIds.has(instanceId);
    }

    private clearNameForInstance(instanceId: string) {
        const currentName = this.nameReverse.get(instanceId);

        if (!currentName) {
            return;
        }

        this.nameReverse.delete(instanceId);

        if (this.nameMap.get(currentName) === instanceId) {
            this.nameMap.delete(currentName);
        }
    }

    reserveName(instanceName: string, instanceId: string) {
        const existing = this.nameMap.get(instanceName);

        if (existing && existing !== instanceId) {
            return false;
        }

        const currentName = this.nameReverse.get(instanceId);

        if (currentName && currentName !== instanceName) {
            this.clearNameForInstance(instanceId);
        }

        this.nameMap.set(instanceName, instanceId);
        this.nameReverse.set(instanceId, instanceName);

        return true;
    }

    registerName(instanceName: string, instanceId: string) {
        if (!this.has(instanceId)) {
            return;
        }

        this.reserveName(instanceName, instanceId);
    }

    unregisterName(instanceName: string, instanceId: string) {
        const mapped = this.nameMap.get(instanceName);
        if (mapped && mapped === instanceId) {
            this.nameMap.delete(instanceName);
            this.nameReverse.delete(instanceId);
        }
    }

    getByName(instanceName: string): ICSI | undefined {
        const id = this.nameMap.get(instanceName);
        if (!id) return undefined;
        return this.get(id);
    }

    hasName(instanceName: string): boolean {
        return this.nameMap.has(instanceName);
    }

    getByNameOrId(token: string): ICSI | undefined {
        const byId = this.get(token);
        if (byId) return byId;

        return this.getByName(token);
    }

    getByExposePath(exposePath: string): ICSI[] {
        const set = Array.from(this.exposePathMap)
            .find(([path]) => exposePath.startsWith(path))?.[1];

        if (!set) {
            return [];
        }

        return Array.from(set)
            .map(instanceId => this.get(instanceId))
            .filter((instance): instance is ICSI => !!instance);
    }

    set(instanceId: string, value: ICSI): this {
        const res = super.set(instanceId, value);

        this.releaseId(instanceId);

        const name = this.nameReverse.get(instanceId);
        if (name) {
            this.nameMap.set(name, instanceId);
        }

        return res;
    }

    delete(instanceId: string): boolean {
        this.releaseId(instanceId);
        this.clearNameForInstance(instanceId);

        for (const [path, set] of this.exposePathMap.entries()) {
            if (set.has(instanceId)) {
                set.delete(instanceId);
                if (!set.size) this.exposePathMap.delete(path);
            }
        }

        return super.delete(instanceId);
    }
}
