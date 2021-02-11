export { AcknowledgeMessage, AcknowledgeMessageData } from "./messages/acknowledge";
export { ConfirmHealthMessage, ConfirmHealthMessageData } from "./messages/confirm-health";
export { DescribeSequenceMessage, DescribeSequenceMessageData } from "./messages/describe-sequence";
export { ErrorMessage, ErrorMessageData } from "./messages/error";
export { KeepAliveMessage, KeepAliveMessageData } from "./messages/keep-alive";
export { KillSequenceMessage, KillSequenceMessageData } from "./messages/kill-sequence";
export { MonitoringRateMessage, MonitoringRateMessageData } from "./messages/monitor-rate";
export { MonitoringMessage, MonitoringMessageData } from "./messages/monitoring";
export { StopSequenceMessage, StopSequenceMessageData } from "./messages/stop-sequence";

import { Message } from "./messages/message";
import { MessageUtilities } from "./messages-utils";

type MessageData<T extends Message> = Omit<T, "msgCode">;

export {
    Message,
    MessageData,
    MessageUtilities
};