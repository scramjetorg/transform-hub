import { CSIController } from "./csi-controller";

export class InstancesStore extends Map<string, CSIController> {
    map<X>(mapper: (csiController: CSIController) => X): X[] {
        return Array.from(this.values()).map(mapper);
    }

    getByInstanceId(instanceId: string): CSIController | undefined {
        return this.get(instanceId);
    }

    getByExposePath(exposePath: string): CSIController[] {
        return Array.from(this.values()).filter((controller) => controller.expose?.path === exposePath);
    }

    set(instanceId: string, value: CSIController): this {
        
        return super.set(instanceId, value);
    }

    delete(instanceId: string): boolean {
        
        return super.delete(instanceId);
    }
}

