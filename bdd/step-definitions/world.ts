import { setWorldConstructor, World, setDefaultTimeout } from "@cucumber/cucumber";
import { ICreateAttachment, ICreateLog } from "@cucumber/cucumber/lib/runtime/attachment_manager";
import { InstanceClient, SequenceClient } from "@scramjet/api-client";
import { STHRestAPI } from "@scramjet/types";
import { ChildProcess, ChildProcessWithoutNullStreams } from "child_process";
import { Readable } from "stream";
import * as dns from "dns";

const DEFAULT_TIMEOUT = 864e5;

export class CustomWorld implements World {
    readonly attach: ICreateAttachment;
    readonly log: ICreateLog;
    readonly parameters: any;

    resources: {
        [key: string]: any;
        hub?: ChildProcess;
        instance?: InstanceClient;
        instance1?: InstanceClient;
        instance2?: InstanceClient;
        sequence?: SequenceClient;
        sequence1?: SequenceClient;
        sequence2?: SequenceClient;
        outStream?: Readable;
    } = {};

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
        topic?: string;
    } = {};

    constructor({ attach, log, parameters }: any) {
        // https://nodejs.org/api/dns.html#dnssetdefaultresultorderorder
        const { setDefaultResultOrder } = dns as unknown as { setDefaultResultOrder?: (param: string) => void };

        if (setDefaultResultOrder) {
            setDefaultResultOrder("ipv4first");
        }

        this.attach = attach;
        this.log = log;
        this.parameters = parameters;
    }
}

setWorldConstructor(CustomWorld);
setDefaultTimeout(DEFAULT_TIMEOUT);
