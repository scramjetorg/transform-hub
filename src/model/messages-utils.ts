import { BaseMessage, ErrorMessage, ConfirmAliveMessage, DescribeSequenceMessage,
    KeepAliveMessage, KillSequenceMessage, MonitoringRateMessage, MonitoringMessage,
    StopSequenceMessage, Message, EncodedMessage } from "./index";
import { RunnerMessageCode } from "../runner/fake/runner";


/**
* Serizalized message
* @param {Message} msg - an instance of message class
* @return {[]} - a serizalized message in a format [msgCode, '{msgBody}'] where 'msgCode' is a message type code
* and 'msgBody' is a message in stringified JSON format
* */
export function serializeMessage(msg: Message): EncodedMessage {
    const code = msg.messageTypeCode;
    const json = JSON.stringify(msg);
    const obj = JSON.parse(json);
    delete obj.messageTypeCode;
    return [code, obj];
}
