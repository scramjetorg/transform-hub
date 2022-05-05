import { APIErrorCode } from "@scramjet/symbols";

export type AcknowledgeMessageData = {

    /** A unique reference number for a given error type.  */
    code: APIErrorCode;

    /** An error message describing the potential cause of the error 
     * and possibly a way how to fix it.  */
    message: string;

    /** A link to the detail information about the error. */
    url?: string;
}
