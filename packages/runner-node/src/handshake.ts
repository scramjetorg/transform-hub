import { InstanceStatus, RunnerMessageCode } from "@scramjet/symbols";
import { SequenceInfo, AppConfig, PingMessageData } from "@scramjet/types";

export interface RunnerHandshakeInputs {
    instanceId: string;
    sequenceInfo: SequenceInfo;
    appConfig: AppConfig;
    args: unknown[];
    instanceName?: string;
}

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
