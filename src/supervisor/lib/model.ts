import { Message } from "../../types/model";
import { MonitoringMessage } from "../../types/model";
import { DescribeSequenceMessage } from "../../types/model";
import { MonitoringRateMessage } from "../../types/model";
import { KeepAliveMessage } from "../../types/model";
import { ConfirmAliveMessage } from "../../types/model";
import { KillSequenceMessage } from "../../types/model";
import { StopSequenceMessage } from "../../types/model";
import { AcknowledgeMessage } from "../../types/model";
import { ErrorMessage } from "../../types/model";

/**
 * An utility class for serialization and deserialization of messages exchanged between Host, Supervisor and Runner.
 *
 * An example of deserialization:
 * 
 * ```js
 * const msgObj = { "monitoringRate": 1 }
 * deserializeMessage([4003, JSON.stringify(msgObj);
 * ```
 * 
 * An example of serialization:
 * 
 * ```js
 * const monitoringMessage: MonitoringMessage = { messageTypeCode: 5, itemThroughput: 5, itemsThroughput: [1, 2], 
 * pressure: 8, cpu: 0.7, memoryUsed: 424343234, memoryFree: 424423432, swapUsed: 424343234, swapFree: 424343234 };
 * serializeMessage(monitoringMessage);
 * ```
 *
 */
class ModelUtils {

    /**
     * Deserialize message
     * @param {[]} data - a message serialized in format [msgCode, '{msgBody}'] where 'msgCode' is a message type code
     * and 'msgBody' is a message in stringified JSON format
     * @return {Message} - an instance of message class
     */
    static async deserializeMessage(data: [number, string]) {

        if (data[0] >= 3000 && data[0] < 4000) {
            console.log("Bingo! 11");
            let retval = ModelUtils.getMonitorStreamMessage(data[0], data[1]);
            console.log(retval);
            return ModelUtils.getMonitorStreamMessage(data[0], data[1]);
        } else if (data[0] >= 4000 && data[0] < 5000) {
            console.log("Bingo! 22");
            let retval = ModelUtils.getControlStreamMessage(data[0], data[1]);
            console.log(retval);
            return ModelUtils.getControlStreamMessage(data[0], data[1]);
        }

        return Promise.reject(new TypeError("🦄"));
    }

    /**
    * Returns an instance of monitor type message class, which comes from Runner-->Supervisor control stream
    * @param {number} code - a numeric code of message type
    * @param {string} data - a message in stringified JSON format
    * @return {Message} - an instance of message class
    */
    private static getMonitorStreamMessage(code: number, data: string) {
        switch (code) {
        case 3000:
            return KeepAliveMessage.fromJSON(data);
        case 3001:
            return MonitoringMessage.fromJSON(data);
        case 3002:
            return DescribeSequenceMessage.fromJSON(data);
        case 3003:
            return ErrorMessage.fromJSON(data);
        case 3004:
            return AcknowledgeMessage.fromJSON(data);
        default:
            throw new Error("Unrecognized message code: " + code);
        }
    }

    /**
    * Returns an instance of control type message class, which comes from Supervisor-->Runner monitoring stream
    * @param {number} code - a numeric code of message type
    * @param {string} data - a message in stringified JSON format
    * @return {Message} - an instance of message class
    */
    private static getControlStreamMessage(code: number, data: string) {
        switch (code) {
        case 4000:
            return new ConfirmAliveMessage();
        case 4001:
            return StopSequenceMessage.fromJSON(data);
        case 4002:
            return new KillSequenceMessage();
        case 4003:
            return MonitoringRateMessage.fromJSON(data);
        default:
            throw new Error("Unrecognized message code: " + code);
        }

    }

    /**
     * Serizalized message
     * @param {Message} message - an instance of message class
     * @return {[]} - a serizalized message in a format [msgCode, '{msgBody}'] where 'msgCode' is a message type code
     * and 'msgBody' is a message in stringified JSON format
     */
    static serializeMessage(message: Message) {
        const code = message.messageTypeCode;
        const json = JSON.stringify(message);
        const obj = JSON.parse(json);
        delete obj.messageTypeCode;
        return [code, JSON.stringify(obj)]; // [1001, '{msgCod: 1001, prop1: 1,...}']
    }
}

export { ModelUtils };
