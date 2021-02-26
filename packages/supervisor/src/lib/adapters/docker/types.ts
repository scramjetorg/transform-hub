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
        image: DockerImage,
        volumes: DockerAdapterVolumeConfig[],
        binds: string[]) => Promise<DockerContainer>;
    startContainer: (image: DockerImage) => Promise<void>;
    stopContainer: (image: string) => Promise<void>;
    removeContainer: (image: string) => Promise<void>;
    execCommand: (containerId: string, command: string[]) => Promise<DockerAdapterStreams>;
    createVolume: (name?: string) => Promise<DockerVolume>;
    removeVolume: (id: string) => Promise<void>;
    run: (config: DockerAdapterRunConfig) => Promise<DockerAdapterRunResponse>;
}
