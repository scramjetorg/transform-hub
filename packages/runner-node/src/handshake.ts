import { InstanceStatus, RunnerMessageCode } from "@scramjet/symbols";
import type { PingMessageData } from "@scramjet/types";
import type { RunnerHandshakeInputs } from "./types";

export function buildPing(inputs: RunnerHandshakeInputs): [
    RunnerMessageCode.PING,
    PingMessageData
] {
    const payload: PingMessageData["payload"] = {
        system: { processPID: process.pid.toString() },
        appConfig: inputs.appConfig,
        args: inputs.args,
        instanceName: inputs.instanceName,
    };

    if (inputs.exposePath) payload.exposePath = inputs.exposePath;
    if (inputs.exposeHost) payload.exposeHost = inputs.exposeHost;
    if (inputs.exposePort !== undefined) payload.exposePort = inputs.exposePort;

    return [
        RunnerMessageCode.PING,
        {
            id: inputs.instanceId,
            created: Date.now(),
            sequenceInfo: inputs.sequenceInfo,
            payload,
            status: InstanceStatus.STARTING,
            inputHeadersSent: false,
        },
    ];
}
