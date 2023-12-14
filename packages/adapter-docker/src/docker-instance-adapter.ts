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
    InstanceConfig,
    RunnerContainerConfiguration,
    InstanceLimits,
    STHConfiguration,
    SequenceInfo,
    RunnerConnectInfo
} from "@scramjet/types";
import path from "path";
import { DockerodeDockerHelper } from "./dockerode-docker-helper";
import { DockerAdapterResources, DockerAdapterRunPortsConfig, DockerAdapterVolumeConfig, IDockerHelper } from "./types";
import { FreePortsFinder, defer, streamToString } from "@scramjet/utility";
import { STH_DOCKER_NETWORK, isHostSpawnedInDockerContainer, getHostname } from "./docker-networking";
import { ObjLogger } from "@scramjet/obj-logger";
import { getRunnerEnvEntries } from "@scramjet/adapters";
import { Readable } from "stream";

/**
 * Adapter for running Instance by Runner executed in Docker container.
 */
class DockerInstanceAdapter implements
ILifeCycleAdapterMain,
ILifeCycleAdapterRun,
IComponent {
    private dockerHelper: IDockerHelper;
    private _limits?: InstanceLimits = {};
    private resources: DockerAdapterResources = {};
    private sthConfig: STHConfiguration;
    id: string = "";

    logger: IObjectLogger;

    crashLogStreams?: Promise<string[]>;

    get limits() { return this._limits || {} as InstanceLimits; }
    private set limits(value: InstanceLimits) { this._limits = value; }

    constructor(sthConfig: STHConfiguration, id: string = "") {
        this.sthConfig = sthConfig;
        this.dockerHelper = new DockerodeDockerHelper();

        this.logger = new ObjLogger(this, { id });
        this.dockerHelper.logger.updateBaseLog({ id });
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
        this.logger.debug("STATS. Container id:", this.resources.containerId);

        this.resources.containerId ||= await this.dockerHelper.getContainerIdByLabel("scramjet.instance.id", this.id);

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

    private async getNetworkSetup(): Promise<{ network: string, host: string }> {
        const interfaces = await this.dockerHelper.listNetworks();
        const sthDockerNetwork = interfaces.find(net => net.Name === STH_DOCKER_NETWORK);

        if (!sthDockerNetwork) {
            // STH docker network should be created in Host initialization
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

    async setRunner(system: Record<string, string>): Promise<void> {
        const containerId = await this.dockerHelper.getContainerIdByLabel("scramjet.instance.id", system.id);

        this.logger.debug("Container id restored", containerId);

        this.resources.containerId = containerId;
    }

    async run(config: InstanceConfig, instancesServerPort: number, instanceId: string, sequenceInfo: SequenceInfo, payload: RunnerConnectInfo): Promise<ExitCode> {
        await this.dispatch(config, instancesServerPort, instanceId, sequenceInfo, payload);
        return this.waitUntilExit(config, instanceId, sequenceInfo);
    }

    // eslint-disable-next-line complexity
    async dispatch(config: InstanceConfig, instancesServerPort: number, instanceId: string, sequenceInfo: SequenceInfo, payload: RunnerConnectInfo): Promise<ExitCode> {
        if (!(config.type === "docker" && "container" in config)) {
            throw new Error("Docker instance adapter run with invalid runner config");
        }

        this.limits = config.limits;

        this.resources.ports =
            config.config?.ports ? await this.getPortsConfig(config.config.ports, config.container) : undefined;

        config.container.maxMem = config.limits.memory || config.container.maxMem;

        this.logger.info("Instance preparation done for config", config);

        const extraVolumes: DockerAdapterVolumeConfig[] = [];

        const networkSetup = await this.getNetworkSetup();

        const envs = getRunnerEnvEntries({
            sequencePath: path.join(config.sequenceDir, config.entrypointPath),
            instancesServerPort,
            instancesServerHost: networkSetup.host,
            instanceId,
            pipesPath: "",
            sequenceInfo,
            payload
        }, {
            ...this.sthConfig.runnerEnvs
        }).map(([k, v]) => `${k}=${v}`);

        this.logger.debug("Runner will start with envs", envs);

        const { containerId, streams } = await this.dockerHelper.run({
            imageName: config.container.image,
            volumes: [
                ...extraVolumes,
                { mountPoint: config.sequenceDir, volume: config.id, writeable: false }
            ],
            labels: {
                "scramjet.sequence.name": config.name,
                "scramjet.instance.id": instanceId
            },
            ports: this.resources.ports,
            publishAllPorts: true,
            envs,
            autoRemove: true,
            maxMem: config.container.maxMem,
            networkMode: networkSetup.network,
            gpu: this.limits.gpu
        });

        this.crashLogStreams = Promise.all(([streams.stdout, streams.stderr] as Readable[]).map(streamToString));

        this.resources.containerId = containerId; // doesnt matter

        this.logger.trace("Container is running", containerId);

        return 0;
    }

    async waitUntilExit(config: InstanceConfig, instanceId:string, _sequenceInfo: SequenceInfo): Promise<number> {
        try {
            this.resources.containerId = this.resources.containerId || await this.dockerHelper.getContainerIdByLabel("scramjet.instance.id", instanceId);

            this.logger.debug("Wait for container exit...", this.resources.containerId);

            const { statusCode } = await this.dockerHelper.wait(this.resources.containerId);

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
            this.logger.debug("Volume will be removed in 60 sec");

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
            this.logger.debug("Forcefully stopping container", this.resources.containerId);

            await this.dockerHelper.stopContainer(this.resources.containerId);

            this.logger.debug("Container removed");
        }
    }

    async getCrashLog(): Promise<string[]> {
        if (!this.crashLogStreams) return [];

        return this.crashLogStreams;
    }
}

export { DockerInstanceAdapter };
