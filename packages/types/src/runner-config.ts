// TODO: Rename. it is not a runner config but response from Pre-runner. - valid!!!

import { PortConfig } from "./sequence-package-json";
import { RunnerContainerConfiguration } from "./sth-configuration";

type CommonSequenceConfig = {
    type: string;
    engines: Record<string, string>;
    id: string;
    /**
     * Relative path from sequence package root to JS file
     */
    entrypointPath: string;
    name: string;
    version: string;
    sequenceDir: string;
}

export type DockerSequenceConfig = CommonSequenceConfig & {
    type: "docker",
    container: RunnerContainerConfiguration;
    config?: {
        ports?: PortConfig[] | null
    };
};

export type ProcessSequenceConfig = CommonSequenceConfig & {
    type: "process"
}

export type KubernetesSequenceConfig = CommonSequenceConfig & {
    type: "kubernetes"
}

export type SequenceConfig = DockerSequenceConfig | ProcessSequenceConfig | KubernetesSequenceConfig

export type InstanceConifg = SequenceConfig & { instanceAdapterExitDelay: number }
