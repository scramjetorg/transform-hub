import { getLogger } from "@scramjet/logger";
import { HostError } from "@scramjet/model";
import { ILifeCycleAdapterIdentify, ISequence, ISequenceStore } from "@scramjet/types";
import { ReasonPhrases } from "http-status-codes";
import { Sequence } from "./sequence";
import { InstanceStore } from "./instance-store";

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
    instancesStore = InstanceStore;

    private logger = getLogger(this);
    private sequences: { [key: string]: Sequence } = {}

    constructor(
        private sequenceAdapter: ILifeCycleAdapterIdentify
    ) {}

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

        this.logger.log("New sequence added:", sequence.id);
    }

    async delete(id: string): Promise<{ opStatus: ReasonPhrases, error?: string, id?:string }> {
        if (!id) {
            return {
                opStatus: ReasonPhrases.BAD_REQUEST
            };
        }

        const sequence = this.getById(id);

        if (!sequence) {
            return {
                opStatus: ReasonPhrases.NOT_FOUND
            };
        }

        if (sequence.instances.length) {
            this.logger.log("Can't remove sequence in use:", id);

            return {
                opStatus: ReasonPhrases.CONFLICT,
                error: "Can't remove sequence in use"
            };
        }

        const volumeId = this.sequences[id].config.packageVolumeId;

        try {
            this.logger.log("Removing volume...", volumeId);
            await this.sequenceAdapter.remove(this.sequences[id].config);
            delete this.sequences[id];
            this.logger.log("Volume removed:", volumeId);

            return {
                opStatus: ReasonPhrases.OK,
                id
            };
        } catch (error: any) {
            this.logger.error("Error removing sequence!", error);
            throw new HostError("CONTROLLER_ERROR", error);
        }
    }

    close() {
        return Promise.all(
            Object.values(this.sequences).map(seq => {
                return this.delete(seq.id);
            })
        );
    }
}
