/**
 * Instance and sequence config types.
 *
 * Simplified structural copies from the old types package/instance.ts,
 * the old types package/instance-store.ts, and the old types package/runner-config.ts.
 */

import { InstanceId } from "./ids";

export type InstanceArgs = any[];
export type InstanceConnectionInfo = Record<string, any>;

export type CommonSequenceConfig = {
    type: string;
    engines: Record<string, string>;
    id: string;
    entrypointPath: string;
    name: string;
    version: string;
    sequenceDir: string;
    description?: string;
    author?: string;
    keywords?: string[];
    args?: InstanceArgs;
    exposePath?: string;
    exposeHost?: string;
    tags?: string[];
    repository?: Record<string, any> | string;
    language: string;
    packageSize?: number;
};

export type ProcessSequenceConfig = CommonSequenceConfig & {
    type: "process";
};

export type KubernetesSequenceConfig = CommonSequenceConfig & {
    type: "kubernetes";
};

export type SequenceConfig =
    | ({ type: "docker" } & CommonSequenceConfig & Record<string, any>)
    | ProcessSequenceConfig
    | KubernetesSequenceConfig
    | CommonSequenceConfig;

export type InstanceConfig = SequenceConfig & { instanceAdapterExitDelay: number; limits: any };

export type Instance = {
    id: InstanceId;
    appConfig?: any;
    args?: InstanceArgs;
    provides?: string;
    requires?: string;
    sequence: any; // SequenceInfoInstance
    instanceName?: string;
    ports?: Record<string, number>;
    created?: Date;
    started?: Date;
    ended?: Date;
    status?: string;
    terminated?: {
        exitcode: number;
        reason: string;
    };
};

export type StartInstanceReturnType =
    | { message: string; exitcode: number; status: string }
    | {
          id: string;
          appConfig: any;
          args: any[] | undefined;
          sequenceId: string;
          info: Record<string, any>;
          limits: { memory: number };
          sequence: any;
      };
