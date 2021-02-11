[@scramjet/model](../README.md) / [Exports](../modules.md) / DescribeSequenceMessage

# Interface: DescribeSequenceMessage

Message providing the definition of the Sequence.
It includes information on stream mode, name, description and scalability of each subsequence.
This message type is sent from Runner.

## Hierarchy

* **DescribeSequenceMessage**

## Table of contents

### Properties

- [definition](describesequencemessage.md#definition)
- [msgCode](describesequencemessage.md#msgcode)

## Properties

### definition

• `Optional` **definition**: *undefined* \| FunctionDefinition[]

Provides the definition of each subsequence.

Defined in: [messages/describe-sequence.ts:14](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/e4cc8a9/src/model/messages/describe-sequence.ts#L14)

___

### msgCode

• **msgCode**: RunnerMessageCode

Message type code from RunnerMessageCode enumeration.

Defined in: [messages/describe-sequence.ts:11](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/e4cc8a9/src/model/messages/describe-sequence.ts#L11)
