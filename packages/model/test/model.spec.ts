import { RunnerMessageCode } from "@scramjet/symbols";
import { StopSequenceMessage } from "@scramjet/types";
import testModel from "ava";

/* eslint-disable-next-line import/no-extraneous-dependencies */
import { MessageUtilities } from "@scramjet/model";

testModel("Serialization must return a message in the correct format", async t => {
    const stopMsg: StopSequenceMessage = { msgCode: RunnerMessageCode.STOP, timeout: 1000, canCallKeepalive: true };
    const serizalized = MessageUtilities.serializeMessage(stopMsg);

    t.is(JSON.stringify(serizalized), "[4001,{\"timeout\":1000,\"canCallKeepalive\":true}]");
});

testModel("Deserialization must return a message of correct type", async t => {
    const stopMsg: StopSequenceMessage = { msgCode: RunnerMessageCode.STOP, timeout: 1000, canCallKeepalive: true };
    const deserialized = MessageUtilities.deserializeMessage("[4001,{\"timeout\":1000,\"canCallKeepalive\":true}]");

    t.deepEqual(deserialized, stopMsg);
});

testModel("Message after being serizalized --> deserialized --> serizalized must be equal to the orginally serizalized message", async t => {

    const stopMsg: StopSequenceMessage = { msgCode: RunnerMessageCode.STOP, timeout: 1000, canCallKeepalive: true };
    const serizalized = MessageUtilities.serializeMessage(stopMsg);
    const deserialized = MessageUtilities.deserializeMessage(JSON.stringify(serizalized));
    const serializedAgain = MessageUtilities.serializeMessage(deserialized);

    t.is(JSON.stringify(serizalized), JSON.stringify(serializedAgain));

});

testModel("Deserialization must throw an error when an incorrect message code is provided", t => {
    const msg = "[-1,{\"delay\":1000,\"canCallKeepalive\":true}]";
    const error = t.throws(() => {
        MessageUtilities.deserializeMessage(msg);
    }, { instanceOf: TypeError });

    t.is(error.message, "Error while parsing a message.");
});

testModel("Deserialization must throw an error when a message is incorrectly serialized", t => {
    const msg = "[-1,{\"delay\":1000, \"canCallKeepalive\": true},-1";
    const error = t.throws(() => {
        MessageUtilities.deserializeMessage(msg);
    }, { instanceOf: TypeError });

    t.is(error.message, "Error while parsing a message.");
});
