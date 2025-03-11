import { CSIController } from "./csi-controller";

export class InstancesStore extends Map<string, CSIController> {
    private exposePathMap: Map<string, Set<string>> = new Map();

    registerRpc(path: string, instanceId: string) {
        if (!this.exposePathMap.has(path)) {
            this.exposePathMap.set(path, new Set());
        }
        this.exposePathMap.get(path)?.add(instanceId);
    }
    map<X>(mapper: (csiController: CSIController) => X): X[] {
        return Array.from(this.values()).map(mapper);
    }

    getByInstanceId(instanceId: string): CSIController | undefined {
        return this.get(instanceId);
    }

    getByExposePath(exposePath: string): CSIController[] {
        const set = Array.from(this.exposePathMap)
            .find(([path]) => exposePath.startsWith(path))?.[1];

        if (!set) {
            return [];
        }

        return Array.from(set)
            .map(instanceId => this.get(instanceId))
            .filter((instance): instance is CSIController => !!instance);
    }

    set(instanceId: string, value: CSIController): this {
        return super.set(instanceId, value);
    }

    delete(instanceId: string): boolean {
        return super.delete(instanceId);
    }
}

