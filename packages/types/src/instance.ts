import { InstanceStatus } from "@scramjet/symbols";
import { AppConfig } from "./app-config";
// biome-ignore lint/suspicious/noImportCycles: existing package cycle retained during Biome migration
import { SequenceInfo } from "./sequence-adapter";

export type InstanceId = string;

export type InstanceArgs = any[];

export type InstanceConnectionInfo = {}

export type StartInstanceReturnType =
    { message: string; exitcode: number; status: InstanceStatus; } |
    { id: string; appConfig: AppConfig; args: any[] | undefined; sequenceId: string; info: {}; limits: { memory: number; }; sequence: SequenceInfo; }
;
