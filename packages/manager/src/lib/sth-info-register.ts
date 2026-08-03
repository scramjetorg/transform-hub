import { ISTHInfoRegister, HostId, SequenceId } from "./types/from-types";
import { InstanceId } from "@scramjet/runtime-types";
import { ObjLogger } from "@scramjet/obj-logger";
import { Instance, SequenceConfig, CommonSequenceConfig, SequenceInfo } from "@scramjet/runtime-types";

type InstancesSet = Set<InstanceId>;
type SequencesMap = Map<SequenceId, InstancesSet>;
type HostsMap = Map<HostId, SequencesMap>;

export class STHInfoRegister implements ISTHInfoRegister {
    private hostsMap: HostsMap = new Map();
    private sequencesStore = new Map<HostId, SequenceInfo[]>();
    private instancesStore = new Map<string, Instance>();
    logger = new ObjLogger(this);

    addHub(hostId: string): void {
        if (this.hostsMap.get(hostId) === undefined) {
            this.hostsMap.set(hostId, new Map());
        }
    }

    removeHub(hostId: string): void {
        this.clearHostEntities(hostId);
        this.hostsMap.delete(hostId);
    }

    addSequence(hostId: string, seqId: string, seqConfig?: SequenceConfig): void {
        this.logger.info(`Adding sequence to store (host id: ${hostId}, seq id: ${seqId}.`);

        const sequencesMap = this.hostsMap.get(hostId);

        if (!sequencesMap) {
            this.logger.error(`Host with id: ${hostId} does not exist.`);
            return;
        }

        if (sequencesMap.get(seqId) !== undefined) {
            this.logger.error("sequence with seqId already exists", seqId);

            return;
        }

        sequencesMap.set(seqId, new Set());
        this.logger.info(`Sequence added ${seqId}.`);
        if (seqConfig) {
            const newSequence: SequenceInfo = {
                id: seqId,
                config: seqConfig,
                location: hostId,
                instances:  []
            };

            const existingHub = this.sequencesStore.get(hostId) ?? [];

            existingHub.push(newSequence);
            this.sequencesStore.set(hostId, existingHub);
        }
    }

    deleteSequence(hostId: string, seqId: string): void {
        this.logger.info(`Removing sequence from store (host id: ${hostId}, seq id: ${seqId}.`);
        const sequencesMap = this.hostsMap.get(hostId);
        const sequencesArray = this.sequencesStore.get(hostId);

        if (sequencesMap) {
            sequencesMap.delete(seqId);
        }

        if (sequencesArray) {
            const updatedSequencesArray = sequencesArray.filter(sequence => sequence.id !== seqId);

            if (updatedSequencesArray.length === 0) {
                this.sequencesStore.delete(hostId);
            } else {
                this.sequencesStore.set(hostId, updatedSequencesArray);
            }
        }

        if (!sequencesMap && !sequencesArray) {
            this.logger.error(`Host with id: ${hostId} does not exist.`);
        }
    }

    addInstance(hostId: string, instance : Instance): void {
        this.logger.info(`Adding instance to store (host id: ${hostId}, instance id: ${instance.id}.`);
        const sequencesMap = this.hostsMap.get(hostId);

        if (sequencesMap === undefined) {
            throw new Error(`Host with id: ${hostId} does not exist.`);
        }

        const instancesMap = sequencesMap.get(instance.sequence.id);
        const sequencesArray = this.sequencesStore.get(hostId);

        if (instancesMap === undefined) {
            throw new Error(`Sequence with id: ${instance.sequence.id} does not exist.`);
        }

        if (instancesMap.has(instance.id) === false) {
            instancesMap.add(instance.id);
            if (sequencesArray) {
                const sequence = sequencesArray.find(seq => seq.id === instance.sequence.id);

                sequence?.instances.push(instance.id);
            }

            this.instancesStore.set(this.getInstanceStoreKey(hostId, instance.id), this.withAggregationMetadata(hostId, instance));
        }
    }

    private getInstanceStoreKey(hostId: string, instanceId: string): string {
        return `${hostId}:${instanceId}`;
    }

    private withAggregationMetadata(hostId: string, instance: Instance): Instance {
        const sequenceInfo = this.sequencesStore.get(hostId)?.find(sequence => sequence.id === instance.sequence.id);
        const sequenceConfig = sequenceInfo?.config as Record<string, unknown> | undefined;
        const sequence = instance.sequence as Record<string, unknown>;

        return {
            ...instance,
            hubId: (instance as any).hubId ?? hostId,
            location: (instance as any).location ?? hostId,
            sequenceId: (instance as any).sequenceId ?? instance.sequence.id,
            sequence: {
                ...instance.sequence,
                name: sequence.name ?? sequenceConfig?.name ?? sequenceConfig?.id ?? instance.sequence.id,
                location: sequence.location ?? sequenceInfo?.location ?? hostId,
            }
        } as Instance;
    }

    deleteInstance(hostId: string, seqId: string, instanceId: string): void {
        this.logger.info(`Removing instance from store (host id: ${hostId}, instance id: ${seqId}.`);

        const sequencesMap = this.hostsMap.get(hostId);

        if (sequencesMap) {
            const instancesMap = sequencesMap.get(seqId);
            const sequencesArray = this.sequencesStore.get(hostId);

            if (instancesMap?.has(instanceId)) {
                instancesMap.delete(instanceId);
                const sequence = sequencesArray?.find(seq => seq.id === seqId);

                if (sequence) {
                    sequence.instances = sequence.instances.filter(item => item !== instanceId);
                }

                this.instancesStore.delete(this.getInstanceStoreKey(hostId, instanceId));
            }
        }
    }

    getHubs(): string[] {
        return Array.from(this.hostsMap.keys());
    }

    getSequences(): SequenceInfo[] {
        const allSequencesArray = [];

        for (const [, sequences] of this.sequencesStore) {
            sequences.map(sequenceInfo => {
                if ("container" in sequenceInfo.config) {
                    const { type, config, container, ...rest } = sequenceInfo.config;
                    const seqConfig : CommonSequenceConfig = {
                        ...rest,
                        type
                    };

                    sequenceInfo.config = seqConfig;
                }
                return sequenceInfo;
            });

            allSequencesArray.push(...sequences);
        }

        return allSequencesArray;
    }

    getSequencesByHub(hostId: string): string[] {
        const sequencesMap = this.hostsMap.get(hostId);

        if (sequencesMap === undefined) {
            throw new Error(`Host with id: ${hostId} does not exist.`);
        }
        return Array.from(sequencesMap.keys());
    }

    getInstances(): Instance[] {
        return Array.from(this.instancesStore.values());
    }

    clearHostEntities(id: string) {
        this.logger.info("cleaning host entities", id);
        if (!this.hostsMap.has(id)) {
            return;
        }

        this.hostsMap.get(id)?.forEach((instancesSet, _sequenceId) => {
            instancesSet.forEach((instanceId) => {
                this.instancesStore.delete(this.getInstanceStoreKey(id, instanceId));
            });
        });

        this.sequencesStore.delete(id);
        this.hostsMap.set(id, new Map());
    }

    handleHubDisconnect(id: HostId) {
        this.logger.debug(`Handling hub disconnect [${id}]`);
        this.clearHostEntities(id);
    }

    getInstancesByHub(hostId: HostId) {
        const sequencesMap = this.hostsMap.get(hostId);

        if (sequencesMap === undefined) {
            throw new Error(`Host with id: ${hostId} does not exist.`);
        }

        const instances = Array.from(sequencesMap.values())
            .flatMap(instanceSet => Array.from(instanceSet.values()));

        return instances;
    }
}
