import {
    BaseMessage, ErrorMessage, ConfirmAliveMessage, DescribeSequenceMessage,
    KeepAliveMessage, KillSequenceMessage, MonitoringRateMessage, MonitoringMessage,
    StopSequenceMessage
} from "../index";

import { RunnerMessageCode } from "../../types/runner";

export type Message = 
    BaseMessage
    & 
    (ErrorMessage 
    | ConfirmAliveMessage 
    | DescribeSequenceMessage
    | KeepAliveMessage
    | KeepAliveMessage
    | KillSequenceMessage
    | MonitoringRateMessage
    | MonitoringMessage
    | StopSequenceMessage
    );


export type EncodedMessage = [RunnerMessageCode, Message];