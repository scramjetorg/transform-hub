[@scramjet/model](../README.md) / [Exports](../modules.md) / KeepAliveMessage

# Interface: KeepAliveMessage

Message instrucing how much longer to keep Sequence alive.
This message type is sent from Runner.

## Hierarchy

* **KeepAliveMessage**

## Table of contents

### Properties

- [keepAlive](keepalivemessage.md#keepalive)
- [msgCode](keepalivemessage.md#msgcode)

## Properties

### keepAlive

• **keepAlive**: *number*

Information on how much longer the Sequence will be active (in miliseconds).

Defined in: [messages/keep-alive.ts:13](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/e4cc8a9/src/model/messages/keep-alive.ts#L13)

___

### msgCode

• **msgCode**: RunnerMessageCode

Message type code from RunnerMessageCode enumeration.

Defined in: [messages/keep-alive.ts:10](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/e4cc8a9/src/model/messages/keep-alive.ts#L10)
