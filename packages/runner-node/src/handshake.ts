import { RunnerMessageCode } from "@scramjet/symbols";
import { SequenceInfo, AppConfig } from "@scramjet/types";

export interface RunnerHandshakeInputs {
    sequenceInfo: SequenceInfo;
    appConfig: AppConfig;
    args: unknown[];
    instanceName?: string;
}

export function buildPing(inputs: RunnerHandshakeInputs): [
    RunnerMessageCode.PING,
    {
        sequenceInfo: SequenceInfo;
        payload: {
            system: { processPID: number };
            appConfig: AppConfig;
            args: unknown[];
            instanceName?: string;
        };
    }
] {
    return [
        RunnerMessageCode.PING,
        {
            sequenceInfo: inputs.sequenceInfo,
            payload: {
                system: { processPID: process.pid },
                appConfig: inputs.appConfig,
                args: inputs.args,
                instanceName: inputs.instanceName,
            },
        },
    ];
}
