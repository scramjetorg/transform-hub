// TODO: Rename. it is not a runner config but response from Pre-runner. - valid!!!

export type RunnerConfig = {
    image: string;
    version: string;
    engines: {
        [key: string]: string;
    };
    config?: any;
    sequencePath: string;
    packageVolumeId?: string;
};
