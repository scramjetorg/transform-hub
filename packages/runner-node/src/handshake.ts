import { InstanceStatus, RunnerMessageCode } from "@scramjet/symbols";
import type { PingMessageData } from "@scramjet/types";
import type { RunnerHandshakeInputs } from "./types";

export function buildPing(inputs: RunnerHandshakeInputs): [
    RunnerMessageCode.PING,
    PingMessageData
] {
    return [
        RunnerMessageCode.PING,
        {
            id: inputs.instanceId,
            created: Date.now(),
            sequenceInfo: inputs.sequenceInfo,
            payload: {
                system: { processPID: process.pid.toString() },
                appConfig: inputs.appConfig,
                args: inputs.args,
                instanceName: inputs.instanceName,
            },
            status: InstanceStatus.STARTING,
            inputHeadersSent: false,
        },
    ];
}
