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
    PANG = 3012,
    INPUT_CONTENT_TYPE = 3013,

    PONG = 4000,
    STOP = 4001,
    KILL = 4002,
    MONITORING_RATE = 4003,
    FORCE_CONFIRM_ALIVE = 4004,

    EVENT = 5001,
}
