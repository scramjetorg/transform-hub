[@scramjet/model](../README.md) / [Exports](../modules.md) / KillSequenceMessage

# Interface: KillSequenceMessage

Message instructing Runner to terminate Sequence using the kill signal.
It causes an ungraceful termination of Sequence.
This message type is sent from Supervisor.

## Hierarchy

* **KillSequenceMessage**

## Table of contents

### Properties

- [msgCode](killsequencemessage.md#msgcode)

## Properties

### msgCode

• **msgCode**: RunnerMessageCode

Message type code from RunnerMessageCode enumeration

Defined in: [messages/kill-sequence.ts:11](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/e4cc8a9/src/model/messages/kill-sequence.ts#L11)
