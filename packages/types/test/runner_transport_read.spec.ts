import { DEFAULT_VERSER2_RUNNER_ROUTE_CONTRACTS, RunnerTransport } from "../src";

const runnerTransport: RunnerTransport = {
    kind: "legacy",
    connect: async () => undefined,
    disconnect: async () => undefined
};

runnerTransport.connect({ instanceId: "instance-1", streams: [] as any });
DEFAULT_VERSER2_RUNNER_ROUTE_CONTRACTS.runnerDomain.includes("<instanceId>");
