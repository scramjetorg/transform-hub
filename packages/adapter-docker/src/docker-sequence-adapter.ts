import { SequenceAdapterError } from "@scramjet/model";
import {
    ISequenceAdapter,
    SequenceConfig,
    DockerSequenceConfig,
    IObjectLogger,
    DockerAdapterConfiguration
} from "@scramjet/types";
import { Readable } from "stream";
import { appendFile } from "fs";
import { DockerodeDockerHelper } from "./dockerode-docker-helper";
import {
    DockerAdapterResources,
    DockerAdapterRunResponse,
    DockerAdapterStreams,
    DockerVolume,
    IDockerHelper
} from "./types";
import { isDefined, readStreamedJSON } from "@scramjet/utility";
import { ObjLogger } from "@scramjet/obj-logger";
import { detectLanguage, sequencePackageJSONDecoder } from "@scramjet/adapters-utils";

const PACKAGE_DIR = "/package";

/**
 * Adapter for preparing Sequence to be run in Docker container.
 */
class DockerSequenceAdapter implements ISequenceAdapter {
    private dockerHelper: IDockerHelper;
    private resources: DockerAdapterResources = {};
    private config: DockerAdapterConfiguration;

    public name = "DockerSequenceAdapter";

    /**
     * Instance of class providing logging utilities.
     */
    logger: IObjectLogger;

    constructor(config: DockerAdapterConfiguration) {
        this.config = config;
        this.logger = new ObjLogger(this.name);

        this.dockerHelper = new DockerodeDockerHelper();
        this.dockerHelper.logger.pipe(this.logger);
    }

    /**
     * Initializes adapter.
     */
    async init(): Promise<void> {
        this.logger.trace("Initializing");

        await this.fetch(this.config.prerunner.image);

        this.logger.info("Docker adapter initialized with options", {
            "python3 runner image": this.config.runnerImages.python3,
            "node runner image": this.config.runnerImages.node,
            "prerunner image": this.config.prerunner.image
        });
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
        this.logger.trace("Listing exiting sequences");

        const potentialVolumes = await this.dockerHelper.listVolumes();

        const configs = await Promise.all(
            potentialVolumes
                .map(volume => this.identifyOnly(volume))
                .map(configPromised => configPromised.catch(() => null))
        );

        return configs.filter(isDefined);
    }

    /**
     * Identifies sequence existing on Docker volume.
     *
     * @param {string} volume Volume id.
     * @returns {SequenceConfig} Sequence configuration or undefined if sequence cannot be identified.
     */
    private async identifyOnly(volume: string): Promise<SequenceConfig | undefined> {
        this.logger.info("Attempting to identify volume", volume);

        try {
            const { streams, wait } = await this.dockerHelper.run({
                imageName: this.config.prerunner?.image || "",
                volumes: [{ mountPoint: PACKAGE_DIR, volume, writeable: true }],
                command: ["/opt/transform-hub/identify.sh"],
                autoRemove: true,
                maxMem: this.config.prerunner?.maxMem || 0
            });

            this.logger.debug("Identify started", volume, this.config.prerunner?.maxMem || 0);

            const ret = await this.parsePackage(streams, wait, volume);

            if (!ret.id) {
                return undefined;
            }

            this.logger.info("Identified image for volume", { volume, image: ret.container?.image });

            return ret;
        } catch (e: any) {
            this.logger.error("Docker failed", e.message, volume);

            throw e;
        }
    }

