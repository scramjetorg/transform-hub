export enum OpRecordCode {

    /**
     * The message codes related to the operation on an Instance.
     * They are triggered in response to the user operations performed by the API.
     */

    GET_INSTANCE = 12200,
    GET_INSTANCE_STDOUT = 12201,
    GET_INSTANCE_STDERR = 12202,
    GET_INSTANCE_STDIN = 12203,
    GET_INSTANCE_LOG = 12204,
    GET_INSTANCE_MONITORING = 12205,
    GET_INSTANCE_OUTPUT = 12206,
    GET_INSTANCE_HEALTH = 12208,
    GET_INSTANCE_EVENTS = 12209,
    GET_INSTANCE_EVENT = 12210,
    GET_INSTANCE_EVENT_ONCE = 12211,
    POST_INSTANCE_INPUT = 12107,
    POST_INSTANCE_MONITORING_RATE = 12112,
    POST_INSTANCE_EVENT = 12110,
    POST_STOP_INSTANCE = 12114,
    POST_KILL_INSTANCE = 12115,

    /**
     * The message codes related to the operation on a Sequence.
     * They are triggered in response to the user operations performed by the API.
     */

    GET_SEQUENCE = 11200,
    DELETE_SEQUENCE = 11400,
    POST_SEQUENCE = 11100,
    POST_START_INSTANCE = 11117,

    /**
     * The message codes related to the operation on Topics.
     * They are trigger in response for the user operations performed by the API.
     */

    GET_TOPIC = 13200,
    POST_TOPIC = 13100,

    /**
     * The message codes for the events which originate from within the system itself and
     * are not the responses for the user operations performed by the API.
     */

    /**
     * The HEARTBEAT message is a signal issued periodically (configurable)
     * by the CSI Controller, the Host and the Manager.
     * It indicates whether the services are still operational.
     */
    HEARTBEAT = -1, // NOT YET IMPLEMENTED

    /**
     * The INSTANCE_STOPPED message is sent when an Instance terminated not 
     * in response to the API request but gracefully by itself or by throwing an error. 
     */
    INSTANCE_STOPPED = -1 // NOT YET IMPLEMENTED
}
