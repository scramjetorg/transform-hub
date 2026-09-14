import { SequenceAdapterError } from "@scramjet/model";
import { IObjectLogger } from "@scramjet/runtime-types";
import { ISequenceAdapter, SequenceConfig } from "@scramjet/runtime-types";
import { STHConfiguration, DockerAdapterConfiguration } from "@scramjet/api-types";
import { DockerSequenceConfig } from "./types";
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
import { isDefined } from "@scramjet/utility";
import { ObjLogger } from "@scramjet/obj-logger";
import { sequencePackageJSONDecoder, detectLanguage, selectRunnerImageForEngines } from "@scramjet/adapters-common";

const PACKAGE_DIR = "/package";
const MAX_PRERUNNER_OUTPUT = 16 * 1024;
const MAX_PULL_ERROR_MESSAGE = 16 * 1024;

function getBoundedErrorMessage(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);

    return message.slice(0, MAX_PULL_ERROR_MESSAGE);
}

async function readBoundedStream(stream: Readable, limit = MAX_PRERUNNER_OUTPUT): Promise<string> {
    let output = "";
    for await (const chunk of stream) {
        if (output.length < limit) {
            output += chunk.toString().slice(0, limit - output.length);
        }
    }
    return output;
}

/**
 * Adapter for preparing Sequence to be run in Docker container.
 */
class DockerSequenceAdapter implements ISequenceAdapter {
    private dockerHelper: IDockerHelper;
    private resources: DockerAdapterResources = {};
    private dockerConfig: DockerAdapterConfiguration;

    public name = "DockerSequenceAdapter";

    /**
     * Instance of class providing logging utilities.
     */
    logger: IObjectLogger;

    constructor(config: STHConfiguration) {
        this.logger = new ObjLogger(this.name);

        this.dockerHelper = new DockerodeDockerHelper();
        this.dockerConfig = config.adapters.docker as unknown as DockerAdapterConfiguration;
        this.dockerHelper.logger.pipe(this.logger);
    }

    /**
     * Initializes adapter.
     */
    async init(): Promise<void> {
        this.logger.trace("Initializing");

        try {
            await this.fetch(this.dockerConfig.prerunner.image);
        } catch (error) {
            this.logger.error("Pre-runner image pull failed", {
                stage: "pre-runner-image-pull",
                image: this.dockerConfig.prerunner.image,
                error: getBoundedErrorMessage(error)
            });

            throw new SequenceAdapterError("DOCKER_ERROR");
        }

        this.logger.info("Docker adapter initialized with options", {
            "py runner image": this.dockerConfig.runnerImages.python3,
            "js runner image": this.dockerConfig.runnerImages.node,
            "prerunner image": this.dockerConfig.prerunner.image
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

        // TODO: Reimplement this using a local mount instead of volume

        try {
            const { streams, wait } = await this.dockerHelper.run({
                imageName: this.dockerConfig.prerunner?.image || "",
                volumes: [{ mountPoint: PACKAGE_DIR, volume, writeable: true }],
                command: ["/opt/transform-hub/identify.sh"],
                autoRemove: true,
                maxMem: this.dockerConfig.prerunner?.maxMem || 0
            });

            this.logger.debug("Identify started", volume, this.dockerConfig.prerunner?.maxMem || 0);

            const ret = await this.parsePackage(streams, wait, volume, this.dockerConfig.prerunner?.image || "");

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

        this.logger.debug("Starting PreRunner", this.dockerConfig.prerunner);

        try {
            runResult = await this.dockerHelper.run({
                imageName: this.dockerConfig.prerunner.image || "",
                volumes: [{ mountPoint: PACKAGE_DIR, volume: volumeId, writeable: true }],
                autoRemove: true,
                maxMem: this.dockerConfig.prerunner.maxMem || 0
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

            const config = await this.parsePackage(streams, wait, volumeId, this.dockerConfig.prerunner.image || "");

            try {
                await this.fetch(config.container.image);
            } catch (err: any) {
                this.logger.error("Runner image fetch failed", {
                    stage: "runner-image-fetch",
                    image: config.container.image,
                    volume: volumeId,
                    error: err?.message || String(err)
                });
                throw new SequenceAdapterError("DOCKER_ERROR", {
                    stage: "runner-image-fetch",
                    image: config.container.image,
                    volume: volumeId,
                    error: err?.message || String(err)
                });
            }

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
        } catch {
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
    private async parsePackage(
        streams: DockerAdapterStreams,
        wait: Function,
        volumeId: DockerVolume,
        image: string
    ): Promise<DockerSequenceConfig> {
        const parseStart = new Date();

        const [stdout, stderr, exitResult] = await Promise.all([
            readBoundedStream(streams.stdout as Readable),
            readBoundedStream(streams.stderr as Readable),
            wait()
        ]);

        const diagnostics = {
            stage: "pre-runner",
            image,
            volume: volumeId,
            status: exitResult?.statusCode,
            stdout,
            stderr
        };

        if (exitResult?.statusCode !== 0) {
            this.logger.error("PreRunner exited with a non-zero status", diagnostics);
            throw new SequenceAdapterError("PRERUNNER_ERROR", diagnostics);
        }

        let preRunnerResult: any;
        try {
            preRunnerResult = JSON.parse(stdout);
        } catch (err) {
            this.logger.error("PreRunner returned invalid JSON", diagnostics);
            throw new SequenceAdapterError("PRERUNNER_ERROR", {
                ...diagnostics,
                error: err instanceof Error ? err.message : String(err)
            });
        }

        const parseSecs = (new Date().getTime() - parseStart.getTime()) / 1000;

        appendFile("timing-log.ndjson", JSON.stringify({
            operation: "waiting for pre-runner",
            time: parseSecs,
        }) + "\n", () => {});

        this.logger.debug("PreRunner response", preRunnerResult);

        if (preRunnerResult && preRunnerResult.error) {
            this.logger.error("PreRunner failed", preRunnerResult.error);

            throw new SequenceAdapterError("PRERUNNER_ERROR", { ...diagnostics, error: preRunnerResult.error });
        }

        const validPackageJson = await sequencePackageJSONDecoder.decodeToPromise(preRunnerResult);
        const engines = validPackageJson.engines ? { ...validPackageJson.engines } : {};
        const config = validPackageJson.scramjet?.config ? { ...validPackageJson.scramjet.config } : {};

        const container = Object.assign({}, this.dockerConfig.runner);

        container.image = selectRunnerImageForEngines(engines, this.dockerConfig.runnerImages);

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
