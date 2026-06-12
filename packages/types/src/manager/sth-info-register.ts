import type { IObjectLogger, Instance, InstanceId, SequenceConfig, SequenceInfo } from "../index";

export type HostId = string;
export type SequenceId = string;

export interface ISTHInfoRegister {
    logger: IObjectLogger;
    addHub(hostId: HostId): void;
    addSequence(hostId: HostId, seqId: SequenceId, seqConfig?: SequenceConfig): void;
    deleteSequence(hostId: HostId, seqId: SequenceId): void;
    addInstance(hostId: HostId, instance: Instance): void;
    deleteInstance(hostId: HostId, seqId: SequenceId, instanceId: InstanceId): void;

    getHubs(): HostId[];
    getSequences(): SequenceInfo[];
    getSequencesByHub(hostId: string): string[];
    getInstances(): Instance[];
    getInstancesByHub(hostId: HostId): any;

    /**
     * Removes entities associated with hub with given id.
     * @param {string} id Host id
     */
    clearHostEntities(id: string): void;
    handleHubDisconnect(id: string): void;
}
