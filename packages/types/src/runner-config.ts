// TODO: Rename. it is not a runner config but response from Pre-runner. - valid!!!

import { ContainerConfiguration } from "./sth-configuration";

export type RunnerConfig = {
    name: string;
    container: ContainerConfiguration;
    version: string;
    engines: {
        [key: string]: string;
    };
    config?: any;
    sequencePath: string;
    packageVolumeId: string;
    error?: string;
    produces: string,
    consumes: string
};
