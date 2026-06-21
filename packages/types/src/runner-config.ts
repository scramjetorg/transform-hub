// TODO: Rename. it is not a runner config but response from Pre-runner. - valid!!!

import type { InstanceLimits } from "./instance-limits";
import type { InstanceArgs } from "./instance";
import type { PortConfig } from "./sequence-package-json";
import type { RunnerContainerConfiguration } from "./sth-configuration";

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
    exposePath?: string;
    exposeHost?: string;
    tags?: string[];
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

export type SequenceConfig = DockerSequenceConfig | ProcessSequenceConfig | KubernetesSequenceConfig | CommonSequenceConfig;

export type InstanceConfig = SequenceConfig & { instanceAdapterExitDelay: number, limits: InstanceLimits }
