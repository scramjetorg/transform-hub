import { ISequence, RunnerConfig } from "@scramjet/types";

export class Sequence implements ISequence {
    id: string;
    config: RunnerConfig;

    constructor(id: string, config: RunnerConfig) {
        this.id = id;
        this.config = config;
    }
}
