// TODO: Rename. it is not a runner config but response from Pre-runner. - valid!!!

import { ContainerConfiguration } from "./sth-configuration";

export type RunnerConfig = {
    name: string;
    description: string;
    container: ContainerConfiguration;
    version: string;
    keywords: string[];
    engines: {
        [key: string]: string;
    };
    config?: any;
    sequencePath: string;
    packageVolumeId: string;
    error?: string;
};
