import * as Dockerode from "dockerode";
import { PassThrough } from "stream";
import { getLogger } from "@scramjet/logger";
import { Logger } from "@scramjet/types";

import {
    DockerAdapterRunConfig,
    DockerAdapterRunResponse,
    DockerAdapterStreams, DockerAdapterVolumeConfig,
    DockerAdapterWaitOptions,
    DockerContainer,
    IDockerHelper, DockerImage, DockerVolume, ExitData
} from "./types";

/**
 * Configuration for volumes to be mounted to container.
 */
type DockerodeVolumeMountConfig = {
    /**
     * Directory in container where volume has to be mounted.
     */
    Target: string,

    /**
     * Volume name.
     */
    Source: string,

    /**
     * Mounting mode.
     */
    Type: "volume" | "bind",

    /**
     * Access mode.
     */
    ReadOnly: boolean
}

/**
 * Communicates with Docker using Dockerode library.
 */
export class DockerodeDockerHelper implements IDockerHelper {
    dockerode: Dockerode = new Dockerode();
    logger: Logger = getLogger(this);

    /**
     * Translates DockerAdapterVolumeConfig to volumes configuration that Docker API can understand.
     *
     * @param volumeConfigs Volumes configuration,
     * @returns Translated volumes configuration.
     */
    translateVolumesConfig(volumeConfigs: DockerAdapterVolumeConfig[]): DockerodeVolumeMountConfig[] {
        return volumeConfigs.map(cfg => {
            if ("bind" in cfg) {
                return {
                    Target: cfg.mountPoint,
                    Source: cfg.bind,
                    Type: "bind",
                    ReadOnly: false
                };
            }

            return {
                Target: cfg.mountPoint,
                Source: cfg.volume,
                Type: "volume",
                ReadOnly: false
            };
        });
    }

    /**
     * Creates container based on provided parameters.
     *
     * @param containerCfg Image to start container from.
     * @returns Created container id.
     */
    async createContainer(
        containerCfg: {
            dockerImage: DockerImage,
            volumes: DockerAdapterVolumeConfig[],
            binds: string[],
            ports: any,
            envs: string[],
            autoRemove: boolean,
            maxMem: number, // TODO: Container configuration
            command?: string[],
            publishAllPorts: boolean,
            labels: { [key: string]: string }
        }
    ): Promise<DockerContainer> {
        containerCfg.ports = { ...containerCfg.ports };
        const config: Dockerode.ContainerCreateOptions = {
            Image: containerCfg.dockerImage,
            AttachStdin: true,
            AttachStdout: true,
            AttachStderr: true,
            Tty: false,
            OpenStdin: true,
            StdinOnce: true,
            Env: containerCfg.envs,
            ExposedPorts: containerCfg.ports.ExposedPorts,
            HostConfig: {
                Binds: containerCfg.binds,
                Mounts: this.translateVolumesConfig(containerCfg.volumes),
                AutoRemove: containerCfg.autoRemove || false,
                Memory: containerCfg.maxMem,
                MemorySwap: 0,
                PortBindings: containerCfg.ports.PortBindings,
                PublishAllPorts: containerCfg.publishAllPorts || false,
                NetworkMode: "host"
            },
            Labels: containerCfg.labels || {},
        };

        if (containerCfg.command) {
            config.Cmd = [...containerCfg.command];
        }

        const { id } = await this.dockerode.createContainer(config);

        return id;
    }

    /**
     * Start continer with provided id.
     *
     * @param containerId Container id.
     * @returns Promise resolving when container has been started.
     */
    startContainer(containerId: DockerContainer): Promise<void> {
        return this.dockerode.getContainer(containerId).start();
    }

    /**
     * Stops container with provided id.
     *
     * @param containerId Container id.
     * @returns Promise which resolves when the container has been stopped.
     */
    stopContainer(containerId: DockerContainer): Promise<void> {
        return this.dockerode.getContainer(containerId).stop();
    }

    /**
     * Forcefully removes container with provided id.
     *
     * @param containerId Container id.
     * @returns Promise which resolves when container has been removed.
     */
    removeContainer(containerId: DockerContainer): Promise<void> {
        return this.dockerode.getContainer(containerId).remove();
    }

