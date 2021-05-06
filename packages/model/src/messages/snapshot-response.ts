import { RunnerMessageCode } from "@scramjet/symbols";

export type SnapshotResponseMessageData = {

    /** The url of container snapshot created. */
    url: string;
}

/**
 * Information about the url of the container snapshot created.
 * This message type is sent from the LifeCycle Controller.
 */
export type SnapshotResponseMessage = { msgCode: RunnerMessageCode.SNAPSHOT_RESPONSE } & SnapshotResponseMessageData;
