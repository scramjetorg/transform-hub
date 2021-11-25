// TODO: Rename. it is not a runner config but response from Pre-runner. - valid!!!

import { RunnerContainerConfiguration } from "./sth-configuration";

type CommonSequenceConfig = {
    type: string;
    id: string;
    sequencePath: string;
    name: string;
    version: string;
}

export type DockerSequenceConfig = CommonSequenceConfig & {
    type: "docker",
    container: RunnerContainerConfiguration;
    engines: {
        [key: string]: string;
    };
    config?: {
        image?: string,
        ports?: `${number}/${"tcp" | "udp"}`[]
    };
};

export type ProcessSequenceConfig = CommonSequenceConfig & {
    type: "process",
}

export type SequenceConfig = DockerSequenceConfig | ProcessSequenceConfig

export type InstanceConifg = SequenceConfig & { instanceAdapterExitDelay: number }
