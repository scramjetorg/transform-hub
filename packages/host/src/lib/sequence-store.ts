import { DockerodeDockerHelper } from "@scramjet/adapters";
import { getLogger } from "@scramjet/logger";
import { HostError } from "@scramjet/model";
import { ISequenceAdapter, ISequenceStore, STHRestAPI } from "@scramjet/types";
import { ReasonPhrases } from "http-status-codes";

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

    private logger = getLogger(this);
    private sequences: Partial<Record<string, ISequenceAdapter>> = {}

    getSequences(): ISequenceAdapter[] {
        return Object.values(this.sequences) as ISequenceAdapter[];
    }

    getById(key: string): ISequenceAdapter | null {
        return this.sequences[key] ?? null;
    }

    add(sequence: ISequenceAdapter) {
        if (sequence) {
            this.sequences[sequence.info.getId()] = sequence;
        }

        this.logger.info("New sequence added:", sequence.info.getId());
    }

    async delete(sequenceId: string): Promise<STHRestAPI.DeleteSequenceResponse> {
        if (!sequenceId) {
            return {
                opStatus: ReasonPhrases.BAD_REQUEST
            };
        }

        const sequence = this.getById(sequenceId);

        if (!sequence) {
            return {
                opStatus: ReasonPhrases.NOT_FOUND
            };
        }

        if (sequence.info.hasInstances()) {
            this.logger.warn("Can't remove sequence in use:", sequenceId);

            return {
                opStatus: ReasonPhrases.CONFLICT,
                error: "Can't remove sequence in use."
            };
        }


        try {
            await sequence.remove()
            await sequence.cleanup()

            delete this.sequences[sequenceId];

            this.logger.log("Sequence removed:", sequenceId);

            return {
                opStatus: ReasonPhrases.OK,
                id: sequenceId
            };
        } catch (error: any) {
            this.logger.error("Error removing sequence!", error);
            throw new HostError("CONTROLLER_ERROR");
        }
    }
}
