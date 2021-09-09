import { configService } from "@scramjet/sth-config";
import { getLogger } from "@scramjet/logger";
import { HostError, SupervisorError } from "@scramjet/model";
import {
    IComponent,
    ILifeCycleAdapterMain,
    ILifeCycleAdapterIdentify,
    Logger,
    RunnerConfig,
    ContainerConfiguration
} from "@scramjet/types";
import { StringDecoder } from "string_decoder";
import { DataStream } from "scramjet";
import { Readable } from "stream";
import { DockerodeDockerHelper } from "./dockerode-docker-helper";
import { DockerAdapterRunResponse, DockerAdapterStreams, DockerVolume, IDockerHelper } from "./types";

class LifecycleDockerAdapterSequence implements
    ILifeCycleAdapterMain,
    ILifeCycleAdapterIdentify,
    IComponent {
    private dockerHelper: IDockerHelper;

    private prerunnerConfig?: ContainerConfiguration;

    logger: Logger;

    constructor() {
        this.dockerHelper = new DockerodeDockerHelper();
        this.logger = getLogger(this);
    }

    async init(): Promise<void> {
        this.logger.info("Docker sequence adapter init");
        this.prerunnerConfig = configService.getDockerConfig().prerunner;
        try {
            await this.dockerHelper.pullImage(this.prerunnerConfig.image, true);
        } catch (error) {
            throw new HostError(
                "ADAPTER_INTIALIZATION_ERROR",
                { reason: "Docker pull image failed", error }
            );
        }
        this.logger.info("Docker sequence adapter done");
    }

    async fetch(config: RunnerConfig) {
        if (config.container.image) {
            await this.dockerHelper.pullImage(config.container.image, true);
        }
    }

    async list(): Promise<RunnerConfig[]> {
        const potentialVolumes = await this.dockerHelper.listVolumes();

        return DataStream.from(potentialVolumes)
            .setOptions({ maxParallel: 8 }) // config?
            .map(volumeName => this.identifyOnly(volumeName))
            .catch(() => undefined)
            .toArray();
    }

    async identifyOnly(volume: string): Promise<RunnerConfig | undefined> {
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

            if (!ret.packageVolumeId) {
                return undefined;
            }

            this.logger.info(`Identified volume ${volume} as to be run with ${ret.image}`);

            return ret;
        } catch {
            this.logger.error("Docker failed!");
            throw new SupervisorError("DOCKER_ERROR");
        }
    }

    private async readStreamedJSON(readable: Readable): Promise<any> {
        const decoder = new StringDecoder("utf-8");

        let out = "";

        for await (const chunk of readable) {
            out += decoder.write(chunk);
        }

        out += decoder.end();

        return JSON.parse(out);
    }

    async identify(stream: Readable, id: string): Promise<RunnerConfig> {
        const volumeId = await this.createVolume(id);

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
            const { streams, wait } = runResult;

            stream.pipe(streams.stdin);

            return await this.parsePackage(streams, wait, volumeId);
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

    private async parsePackage(streams: DockerAdapterStreams, wait: Function, volumeId: DockerVolume) {
        const [res] = await Promise.all([
            this.readStreamedJSON(streams.stdout as Readable),
            wait
        ]);
        const engines = res.engines ? { ...res.engines } : {};
        const config = res.config ? { ...res.config } : {};

        if (res.error) {
            await this.remove({ packageVolumeId: volumeId });
            return res;
        }

        return {
            container: configService.getDockerConfig().runner,
            name: res.name || "",
            version: res.version || "",
            engines,
            config,
            sequencePath: res.main,
            packageVolumeId: volumeId
        };
    }

    cleanup() {
        return;
    }

    async remove({ packageVolumeId }: {packageVolumeId: string}) {
        this.logger.info("Removing sequence data", packageVolumeId);
        await this.dockerHelper.removeVolume(packageVolumeId);
        this.logger.info("Sequence data removed");
    }
}

export { LifecycleDockerAdapterSequence };