    /**
     * Gets statistics from container with provided id.
     *
     * @param containerId Container id.
     * @returns Promise which resolves with container statistics.
     */
    stats(containerId: DockerContainer): Promise<Dockerode.ContainerStats> {
        return this.dockerode.getContainer(containerId).stats({ stream: false });
    }

    private async isImageInLocalRegistry(name: string): Promise<boolean> {
        return this.dockerode.getImage(name).get().then(() => true, () => false);
    }

    private pulledImages: {[key: string]: Promise<void> | undefined } = {};

    async pullImage(name: string, fetchOnlyIfNotExists = true) {
        if (fetchOnlyIfNotExists) {
            this.logger.log("Checking image", name);

            if (this.pulledImages[name]) return this.pulledImages[name];

            if (await this.isImageInLocalRegistry(name)) {
                this.pulledImages[name] = Promise.resolve();
                return this.pulledImages[name];
            }
        }

        this.pulledImages[name] = (async () => {
            this.logger.log("Start pulling image", name);

            const pullStream = await this.dockerode.pull(name);

            // Wait for pull to finish
            await new Promise(res => this.dockerode.modem.followProgress(pullStream, res));

            this.logger.log("Pulling image", name, "done.");
        })();

        return this.pulledImages[name];
    }

    /**
     * Creates docker volume.
     *
     * @param name Volume name. Optional. If not provided, volume will be named with unique name.
     * @returns Volume name.
     */
    async createVolume(name: string = ""): Promise<DockerVolume> {
        return this.dockerode.createVolume({
            Name: name,
            Labels: {
                "org.scramjet.host.is-sequence": "true"
            }
        }).then((volume: Dockerode.Volume) => {
            return volume.name;
        });
    }

    /**
     * Removes volume with specific name.
     *
     * @param volumeName Volume name.
     * @returns Promise which resolves when volume has been removed.
     */
    async removeVolume(volumeName: DockerVolume): Promise<void> {
        return this.dockerode.getVolume(volumeName).remove();
    }

    async listVolumes() {
        const { Volumes } = await this.dockerode.listVolumes({
            filters: { label: { "org.scramjet.host.is-sequence": true } }
        });

        return Volumes.map(volume => volume.Name);
    }

    /**
     * Attaches to container streams.
     *
     * @param container Container id.
     * @param opts Attach options.
     * @returns Object with container's standard I/O streams.
     */
    async attach(container: DockerContainer, opts: any): Promise<any> {
        return this.dockerode.getContainer(container).attach(opts);
    }

    /**
     * Starts container.
     *
     * @param config Container configuration.
     * @returns @see {DockerAdapterRunResponse}
     */
    async run(config: DockerAdapterRunConfig): Promise<DockerAdapterRunResponse> {
        const streams: DockerAdapterStreams = {
            stdin: new PassThrough(),
            stdout: new PassThrough(),
            stderr: new PassThrough()
        };
        // ------
        const container = await this.createContainer(
            {
                dockerImage: config.imageName,
                volumes: config.volumes || [],
                binds: config.binds || [],
                ports: config.ports,
                envs: config.envs || [],
                autoRemove: config.autoRemove || false,
                maxMem: (config.maxMem || 64) * 1024 * 1024,
                command: config.command,
                labels: config.labels || {},
                publishAllPorts: config.publishAllPorts || false,

            }
        );
        // ------
        const stream = await this.attach(container, {
            stream: true,
            stdin: true,
            stdout: true,
            stderr: true,
            hijack: true
        });

        stream.on("close", () => {
            streams.stdout.emit("end");
            streams.stderr.emit("end");
        });

        await this.startContainer(container);

        streams.stdin.pipe(stream);

        this.dockerode.getContainer(container)
            .modem.demuxStream(stream, streams.stdout, streams.stderr);

        return {
            streams: streams,
            containerId: container,
            wait: async () => this.wait(container, { condition: "not-running" })
        };
    }

    /**
     * Waits for container status change.
     *
     * @param container Container id.
     * @param options Condition to be fullfilled. @see {DockerAdapterWaitOptions}
     * @returns Container exit code.
     */
    async wait(container: DockerContainer, options: DockerAdapterWaitOptions): Promise<ExitData> {
        const containerExitResult = await this.dockerode.getContainer(container).wait(options);

        return { statusCode: containerExitResult.StatusCode };
    }
}
