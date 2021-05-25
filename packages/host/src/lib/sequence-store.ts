import { DockerodeDockerHelper } from "@scramjet/adapters";
import { ISequence, ISequenceStore, RunnerConfig } from "@scramjet/types";
import { CSIController } from "./csi-controller";
import { InstanceStore } from "./instance-store";
export class Sequence implements ISequence {
    id: string;
    config: RunnerConfig;

    constructor(id: string, config: RunnerConfig) {
        this.id = id;
        this.config = config;
    }
}

/**
 *
 * An utility class for manipulation of the
 * Sequences stored on the CSH.
 *
 * Question: Patryk raised an issue that we should think of
 * saving the Sequence information in the file (for the future sprints)
 *
 * or, we could just try to reconnect instances after host restart.
 */
export class SequenceStore implements ISequenceStore {
    dockerHelper: DockerodeDockerHelper = new DockerodeDockerHelper();

    instancesStore = InstanceStore;

    private sequences: { [key: string]: Sequence } = {}

    getSequences(): ISequence[] {
        return Object.values(this.sequences);
    }

    getById(key: string): ISequence {
        return this.sequences[key];
    }

    add(sequence: ISequence) {
        if (sequence) {
            this.sequences[sequence.id] = sequence;
        }
    }

    async remove(id: string) {
        if (!id) {
            return false;
        }

        const sequence = this.getById(id);

        if (!sequence) {
            return false;
        }

        const isRunning = !!Object.values(this.instancesStore)
            .find((instance: CSIController) => instance.sequence === sequence);

        if (isRunning) {
            return {
                status: 409
            };
        }

        /**
         * TODO: Here we also need to check if there aren't any Instances running
         * that use this Sequence.
         */

        const volumeId = this.sequences[id].config.packageVolumeId as string;

        try {
            await this.dockerHelper.removeVolume(volumeId);

            delete this.sequences[id];

            return true;
        } catch (error) {
            return false;
        }
    }

    close() {
        return Promise.all(
            Object.values(this.sequences).map(seq => {
                return this.remove(seq.id);
            })
        );
    }
}
