import { getLogger } from "@scramjet/logger";
import { SequenceAdapterError } from "@scramjet/model";
import {
    ISequenceAdapter,
    Logger,
    SequenceConfig,
    STHConfiguration,
    DockerSequenceConfig,
    IObjectLogger,
} from "@scramjet/types";
import { Readable } from "stream";
import { DockerodeDockerHelper } from "./dockerode-docker-helper";
import { DockerAdapterResources, DockerAdapterRunResponse, DockerAdapterStreams, DockerVolume, IDockerHelper } from "./types";
import { isDefined, readStreamedJSON } from "@scramjet/utility";
import { ObjLogger } from "@scramjet/obj-logger";
import { sequencePackageJSONDecoder } from "./validate-sequence-package-json";

/**
 * Adapter for preparing Sequence to be run in Docker container.
 */
class DockerSequenceAdapter implements ISequenceAdapter {
    private dockerHelper: IDockerHelper;
    private resources: DockerAdapterResources = {};
    private logger: Logger;

    public name = "DockerSequenceAdapter";

    /**
     * Instance of class providing logging utilities.
     */
    objLogger: IObjectLogger;

    constructor(private config: STHConfiguration) {
        this.dockerHelper = new DockerodeDockerHelper();
        this.logger = getLogger(this);
        this.objLogger = new ObjLogger(this);

        this.dockerHelper.objLogger.pipe(this.objLogger);
    }

    /**
     * Initializes adapter.
     */
    async init(): Promise<void> {
        this.logger.log("Initializing...");
        this.objLogger.trace("Initializing");

        await this.fetch(this.config.docker.prerunner.image);

        this.logger.info("Initiazation done.");
        this.objLogger.trace("Initiazation done");
    }

    /**
     * Pulls image from registry.
     *
     * @param {string} name Docker image name
     */
    async fetch(name: string) {
        await this.dockerHelper.pullImage(name, true);
    }

    /**
     * Finds existing Docker volumes containing sequences.
     *
     * @returns {Promise<SequenceConfig[]>} Promise resolving to array of identified sequences.
     */
    async list(): Promise<SequenceConfig[]> {
        this.logger.debug("Listing exiting sequences...");
        this.objLogger.trace("Listing exiting sequences");

        const potentialVolumes = await this.dockerHelper.listVolumes();

        const configs = await Promise.all(
            potentialVolumes
                .map((volume) => this.identifyOnly(volume))
                .map((configPromised) => configPromised.catch(() => null))
        );

        return configs
            .filter(isDefined);
    }

    /**
     * Identifies sequence existing on Docker volume.
     *
     * @param {string} volume Volume id.
     * @returns {SequenceConfig} Sequence configuration or undefined if sequence cannot be identified.
     */
    private async identifyOnly(volume: string): Promise<SequenceConfig | undefined> {
        this.logger.info(`Attempting to identify volume: ${volume}`);
        this.objLogger.info("Attempting to identify volume", volume);

        try {
            const { streams, wait } = await this.dockerHelper.run({
                imageName: this.config.docker.prerunner?.image || "",
                volumes: [
                    { mountPoint: "/package", volume },
                ],
                command: ["/app/identify.sh"],
                autoRemove: true,
                maxMem: this.config.docker.prerunner?.maxMem || 0
            });

            this.logger.debug(`Prerunner identify started for: ${volume}`);
            this.objLogger.debug("Identify started", volume);

            const ret = await this.parsePackage(streams, wait, volume);

            if (!ret.id) {
                return undefined;
            }

            this.logger.info(`Identified volume ${volume} as to be run with ${ret.container?.image}`);
            this.objLogger.info(`Identified volume ${volume} as to be run with ${ret.container?.image}`);

            return ret;
        } catch (e: any) {
            this.logger.error("Docker failed!");
            this.objLogger.error("Docker failed", e.message, volume);

            throw new SequenceAdapterError("DOCKER_ERROR");
        }
    }

