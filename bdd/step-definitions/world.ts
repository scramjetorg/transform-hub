import { setWorldConstructor, World, setDefaultTimeout } from "@cucumber/cucumber";
import { ICreateAttachment, ICreateLog } from "@cucumber/cucumber/lib/runtime/attachment_manager";
import { HostClient, InstanceClient, ManagerClient, SequenceClient } from "@scramjet/api-client";
import { MultiManagerClient } from "@scramjet/multi-manager-api-client";
import { STHRestAPI } from "@scramjet/api-types";
import { ChildProcess, ChildProcessWithoutNullStreams } from "child_process";
import { Readable } from "stream";
import * as dns from "dns";
const { ScenarioLifecycle } = require("../../scripts/lib/bdd-scenario-lifecycle.js");
const { memoryRegistry } = require("../lib/memory-registry");

const glob: (pattern: string, callback: (err: Error | null, matches: string[]) => void) => void = require("glob");

const DEFAULT_TIMEOUT = 20000;
const MAX_TIMEOUT = 30000;
const configuredTimeout = Number(process.env.BDD_STEP_TIMEOUT_MS);
const defaultTimeout = Number.isFinite(configuredTimeout) && configuredTimeout > 0
    ? Math.min(configuredTimeout, MAX_TIMEOUT)
    : DEFAULT_TIMEOUT;

export class CustomWorld implements World {
    readonly attach: ICreateAttachment;
    readonly log: ICreateLog;
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
    } = {
            instanceList: {},
            multiHosts: {},
            multiManagers: {},
            managers: {},
            hosts: {},
            sequences: {},
            instancesClients: {}
        };

    async findSequencePackage(sequenceName: string) {
        return new Promise<string>((resolve) => {
            glob("../**/" + sequenceName + ".tar.gz", (err, matches) => {
                if (err) {
                    throw err;
                }

                if (matches.length === 0) {
                    throw new Error(`No sequence package found for ${sequenceName}`);
                }

                resolve(matches[0]);
            });
        });
    }

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
        commandInProgress?: ChildProcessWithoutNullStreams;
        collectedTopicData?: string;
    } = {};

    /** Explicit owner for Hub, Manager, and runner resources created by this scenario. */
    readonly scenarioLifecycle = new ScenarioLifecycle(memoryRegistry);

    /** @internal Memory guard baseline (set by support/memory-hooks.ts). */
    __memoryBaseline?: number;
    /** @internal Memory guard before-usage snapshot (set by support/memory-hooks.ts). */
    __memoryBeforeUsage?: number;

    constructor({ attach, log, parameters }: any) {
        // https://nodejs.org/api/dns.html#dnssetdefaultresultorderorder
        const { setDefaultResultOrder } = dns as unknown as { setDefaultResultOrder?: (param: string) => void };

        if (setDefaultResultOrder) {
            setDefaultResultOrder("ipv4first");
        }
        this.attach = attach;
        this.log = log;
        this.parameters = parameters;
        this.cliResources.collectedTopicData = "";
    }
}

setWorldConstructor(CustomWorld);
setDefaultTimeout(defaultTimeout);
