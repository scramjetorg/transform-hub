/**
 * General message class
 * All messages must include a message type code.
 */
class Message {

    messageTypeCode: number;

    constructor(messageTypeCode: number) {
        this.messageTypeCode = messageTypeCode;
    }
}

/**
 * Monitoring message including detailed performance statistics.
 * This message type is sent from Runner.
 */
class MonitoringMessage extends Message {

    itemThroughput: number;
    itemsThroughput: number[];
    pressure: number;
    cpu: number;
    memoryUsed: number;
    memoryFree: number;
    swapUsed: number;
    swapFree: number;

    constructor(itemThroughput: number, itemsThroughput: number[], pressure: number, cpu: number, memoryUsed: number,
        memoryFree: number, swapUsed: number, swapFree: number) {
        super(3001);
        this.itemThroughput = itemThroughput;
        this.itemsThroughput = itemsThroughput;
        this.pressure = itemThroughput;
        this.cpu = itemThroughput;
        this.memoryUsed = itemThroughput;
        this.memoryFree = memoryFree;
        this.swapUsed = swapUsed;
        this.swapFree = swapFree;
    }

    static fromJSON(json: string) {

        const objMsg = JSON.parse(json);

        if (!objMsg.hasOwnProperty("itemThroughput")) {
            throw new Error("MonitoringMessage requires an 'itemThroughput' property.");        
        } else if (!objMsg.hasOwnProperty("itemsThroughput")) {
            throw new Error("MonitoringMessage requires an 'itemsThroughput' property."); 
        } else if (!objMsg.hasOwnProperty("pressure")) {
            throw new Error("MonitoringMessage requires an 'pressure' property.");
        } else if (!objMsg.hasOwnProperty("cpu")) {
            throw new Error("MonitoringMessage requires an 'cpu' property.");
        } else if (!objMsg.hasOwnProperty("memoryUsed")) {
            throw new Error("MonitoringMessage requires an 'memoryUsed' property.");
        } else if (!objMsg.hasOwnProperty("memoryFree")) {
            throw new Error("MonitoringMessage requires an 'memoryFree' property.");
        } else if (!objMsg.hasOwnProperty("swapUsed")) {
            throw new Error("MonitoringMessage requires an 'swapUsed' property.");
        } else if (!objMsg.hasOwnProperty("swapFree")) {
            throw new Error("MonitoringMessage requires an 'swapFree' property.");
        }

        const monitoringMessage = new MonitoringMessage(objMsg.itemThroughput, 
            objMsg.itemsThroughput, objMsg.pressure, objMsg.cpu, objMsg.memoryUsed,
            objMsg.memoryFree, objMsg.swapUsed, objMsg.swapFree);

        return monitoringMessage;
    }

}

/**
 * Message providing the description of Sequence.
 * It is an array of subsequences from which the sequence is construced.
 * This message type is sent from Runner.
 */
class DescribeSequenceMessage extends Message {

    subsequences: string[];

    constructor(subsequences: string[]) {
        super(3002);
        this.subsequences = subsequences;
    }

    static fromJSON(json: string) {

        const objMsg = JSON.parse(json);

        if (!objMsg.hasOwnProperty("subsequences")) {
            throw new Error("DescribeSequenceMessage requires a 'subsequences' property.");
        } 

        const describeSequenceMessage = new DescribeSequenceMessage(objMsg.subsequences);
        return describeSequenceMessage;
    }
}


/**
 * Message instrucing how much longer to keep Sequence alive.
 * This message type is sent from Runner.
 */
class KeepAliveMessage extends Message {

    keepAlive: number;

    constructor(keepAlive: number) {
        super(3000);
        this.keepAlive = keepAlive;
    }

    static fromJSON(json: string): KeepAliveMessage {

        const objMsg = JSON.parse(json);

        if (!objMsg.hasOwnProperty("keepAlive")) {
            throw new Error("KeepAliveMessage requires a 'keepAlive' property.");
        }

        const keepAliveMessage = new KeepAliveMessage(objMsg.keepAlive);
        return keepAliveMessage;
    }
}

/**
 * Error message
 * This message type is sent from Runner.
 */
class ErrorMessage extends Message {

    exitCode: number;
    message: string;
    errorCode: number;
    stacktrace: string;

