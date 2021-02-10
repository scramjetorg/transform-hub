import testModel from "ava";
import { MessageUtilities, StopSequenceMessage } from "../index";
import { RunnerMessageCode } from "@scramjet/types";

testModel("Serialization must return message in the correct format", async t => {
    const stopMsg: StopSequenceMessage = { msgCode: RunnerMessageCode.STOP, delay: 1000 };
    const serizalized = MessageUtilities.serializeMessage(stopMsg);
    t.is(JSON.stringify(serizalized), "[4001,{\"delay\":1000}]");
});

testModel("Deserialization must return a message of correct type", async t => {
    const stopMsg: StopSequenceMessage = { msgCode: RunnerMessageCode.STOP, delay: 1000 };
    const deserialized = MessageUtilities.deserializeMessage("[4001,{\"delay\":1000}]");
    t.deepEqual(deserialized, stopMsg);
});

testModel("Message after being serizalized --> deserialized --> serizalized must be equal to the orginally serizalized message", async t => {

    const stopMsg: StopSequenceMessage = { msgCode: RunnerMessageCode.STOP, delay: 1000 };
    const serizalized = MessageUtilities.serializeMessage(stopMsg);

    const deserialized = MessageUtilities.deserializeMessage(JSON.stringify(serizalized));

    const serializedAgain = MessageUtilities.serializeMessage(deserialized);

    t.is(JSON.stringify(serizalized), JSON.stringify(serializedAgain));

});