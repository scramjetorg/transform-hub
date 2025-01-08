import { RunnerConnectInfo } from "../runner-connect";

export type StartSequenceResponse = { id: string, parentId?: string };

export type StartSequencePayload = Omit<Omit<RunnerConnectInfo, "adapter">, "inputContentType">;
