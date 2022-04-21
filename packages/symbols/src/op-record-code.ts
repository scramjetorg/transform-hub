export enum OpRecordCode {

    /**
     * The message codes related to the operation on an Instance.
     * They are triggered in response to the user operations performed by the API.
     */

    GET_INSTANCE = 11200,
    GET_INSTANCE_STDOUT = 11201,
    GET_INSTANCE_STDERR = 11202,
    GET_INSTANCE_STDIN = 11203,
    GET_INSTANCE_LOG = 11204,
    GET_INSTANCE_MONITORING = 11205,
    GET_INSTANCE_OUTPUT = 11206,
    GET_INSTANCE_HEALTH = 11208,
    GET_INSTANCE_EVENTS = 11209,
    GET_INSTANCE_EVENT = 11210,
    GET_INSTANCE_EVENT_ONCE = 11211,
    POST_INSTANCE_INPUT = 11107,
    POST_INSTANCE_MONITORING_RATE = 11112,
    POST_INSTANCE_EVENT = 11110,
    POST_STOP_INSTANCE = 11114,
    POST_KILL_INSTANCE = 11115,

    /**
     * The message codes related to the operation on a Sequence.
     * They are triggered in response to the user operations performed by the API.
     */

    GET_SEQUENCE = 10200,
    DELETE_SEQUENCE = 10400,
    POST_SEQUENCE = 10100,
    POST_START_INSTANCE = 10117,

    /**
     * The message codes related to the operation on Topics.
     * They are triggered in response to the user operations performed by the API.
     */

    GET_TOPIC = 12200,
    POST_TOPIC = 12100,

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
