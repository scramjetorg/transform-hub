import { IObjectLogger, OpResponse, StartInstanceReturnType, STHRestAPI } from "@scramjet/types";
import { RefCountHandler } from "@scramjet/utility";
import { Auditor } from "../auditor";
import { LoadCheck } from "@scramjet/load-check";
import { ServiceDiscovery } from "../serviceDiscovery/sd-adapter";
import { CommonLogsPipe } from "../common-logs-pipe";
import { CPMConnector } from "../cpm-connector";
import { Readable } from "stream";
import { Socket } from "net";
import { IInstanceStore } from "./instance-store";
import { ISequenceStore } from "./sequence-store";

type SequenceId = string;

export interface IHost {
    logger: IObjectLogger;

    service: string;
    apiBase: string;
    apiVersion: string;

    publicConfig: STHRestAPI.GetConfigResponse;

    instanceBase: string;
    heartBeatInterval: RefCountHandler;

    auditor: Auditor;
    loadCheck: LoadCheck;
    serviceDiscovery: ServiceDiscovery;
    commonLogsPipe: CommonLogsPipe;
    cpmConnector?: CPMConnector;
    instancesStore: IInstanceStore;
    sequenceStore: ISequenceStore;

    getSequence(id: SequenceId): OpResponse<STHRestAPI.GetSequenceResponse>
    getSequences(): STHRestAPI.GetSequencesResponse;
    deleteSequence(id: SequenceId, force: boolean): Promise<SequenceId>;
    addSequence(id: string, req: Readable, override: boolean, socket?: Socket): Promise<STHRestAPI.SendSequenceResponse>;

    startSequence(id: SequenceId, requestConfig: STHRestAPI.StartSequencePayload): Promise<StartInstanceReturnType>;
    getSequenceInstances(sequenceId: SequenceId): STHRestAPI.GetSequenceInstancesResponse;
    getInstances(): STHRestAPI.GetInstancesResponse;
    // getInstance(id: InstanceId): STHRestAPI.GetInstanceResponse;

    getStatus(): STHRestAPI.GetStatusResponse;
}
