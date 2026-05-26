import { InstanceId } from "@scramjet/types";
import { ICSI } from "./csi";

export interface IInstanceStore extends Map<InstanceId, ICSI> {
    get length(): number;
    registerRpc(path: string, instanceId: string): void;
    reserveId(instanceId: string): boolean;
    releaseId(instanceId: string): void;
    hasReservedId(instanceId: string): boolean;
    reserveName(instanceName: string, instanceId: string): boolean;
    /** Stable instance name registration (one live instance per name) */
    registerName(instanceName: string, instanceId: string): void;
    /** Unregister previously registered stable name for instance */
    unregisterName(instanceName: string, instanceId: string): void;
    /** Lookup instance by stable name */
    getByName(instanceName: string): ICSI | undefined;
    hasName(instanceName: string): boolean;
    /** Lookup by exact id first, then by stable name (id-first semantics) */
    getByNameOrId(token: string): ICSI | undefined;
    map<X>(mapper: (csiController: ICSI) => X): X[];
    getByInstanceId(instanceId: string): ICSI | undefined;
    getByExposePath(exposePath: string): ICSI[];
    set(instanceId: string, value: ICSI): this;
    delete(instanceId: string): boolean;
}
