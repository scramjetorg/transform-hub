import { CPMMessageCode, RunnerMessageCode } from "@scramjet/symbols";
import { CPMMessage, MessageType, RunnerMessage } from "@scramjet/types";
import { getMessage } from "./get-message";

// TODO: this serializes the message to array and deserializeMessage from string.
/**
 * Serizalized message.
 *
 * @param msg - an object of message type
 * @return - a serializable message in a format [msgCode, {msgBody}]
 *           where 'msgCode' is a message type code and 'msgBody' is a message body
 **/

export function serializeMessage<T extends RunnerMessageCode | CPMMessageCode>(
    { msgCode, ...msg }: MessageType<T>): RunnerMessage| CPMMessage {
    // DO TYPEGUARDS...

    const json = JSON.parse(JSON.stringify(msg));

    return [msgCode, json];
}

/**
 * Get an object of message type from serialized message.
 *
 * @param { string } msg - a stringified and serialized message
 * @return { any } - an object of message type
 **/
export function deserializeMessage(msg: string): MessageType<RunnerMessageCode> {
    try {
        const obj = JSON.parse(msg);

        if (Array.isArray(obj) && obj.length === 2) {
            const code: RunnerMessageCode = +obj[0];
            const data = obj[1];

            if (Object.values(RunnerMessageCode).includes(code))
                return getMessage(code, data);
        }
        throw new TypeError("Not a recognized array: " + obj);
    } catch (e: any) {
        throw new TypeError("Error while parsing a message.");
    }
}
