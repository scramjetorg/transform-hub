import { ISequence, RunnerConfig } from "@scramjet/types";

export class Sequence implements ISequence {
    id: string;
    description: string;
    keywords: string[];
    config: RunnerConfig;
    instances: any[] = []

    constructor(config: RunnerConfig) {
        this.id = config.packageVolumeId;
        this.description = config.description;
        this.keywords = config.keywords;
        this.config = config;
    }
}
