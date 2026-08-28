import { type IWorld, setWorldConstructor, setDefaultTimeout } from "@cucumber/cucumber";
import { HostClient, InstanceClient, ManagerClient, SequenceClient } from "@scramjet/api-client";
import { MultiManagerClient } from "@scramjet/multi-manager-api-client";
import { STHRestAPI } from "@scramjet/api-types";
import { ChildProcess, ChildProcessWithoutNullStreams } from "child_process";
import { Readable } from "stream";
import type { ScenarioIsolation } from "../lib/scenario-isolation";
import * as dns from "dns";
const { ScenarioLifecycle } = require("../../scripts/lib/bdd-scenario-lifecycle.js");
const { memoryRegistry } = require("../lib/memory-registry");

const DEFAULT_TIMEOUT = 20000;
const MAX_TIMEOUT = 30000;
const configuredTimeout = Number(process.env.BDD_STEP_TIMEOUT_MS);
const defaultTimeout = Number.isFinite(configuredTimeout) && configuredTimeout > 0
    ? Math.min(configuredTimeout, MAX_TIMEOUT)
    : DEFAULT_TIMEOUT;

export class CustomWorld implements IWorld {
    readonly attach: IWorld["attach"];
    readonly log: IWorld["log"];
    readonly link: IWorld["link"];
    readonly parameters: any;
    response?: any;

    resources: {
        [key: string]: any;
        hub?: ChildProcess;
        appcontextExposeResponse?: { status: number; body: string };
        hostClient?: HostClient;
        multiManagers: Record<string, MultiManagerClient & { process?: ChildProcess }>;
        managers: Record<string, ManagerClient>;
        hosts: Record<string, HostClient>;
        sequences: Record<string, SequenceClient>;
        instancesClients: Record<string, InstanceClient>;
        instanceList: {[key: string]: InstanceClient};
        instance?: InstanceClient;
        instance1?: InstanceClient;
        instance2?: InstanceClient;
        sequence?: SequenceClient;
        sequence1?: SequenceClient;
        sequence2?: SequenceClient;
        outStream?: Readable;
        floodStream?: Readable;
        floodSendPromise?: Promise<unknown>;
        floodResponseClosedPromise?: Promise<unknown>;
        floodHubRequestLifecycleWaiter?: { promise: Promise<void>; cancel: (error?: Error) => void };
        markFloodRunnerExpected?: () => void;
        floodSourceClosedPromise?: Promise<unknown>;
        floodAbortController?: AbortController;
        floodCorrelationId?: string;
    } = {
            instanceList: {},
            multiHosts: {},
            multiManagers: {},
            managers: {},
            hosts: {},
            sequences: {},
            instancesClients: {}
        };

    cliResources: {
        stdio?: [stdout: string, stderr: string, statusCode: any];
        stdio1?: [stdout: string, stderr: string, statusCode: any];
        stdio2?: [stdout: string, stderr: string, statusCode: any];
        sequenceId?: string;
        sequence1Id?: string;
        sequence2Id?: string;
        instanceId?: string;
        instance1Id?: string;
        instance2Id?: string;
        sequences?: STHRestAPI.GetSequencesResponse;
        instances?: STHRestAPI.GetInstancesResponse;
        templateDirectory?: string;
        commandInProgress?: ChildProcessWithoutNullStreams;
        collectedTopicData?: string;
    } = {};

    /** Explicit owner for Hub, Manager, and runner resources created by this scenario. */
    readonly scenarioLifecycle = new ScenarioLifecycle(memoryRegistry);

    /** Per-scenario HOME, config, artifact, port, child-process, and PKI owner. */
    scenarioIsolation?: ScenarioIsolation;

    /** @internal Memory guard baseline (set by support/memory-hooks.ts). */
    __memoryBaseline?: number;
    /** @internal Memory guard before-usage snapshot (set by support/memory-hooks.ts). */
    __memoryBeforeUsage?: number;
    /** @internal Memory guard post-GC baseline snapshot (set by support/memory-hooks.ts). */
    __memoryBaselineUsage?: number;

    constructor({ attach, log, link, parameters }: Pick<IWorld, "attach" | "log" | "link" | "parameters">) {
        // https://nodejs.org/api/dns.html#dnssetdefaultresultorderorder
        const { setDefaultResultOrder } = dns as unknown as { setDefaultResultOrder?: (param: string) => void };

        if (setDefaultResultOrder) {
            setDefaultResultOrder("ipv4first");
        }
        this.attach = attach;
        this.log = log;
        this.link = link;
        this.parameters = parameters;
        this.cliResources.collectedTopicData = "";
    }
}

setWorldConstructor(CustomWorld);
setDefaultTimeout(defaultTimeout);
