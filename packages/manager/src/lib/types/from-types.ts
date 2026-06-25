/**
 * Local type definitions for manager package.
 *
 * These replace types previously imported from the old types package
 * that are specific to the manager package.
 */

import {
    APIRoute,
    ParsedMessage,
    ManagerConfiguration,
    MRestAPI,
    DisconnectReason
} from "@scramjet/api-types";
import {
    IComponent,
    IObjectLogger,
    LogLevel,
    SequenceConfig,
    Instance
} from "@scramjet/runtime-types";

export type STHTopicEventData = any;

export { DisconnectReason };

export {
    APIRoute,
    IComponent,
    IObjectLogger,
    LogLevel,
    SequenceConfig,
    Instance,
    ParsedMessage,
    ManagerConfiguration,
    MRestAPI,
};

export interface ISTHConnectionStore {
    [key: string]: any;
}

export interface ISTHController {
    [key: string]: any;
}

export enum SthConnectionStoreErrors {
    ID_NOT_FOUND = "ID_NOT_FOUND",
    CONFLICT = "CONFLICT",
    ID_NOT_PROVIDED = "ID_NOT_PROVIDED",
    NATIVE_HUB = "NATIVE_HUB",
    CONNECTED = "CONNECTED",
}

export type STHControllerEvents = Record<string, any>;

export interface ISTHInfoRegister {
    [key: string]: any;
}

export type HostId = string;
export type SequenceId = string;

export enum ActorType {
    HOST = "host",
    API = "api",
}

export enum ActorRole {
    PROVIDER = "provider",
    CONSUMER = "consumer",
}

export type ActorStreamType<_R> = any;
export interface IServiceDiscovery {
    [key: string]: any;
}
export interface ITopicActor<_T, _R> {
    [key: string]: any;
}
export type Topic = any;

// Protocol message type stubs for CPM-STH communication
export type InstanceMessage = any;
export type InstanceBulkMessage = any;
export type EncodedCPMSTHMessage = any;
export type CPMMessageSTHID = any;
export type SpaceEventMessageData = any;
export type SequenceMessageData = any;
export type SequenceMessage = any;
export type NetworkInfo = any;
export type LoadCheckStatMessage = any;
export type InstanceMessageData = any;
