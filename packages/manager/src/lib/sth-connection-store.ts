import { ISTHConnectionStore, ISTHController, SthConnectionStoreErrors } from "@scramjet/platform-types";
import { IObjectLogger, MRestAPI } from "@scramjet/types";
import { ObjLogger } from "@scramjet/obj-logger";

export class SthConnectionStore implements ISTHConnectionStore {
    public logger: IObjectLogger = new ObjLogger(this);
    private sthControllers: Map<string, ISTHController> = new Map();

    list() {
        return [...this.sthControllers.values()];
    }

    forEach(callback: (id: string, sthController: ISTHController) => void) {
        for (const [id, controller] of this.sthControllers.entries()) {
            callback(id, controller);
        }
    }

    map<T>(callback: (id: string, sthController: ISTHController) => T): T[] {
        const result: T[] = [];
        for (const [id, controller] of this.sthControllers.entries()) {
            result.push(callback(id, controller));
        }
        return result;
    }

    add(sthController: ISTHController) {
        if (sthController) {
            this.sthControllers.set(sthController.id, sthController);
            this.logger.info("New STH Controller added", sthController.id);
        }
    }

    getById(id: string): ISTHController | undefined {
        return this.sthControllers.get(id);
    }

    getByAccessKey(accessKey: string) {
        return this.list().filter(sthController => sthController.accessKey === accessKey);
    }

    getSTHControllerInfo(id: string): MRestAPI.ConnectedSTHInfo | undefined {
        return this.getById(id)?.getInfo();
    }

    getSTHControllersInfo(): MRestAPI.ConnectedSTHInfo[] {
        return this.list().map((sth: ISTHController) => sth.getInfo());
    }

    async delete(id: string, force: boolean) {
        if (!id) {
            throw new Error(SthConnectionStoreErrors.ID_NOT_PROVIDED);
        }
        const sthController = this.getById(id);

        if (!sthController) {
            throw new Error(SthConnectionStoreErrors.ID_NOT_FOUND);
        }

        if (sthController.selfHosted === false) {
            throw new Error(SthConnectionStoreErrors.NATIVE_HUB);
        }

        if (sthController.verserConnection.connected) {
            if (force) {
                this.sthControllers.get(id)?.disconnect("id_drop");
            } else {
                throw new Error(SthConnectionStoreErrors.CONNECTED);
            }
        }

        this.sthControllers.delete(id);
        this.logger.info("STH Controller removed", id);
    }
}
