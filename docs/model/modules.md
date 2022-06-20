[@scramjet/model](README.md) / Exports

# @scramjet/model

## Table of contents

### Classes

- [AppError](classes/AppError.md)
- [CSIControllerError](classes/CSIControllerError.md)
- [CommunicationHandler](classes/CommunicationHandler.md)
- [DelayedStream](classes/DelayedStream.md)
- [HostError](classes/HostError.md)
- [IDProvider](classes/IDProvider.md)
- [InstanceAdapterError](classes/InstanceAdapterError.md)
- [RunnerError](classes/RunnerError.md)
- [SequenceAdapterError](classes/SequenceAdapterError.md)

### Type aliases

- [ConfiguredMessageHandler](modules.md#configuredmessagehandler)
- [ICSIControllerErrorData](modules.md#icsicontrollererrordata)
- [IHostErrorData](modules.md#ihosterrordata)
- [IRunnerErrorData](modules.md#irunnererrordata)

### Variables

- [MessageUtilities](modules.md#messageutilities)

### Functions

- [checkMessage](modules.md#checkmessage)
- [deserializeMessage](modules.md#deserializemessage)
- [getMessage](modules.md#getmessage)
- [serializeMessage](modules.md#serializemessage)

## Type aliases

### ConfiguredMessageHandler

Ƭ **ConfiguredMessageHandler**<`T`\>: { `blocking`: `boolean` ; `handler`: `MutatingMonitoringMessageHandler`<`T` extends `MonitoringMessageCode` ? `T` : `never`\>  } \| { `blocking`: `boolean` ; `handler`: `ControlMessageHandler`<`T` extends `ControlMessageCode` ? `T` : `never`\>  }

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends `RunnerMessageCode` \| `CPMMessageCode` |

#### Defined in

[packages/model/src/stream-handler.ts:25](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L25)

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
| `serializeMessage` | <T\>(`msg`: `MessageType`<`T`\>) => `RunnerMessage` \| `CPMMessage` |

#### Defined in

[packages/model/src/index.ts:11](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/index.ts#L11)

## Functions

### checkMessage

▸ **checkMessage**<`X`\>(`msgCode`, `msgData`): `MessageDataType`<`X`\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `X` | extends `RunnerMessageCode` \| `CPMMessageCode` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `msgCode` | `X` |
| `msgData` | `LoadCheckStat` \| `ErrorMessageData` \| `AcknowledgeMessageData` \| `DescribeSequenceMessageData` \| `StatusMessageData` \| `EventMessageData` \| `PingMessageData` \| `PangMessageData` \| `HandshakeAcknowledgeMessageData` \| `KeepAliveMessageData` \| `KillMessageData` \| `MonitoringRateMessageData` \| `MonitoringMessageData` \| `StopSequenceMessageData` \| `SequenceCompleteMessageData` \| `STHIDMessageData` \| `InstanceMessage` \| `InstanceBulkMessage` \| `SequenceMessage` \| `SequenceBulkMessage` \| `SequenceStoppedMessageData` \| `NetworkInfo`[] |

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

▸ **getMessage**<`X`\>(`msgCode`, `msgData`): `MessageType`<`X`\>

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

▸ **serializeMessage**<`T`\>(`msg`): `RunnerMessage` \| `CPMMessage`

Serialized message.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends `RunnerMessageCode` \| `CPMMessageCode` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `msg` | `MessageType`<`T`\> | an object of message type |

#### Returns

`RunnerMessage` \| `CPMMessage`

- a serializable message in a format [msgCode, {msgBody}]
          where 'msgCode' is a message type code and 'msgBody' is a message body

#### Defined in

[packages/model/src/messages-utils.ts:14](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/messages-utils.ts#L14)
