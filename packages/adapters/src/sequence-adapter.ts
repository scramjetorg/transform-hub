import { development, imageConfig } from "@scramjet/csi-config";
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
import { Readable } from "stream";
import { DockerodeDockerHelper, DockerAdapterResources, DockerAdapterRunResponse, IDockerHelper } from ".";

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

    identify(stream: Readable): MaybePromise<RunnerConfig> {
        return new Promise(async (resolve) => {
            const volumes = [];

            if (development() && process.env.HOT_VOLUME) {
                volumes.push(
                    ...process.env.HOT_VOLUME
                        .split(",")
                        .map((volume) => volume.split(":"))
                        .map(([bind, mountPoint]) => ({ mountPoint, bind }))
                );

                this.logger.warn("Using hot volume configuration", volumes);
            } else {
                this.logger.info("No hacks", development(), process.env.HOT_VOLUME);
            }

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
                        { mountPoint: "/package", volume: this.resources.volumeId },
                        ...volumes
                    ],
                    autoRemove: true
                });
            } catch {
                throw new SupervisorError("DOCKER_ERROR");
            }

            const { streams, wait } = runResult;

            stream.pipe(streams.stdin);

            const preRunnerResponseChunks: Uint8Array[] = [];

            streams.stdout
                .on("data", (chunk) => {
                    preRunnerResponseChunks.push(Buffer.from(chunk));
                })
                .on("error", () => {
                    throw new SupervisorError("PRERUNNER_ERROR");
                })
                .on("end", async () => {
                    const res = JSON.parse(Buffer.concat(preRunnerResponseChunks).toString("utf8"));

                    resolve({
                        image: this.imageConfig.runner || "",
                        version: res.version || "",
                        engines: {
                            ...res.engines
                        },
                        sequencePath: res.main,
                        packageVolumeId: this.resources.volumeId
                    });
                });

            await wait();
        });
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