    constructor(exitCode: number, message: string, errorCode: number, stacktrace: string) {
        super(3003);
        this.exitCode = exitCode;
        this.message = message;
        this.errorCode = errorCode;
        this.stacktrace = stacktrace;
    }

    static fromJSON(json: string) {

        const objMsg = JSON.parse(json);

        if (!objMsg.hasOwnProperty("exitCode")) {
            throw new Error("ErrorMessage requires an 'exitCode' property.");
        } else if (!objMsg.hasOwnProperty("message")) {
            throw new Error("ErrorMessage requires a 'message' property.");
        } else if (!objMsg.hasOwnProperty("errorCode")) {
            throw new Error("ErrorMessage requires an 'errorCode' property.");
        } else if (!objMsg.hasOwnProperty("stacktrace")) {
            throw new Error("ErrorMessage requires a 'stacktrace' property.");
        }

        const errorMessage = new ErrorMessage(objMsg.exitCode, objMsg.message, objMsg.errorCode, objMsg.stacktrace);
        return errorMessage;
    }
}

/**
 * Message indicating whether the command received from Supervisor was received and whether it was performed or not.
 * Optionally, it may include a related error messsage.
 * This message type is sent from Runner.
 */
class AcknowledgeMessage extends Message {
    acknowledged: boolean;
    status: number;
    errorMsg?: ErrorMessage;

    constructor(acknowledged: boolean, status: number, errorMsg?: ErrorMessage) {
        super(3004);
        this.acknowledged = acknowledged;
        this.status = status;
        this.errorMsg = errorMsg;
    }

    static fromJSON(json: string) {

        const objMsg = JSON.parse(json);

        if (!objMsg.hasOwnProperty("acknowledged")) {
            throw new Error("AcknowledgeMessage requires an 'acknowledged' property.");
        } else if (!objMsg.hasOwnProperty("status")) {
            throw new Error("AcknowledgeMessage requires a 'status' property.");
        }

        const acknowledgeMessage = new AcknowledgeMessage(objMsg.acknowledged, objMsg.status);
        return acknowledgeMessage;
    }
}

/**
 * Message instructing Runner how often to emit monitoring messages.
 * This message type is sent from Supervisor.
 */
class MonitoringRateMessage extends Message {

    monitoringRate: number;

    constructor(monitoringRate: number) {
        super(4003);
        this.monitoringRate = monitoringRate;
    }

    static fromJSON(json: string) {

        const objMsg = JSON.parse(json);

        if (!objMsg.hasOwnProperty("monitoringRate")) {
            throw new Error("MonitoringRateMessage requires a 'monitoringRate' property.");
        }

        const monitoringRateMessage = new MonitoringRateMessage(objMsg.monitoringRate);
        return monitoringRateMessage;
    }
}

/**
 * Message forcing Runner to emit a keep alive message.
 * It is used when Supervisor does not receive a keep alive message from Runner withih a specified time.
 * It forces Runner to emit a keep alive message to confirm it is active.
 * This message type is sent from Supervisor.
 */
class ConfirmAliveMessage extends Message {

    constructor() {
        super(3000);
    }
}

/**
 * Message instructing Runner to terminate Sequence using the kill signal.
 * It causes an ungraceful termination of Sequence.
 * This message type is sent from Supervisor.
 */
class KillSequenceMessage extends Message {

    constructor() {
        super(4002);
    }
}

/**
 * Message instructing Runner to terminate Sequence gracefully after a specified period of time (in miliseconds).
 * It gives Sequence and Runner time to perform a cleanup.
 * This message type is sent from Supervisor.
 */
class StopSequenceMessage extends Message {

    delay: number;

    constructor(delay: number) {
        super(4001);
        this.delay = delay;
    }

    static fromJSON(json: string) {

        const objMsg = JSON.parse(json);

        if (!objMsg.hasOwnProperty("delay")) {
            throw new Error("StopSequenceMessage requires a 'delay' property.");
        } 

        const stopSequenceMessage = new StopSequenceMessage(objMsg.delay);
        return stopSequenceMessage;
    }
}

export { Message, MonitoringMessage, DescribeSequenceMessage, MonitoringRateMessage, 
    KeepAliveMessage, ConfirmAliveMessage, KillSequenceMessage, StopSequenceMessage,
    ErrorMessage, AcknowledgeMessage
};

