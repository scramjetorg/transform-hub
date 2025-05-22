import { ICSI } from "./types";

export class InstancesStore extends Map<string, ICSI> {
    private exposePathMap: Map<string, Set<string>> = new Map();

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
        return super.set(instanceId, value);
    }

    delete(instanceId: string): boolean {
        return super.delete(instanceId);
    }
}

