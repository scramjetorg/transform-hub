import { RunnerConnectInfo } from "@scramjet/runtime-types";

export type StartSequenceResponse = { id: string; processId?: number };

export type StartSequencePayload = Omit<Omit<RunnerConnectInfo, "adapter">, "inputContentType"> & {
    sequenceName?: string;
};
