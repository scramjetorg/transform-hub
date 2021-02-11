[@scramjet/model](../README.md) / [Exports](../modules.md) / MessageUtilities

# Namespace: MessageUtilities

## Table of contents

### Functions

- [deserializeMessage](messageutilities.md#deserializemessage)
- [getMessage](messageutilities.md#getmessage)
- [serializeMessage](messageutilities.md#serializemessage)

## Functions

### deserializeMessage

▸ **deserializeMessage**(`msg`: *string*): *any*

Get an object of message type from serialized message.

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`msg` | *string* | a stringified and serialized message   |

**Returns:** *any*

- an object of message type

Defined in: [messages-utils.ts:71](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/e4cc8a9/src/model/messages-utils.ts#L71)

___

### getMessage

▸ **getMessage**(`code`: RunnerMessageCode, `msgData`: *string*): *any*

Get an object of message type from serialized message.
A helper method used for deserializing messages.

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`code` | RunnerMessageCode | message type code   |
`msgData` | *string* | a stringified message   |

**Returns:** *any*

- an object of message type

Defined in: [messages-utils.ts:27](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/e4cc8a9/src/model/messages-utils.ts#L27)

___

### serializeMessage

▸ **serializeMessage**(`msg`: *any*): RunnerMessage

Serizalized message

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`msg` | *any* | an object of message type   |

**Returns:** RunnerMessage

- a serizalized message in a format [msgCode, {msgBody}]
where 'msgCode' is a message type code and 'msgBody' is a message in stringified JSON format

Defined in: [messages-utils.ts:12](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/e4cc8a9/src/model/messages-utils.ts#L12)
