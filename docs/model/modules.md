[@scramjet/model](README.md) / Exports

# @scramjet/model

## Table of contents

### Classes

- [AppError](undefined)
- [CSIControllerError](undefined)
- [CommunicationHandler](undefined)
- [DelayedStream](undefined)
- [HostError](undefined)
- [IDProvider](undefined)
- [InstanceAdapterError](undefined)
- [RunnerError](undefined)
- [SequenceAdapterError](undefined)

### Type aliases

- [ConfiguredMessageHandler](undefined)
- [ICSIControllerErrorData](undefined)
- [IHostErrorData](undefined)
- [IRunnerErrorData](undefined)

### Variables

- [MessageUtilities](undefined)

### Functions

- [checkMessage](undefined)
- [deserializeMessage](undefined)
- [getMessage](undefined)
- [serializeMessage](undefined)

## Classes

### AppError

• **AppError**: Class AppError

#### Defined in

[packages/model/src/errors/app-error.ts:7](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/errors/app-error.ts#L7)

___

### CSIControllerError

• **CSIControllerError**: Class CSIControllerError

#### Defined in

[packages/model/src/errors/csi-controller-error.ts:6](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/errors/csi-controller-error.ts#L6)

___

### CommunicationHandler

• **CommunicationHandler**: Class CommunicationHandler

#### Defined in

[packages/model/src/stream-handler.ts:59](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L59)

___

### DelayedStream

• **DelayedStream**: Class DelayedStream

#### Defined in

[packages/model/src/utils/delayed-stream.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/utils/delayed-stream.ts#L3)

___

### HostError

• **HostError**: Class HostError

#### Defined in

[packages/model/src/errors/host-error.ts:6](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/errors/host-error.ts#L6)

___

### IDProvider

• **IDProvider**: Class IDProvider

#### Defined in

[packages/model/src/utils/id-provider.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/utils/id-provider.ts#L3)

___

### InstanceAdapterError

• **InstanceAdapterError**: Class InstanceAdapterError

#### Defined in

[packages/model/src/errors/instance-adapter-error.ts:4](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/errors/instance-adapter-error.ts#L4)

___

### RunnerError

• **RunnerError**: Class RunnerError

#### Defined in

[packages/model/src/errors/runner-error.ts:6](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/errors/runner-error.ts#L6)

___

### SequenceAdapterError

• **SequenceAdapterError**: Class SequenceAdapterError

#### Defined in

[packages/model/src/errors/sequence-adapter-error.ts:4](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/errors/sequence-adapter-error.ts#L4)

## Type aliases

### ConfiguredMessageHandler

Ƭ **ConfiguredMessageHandler**: Object \| Object

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends RunnerMessageCode \| CPMMessageCode |

#### Defined in

[packages/model/src/stream-handler.ts:25](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/stream-handler.ts#L25)

___

### ICSIControllerErrorData

Ƭ **ICSIControllerErrorData**: any

#### Defined in

[packages/model/src/errors/csi-controller-error.ts:4](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/errors/csi-controller-error.ts#L4)

___

### IHostErrorData

Ƭ **IHostErrorData**: any

#### Defined in

[packages/model/src/errors/host-error.ts:4](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/errors/host-error.ts#L4)

___

### IRunnerErrorData

Ƭ **IRunnerErrorData**: any

#### Defined in

[packages/model/src/errors/runner-error.ts:4](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/errors/runner-error.ts#L4)

## Variables

### MessageUtilities

• `Const` **MessageUtilities**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `deserializeMessage` | Function |
| `serializeMessage` | Function |

#### Defined in

[packages/model/src/index.ts:11](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/index.ts#L11)

## Functions

### checkMessage

▸ **checkMessage**<`X`\>(`msgCode`, `msgData`): MessageDataType<X\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `X` | extends RunnerMessageCode \| CPMMessageCode |

#### Parameters

| Name | Type |
| :------ | :------ |
| `msgCode` | X |
| `msgData` | MonitoringMessageData \| DescribeSequenceMessageData \| ErrorMessageData \| StatusMessageData \| KeepAliveMessageData \| AcknowledgeMessageData \| HandshakeAcknowledgeMessageData \| StopSequenceMessageData \| MonitoringRateMessageData \| PingMessageData \| SequenceStoppedMessageData \| PangMessageData \| EmptyMessageData \| EventMessageData \| STHIDMessageData \| LoadCheckStat \| NetworkInfo[] \| InstanceBulkMessage \| SequenceBulkMessage \| InstanceMessage \| SequenceMessage |

#### Returns

MessageDataType<X\>

#### Defined in

[packages/model/src/get-message.ts:53](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/get-message.ts#L53)

___

### deserializeMessage

▸ **deserializeMessage**(`msg`): MessageType<RunnerMessageCode\>

Get an object of message type from serialized message.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `msg` | string | a stringified and serialized message |

#### Returns

MessageType<RunnerMessageCode\>

- an object of message type

#### Defined in

[packages/model/src/messages-utils.ts:29](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/messages-utils.ts#L29)

___

### getMessage

▸ **getMessage**<`X`\>(`msgCode`, `msgData`): MessageType<X\>

Get an object of message type from serialized message.
A helper method used for deserializing messages.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `X` | extends RunnerMessageCode |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `msgCode` | X | message type code |
| `msgData` | MessageDataType<X\> | a message object |

#### Returns

MessageType<X\>

- an object of message type

#### Defined in

[packages/model/src/get-message.ts:94](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/get-message.ts#L94)

___

### serializeMessage

▸ **serializeMessage**<`T`\>(`msg`): RunnerMessage \| CPMMessage

Serizalized message.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends RunnerMessageCode \| CPMMessageCode |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `msg` | MessageType<T\> | an object of message type |

#### Returns

RunnerMessage \| CPMMessage

- a serializable message in a format [msgCode, {msgBody}]
          where 'msgCode' is a message type code and 'msgBody' is a message body

#### Defined in

[packages/model/src/messages-utils.ts:14](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/messages-utils.ts#L14)
