import { Duplex, PassThrough } from "stream";

import * as Dockerode from "dockerode";

import {
    DockerAdapterRunConfig,
    DockerAdapterRunResponse,
    DockerAdapterVolumeConfig,
    DockerVolume,
    DockerImage,
    DockerContainer,
    DockerHelper,
    DockerAdapterStreams
} from "./types";

export class DockerodeDockerHelper implements DockerHelper {
    dockerode: Dockerode;

    constructor() {
        this.dockerode = new Dockerode();
    }

    translateVolumesConfig(volumeConfigs: DockerAdapterVolumeConfig[]): { [k: string]: Dockerode.Volume } {
        const result: any = {};

        for (let cfg of volumeConfigs) {
            result[cfg.mountPoint] = this.dockerode.getVolume(cfg.volume);
        }

        return result;
    }

    createContainer(
        dockerImage: DockerImage,
        volumes: DockerAdapterVolumeConfig[] = [],
        binds: string[] = []
    ): Promise<DockerContainer> {
        return this.dockerode.createContainer({
            Image: dockerImage,
            AttachStdin: true,
            AttachStdout: true,
            AttachStderr: true,
            Tty: false,
            OpenStdin: true,
            StdinOnce: true,
            Volumes: this.translateVolumesConfig(volumes),
            HostConfig: {
                Binds: binds
            }
        }).then((container: Dockerode.Container) => container.id);
    }

    startContainer(containerId: DockerContainer): Promise<void> {
        return this.dockerode.getContainer(containerId).start();
    }

    stopContainer(containerId: DockerContainer): Promise<void> {
        return this.dockerode.getContainer(containerId).stop();
    }

    removeContainer(containerId: DockerContainer): Promise<void> {
        return this.dockerode.getContainer(containerId).remove();
    }

    execCommand(containerId: DockerContainer, command: string[]): Promise<DockerAdapterStreams> {
        const options = {
            AttachStdin: true,
            AttachStdout: true,
            AttachStderr: true,
            Tty: false,
            Detach: false,
            OpenStdin: false,
            StdinOnce: false,
            Cmd: command
        };

        const container = this.dockerode.getContainer(containerId);

        return container.exec(options).then((exec: Dockerode.Exec) => exec.start({
            hijack: true,
            Tty: false,
            stdin: true
        })).then((duplex: Duplex) => {
            const streams: DockerAdapterStreams = {
                stdin: new PassThrough().pipe(duplex),
                stdout: new PassThrough(),
                stderr: new PassThrough()
            };

            container.modem.demuxStream(duplex, streams.stdout, streams.stderr);

            duplex.on("close", () => {
                streams.stdout.emit("end");
                streams.stderr.emit("end");
            });

            return streams;
        });
    }

    createVolume(name: string = ""): Promise<DockerVolume> {
        return this.dockerode.createVolume({
            Name: name,
        }).then((volume: Dockerode.Volume) => volume.name);
    }

    removeVolume(volumeId: DockerVolume): Promise<void> {
        return this.dockerode.getVolume(volumeId).remove();
    }

    run(config: DockerAdapterRunConfig): Promise<DockerAdapterRunResponse> {
        return new Promise((resolve) => {
            this.createContainer(config.imageName, config.volumes, config.binds)
                .then(async (container) => {
                    await this.startContainer(container);

                    resolve({
                        streams: await this.execCommand(container, config.command),
                        stopAndRemove: () => this.stopContainer(container)
                            .then(() => this.removeContainer(container))
                    });
                });
        });
    }
}
