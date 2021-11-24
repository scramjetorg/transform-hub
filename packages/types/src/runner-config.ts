// TODO: Rename. it is not a runner config but response from Pre-runner. - valid!!!

import { RunnerContainerConfiguration } from "./sth-configuration";

type CommonRunnerConfig = {
    id: string;
    sequencePath: string;
    name: string;
    version: string;
    instanceAdapterExitDelay: number
}

export type DockerRunnerConfig = CommonRunnerConfig & {
    type: 'docker',
    container: RunnerContainerConfiguration;
    engines: {
        [key: string]: string;
    };
    config?: {
        image?: string,
        ports?: `${number}/${'tcp' | 'udp'}`[]
    };
};

export type ProcessRunnerConfig = CommonRunnerConfig & {
    type: 'process',
}

export type RunnerConfig = DockerRunnerConfig | ProcessRunnerConfig
