import { MonitoringMessage, RunnerMessageCode } from "@scramjet/types";
import { RunnerMessage } from "@scramjet/types";
import { ConfirmAliveMessage, DescribeSequenceMessage, ErrorMessage, KeepAliveMessage, KillSequenceMessage, MonitoringRateMessage, StopSequenceMessage } from ".";

export module MessageUtilities {

    /**
    * Serizalized message
    * @param {any} msg - an object of message type
    * @return { RunnerMessage } - a serizalized message in a format [msgCode, {msgBody}] 
    * where 'msgCode' is a message type code and 'msgBody' is a message in stringified JSON format
    * */
    export function serializeMessage(msg: any): RunnerMessage {
        const code = msg.msgCode;
        const json = JSON.stringify(msg);
        const obj = JSON.parse(json);
        delete obj.msgCode;
        return [code, obj];
    }

    /**
    * Get an object of message type from serialized message.
    * A helper method used for deserializing messages.
    * @param { RunnerMessageCode } code - message type code
    * @param { string } msgData - a stringified message
    * @return { any } - an object of message type
    * */
    export function getMessage(code: RunnerMessageCode, msgData: string): any {
        switch (code) {
        case RunnerMessageCode.STOP: {
            const msg: StopSequenceMessage = JSON.parse(msgData);
            return msg;
        }
        case RunnerMessageCode.KILL: {
            const msg: KillSequenceMessage = JSON.parse(msgData);
            return msg;
        }
        case RunnerMessageCode.ALIVE: {
            const msg: KeepAliveMessage = JSON.parse(msgData);
            return msg;
        }
        case RunnerMessageCode.MONITORING_RATE: {
            const msg: MonitoringRateMessage = JSON.parse(msgData);
            return msg;
        }
        case RunnerMessageCode.FORCE_CONFIRM_ALIVE: {
            const msg: ConfirmAliveMessage = JSON.parse(msgData);
            return msg;
        }
        case RunnerMessageCode.DESCRIBE_SEQUENCEMESSAGE: {
            const msg: DescribeSequenceMessage = JSON.parse(msgData);
            return msg;
        }
        case RunnerMessageCode.ERROR: {
            const msg: ErrorMessage = JSON.parse(msgData);
            return msg;
        }
        case RunnerMessageCode.MONITORING: {
            const msg: MonitoringMessage = JSON.parse(msgData);
            return msg;
        }
        default:
            throw new Error("Unrecognized message code: " + code);
        }
    }

    /**
    * Get an object of message type from serialized message.
    * @param { string } msg - a stringified and serialized message
    * @return { any } - an object of message type
    * */
    export function deserializeMessage(msg: string): any {
        try {
            const obj = JSON.parse(msg);
            if (Array.isArray(obj) && obj.length === 2) {
                const code = obj[0];
                let data = obj[1];
                data.msgCode = code;
                data = JSON.stringify(data);
                return getMessage(code, data);
            }
            throw new Error("Not a recognized array: " + obj);

        } catch (e) {
            throw new Error("Error while parsing a message: " + msg);
        }
    }
}

