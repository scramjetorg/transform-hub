import { ISTHConnectionStore } from "./types/from-types";
import { ObjLogger } from "@scramjet/obj-logger";
import { OpRecordCode } from "@scramjet/symbols";
import { OpRecord } from "@scramjet/runtime-types";
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
    private heartbeatTimer?: NodeJS.Timeout;
    private stopped = false;

    flowing = false;

    get output() {
        return this._output.rewind();
    }

    private writeHeartBeatMessage() {
        if (this.stopped) return;
        this.selfAuditStream.write(
            `${JSON.stringify({
                opCode: OpRecordCode.MANAGER_HEARTBEAT,
                objectId: this.managerId,
                requestorId: "system",
            } as OpRecord)}\n`
        );
    }

    public hubConnectionChange(sthId: string, status: boolean) {
        if (this.stopped) return;
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
        if (this.stopped) return;
        this.flowing = flowing;
        await this.onUpdate();
        if (this.stopped) this.flowing = false;
    }

    async onUpdate() {
        if (this.stopped) return;
        if (this.flowing) {
            for (const sthController of this.sthConnectionStore.list()) {
                if (this.stopped) return;
                const hostAudit = await sthController.getAuditStream().catch((err: Error) => {
                    this.logger.error("Can't get audit stream", err);
                });

                if (this.stopped) {
                    try { sthController.disconnectAuditStream(); } catch { /* best effort after shutdown */ }
                    return;
                }
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
        if (this.stopped) return;
        this.heartbeatTimer = setInterval(() => {
            this.writeHeartBeatMessage();
        }, this.heartbeatInterval);
        this.heartbeatTimer.unref?.();
    }

    async attachSTH(sthController: STHController) {
        if (this.stopped) return;
        const stream = await sthController.getAuditStream();
        if (this.stopped) {
            try { sthController.disconnectAuditStream(); } catch { /* best effort after shutdown */ }
            return;
        }
        this.ms.add(stream);
        await this.onUpdate();
    }

    removeSTH(stream: Readable) {
        this.ms.remove(stream);
    }

    disconnectSTHAuditStreams(): Error[] {
        const errors: Error[] = [];
        this.sthConnectionStore.list().forEach((sthController: any) => {
            try {
                if (sthController.auditStream) this.ms.remove(sthController.auditStream);
                sthController.disconnectAuditStream();
            } catch (error) {
                errors.push(error instanceof Error ? error : new Error(String(error)));
            }
        });
        return errors;
    }

    stop(): Error[] {
        if (this.stopped) return [];
        this.stopped = true;
        this.flowing = false;
        const errors: Error[] = [];
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = undefined;
        }
        errors.push(...this.disconnectSTHAuditStreams());
        try { this.ms.remove(this.selfAuditStream); } catch (error) { errors.push(error instanceof Error ? error : new Error(String(error))); }
        try { this.selfAuditStream.end(); } catch (error) { errors.push(error instanceof Error ? error : new Error(String(error))); }
        return errors;
    }
}
