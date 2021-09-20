import { setWorldConstructor, World, setDefaultTimeout } from "@cucumber/cucumber";
import { ICreateAttachment, ICreateLog } from "@cucumber/cucumber/lib/runtime/attachment_manager";

const DEFAULT_TIMEOUT = 200000;

export class CustomWorld implements World {
    readonly attach: ICreateAttachment;
    readonly log: ICreateLog;
    readonly parameters: any;

    resources: { [key: string]: any } = {}

    constructor({ attach, log, parameters }: any) {
        this.attach = attach;
        this.log = log;
        this.parameters = parameters;
    }
}

setWorldConstructor(CustomWorld);
setDefaultTimeout(DEFAULT_TIMEOUT);
