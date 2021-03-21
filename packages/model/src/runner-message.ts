export enum RunnerMessageCode {
    PONG = 3000,
    ACKNOWLEDGE = 3004,
    PING = 4000,
    STOP = 4001,
    KILL = 4002,
    MONITORING_RATE = 4003,
    ALIVE = 3010, // temporary message code
    FORCE_CONFIRM_ALIVE = 4004,
    DESCRIBE_SEQUENCE = 3002,
    ERROR = 3003,
    MONITORING = 3001,
    EVENT = 4005,
    SNAPSHOT_RESPONSE = 3005
}

// TODO: this not used anywhere?
export type RunnerMessage = [
    RunnerMessageCode,
    object
];
