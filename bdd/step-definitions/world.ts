import { setWorldConstructor, World } from "@cucumber/cucumber";
import { ICreateAttachment, ICreateLog } from "@cucumber/cucumber/lib/runtime/attachment_manager";

class CustomWorld implements World {
    readonly attach: ICreateAttachment;
    readonly log: ICreateLog;
    readonly parameters: any;

    constructor({ attach, log, parameters }) {
        this.attach = attach;
        this.log = log;
        this.parameters = parameters;
    }
    resources: { [key: string]: any }
}

setWorldConstructor(CustomWorld);
