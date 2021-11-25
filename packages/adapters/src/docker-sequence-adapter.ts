import { getLogger } from "@scramjet/logger";
import { SupervisorError } from "@scramjet/model";
import {
    ISequenceAdapter,
    Logger,
    SequenceConfig,
    STHConfiguration,
    SequenceInfo,
    DockerSequenceConfig,
} from "@scramjet/types";
import { Readable } from "stream";
import { DockerodeDockerHelper } from "./dockerode-docker-helper";
import { DockerAdapterResources, DockerAdapterRunResponse, DockerAdapterStreams, DockerVolume, IDockerHelper } from "./types";
import { isDefined, readStreamedJSON } from "@scramjet/utility";
import { isValidSequencePackageJSON } from "./validate-sequence-package-json";

class DockerSequenceAdapter implements ISequenceAdapter {
    private dockerHelper: IDockerHelper;
    private resources: DockerAdapterResources = {};

    private logger: Logger;

    private computedInfo: SequenceInfo | null = null

    constructor(private config: STHConfiguration, info?: SequenceInfo) {
        if (info && info.config.type !== "docker") {
            throw new Error("Invalid info config for DockerSequenceAdapter");
        }
        this.computedInfo = info ?? null;

        this.dockerHelper = new DockerodeDockerHelper();
        this.logger = getLogger(this);
    }

    public get info(): SequenceInfo {
        if (!this.computedInfo) {
            throw new Error("Sequence not identified yet");
        }

        return this.computedInfo;
    }

    async init(): Promise<void> {
        this.logger.log("DockerSequenceAdapter init.");

        await this.fetch(this.config.docker.prerunner.image);

        this.logger.info("DockerSequenceAdapter initiazation done.");
    }

    async fetch(name: string) {
        await this.dockerHelper.pullImage(name, true);
    }

    async list(): Promise<DockerSequenceAdapter[]> {
        const potentialVolumes = await this.dockerHelper.listVolumes();

        const configs = await Promise.all(
            potentialVolumes
                .map((volume) => this.identifyOnly(volume))
                .map((configPromised) => configPromised.catch(() => null))
        );

        return configs
            .filter(isDefined)
            .map((config): SequenceInfo => ({ id: config.id, config, instances: new Set() }))
            .map((info) => new DockerSequenceAdapter(this.config, info));
    }

    private async identifyOnly(volume: string): Promise<SequenceConfig | undefined> {
        this.logger.info(`Attempting to identify volume: ${volume}`);

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

            const ret = await this.parsePackage(streams, wait, volume);

            if (!ret.id) {
                return undefined;
            }

            this.logger.info(`Identified volume ${volume} as to be run with ${ret.container?.image}`);

            return ret;
        } catch {
            this.logger.error("Docker failed!");
            throw new SupervisorError("DOCKER_ERROR");
        }
    }

    async identify(stream: Readable, id: string): Promise<void> {
        const volumeId = await this.createVolume(id);

        this.resources.volumeId = volumeId;
        this.logger.log("Volume created. Id: ", volumeId);

        let runResult: DockerAdapterRunResponse;

        this.logger.log("Starting PreRunner", this.config);

        try {
            runResult = await this.dockerHelper.run({
                imageName: this.config.docker.prerunner.image || "",
                volumes: [
                    { mountPoint: "/package", volume: volumeId }
                ],
                autoRemove: true,
                maxMem: this.config.docker.prerunner.maxMem || 0
            });
        } catch (err) {
            this.logger.error(err);
            throw new SupervisorError("DOCKER_ERROR");
        }

        try {
            const { streams, wait, containerId } = runResult;

            this.resources.containerId = containerId;

            stream.pipe(streams.stdin);

            const config = await this.parsePackage(streams, wait, volumeId);

            this.resources.containerId = undefined;

            await this.fetch(config.container.image);

            this.computedInfo = { id: config.id, config, instances: new Set() };
        } catch (err) {
            this.logger.error(err);
            throw new SupervisorError("PRERUNNER_ERROR", err);
        }
    }

    private async createVolume(id: string): Promise<DockerVolume> {
        try {
            return await this.dockerHelper.createVolume(id);
        } catch (error: any) {
            throw new SupervisorError("DOCKER_ERROR", "Error creating volume");
        }
    }

    private async parsePackage(
        streams: DockerAdapterStreams,
        wait: Function,
        volumeId: DockerVolume
    ): Promise<DockerSequenceConfig> {
        const [packageJson] = await Promise.all([
            readStreamedJSON(streams.stdout as Readable),
            wait
        ]);

        if (!isValidSequencePackageJSON(packageJson)) {
            throw new Error("Invalid Scramjet sequence package.json");
        }

        const engines = packageJson.engines ? { ...packageJson.engines } : {};
        const config = packageJson.scramjet?.config ? { ...packageJson.scramjet.config } : {};

        return {
            type: "docker",
            container: this.config.docker.runner,
            name: packageJson.name || "",
            version: packageJson.version || "",
            engines,
            config,
            entrypointPath: packageJson.main,
            id: volumeId,
        };
    }

    async remove() {
        if (this.resources.containerId) {
            this.logger.info("Forcefully stopping containter", this.resources.containerId);

            await this.dockerHelper.stopContainer(this.resources.containerId);

            this.logger.info("Container removed.");
        }

        await this.dockerHelper.removeVolume(this.info.id);

        this.logger.debug("Volume removed.");
    }
}

export { DockerSequenceAdapter };
