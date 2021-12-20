import { development } from "@scramjet/sth-config";
import { getLogger } from "@scramjet/logger";
import { SupervisorError } from "@scramjet/model";
import {
    ContainerConfiguration,
    ContainerConfigurationWithExposedPorts,
    ExitCode,
    IComponent,
    ILifeCycleAdapterMain,
    ILifeCycleAdapterRun,
    Logger,
    MonitoringMessageData,
    SequenceConfig,
    RunnerContainerConfiguration,
} from "@scramjet/types";
import * as path from "path";
import { DockerodeDockerHelper } from "./dockerode-docker-helper";
import { DockerAdapterResources, DockerAdapterRunPortsConfig, DockerAdapterVolumeConfig, IDockerHelper } from "./types";
import { FreePortsFinder, defer } from "@scramjet/utility";

class DockerInstanceAdapter implements
ILifeCycleAdapterMain,
ILifeCycleAdapterRun,
IComponent {
    private dockerHelper: IDockerHelper;

    private resources: DockerAdapterResources = {};

    logger: Logger;

    constructor() {
        this.dockerHelper = new DockerodeDockerHelper();

        this.logger = getLogger(this);
    }

    async init(): Promise<void> {
        // noop
    }

    private async preparePortBindingsConfig(
        declaredPorts: string[],
        containerConfig: ContainerConfiguration & ContainerConfigurationWithExposedPorts,
        exposed = false) {
        if (declaredPorts.every(entry => (/^\d{3,5}\/(tcp|udp)$/).test(entry))) {
            const freePorts = exposed ? [] : await FreePortsFinder.getPorts(
                declaredPorts.length, ...containerConfig.exposePortsRange
            );

            return declaredPorts.reduce((obj: { [ key: string ]: any }, entry: string) => {
                if (entry) {
                    const { port, protocol } = entry.match(/^(?<port>\d{3,5})\/(?<protocol>(tcp|udp))$/)?.groups as { port: string, protocol: string };

                    obj[`${port}/${protocol}`] = exposed ? {} : [{ HostIp: containerConfig.hostIp, HostPort: freePorts?.pop()?.toString() }];
                }

                return obj;
            }, {});
        }

        throw new SupervisorError("INVALID_CONFIGURATION", "Incorrect ports configuration provided.");
    }

    private async getPortsConfig(
        ports: string[], containerConfig: RunnerContainerConfiguration
    ): Promise<DockerAdapterRunPortsConfig> {
        const [ExposedPorts, PortBindings] = await Promise.all([
            this.preparePortBindingsConfig(ports, containerConfig, true),
            this.preparePortBindingsConfig(ports, containerConfig, false)
        ]);

        return { ExposedPorts, PortBindings };
    }

    async stats(msg: MonitoringMessageData): Promise<MonitoringMessageData> {
        if (this.resources.containerId) {
            const stats = await this.dockerHelper.stats(this.resources.containerId)!;

            return {
                cpuTotalUsage: stats.cpu_stats?.cpu_usage?.total_usage,
                healthy: msg.healthy,
                limit: stats.memory_stats?.limit,
                memoryMaxUsage: stats.memory_stats?.max_usage,
                memoryUsage: stats.memory_stats?.usage,
                networkRx: stats.networks?.eth0?.rx_bytes,
                networkTx: stats.networks?.eth0?.tx_bytes,
                containerId: this.resources.containerId
            };
        }

        return msg;
    }

    // eslint-disable-next-line complexity
    async run(config: SequenceConfig, instancesServerPort: number, instanceId: string): Promise<ExitCode> {
        if (config.type !== "docker") {
            throw new Error("Docker instance adapter run with invalid runner config");
        }

        this.resources.ports =
            config.config?.ports ? await this.getPortsConfig(config.config.ports, config.container) : undefined;

        this.logger.info("Instance preparation done.");

        const extraVolumes: DockerAdapterVolumeConfig[] = [];

        if (development()) {
            this.logger.debug("Development mode on.");

            if (process.env.CSI_COREDUMP_VOLUME) {
                this.logger.debug("CSI_COREDUMP_VOLUME", process.env.CSI_COREDUMP_VOLUME);

                extraVolumes.push({
                    mountPoint: "/cores",
                    bind: process.env.CSI_COREDUMP_VOLUME
                });
            }
        }

        this.logger.log("Starting Runner...", config.container);

        const { containerId } = await this.dockerHelper.run({
            imageName: config.container.image,
            volumes: [
                ...extraVolumes,
                { mountPoint: "/package", volume: config.id }
            ],
            labels: {
                "scramjet.sequence.name": config.name
            },
            ports: this.resources.ports,
            publishAllPorts: true,
            envs: [
                `SEQUENCE_PATH=${path.join("/package", config.entrypointPath)}`,
                `DEVELOPMENT=${process.env.DEVELOPMENT ?? ""}`,
                `PRODUCTION=${process.env.PRODUCTION ?? ""}`,
                `INSTANCES_SERVER_PORT=${instancesServerPort}`,
                `INSTANCE_ID=${instanceId}`
            ],
            autoRemove: true,
            maxMem: config.container.maxMem,
        });

        this.resources.containerId = containerId;

        this.logger.log(`Container is running (${containerId}).`);

        try {
            const { statusCode } = await this.dockerHelper.wait(containerId);

            this.logger.log("Container exited.");

            if (statusCode > 0) {
                throw new SupervisorError("RUNNER_NON_ZERO_EXITCODE", { statusCode });
            } else {
                return 0;
            }
        } catch (error: any) {
            if (error instanceof SupervisorError && error.code === "RUNNER_NON_ZERO_EXITCODE" && error.data.statusCode) {
                this.logger.debug("Container returned non-zero status code", error.data.statusCode);

                return error.data.statusCode;
            }

            this.logger.debug("Container errored.", error);
            throw error;
        }
    }

    async cleanup(): Promise<void> {
        if (this.resources.volumeId) {
            this.logger.log("Volume will be removed in 1 sec");

            await defer(60000);
            await this.dockerHelper.removeVolume(this.resources.volumeId);

            this.logger.log("Volume removed");
        }
    }

    // @ts-ignore
    monitorRate(_rps: number): this {
        /** ignore */
    }

    async remove() {
        if (this.resources.containerId) {
            this.logger.log("Forcefully stopping containter", this.resources.containerId);

            await this.dockerHelper.stopContainer(this.resources.containerId);

            this.logger.log("Container removed.");
        }
    }
}

export { DockerInstanceAdapter };
