export enum OpRecordCode {

    /**
     * The message codes related to the operation on an Instance.
     * They are trigger in response for the user operations performed by the API.
     */

    GET_INSTANCE = 8000,
    GET_INSTANCE_STDOUT = 8001,
    GET_INSTANCE_STDERR = 8002,
    GET_INSTANCE_STDIN = 8003,
    GET_INSTANCE_LOG = 8004,
    GET_INSTANCE_MONITORING = 8005,
    GET_INSTANCE_OUTPUT = 8006,
    GET_INSTANCE_HEALTH = 8007,
    GET_INSTANCE_EVENTS = 8008,
    GET_INSTANCE_EVENT = 8009,
    GET_INSTANCE_EVENT_ONCE = 8010,
    POST_INSTANCE_INPUT = 8100,
    POST_INSTANCE_MONITORING_RATE = 8101,
    POST_INSTANCE_EVENT = 8102,
    POST_STOP_INSTANCE = 8103,
    POST_KILL_INSTANCE = 8104,

    /**
     * The message codes related to the operation on a Sequence.
     * They are trigger in response for the user operations performed by the API.
     */

    GET_SEQUENCE = 9000,
    DELETE_SEQUENCE = 9200,
    POST_SEQUENCE = 9100,
    POST_START_INSTANCE = 9101,

    /**
     * The message codes related to the operation on Topics.
     * They are trigger in response for the user operations performed by the API.
     */

    GET_TOPIC = 7000,
    POST_TOPIC = 7001,

    /**
     * The message codes for the events which originate from within the system itself and
     * are not the responses for the user operations performed by the API.
     */

    /**
     * The HEARTBEAT message is a signal issued periodically (configurable)
     * by the CSI Controller, the Host and the Manager.
     * It indicates whether the services are still operational.
     */
    HEARTBEAT = 6000,

    /**
     * The INSTANCE_STOPPED message is sent when an Instance terminated not 
     * in response to the API request but gracefully by itself or by throwing an error. 
     */
    INSTANCE_STOPPED = 6001
}
