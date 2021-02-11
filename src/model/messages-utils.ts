import { RunnerMessage, RunnerMessageCode } from "@scramjet/types";
import { Message } from "./index";
import { getMessage } from "./get-message";

export module MessageUtilities {

    /**
    * Serizalized message
    * @param {any} msg - an object of message type
    * @return { RunnerMessage } - a serizalized message in a format [msgCode, {msgBody}] 
    * where 'msgCode' is a message type code and 'msgBody' is a message in stringified JSON format
    * */
    export function serializeMessage<T extends Message>({ msgCode, ...msg }: T): RunnerMessage {
        // DO TYPEGUARDS...

        const json = JSON.parse(JSON.stringify(msg));
        return [msgCode, json];
    }

    /**
    * Get an object of message type from serialized message.
    * @param { string } msg - a stringified and serialized message
    * @return { any } - an object of message type
    * */
    export function deserializeMessage<T extends Message>(msg: string): T {
        try {
            const obj = JSON.parse(msg);
            if (Array.isArray(obj) && obj.length === 2) {
                const code = +obj[0];
                let data = obj[1];
                if (Object.values(RunnerMessageCode).includes(code))
                    return getMessage(code, data);
            }
            throw new TypeError("Not a recognized array: " + obj);
        } catch (e) {
            throw new TypeError("Error while parsing a message.");
        }
    }
}