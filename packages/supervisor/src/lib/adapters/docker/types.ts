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
    /**
     * @property {string} mountPoint Mount point.
     */
    mountPoint: string,

    /**
     * @property {DockerVolume} volume Volume.
     */
    volume: DockerVolume
};

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
    command: string[];

    /**
     * @property {DockerAdapterVolumeConfig[]} volumes Volumes configuration.
     */
    volumes?: DockerAdapterVolumeConfig[],

    /**
     * @property {string[]} binds Directories mount configuration.
     */
    binds?: string[]
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

/**
 * Result of running command in container.
 */
export type DockerAdapterRunResponse = {
    /**
     * @type {DockerAdapterStreams} Set of standard streams.
     */
    streams: DockerAdapterStreams,

    /**
     * @type {Function} Function to stop and remove container.
     */
    stopAndRemove: Function
};

export interface DockerHelper {
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
     *
     * @returns {Promise} Created container.
     */
    createContainer: (
        dockerImage: DockerImage,
        volumes: DockerAdapterVolumeConfig[],
        binds: string[]) => Promise<DockerContainer>;

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

    /**
     * Removes container.
     *
     * @param {DockerContainer} containerId Container id.
     *
     * @returns {Promise}
     */
    removeContainer: (containerId: DockerContainer) => Promise<void>;

    /**
     * Executes command in container.
     *
     * @param {DockerContainer} containerId Container.
     * @param {string[]} command Command with optional parameters.
     *
     * @returns {Promise} Container standard streams.
     */
    execCommand: (containerId: DockerContainer, command: string[]) => Promise<DockerAdapterStreams>;

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
}
