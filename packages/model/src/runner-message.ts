export enum RunnerMessageCode {
    PING = 3000,
    MONITORING = 3001,
    DESCRIBE_SEQUENCE = 3002,
    ERROR = 3003,
    SNAPSHOT_RESPONSE = 3005,
    SEQUENCE_STOPPED = 3006,
    STATUS = 3007, // temporary message code seq.status
    ALIVE = 3010, // temporary message code
    ACKNOWLEDGE = 3004,
    SEQUENCE_COMPLETED = 3011,

    PONG = 4000,
    STOP = 4001,
    KILL = 4002,
    MONITORING_RATE = 4003,
    FORCE_CONFIRM_ALIVE = 4004,

    EVENT = 5001,
}

// export enum MonitoringRunnerMessageCode {
//     PONG = RunnerMessageCode.PONG,
//     MONITORING = RunnerMessageCode.MONITORING,
//     DESCRIBE_SEQUENCE = RunnerMessageCode.DESCRIBE_SEQUENCE,
//     ERROR = RunnerMessageCode.ERROR,
//     SNAPSHOT_RESPONSE = RunnerMessageCode.SNAPSHOT_RESPONSE,
//     SEQUENCE_STOPPED = RunnerMessageCode.SEQUENCE_STOPPED,
//     STATUS = RunnerMessageCode.STATUS,
//     ALIVE = RunnerMessageCode.ALIVE,
//     ACKNOWLEDGE = RunnerMessageCode.ACKNOWLEDGE,
//     EVENT = RunnerMessageCode.EVENT
// }

// export enum ControlRunnerMessageCode {
//     PING = RunnerMessageCode.PING,
//     STOP = RunnerMessageCode.STOP,
//     KILL = RunnerMessageCode.KILL,
//     MONITORING_RATE = RunnerMessageCode.MONITORING_RATE,
//     FORCE_CONFIRM_ALIVE = RunnerMessageCode.FORCE_CONFIRM_ALIVE,
//     EVENT = RunnerMessageCode.EVENT
// }

// TODO: this not used anywhere?
export type RunnerMessage = [
    RunnerMessageCode,
    object
];
