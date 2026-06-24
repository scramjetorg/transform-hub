/**
 * Sequence information and instance metadata types.
 *
 * Simplified structural copies migrated from the old types package/sequence-adapter.ts.
 */

export type SequenceInfo = {
    config: any;
    id: string;
    instances: string[];
    location: string;
    name?: string;
};

export type SequenceInfoInstance = Omit<SequenceInfo, "instances">;
