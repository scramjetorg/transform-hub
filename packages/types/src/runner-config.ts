// TODO: Rename. it is not a runner config but response from Pre-runner. - valid!!!

import { InstanceLimits } from "./instance-limits";
import { InstanceArgs } from "./instance";
import { PortConfig } from "./sequence-package-json";
import { RunnerContainerConfiguration } from "./sth-configuration";

export type CommonSequenceConfig = {
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
    description?: string;
    author?: string;
    keywords?: string[];
    args?: InstanceArgs;
    repository?: {
        type: string;
        url: string;
        directory?: string;
    } | string;
    language: string;
    packageSize?: number;
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

// eslint-disable-next-line max-len
export type SequenceConfig = DockerSequenceConfig | ProcessSequenceConfig | KubernetesSequenceConfig | CommonSequenceConfig;

export type InstanceConfig = SequenceConfig & { instanceAdapterExitDelay: number, limits: InstanceLimits }
