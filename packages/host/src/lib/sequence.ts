import { ISequence, RunnerConfig } from "@scramjet/types";

export class Sequence implements ISequence {
    id: string;
    config: RunnerConfig;
    instances: any[] = []

    constructor(config: RunnerConfig) {
        this.id = config.packageVolumeId;
        this.config = config;
    }
}
