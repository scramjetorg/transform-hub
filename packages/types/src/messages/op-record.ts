import { OpRecordCode } from "@scramjet/symbols";

export type OpRecord = {

    /**
    * The type of recorded operation is identified by the code value from the OpRecord enumeration.
    */
    opCode: OpRecordCode;

    /**
    * The generated unique request ID for operations coming from the API.
    */

    requestId: string;

    /**
    * The requestor can be either a user who performed the operation or the system.
    */
    requestorId: string;

    /**
    * The address of the original requestor for operations coming from the API .
    */
    requestorIP?: string;

    /**
    * The timestamp of when the operation was registered.
    */
    receivedAt: number;

    /**
    * The timestamp of when the operation was finished (if applicable).
    */
    endedAt?: number;

    /**
    * An instance of the object which the operation concerns, e.g. Host.
    */
    objectId: string;

    /**
    * A type of the object which the operation concerns, e.g. Host ID.
    */
    objectType: string;

    /**
    * The data written to the request stream. 
    */
    tx?: number;

    /**
    * The data received in the request stream
    */
    rx?: number;

    /**
    * The full API URL of the operations coming from the API.
    */
    requestedURL?: string;

}