    /**
     * Unpacks and identifies sequence in Docker volume.
     * This is the main adapter method creating new Docker volume and starting Prerunner
     * with created volume mounted to unpack sequence on it.
     * When Prerunner finishes, it will return JSON with sequence information.
     *
     * @param {Readable} stream Stream containing sequence to be identified.
     * @param {string} id Id for the new docker volume where sequence will be stored.
     * @param {boolean} override Removes previous sequence
     * @returns {Promise<SequenceConfig>} Promise resolving to sequence config.
     */
    async identify(stream: Readable, id: string, override = false): Promise<SequenceConfig> {
        const volStart = new Date();

        if (override) {
            await this.dockerHelper.removeVolume(id);
        }

        const volumeId = await this.createVolume(id);

        const volSecs = (new Date().getTime() - volStart.getTime()) / 1000;

        appendFile("timing-log.ndjson", JSON.stringify({
            operation: "creating volume",
            volumeId: volumeId,
            time: volSecs,
        }) + "\n", () => {});

        this.resources.volumeId = volumeId;

        this.logger.info(`Volume created in ${volSecs}s`, volumeId);

        let runResult: DockerAdapterRunResponse;
        const prerunnerStart = new Date();

        this.logger.debug("Starting PreRunner", this.config.prerunner);

        try {
            runResult = await this.dockerHelper.run({
                imageName: this.config.prerunner.image || "",
                volumes: [{ mountPoint: PACKAGE_DIR, volume: volumeId, writeable: true }],
                autoRemove: true,
                maxMem: this.config.prerunner.maxMem || 0
            });
        } catch (err: any) {
            this.logger.error(err);

            throw new SequenceAdapterError("DOCKER_ERROR");
        }

        const startSecs = (new Date().getTime() - prerunnerStart.getTime()) / 1000;

        appendFile("timing-log.ndjson", JSON.stringify({
            operation: "starting pre-runner",
            time: startSecs,
        }) + "\n", () => {});

        try {
            const { streams, wait } = runResult;

            stream.pipe(streams.stdin);

            const config = await this.parsePackage(streams, wait, volumeId);

            await this.fetch(config.container.image);

            return config;
        } catch (err: any) {
            this.logger.error("Identify failed on volume", id);
            if (err instanceof SequenceAdapterError) {
                throw err;
            } else {
                throw new SequenceAdapterError("PRERUNNER_ERROR", err);
            }
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
    // eslint-disable-next-line complexity
    private async parsePackage(
        streams: DockerAdapterStreams,
        wait: Function,
        volumeId: DockerVolume
    ): Promise<DockerSequenceConfig> {
        const parseStart = new Date();

        const [preRunnerResult] = (await Promise.all([readStreamedJSON(streams.stdout as Readable), wait])) as any;

        const parseSecs = (new Date().getTime() - parseStart.getTime()) / 1000;

        appendFile("timing-log.ndjson", JSON.stringify({
            operation: "waiting for pre-runner",
            time: parseSecs,
        }) + "\n", () => {});

        this.logger.debug("PreRunner response", preRunnerResult);

        if (preRunnerResult && preRunnerResult.error) {
            this.logger.error("PreRunner failed", preRunnerResult.error);

            throw new SequenceAdapterError("PRERUNNER_ERROR", preRunnerResult.error);
        }

        const validPackageJson = await sequencePackageJSONDecoder.decodeToPromise(preRunnerResult);
        const engines = validPackageJson.engines ? { ...validPackageJson.engines } : {};
        const config = validPackageJson.scramjet?.config ? { ...validPackageJson.scramjet.config } : {};

        const container = Object.assign({}, this.config.runner);

        container.image = "python3" in engines
            ? this.config.runnerImages.python3
            : this.config.runnerImages.node;

        return {
            type: "docker",
            container,
            name: validPackageJson.name || "",
            version: validPackageJson.version || "",
            engines,
            config,
            sequenceDir: PACKAGE_DIR,
            entrypointPath: validPackageJson.main,
            id: volumeId,
            description: validPackageJson.description,
            author: validPackageJson.author,
            keywords: validPackageJson.keywords,
            args: validPackageJson.args,
            repository: validPackageJson.repository,
            language: detectLanguage(validPackageJson)
        };
    }

    /**
     * Removes Docker volume used by Sequence.
     *
     * @param {SequenceConfig} config Sequence configuration.
     */
    async remove(config: SequenceConfig) {
        if (config.type !== "docker") {
            throw new Error(`Incorrect SequenceConfig passed to DockerSequenceAdapter: ${config.type}`);
        }

        await this.dockerHelper.removeVolume(config.id);

        this.logger.debug("Volume removed", config.id);
    }
}

export { DockerSequenceAdapter };
