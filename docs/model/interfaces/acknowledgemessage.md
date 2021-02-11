[@scramjet/model](../README.md) / [Exports](../modules.md) / AcknowledgeMessage

# Interface: AcknowledgeMessage

Message indicating whether the command message (e.g. stop or kill) was received.
Optionally, it can indicate if the command was performed successfully, or
(in case of issues) attach a related error description.
This message type is sent from Runner.

## Hierarchy

* **AcknowledgeMessage**

## Table of contents

### Properties

- [acknowledged](acknowledgemessage.md#acknowledged)
- [errorMsg](acknowledgemessage.md#errormsg)
- [msgCode](acknowledgemessage.md#msgcode)
- [status](acknowledgemessage.md#status)

## Properties

### acknowledged

• **acknowledged**: *boolean*

Indicates whether a message was received.

Defined in: [messages/acknowledge.ts:17](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/e4cc8a9/src/model/messages/acknowledge.ts#L17)

___

### errorMsg

• `Optional` **errorMsg**: *undefined* \| [*ErrorMessage*](errormessage.md)

Describes an error message if error was thrown after performing a requested operation.

Defined in: [messages/acknowledge.ts:23](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/e4cc8a9/src/model/messages/acknowledge.ts#L23)

___

### msgCode

• **msgCode**: RunnerMessageCode

Message type code from RunnerMessageCode enumeration.

Defined in: [messages/acknowledge.ts:14](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/e4cc8a9/src/model/messages/acknowledge.ts#L14)

___

### status

• `Optional` **status**: *undefined* \| *number*

Indicates status of the performed operation.

Defined in: [messages/acknowledge.ts:20](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/e4cc8a9/src/model/messages/acknowledge.ts#L20)
