@scramjet/model

# @scramjet/model

## Table of contents

### Classes

- [AppError](classes/apperror.md)
- [CSIControllerError](classes/csicontrollererror.md)
- [CommunicationHandler](classes/communicationhandler.md)
- [DelayedStream](classes/delayedstream.md)
- [HostError](classes/hosterror.md)
- [IDProvider](classes/idprovider.md)
- [InstanceAdapterError](classes/instanceadaptererror.md)
- [RunnerError](classes/runnererror.md)
- [SequenceAdapterError](classes/sequenceadaptererror.md)

### Type aliases

- [ConfiguredMessageHandler](README.md#configuredmessagehandler)
- [ICSIControllerErrorData](README.md#icsicontrollererrordata)
- [IHostErrorData](README.md#ihosterrordata)
- [IRunnerErrorData](README.md#irunnererrordata)

### Variables

- [MessageUtilities](README.md#messageutilities)

### Functions

- [checkMessage](README.md#checkmessage)
- [deserializeMessage](README.md#deserializemessage)
- [getMessage](README.md#getmessage)
- [serializeMessage](README.md#serializemessage)

## Type aliases

### ConfiguredMessageHandler

Ƭ **ConfiguredMessageHandler**<`T`\>: { `blocking`: `boolean` ; `handler`: `MutatingMonitoringMessageHandler`<`T` extends `MonitoringMessageCode` ? `T` : `never`\>  } \| { `blocking`: `boolean` ; `handler`: `ControlMessageHandler`<`T` extends `ControlMessageCode` ? `T` : `never`\>  }

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends `RunnerMessageCode` \| `CPMMessageCode` |

#### Defined in

[packages/model/src/stream-handler.ts:23](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L23)

___

### ICSIControllerErrorData

Ƭ **ICSIControllerErrorData**: `any`

#### Defined in

[packages/model/src/errors/csi-controller-error.ts:4](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/errors/csi-controller-error.ts#L4)

___

### IHostErrorData

Ƭ **IHostErrorData**: `any`

#### Defined in

[packages/model/src/errors/host-error.ts:4](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/errors/host-error.ts#L4)

___

### IRunnerErrorData

Ƭ **IRunnerErrorData**: `any`

#### Defined in

[packages/model/src/errors/runner-error.ts:4](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/errors/runner-error.ts#L4)

## Variables

### MessageUtilities

• `Const` **MessageUtilities**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `deserializeMessage` | (`msg`: `string`) => `MessageType`<`RunnerMessageCode`\> |
| `serializeMessage` | <T\>(`__namedParameters`: `MessageType`<`T`\>) => `RunnerMessage` \| `CPMMessage` |

#### Defined in

[packages/model/src/index.ts:11](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/index.ts#L11)

## Functions

### checkMessage

▸ `Const` **checkMessage**<`X`\>(`msgCode`, `msgData`): `MessageDataType`<`X`\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `X` | extends `RunnerMessageCode` \| `CPMMessageCode` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `msgCode` | `X` |
| `msgData` | `MonitoringMessageData` \| `DescribeSequenceMessageData` \| `ErrorMessageData` \| `StatusMessageData` \| `KeepAliveMessageData` \| `AcknowledgeMessageData` \| `HandshakeAcknowledgeMessageData` \| `StopSequenceMessageData` \| `MonitoringRateMessageData` \| `PingMessageData` \| `SequenceStoppedMessageData` \| `PangMessageData` \| `EmptyMessageData` \| `EventMessageData` \| `STHIDMessageData` \| `LoadCheckStat` \| `NetworkInfo`[] \| `InstanceBulkMessage` \| `SequenceBulkMessage` \| `InstanceMessage` \| `SequenceMessage` |

#### Returns

`MessageDataType`<`X`\>

#### Defined in

[packages/model/src/get-message.ts:53](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/get-message.ts#L53)

___

### deserializeMessage

▸ **deserializeMessage**(`msg`): `MessageType`<`RunnerMessageCode`\>

Get an object of message type from serialized message.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `msg` | `string` | a stringified and serialized message |

#### Returns

`MessageType`<`RunnerMessageCode`\>

- an object of message type

#### Defined in

[packages/model/src/messages-utils.ts:29](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/messages-utils.ts#L29)

___

### getMessage

▸ `Const` **getMessage**<`X`\>(`msgCode`, `msgData`): `MessageType`<`X`\>

Get an object of message type from serialized message.
A helper method used for deserializing messages.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `X` | extends `RunnerMessageCode` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `msgCode` | `X` | message type code |
| `msgData` | `MessageDataType`<`X`\> | a message object |

#### Returns

`MessageType`<`X`\>

- an object of message type

#### Defined in

[packages/model/src/get-message.ts:94](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/get-message.ts#L94)

___

### serializeMessage

▸ **serializeMessage**<`T`\>(`__namedParameters`): `RunnerMessage` \| `CPMMessage`

Serizalized message.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends `RunnerMessageCode` \| `CPMMessageCode` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `MessageType`<`T`\> |

#### Returns

`RunnerMessage` \| `CPMMessage`

- a serializable message in a format [msgCode, {msgBody}]
          where 'msgCode' is a message type code and 'msgBody' is a message body

#### Defined in

[packages/model/src/messages-utils.ts:14](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/messages-utils.ts#L14)
