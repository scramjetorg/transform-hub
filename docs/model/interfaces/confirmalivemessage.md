[@scramjet/model](../README.md) / [Exports](../modules.md) / ConfirmAliveMessage

# Interface: ConfirmAliveMessage

Message forcing Runner to emit a keep alive message.
It is used when Supervisor does not receive a keep alive message from Runner withih a specified time frame.
It forces Runner to emit a keep alive message to confirm it is still active.
This message type is sent from Supervisor.

## Hierarchy

* **ConfirmAliveMessage**

## Table of contents

### Properties

- [msgCode](confirmalivemessage.md#msgcode)

## Properties

### msgCode

• **msgCode**: RunnerMessageCode

Message type code from RunnerMessageCode enumeration.

Defined in: [messages/confirm-alive.ts:12](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/e4cc8a9/src/model/messages/confirm-alive.ts#L12)
