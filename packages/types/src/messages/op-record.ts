import { OpRecordCode } from "@scramjet/symbols";

export type OpRecord = {

    /**
    * The type of recorded operation is identified by the code value from the OpRecord enumeration.
    */
    opCode: OpRecordCode;

    /**
    * The operation state from the OpState enumeration.
    */
    opState: string;

    /**
    * The generated unique request ID for operations coming from the API.
    */
    requestId: string;

    /**
    * The requestor can be either a user who performed the operation or the system.
    */
    requestorId: string;

    /**
    * The timestamp of when the operation was registered.
    */
    receivedAt: number;

    /**
    * The data written to the request stream. 
    */
    tx?: number;

    /**
    * The data received in the request stream
    */
    rx?: number;

    /**
    * An instance of the object which the operation concerns, e.g. Host.
    */
    objectId: string;
}