    /**
     * Unpacks and identifies sequence in Docker volume.
     * This is the main adapter method creating new Docker volume and starting Prerunner
     * with created volume mounted to unpack sequence on it.
     * When Prerunner finishes, it will return JSON with sequence information.
     *
     * @param {Readable} stream Stream containing sequence to be indentified.
     * @param {string} id Id for the new docker volume where sequence will be stored.
     * @returns {Promise<SequenceConfig>} Promise resolving to sequence config.
     */
    async identify(stream: Readable, id: string): Promise<SequenceConfig> {
        const volumeId = await this.createVolume(id);

        this.resources.volumeId = volumeId;
        this.logger.log("Volume created. Id: ", volumeId);
        this.objLogger.info("Volume created", volumeId);

        let runResult: DockerAdapterRunResponse;

        this.logger.log("Starting PreRunner", this.config);
        this.logger.debug("Starting PreRunner", this.config);

        try {
            runResult = await this.dockerHelper.run({
                imageName: this.config.docker.prerunner.image || "",
                volumes: [
                    { mountPoint: "/package", volume: volumeId }
                ],
                autoRemove: true,
                maxMem: this.config.docker.prerunner.maxMem || 0
            });
        } catch (err: any) {
            this.logger.error(err);
            this.objLogger.error(err);

            throw new SequenceAdapterError("DOCKER_ERROR");
        }

        try {
            const { streams, wait } = runResult;

            stream.pipe(streams.stdin);

            const config = await this.parsePackage(streams, wait, volumeId);

            await this.fetch(config.container.image);

            return config;
        } catch (err: any) {
            this.logger.error(err, id);
            this.objLogger.error(err, id);

            throw new SequenceAdapterError("PRERUNNER_ERROR", err);
        }
    }

    /**
     * Creates volume with provided id.
     *
     * @param {string} id Volume id.
     * @returns {DockerVolume} Created volume.
     */
    private async createVolume(id: string): Promise<DockerVolume> {
        try {
            return await this.dockerHelper.createVolume(id);
        } catch (error: any) {
            this.logger.error("Error creating volume", id);
            this.objLogger.error("Error creating volume", id);

            throw new SequenceAdapterError("DOCKER_ERROR", "Error creating volume");
        }
    }

    /**
     * Parses PreRunner output and returns sequence configuration.
     *
     * @param {DockerAdapterStreams} streams Docker container std streams.
     * @param {Function} wait TBD
     * @param {DockerVolume} volumeId Id of the volume where sequence is stored.
     * @returns {Promise<DockerSequenceConfig>} Promise resolving to sequence configuration.
     */
    private async parsePackage(
        streams: DockerAdapterStreams,
        wait: Function,
        volumeId: DockerVolume
    ): Promise<DockerSequenceConfig> {
        const [packageJson] = await Promise.all([
            readStreamedJSON(streams.stdout as Readable),
            wait
        ]);

        const validPackageJson = await sequencePackageJSONDecoder.decodeToPromise(packageJson);

        const engines = validPackageJson.engines ? { ...validPackageJson.engines } : {};
        const config = validPackageJson.scramjet?.config ? { ...validPackageJson.scramjet.config } : {};

        return {
            type: "docker",
            container: this.config.docker.runner,
            name: validPackageJson.name || "",
            version: validPackageJson.version || "",
            engines,
            config,
            entrypointPath: validPackageJson.main,
            id: volumeId,
        };
    }

    /**
     * Removes Docker volume used by Sequence.
     *
     * @param {SequenceConfig} config Sequence configuration.
     */
    async remove(config: SequenceConfig) {
        if (config.type !== "docker") {
            throw new Error(`Incorrect SequenceConfig pased to DockerSequenceAdapter: ${config.type}`);
        }

        await this.dockerHelper.removeVolume(config.id);

        this.logger.debug("Volume removed.");
        this.objLogger.debug("Volume removed", config.id);
    }
}

export { DockerSequenceAdapter };
