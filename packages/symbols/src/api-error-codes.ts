export enum APIErrorCode {

    /**
     * A user is not authorized to access a particular Space.
     */
    NOT_AUTHORIZED = 1001,

    /**
     * There is not enough space to perform the operation. 
     * Usually this is caused by the user exceeding the disk quota.
     * It may be thrown when sending a Sequence to the STH.
     */
    INSUFFICIENT_RESOURCES = 1002,

    /**
     * The Sequence package sent to the STH was not processed by the Pre-Runner.
     * It may be caused by the Sequence package not following the package requirements:
     * https://github.com/scramjetorg/scramjet-cloud-docs#31-review-the-package 
     */
    UNPROCESSABLE_ENTITY = 1003,

}
