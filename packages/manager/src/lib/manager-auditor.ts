import { ISTHConnectionStore } from "@scramjet/platform-types";
import { ObjLogger } from "@scramjet/obj-logger";
import { OpRecordCode } from "@scramjet/symbols";
import { OpRecord } from "@scramjet/types";
import { ReReadable } from "rereadable-stream";
import { DataStream, MultiStream, StringStream } from "scramjet";
import { Readable } from "stream";
import { STHController } from "./sth-controller";

export class ManagerAuditor {
    heartbeatInterval: number = 5000;
    logger: ObjLogger = new ObjLogger(this);
    _output = new ReReadable({ length: 1e5 });
    ms: MultiStream = new MultiStream([]);
    auditStream: DataStream;
    sthConnectionStore: ISTHConnectionStore;
    selfAuditStream = new StringStream();
    managerId: string;

    flowing = false;

    get output() {
        return this._output.rewind();
    }

    private writeHeartBeatMessage() {
        this.selfAuditStream.write(
            `${JSON.stringify({
                opCode: OpRecordCode.MANAGER_HEARTBEAT,
                objectId: this.managerId,
                requestorId: "system",
            } as OpRecord)}\n`
        );
    }

    public hubConnectionChange(sthId: string, status: boolean) {
        this.selfAuditStream.write(
            `${JSON.stringify({
                opCode: status ? OpRecordCode.HUB_CONNECTED : OpRecordCode.HUB_DISCONNECTED,
                objectId: sthId,
                requestorId: "system",
            } as OpRecord)}\n`
        );
    }

    constructor(sthConnectionStore: ISTHConnectionStore, managerId: string) {
        this.sthConnectionStore = sthConnectionStore;
        this.managerId = managerId;

        this._output.rewind().resume();

        this.ms.add(this.selfAuditStream);
        this.auditStream = this.ms.mux().stringify();
        this.auditStream.pipe(this._output);

        this.heartbeatStart();
    }

    async setFlowing(flowing: boolean) {
        this.flowing = flowing;
        await this.onUpdate();
    }

    async onUpdate() {
        if (this.flowing) {
            for (const sthController of this.sthConnectionStore.list()) {
                const hostAudit = await sthController.getAuditStream().catch((err) => {
                    this.logger.error("Can't get audit stream", err);
                });

                if (hostAudit && this.ms.streams.indexOf(hostAudit) === -1) {
                    this.logger.info("Adding audit stream", sthController.id);
                    this.ms.add(hostAudit);
                }
            }
        } else {
            this.disconnectSTHAuditStreams();
        }
    }

    heartbeatStart() {
        setInterval(() => {
            this.writeHeartBeatMessage();
        }, this.heartbeatInterval);
    }

    async attachSTH(sthController: STHController) {
        this.ms.add(await sthController.getAuditStream());
        await this.onUpdate();
    }

    removeSTH(stream: Readable) {
        this.ms.remove(stream);
    }

    disconnectSTHAuditStreams() {
        this.sthConnectionStore.list().forEach((sthController) => {
            if (sthController.auditStream) {
                this.ms.remove(sthController.auditStream);
                sthController.disconnectAuditStream();
            }
        });
    }
}
