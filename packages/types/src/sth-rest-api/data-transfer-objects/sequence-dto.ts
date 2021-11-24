import { RunnerConfig } from "../..";

export type SequenceDTO = {
    instances: readonly string[];
    id: string;
    config: RunnerConfig;
}