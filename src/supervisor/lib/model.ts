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
 * const msgObj = { "monitoringRate": 1 }
 * deserializeMessage([4003, JSON.stringify(msgObj);
 * 
 * An example of serialization:
 * 
 * const monitoringMessage: MonitoringMessage = { messageTypeCode: 5, itemThroughput: 5, itemsThroughput: [1, 2], pressure: 8, cpu: 0.7, memoryUsed: 424343234, memoryFree: 424423432, swapUsed: 424343234, swapFree: 424343234 };
 * serializeMessage(monitoringMessage);
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
        const code = data[0]; 
        switch (code) { 
            case 3000: 
                try {
                    const retVal = await KeepAliveMessage.fromJSON(data[1]);
                    return retVal;
                } catch (e) { console.log(e); }
                break;
            case 3001: 
                try {
                    const retVal = await MonitoringMessage.fromJSON(data[1]);
                    return retVal;
                } catch (e) { console.log(e); }
                break;             
                break; 
            case 3002: 
                try {
                    const retVal = await DescribeSequenceMessage.fromJSON(data[1]);
                    return retVal;
                } catch (e) { console.log(e); }
                break;
            case 3003: 
                try {
                    const retVal = await ErrorMessage.fromJSON(data[1]);
                    return retVal;
                } catch (e) { console.log(e); }            
                break;
            case 3004: 
                try {
                    const retVal = await AcknowledgeMessage.fromJSON(data[1]);
                    return retVal;
                } catch (e) { console.log(e); }
            case 4000: 
                return new ConfirmAliveMessage();
                break;
            case 4001: 
                try {
                    const retVal = await StopSequenceMessage.fromJSON(data[1]);
                    return retVal;
                } catch (e) { console.log(e); }
                break;
            case 4002: 
                return new KillSequenceMessage();
                break;
            case 4003: 
                try {
                    const retVal = await MonitoringRateMessage.fromJSON(data[1]);
                    return retVal;
                } catch (e) { console.log(e); }
                break;
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
        return [code, json];
    }

}

export { ModelUtils };
