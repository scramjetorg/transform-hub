import { CommunicationHandler } from "@scramjet/model";
import {
    ReadableStream, WritableStream,
    EncodedSerializedControlMessage, EncodedSerializedMonitoringMessage
} from "@scramjet/types";
import { PassThrough } from "stream";
import { DataStream } from "scramjet";

export function getCommunicationHandler() {
    const comm = new CommunicationHandler();
    const controlDown = new DataStream();
    const monitoringDown = new DataStream();
    const controlUp = new DataStream();
    const monitoringUp = new DataStream();

    comm.hookDownstreamStreams([
        new PassThrough(),
        new PassThrough(),
        new PassThrough(),
        controlDown as WritableStream<EncodedSerializedControlMessage>,
        monitoringDown as unknown as ReadableStream<EncodedSerializedMonitoringMessage>,
        new PassThrough(),
        new PassThrough(),
        new PassThrough(),
        new PassThrough()
    ]);

    comm.hookUpstreamStreams([
        new PassThrough(),
        new PassThrough(),
        new PassThrough(),
        controlUp as unknown as ReadableStream<EncodedSerializedControlMessage>,
        monitoringUp as unknown as WritableStream<EncodedSerializedMonitoringMessage>,
        new PassThrough(),
        new PassThrough(),
        new PassThrough(),
        new PassThrough()
    ]);

    comm.pipeMessageStreams();

    return { comm, controlDown, monitoringDown, controlUp, monitoringUp };
}
