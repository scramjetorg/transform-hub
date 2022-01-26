import { development } from "@scramjet/sth-config";
import { InstanceAdapterError } from "@scramjet/model";
import {
    ContainerConfiguration,
    ContainerConfigurationWithExposedPorts,
    ExitCode,
    IComponent,
    ILifeCycleAdapterMain,
    ILifeCycleAdapterRun,
    IObjectLogger,
    MonitoringMessageData,
    SequenceConfig,
    RunnerContainerConfiguration,
} from "@scramjet/types";
import path from "path";
import { DockerodeDockerHelper } from "./dockerode-docker-helper";
import { DockerAdapterResources, DockerAdapterRunPortsConfig, DockerAdapterVolumeConfig, IDockerHelper } from "./types";
import { FreePortsFinder, defer } from "@scramjet/utility";
import { STH_DOCKER_NETWORK, isHostSpawnedInDockerContainer, getHostname } from "./docker-networking";
import { ObjLogger } from "@scramjet/obj-logger";

/**
 * Adapter for running Instance by Runner executed in Docker container.
 */
class DockerInstanceAdapter implements
ILifeCycleAdapterMain,
ILifeCycleAdapterRun,
IComponent {
    private dockerHelper: IDockerHelper;

    private resources: DockerAdapterResources = {};

    logger: IObjectLogger;

    constructor() {
        this.dockerHelper = new DockerodeDockerHelper();

        this.logger = new ObjLogger(this);
        this.dockerHelper.logger.pipe(this.logger);
    }

    async init(): Promise<void> {
        /** ignore */
    }

    /**
     * Finds free port for every port requested in Sequence configuration and returns map of assigned ports.
     *
     * @param {string[]} declaredPorts Ports declared in sequence config.
     * @param {ContainerConfigurationWithExposedPorts} containerConfig Container configuration
     * extended with configuration for ports exposing.
     * @param {boolean} [exposed=false] Defines configuration output type. Exposed ports when true or port bindings.
     *
     * @returns Promise resolving with map of ports mapping.
     */
    private async preparePortBindingsConfig(
        declaredPorts: string[],
        containerConfig: ContainerConfiguration & ContainerConfigurationWithExposedPorts,
        exposed: boolean = false): Promise<{ [key: string]: string; }> {
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

        throw new InstanceAdapterError("INVALID_CONFIGURATION", "Incorrect ports configuration provided.");
    }

    /**
     * Prepares configuration for expose/bind ports from Docker container.
     *
     * @param {string[]} ports Ports requested to be accessible from container.
     * @param {RunnerContainerConfiguration} containerConfig Runner container configuration.
     *
     * @returns Configuration for exposing and binding ports in Docker container.
     */
    private async getPortsConfig(
        ports: string[], containerConfig: RunnerContainerConfiguration
    ): Promise<DockerAdapterRunPortsConfig> {
        const [ExposedPorts, PortBindings] = await Promise.all([
            this.preparePortBindingsConfig(ports, containerConfig, true),
            this.preparePortBindingsConfig(ports, containerConfig, false)
        ]);

        return { ExposedPorts, PortBindings };
    }

    /**
     * Returns objects with statistics of docker container with running instance.
     *
     * @param {MonitoringMessageData} msg Message to be included in statistics message.
     * @returns {Promise<MonitoringMessageData>} Promise resolved with container statistics.
     */
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

    private async getNetworkSetup(): Promise<{ network: string, host: string }> {
        const interfaces = await this.dockerHelper.listNetworks();
        const sthDockerNetwork = interfaces.find(net => net.Name === STH_DOCKER_NETWORK);

        if (!sthDockerNetwork) {
            // STH docker network should be created in Host intitialization
            throw new Error(`Couldn't find sth docker network: ${sthDockerNetwork}`);
        }

        if (await isHostSpawnedInDockerContainer()) {
            const hostname = getHostname();

            // If Transform Hub runs in Docker container
            // then this container should be connected to STH docker network in Host initialization

            this.logger.debug("Runner will connect to STH container with hostname", hostname);

            return {
                network: STH_DOCKER_NETWORK,
                host: hostname,
            };
        }
        // otherwise STH runs on Host OS so we Runner can just connect to the Gateway
        const sthNetworkGateway = sthDockerNetwork?.IPAM?.Config?.[0]?.Gateway;

        if (!sthNetworkGateway) {
            throw new Error(`Couldn't determine gateway for ${STH_DOCKER_NETWORK}`);
        }

        this.logger.debug("Runner will connect to STH on host OS using gateway", sthNetworkGateway);

        return {
            network: STH_DOCKER_NETWORK,
            host: sthNetworkGateway
        };
    }

    // eslint-disable-next-line complexity
    async run(config: SequenceConfig, instancesServerPort: number, instanceId: string): Promise<ExitCode> {
        if (config.type !== "docker") {
            throw new Error("Docker instance adapter run with invalid runner config");
        }

        this.resources.ports =
            config.config?.ports ? await this.getPortsConfig(config.config.ports, config.container) : undefined;

        this.logger.info("Instance preparation done");

        const extraVolumes: DockerAdapterVolumeConfig[] = [];

        if (development()) {
            this.logger.debug("Development mode on");

            if (process.env.CSI_COREDUMP_VOLUME) {
                this.logger.debug("CSI_COREDUMP_VOLUME", process.env.CSI_COREDUMP_VOLUME);

                extraVolumes.push({
                    mountPoint: "/cores",
                    bind: process.env.CSI_COREDUMP_VOLUME
                });
            }
        }

        const networkSetup = await this.getNetworkSetup();

        const envs = [
            `SEQUENCE_PATH=${path.join("/package", config.entrypointPath)}`,
            `DEVELOPMENT=${process.env.DEVELOPMENT ?? ""}`,
            `PRODUCTION=${process.env.PRODUCTION ?? ""}`,
            `INSTANCES_SERVER_PORT=${instancesServerPort}`,
            `INSTANCES_SERVER_HOST=${networkSetup.host}`,
            `INSTANCE_ID=${instanceId}`,
        ];

        this.logger.debug("Runner will start with envs", envs);

        const { containerId, streams } = await this.dockerHelper.run({
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
            envs,
            autoRemove: true,
            maxMem: config.container.maxMem,
            networkMode: networkSetup.network
        });

        streams.stderr.on("data", data => {
            this.logger.error("Docker container error: ", data.toString());
        });

        this.resources.containerId = containerId;

        this.logger.trace("Container is running", containerId);

        try {
            const { statusCode } = await this.dockerHelper.wait(containerId);

            this.logger.debug("Container exited", statusCode);

            if (statusCode > 0) {
                throw new InstanceAdapterError("RUNNER_NON_ZERO_EXITCODE", { statusCode });
            } else {
                return 0;
            }
        } catch (error: any) {
            if (error instanceof InstanceAdapterError && error.code === "RUNNER_NON_ZERO_EXITCODE" && error.data.statusCode) {
                this.logger.debug("Container returned non-zero status code", error.data.statusCode);

                return error.data.statusCode;
            }

            this.logger.debug("Container errored", error);

            throw error;
        }
    }

    /**
     * Performs cleanup after container close.
     * Removes volume used by sequence and fifos used to communication with runner.
     */
    async cleanup(): Promise<void> {
        if (this.resources.volumeId) {
            this.logger.debug("Volume will be removed in 1 sec");

            await defer(60000); // @TODO: one sec?
            await this.dockerHelper.removeVolume(this.resources.volumeId);

            this.logger.debug("Volume removed");
        }
    }

    // @ts-ignore
    monitorRate(_rps: number): this {
        /** ignore */
    }

    /**
     * Forcefully stops Runner container.
     */
    async remove() {
        if (this.resources.containerId) {
            this.logger.debug("Forcefully stopping containter", this.resources.containerId);

            await this.dockerHelper.stopContainer(this.resources.containerId);

            this.logger.debug("Container removed");
        }
    }
}

export { DockerInstanceAdapter };
