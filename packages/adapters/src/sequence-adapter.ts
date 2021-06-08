import { imageConfig } from "@scramjet/csi-config";
import { getLogger } from "@scramjet/logger";
import { SupervisorError } from "@scramjet/model";
import {
    IComponent,
    ILifeCycleAdapterMain,
    ILifeCycleAdapterIdentify,
    Logger,
    MaybePromise,
    RunnerConfig
} from "@scramjet/types";
import { rmdir } from "fs/promises";
import { StringDecoder } from "string_decoder";
import { DataStream } from "scramjet";
import { Readable } from "stream";
import { DockerodeDockerHelper } from "./dockerode-docker-helper";
import { DockerAdapterResources, DockerAdapterRunResponse, DockerAdapterStreams, IDockerHelper } from "./types";

class LifecycleDockerAdapterSequence implements
ILifeCycleAdapterMain,
ILifeCycleAdapterIdentify,
IComponent {
    private dockerHelper: IDockerHelper;

    private imageConfig: {
        runner?: string,
        prerunner?: string
    } = {};

    private resources: DockerAdapterResources = {};

    logger: Logger;

    constructor() {
        this.dockerHelper = new DockerodeDockerHelper();
        this.logger = getLogger(this);
    }

    async init(): Promise<void> {
        this.imageConfig = await imageConfig();
    }

    async list(): Promise<RunnerConfig[]> {
        const potentialVolumes = await this.dockerHelper.listVolumes();
        const res = await DataStream.from(potentialVolumes)
            .setOptions({ maxParallel: 8 }) // config?
            .map(volumeName => this.identifyOnly(volumeName))
            .catch(() => undefined)
            // eslint-disable-next-line no-extra-parens
            .toArray()
        ;

        return res;
    }

    async identifyOnly(volume: string): Promise<RunnerConfig> {
        this.logger.info(`Attempting to identify volume: ${volume}`);
        try {
            const { streams, wait } = await this.dockerHelper.run({
                imageName: this.imageConfig.prerunner || "",
                volumes: [
                    { mountPoint: "/package", volume },
                ],
                command: ["/app/identify.sh"],
                autoRemove: true
            });

            this.logger.debug(`Prerunner identify started for: ${volume}`);

            const ret = await this.parsePackage(streams, wait);

            this.logger.debug(`Identified volume ${volume} as to be run with ${ret.image}`);

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

    async identify(stream: Readable): Promise<RunnerConfig> {
        try {
            this.resources.volumeId = await this.dockerHelper.createVolume();

            this.logger.log("Volume created. Id: ", this.resources.volumeId);
        } catch (error) {
            throw new SupervisorError("DOCKER_ERROR", "Error creating volume");
        }

        let runResult: DockerAdapterRunResponse;

        try {
            runResult = await this.dockerHelper.run({
                imageName: this.imageConfig.prerunner || "",
                volumes: [
                    { mountPoint: "/package", volume: this.resources.volumeId }
                ],
                autoRemove: true
            });
        } catch {
            throw new SupervisorError("DOCKER_ERROR");
        }

        try {
            const { streams, wait } = runResult;

            stream.pipe(streams.stdin);

            return await this.parsePackage(streams, wait);
        } catch {
            throw new SupervisorError("PRERUNNER_ERROR", "Unable to parse data from pre-runner");
        }
    }

    private async parsePackage(streams: DockerAdapterStreams, wait: Function) {
        const [res] = await Promise.all([
            this.readStreamedJSON(streams.stdout as Readable),
            wait
        ]);
        const engines = res.engines ? { ...res.engines } : {};
        const config = res.config ? { ...res.config } : {};

        return {
            image: this.imageConfig.runner || "",
            version: res.version || "",
            engines,
            config,
            sequencePath: res.main,
            packageVolumeId: this.resources.volumeId
        };
    }

    cleanup(): MaybePromise<void> {
        return new Promise(async (resolve) => {
            if (this.resources.volumeId) {
                this.logger.log("Volume will be removed in 1 sec");

                await new Promise(res => setTimeout(res, 1000));
                await this.dockerHelper.removeVolume(this.resources.volumeId);

                this.logger.log("Volume removed");
            }

            if (this.resources.fifosDir) {
                await rmdir(this.resources.fifosDir, { recursive: true });

                this.logger.log("Fifo folder removed");
            }

            resolve();
        });
    }

    // @ts-ignore
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async remove() {
        if (this.resources.containerId) {
            this.logger.info("Forcefully stopping containter", this.resources.containerId);

            await this.dockerHelper.stopContainer(this.resources.containerId);

            this.logger.info("Container removed");
        }
    }
}

export { LifecycleDockerAdapterSequence };
