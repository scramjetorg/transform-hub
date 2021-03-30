import { CommunicationHandler } from "@scramjet/model";
import {
    ReadableStream, WritableStream,
    EncodedSerializedControlMessage, EncodedSerializedMonitoringMessage,
    EncodedControlMessage, EncodedMonitoringMessage
} from "@scramjet/types";
import { Readable, Writable } from "stream";
import { DataStream } from "scramjet";

export function getCommunicationHandler() {
    const comm = new CommunicationHandler();
    const controlDown = new DataStream();
    const monitoringDown = new DataStream();
    const controlUp = new DataStream();
    const monitoringUp = new DataStream();

    comm.hookLifecycleStreams([
        new Writable(),
        new Readable(),
        new Readable(),
        controlDown as WritableStream<EncodedSerializedControlMessage>,
        monitoringDown as unknown as ReadableStream<EncodedSerializedMonitoringMessage>
    ]);

    comm.hookClientStreams([
        new Readable(),
        new Writable(),
        new Writable(),
        controlUp as unknown as ReadableStream<EncodedControlMessage>,
        monitoringUp as unknown as WritableStream<EncodedMonitoringMessage>
    ]);

    comm.pipeMessageStreams();

    return { comm, controlDown, monitoringDown, controlUp, monitoringUp };
}
