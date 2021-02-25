import { Stream, Writable } from "stream";

export type DockerImage = string;

export type DockerContainer = string;

export type DockerVolume = string;

export type DockerAdapterVolumeConfig = {
    mountPoint: string,
    volume: DockerVolume
};

export type DockerAdapterRunConfig = {
    imageName: string;
    command: string[];
    volumes?: DockerAdapterVolumeConfig[],
    binds?: string[]
};

export type DockerAdapterStreams = {
    stdin: Writable,
    stdout: Stream,
    stderr: Stream
};

export type DockerAdapterRunResponse = {
    streams: DockerAdapterStreams,
    stopAndRemove: Function
};

export interface DockerHelper {
    translateVolumesConfig: (volumeConfigs: DockerAdapterVolumeConfig[]) => any;
    createContainer: (
        dockerImage: DockerImage,
        volumes: DockerAdapterVolumeConfig[],
        binds: string[]) => Promise<DockerContainer>;
    startContainer: (dockerImage: DockerImage) => Promise<void>;
    stopContainer: (containerId: DockerContainer) => Promise<void>;
    removeContainer: (containerId: DockerContainer) => Promise<void>;
    execCommand: (containerId: DockerContainer, command: string[]) => Promise<DockerAdapterStreams>;
    createVolume: (name?: string) => Promise<DockerVolume>;
    removeVolume: (volumeId: DockerVolume) => Promise<void>;
    run: (config: DockerAdapterRunConfig) => Promise<DockerAdapterRunResponse>;
}
