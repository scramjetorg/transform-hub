import { InstanceId } from "@scramjet/types";
import { ICSI } from "./csi";

export interface IInstanceStore extends Map<InstanceId, ICSI> {
    get length(): number;
    registerRpc(path: string, instanceId: string): void;
    map<X>(mapper: (csiController: ICSI) => X): X[];
    getByInstanceId(instanceId: string): ICSI | undefined;
    getByExposePath(exposePath: string): ICSI[];
    set(instanceId: string, value: ICSI): this;
    delete(instanceId: string): boolean;
}
