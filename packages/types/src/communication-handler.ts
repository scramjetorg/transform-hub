import {
    MonitoringMessageCode, ControlMessageCode,
    DownstreamStreamsConfig, UpstreamStreamsConfig
} from "@scramjet/types/src/message-streams";
import { MessageHandler } from "@scramjet/model/src/stream-handler";


export interface ICommunicationHandler {
    hookClientStreams(str: UpstreamStreamsConfig): this;
    hookLifecycleStreams(str: DownstreamStreamsConfig): this;

    addMonitoringHandler<T extends MonitoringMessageCode>(code: T, handler: MessageHandler<T>): this;
    addControlHandler<T extends ControlMessageCode>(code: T, handler: MessageHandler<T>): this;

    pipeMessageStreams(): this;
    pipeStdio(): this;
    pipeDataStreams(): this;
}
