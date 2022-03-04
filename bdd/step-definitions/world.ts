import { setWorldConstructor, World, setDefaultTimeout } from "@cucumber/cucumber";
import { ICreateAttachment, ICreateLog } from "@cucumber/cucumber/lib/runtime/attachment_manager";
import { InstanceClient, SequenceClient } from "@scramjet/api-client";

const DEFAULT_TIMEOUT = 20000;

export class CustomWorld implements World {
    readonly attach: ICreateAttachment;
    readonly log: ICreateLog;
    readonly parameters: any;

    resources: {
        [key: string]: any,
        instance?: InstanceClient,
        instance1?: InstanceClient,
        instance2?: InstanceClient,
        sequence?: SequenceClient,
        sequence1?: SequenceClient,
        sequence2?: SequenceClient
    } = {}

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
        sequences?: any;
    } = {};

    constructor({ attach, log, parameters }: any) {
        this.attach = attach;
        this.log = log;
        this.parameters = parameters;
    }
}

setWorldConstructor(CustomWorld);
setDefaultTimeout(DEFAULT_TIMEOUT);
