import { getLogger } from "@scramjet/logger";
import { SupervisorError } from "@scramjet/model";
import {
    ISequenceAdapter,
    Logger,
    SequenceConfig,
    PreRunnerContainerConfiguration,
    STHConfiguration,
    isValidSequencePackageJSON,
    ISequenceInfo
} from "@scramjet/types";
import { Readable } from "stream";
import { DockerodeDockerHelper } from "./dockerode-docker-helper";
import { DockerAdapterResources, DockerAdapterRunResponse, DockerAdapterStreams, DockerVolume, IDockerHelper } from "./types";
import { isDefined, readStreamedJSON } from "@scramjet/utility";
import { DockerSequenceConfig } from "@scramjet/types";
import { SequenceInfo } from "./sequence-info";

class DockerSequenceAdapter implements ISequenceAdapter {
    private dockerHelper: IDockerHelper;

    private prerunnerConfig?: PreRunnerContainerConfiguration;

    private resources: DockerAdapterResources = {};

    private containersConfiguration: STHConfiguration["docker"];

    private logger: Logger;

    private computedInfo: ISequenceInfo | null = null

    constructor(config: STHConfiguration["docker"], info?: ISequenceInfo) {
        this.containersConfiguration = config;
        this.prerunnerConfig = config.prerunner;

        if(info && info.getConfig().type !== 'docker') {
            throw new Error('Invalid info config for DockerSequenceAdapter')
        }
        this.computedInfo = info ?? null;

        this.dockerHelper = new DockerodeDockerHelper();
        this.logger = getLogger(this);
    }


    public get info(): ISequenceInfo {
        if(!this.computedInfo) {
            throw new Error('Sequence not identified yet');
        }

        return this.computedInfo
    }

    async init(): Promise<void> {
        this.logger.log("DockerSequenceAdapter init.");

        await this.fetch(this.containersConfiguration.prerunner.image);

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
        )

        return configs  
            .filter(isDefined)
            .map((config) => new SequenceInfo(config))
            .map((info) => new DockerSequenceAdapter(this.containersConfiguration, info))
    }

    private async identifyOnly(volume: string): Promise<SequenceConfig | undefined> {
        this.logger.info(`Attempting to identify volume: ${volume}`);

        try {
            const { streams, wait } = await this.dockerHelper.run({
                imageName: this.prerunnerConfig?.image || "",
                volumes: [
                    { mountPoint: "/package", volume },
                ],
                command: ["/app/identify.sh"],
                autoRemove: true,
                maxMem: this.prerunnerConfig?.maxMem || 0
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

        this.logger.log("Starting PreRunner", this.prerunnerConfig);

        try {
            runResult = await this.dockerHelper.run({
                imageName: this.prerunnerConfig?.image || "",
                volumes: [
                    { mountPoint: "/package", volume: volumeId }
                ],
                autoRemove: true,
                maxMem: this.prerunnerConfig?.maxMem || 0
            });
        } catch {
            throw new SupervisorError("DOCKER_ERROR");
        }

        try {
            const { streams, wait, containerId } = runResult;

            this.resources.containerId = containerId;

            stream.pipe(streams.stdin);

            const runnerConfig = await this.parsePackage(streams, wait, volumeId);

            this.resources.containerId = undefined;

            await this.fetch(runnerConfig.container.image)

            this.computedInfo = new SequenceInfo(runnerConfig)
        } catch {
            throw new SupervisorError("PRERUNNER_ERROR", "Unable to parse data from pre-runner");
        }
    }

    private async createVolume(id: string): Promise<DockerVolume> {
        try {
            return await this.dockerHelper.createVolume(id);
        } catch (error: any) {
            throw new SupervisorError("DOCKER_ERROR", "Error creating volume");
        }
    }

    private async parsePackage(streams: DockerAdapterStreams, wait: Function, volumeId: DockerVolume): Promise<DockerSequenceConfig> {
        const [packageJson] = await Promise.all([
            readStreamedJSON(streams.stdout as Readable),
            wait
        ]);
   
        if(!isValidSequencePackageJSON(packageJson)) {
            throw new Error('Invalid Scramjet sequence package.json')
        }

        const engines = packageJson.engines ? { ...packageJson.engines } : {};
        const config = packageJson.scramjet?.config ? { ...packageJson.scramjet.config } : {};

        return {
            type: 'docker',
            container: this.containersConfiguration.runner,
            name: packageJson.name || "",
            version: packageJson.version || "",
            engines,
            config,
            sequencePath: packageJson.main,
            id: volumeId,
        };
    }

    async cleanup(): Promise<void> {
        await this.dockerHelper.removeVolume(this.info.getId());

        this.logger.debug("Volume removed.");
    }

    async remove() {
        if (this.resources.containerId) {
            this.logger.info("Forcefully stopping containter", this.resources.containerId);

            await this.dockerHelper.stopContainer(this.resources.containerId);

            this.logger.info("Container removed.");
        }
    }
}

export { DockerSequenceAdapter };
