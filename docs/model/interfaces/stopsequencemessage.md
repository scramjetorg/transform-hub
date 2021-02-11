[@scramjet/model](../README.md) / [Exports](../modules.md) / StopSequenceMessage

# Interface: StopSequenceMessage

Message instructing Runner to terminate Sequence gracefully after a specified period of time (in seconds).
It gives Sequence and Runner time to perform a cleanup.
This message type is sent from Supervisor.

## Hierarchy

* **StopSequenceMessage**

## Table of contents

### Properties

- [canCallKeepalive](stopsequencemessage.md#cancallkeepalive)
- [msgCode](stopsequencemessage.md#msgcode)
- [timeout](stopsequencemessage.md#timeout)

## Properties

### canCallKeepalive

• **canCallKeepalive**: *boolean*

Informs if keepAlive can be called to prolong the running of the Sequence.

Defined in: [messages/stop-sequence.ts:17](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/e4cc8a9/src/model/messages/stop-sequence.ts#L17)

___

### msgCode

• **msgCode**: RunnerMessageCode

Message type code from RunnerMessageCode enumeration.

Defined in: [messages/stop-sequence.ts:11](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/e4cc8a9/src/model/messages/stop-sequence.ts#L11)

___

### timeout

• **timeout**: *number*

The number of seconds before the Sequence will be killed.

Defined in: [messages/stop-sequence.ts:14](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/e4cc8a9/src/model/messages/stop-sequence.ts#L14)
