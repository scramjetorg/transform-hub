import { MonitoringMessageHandler, ControlMessageHandler } from "@scramjet/model";
import {
    ControlMessageCode,
    DownstreamStreamsConfig,
    MonitoringMessageCode,
    UpstreamStreamsConfig
} from ".";

export interface ICommunicationHandler {
    hookClientStreams(str: UpstreamStreamsConfig): this;
    hookLifecycleStreams(str: DownstreamStreamsConfig): this;

    addMonitoringHandler<T extends MonitoringMessageCode>(code: T, handler: MonitoringMessageHandler<T>): this;
    addControlHandler<T extends ControlMessageCode>(code: T, handler: ControlMessageHandler<T>): this;

    pipeMessageStreams(): this;
    pipeStdio(): this;
    pipeDataStreams(): this;
}
