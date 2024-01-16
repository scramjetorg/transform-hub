import { RunnerConnectInfo } from "../runner-connect";

export type StartSequenceResponse = { id: string };

export type StartSequencePayload = Omit<RunnerConnectInfo, "adapter">;
