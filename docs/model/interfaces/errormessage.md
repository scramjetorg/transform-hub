[@scramjet/model](../README.md) / [Exports](../modules.md) / ErrorMessage

# Interface: ErrorMessage

A general purpose error message.
This message type is sent from Runner.

## Hierarchy

* **ErrorMessage**

## Table of contents

### Properties

- [errorCode](errormessage.md#errorcode)
- [exitCode](errormessage.md#exitcode)
- [message](errormessage.md#message)
- [msgCode](errormessage.md#msgcode)
- [stacktrace](errormessage.md#stacktrace)

## Properties

### errorCode

• **errorCode**: *number*

Error's status code

Defined in: [messages/error.ts:19](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/e4cc8a9/src/model/messages/error.ts#L19)

___

### exitCode

• **exitCode**: *number*

The operation's exit code.

Defined in: [messages/error.ts:13](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/e4cc8a9/src/model/messages/error.ts#L13)

___

### message

• **message**: *string*

Error message.

Defined in: [messages/error.ts:16](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/e4cc8a9/src/model/messages/error.ts#L16)

___

### msgCode

• **msgCode**: RunnerMessageCode

Message type code from RunnerMessageCode enumeration

Defined in: [messages/error.ts:10](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/e4cc8a9/src/model/messages/error.ts#L10)

___

### stacktrace

• **stacktrace**: *string*

Error stack trace.

Defined in: [messages/error.ts:22](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/e4cc8a9/src/model/messages/error.ts#L22)
