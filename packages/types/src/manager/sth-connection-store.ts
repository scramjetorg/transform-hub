import type { Readable, Writable } from "stream";
import type TypedEmitter from "typed-emitter";
import type { VerserConnection } from "@scramjet/verser";
import type { InstanceMessageData, LoadCheckStatMessage, MRestAPI, NetworkInfo, SequenceMessageData, SpaceEventMessageData } from "../index";
import type { STHTopicEventData } from "../messages";
import type { IObjectLogger } from "../object-logger";

export type NotFoundResponse = {
    status: 404
}

export type STHControllerEvents = {
    disconnected: () => void;
    topic: (topicData: STHTopicEventData) => void;
    sequence: (sequence: SequenceMessageData) => void;
    sequences: (sequences: SequenceMessageData[]) => void;
    instance: (instance: InstanceMessageData) => void;
    event: (event: SpaceEventMessageData) => void;
}

export type DisconnectReason = "key_revoked" | "limit_exceeded" | "id_drop" | "disconnected";

export interface ISTHController extends TypedEmitter<STHControllerEvents> {
    id: string,
    description?: string;
    tags?: string[];
    verserConnection?: VerserConnection;
    info: {
        created?: Date,
        lastConnected?: Date
        lastDisconnected?: Date,
    },
    accessKey: string | undefined;
    healthy: boolean,
    created?: Date,
    disconnected?: Date,
    disconnectReason?: DisconnectReason;
    isConnectionActive: boolean;
    selfHosted: boolean;
    networkInterfaces: NetworkInfo[];
    logger: IObjectLogger;
    logStream?: Readable;
    auditStream?: Readable;
    init(): Promise<void>;
    disconnectAuditStream: () => void;
    getAuditStream(): Promise<Readable>;
    reconnect: (verserConnection?: VerserConnection) => Promise<void>;
    main: () => void;
    sendId: () => void;
    getInfo: () => MRestAPI.ConnectedSTHInfo;
    getLoadStat(): LoadCheckStatMessage;
    sendEvent(event: SpaceEventMessageData): Promise<void>;
    createUpstreamTopicRequest(name: string, contentType: string): Promise<Readable>;
    createDownstreamTopicRequest(name: string, contentType: string): Promise<Writable>;
    disconnect(reason: DisconnectReason): Promise<void>;
    dispose(): void;
}

export interface ISTHConnectionStore {
    logger: IObjectLogger;
    list(): ISTHController[];
    forEach(callback: (id: string, sthController: ISTHController) => void): void;
    map<T>(callback: (id: string, sthController: ISTHController) => T): T[];
    getSTHControllersInfo(): MRestAPI.ConnectedSTHInfo[];
    getById(id: string): ISTHController | undefined;
    getByAccessKey(accessKey: string): ISTHController[];
    add(controller: ISTHController): void;
    delete(id: string, force: boolean): Promise<void>;
}

export enum SthConnectionStoreErrors {
    ID_NOT_FOUND = "ID_NOT_FOUND",
    CONFLICT = "CONFLICT",
    ID_NOT_PROVIDED = "ID_NOT_PROVIDED",
    NATIVE_HUB = "NATIVE_HUB",
    CONNECTED = "CONNECTED"
}
