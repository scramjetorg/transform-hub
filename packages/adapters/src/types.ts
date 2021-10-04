import { ExitCode } from "@scramjet/types";
import { ContainerStats } from "dockerode";
import { PathLike } from "fs";
import { Stream, Writable } from "stream";

/**
 * Docker image.
 *
 * @typedef {string} DockerImage
 */
export type DockerImage = string;

/**
 * Docker container.
 *
 * @typedef {string} DockerContainer
 */
export type DockerContainer = string;

/**
 * Docker volume.
 *
 * @typedef {string} DockerVolume
 */
export type DockerVolume = string;

/**
 * Volume mounting configuration.
 *
 * @typedef {object} DockerAdapterVolumeConfig
 */
export type DockerAdapterVolumeConfig = {
    /** @property {string} mountPoint Mount point. */ mountPoint: string
} &
(
    {
        /** @property {DockerVolume} volume Volume. */ volume: DockerVolume
    } | {
        /** @property {DockerVolume} volume Volume. */ bind: string
    }
);

export type DockerAdapterRunPortsConfig = {
    ExposedPorts: any,
    PortBindings: any
}

/**
 * Configuration used to run command in container.
 *
 * @typedef {object} DockerAdapterRunConfig
 */
export type DockerAdapterRunConfig = {
    /**
     * @property {string} imageName Image name.
     */
    imageName: string;

    /**
     * Command with optional parameters.
     *
     * @property {string[]} command Command to be executed.
     */
    command?: string[];

    /**
     * @property {DockerAdapterVolumeConfig[]} volumes Volumes configuration.
     */
    volumes?: DockerAdapterVolumeConfig[],

    /**
     * @property {string[]} binds Directories mount configuration.
     */
    binds?: string[],

    /**
     * @property {DockerAdapterRunPortsConfig} ports Docker ports configuration
     */
    ports?: DockerAdapterRunPortsConfig

    /**
     * @property {string[]} envs A list of environment variables
     * to set inside the container in the form ```["VAR=value", ...]```
     */
    envs?: string[],

    /**
     * @property {boolean} autoRemove If true container will be removed after container's process exit.
     */
    autoRemove?: boolean,

    /**
     * @property {number} maxMem Container memory limit (bytes).
     */
    maxMem?: number,

    publishAllPorts?: boolean,
};

/**
 * Standard streams connected with container.
 */
export type DockerAdapterStreams = {
    /**
     * @type {Writable}
     */
    stdin: Writable,

    /**
     * @type {Stream}
     */
    stdout: Stream,

    /**
     * @type {Stream}
     */
    stderr: Stream
};

export type ExitData = {
    statusCode: ExitCode
}

export type DockerAdapterResources = {
    containerId?: DockerContainer;
    volumeId?: DockerVolume;
    fifosDir?: PathLike;
    ports?: DockerAdapterRunPortsConfig;
}

export type DockerAdapterWaitOptions = {
    condition?: "not-running" | "next-exit" | "removed"
}

/**
 * Result of running command in container.
 */
export type DockerAdapterRunResponse = {
    /**
     * @type {DockerAdapterStreams} Set of standard streams.
     */
    streams: DockerAdapterStreams,

    /**
     * @type {Function} Function which return promise resolving when container status changed.
     *                  Used to wait for container end.
     */
    wait: Function

    /**
     * @type {DockerContainer} Docker container.
     */
    containerId: DockerContainer
};
export interface IDockerHelper {
    /**
     * Converts pairs of mount path and volume name to DockerHelper specific volume configuration.
     *
     * @param {DockerAdapterVolumeConfig} volumeConfigs[] Volume configuration objects.
     *
     * @returns {any} DockerHelper volume configuration.
     */
    translateVolumesConfig: (volumeConfigs: DockerAdapterVolumeConfig[]) => any;

    /**
     * Creates Docker container from provided image with attached volumes and local directories.
     *
     * @param {DockerImage} dockerImage Docker image name.
     * @param {DockerAdapterVolumeConfig[]} volumes Volumes to be mounted to container.
     * @param {string[]} binds Directories to be mounted.
     * @param {string[]} envs Environment variables.
     * @param {boolean} autoRemove If true, container will be removed when finished.
     *
     * @returns {Promise} Created container.
     */
    createContainer: (
        containerCfg: {
            dockerImage: DockerImage,
            volumes: DockerAdapterVolumeConfig[],
            binds: string[],
            ports: any,
            envs: string[],
            autoRemove: boolean,
            maxMem: number,
            publishAllPorts: boolean
        }
    ) => Promise<DockerContainer>;

    /**
     * Starts container.
     *
     * @param {DockerContainer} containerId Container to be started.
     *
     * @returns {Promise}
     */
    startContainer: (containerId: DockerContainer) => Promise<void>;

    /**
     * Stops container.
     *
     * @param {DockerContainer} containerId Container id to be stopped.
     *
     * @returns {Promise}
     */
    stopContainer: (containerId: DockerContainer) => Promise<void>;

    stats: (containerId: DockerContainer) => Promise<ContainerStats>;
    /**
     * Removes container.
     *
     * @param {DockerContainer} containerId Container id.
     *
     * @returns {Promise}
     */
    removeContainer: (containerId: DockerContainer) => Promise<void>;

    /**
     * Lists exisiting volumes
     *
     * @returns {Promise<DockerVolume[]>} List of existing volumes
     */
    listVolumes: () => Promise<DockerVolume[]>;

    /**
     * Creates volume.
     *
     * @param {string} name Volume name.
     *
     * @returns {Promise<DockerVolume>} Created volume.
     */
    createVolume: (name?: string) => Promise<DockerVolume>;

    /**
     * Removes volume.
     *
     * @param {DockerVolume} Volume.
     *
     * @returns {Promise}
     */
    removeVolume: (volumeId: DockerVolume) => Promise<void>;

    /**
     * Executes command in container.
     *
     * @param {DockerAdapterRunConfig} config Execution configuration.
     *
     * @returns {Promise<DockerAdapterRunResponse>}
     */
    run: (config: DockerAdapterRunConfig) => Promise<DockerAdapterRunResponse>;

    /**
     * Waits until containter exits
     *
     * @param {DockerContainer} container
     *
     * @returns {Promise<ExitCode>}
     */
    wait(container: DockerContainer, options?: DockerAdapterWaitOptions): Promise<ExitData>;

    /**
     * Fetches the image from repo
     *
     * @param name the name of the image, eg. ubuntu:latest
     * @param fetchOnlyIfNotExists fetch only if not exists (defaults to true)
     */
    pullImage(name: string, fetchOnlyIfNotExists: boolean): Promise<void>
}
