import { setWorldConstructor, World, setDefaultTimeout } from "@cucumber/cucumber";
import { ICreateAttachment, ICreateLog } from "@cucumber/cucumber/lib/runtime/attachment_manager";
import { InstanceClient, SequenceClient } from "@scramjet/api-client";

const DEFAULT_TIMEOUT = 300000;

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

    constructor({ attach, log, parameters }: any) {
        this.attach = attach;
        this.log = log;
        this.parameters = parameters;
    }
}

setWorldConstructor(CustomWorld);
setDefaultTimeout(DEFAULT_TIMEOUT);
