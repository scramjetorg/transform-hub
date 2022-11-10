[@scramjet/types](../README.md) / [Exports](../modules.md) / IHostClient

# Interface: IHostClient

## Hierarchy

- [`IComponent`](IComponent.md)

  ↳ **`IHostClient`**

## Table of contents

### Properties

- [controlStream](IHostClient.md#controlstream)
- [id](IHostClient.md#id)
- [inputStream](IHostClient.md#inputstream)
- [logStream](IHostClient.md#logstream)
- [logger](IHostClient.md#logger)
- [monitorStream](IHostClient.md#monitorstream)
- [outputStream](IHostClient.md#outputstream)
- [packageStream](IHostClient.md#packagestream)
- [stderrStream](IHostClient.md#stderrstream)
- [stdinStream](IHostClient.md#stdinstream)
- [stdoutStream](IHostClient.md#stdoutstream)

### Methods

- [disconnect](IHostClient.md#disconnect)
- [init](IHostClient.md#init)

## Properties

### controlStream

• **controlStream**: [`ReadableStream`](ReadableStream.md)<`string`\>

#### Defined in

[packages/types/src/csh-connector.ts:24](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/csh-connector.ts#L24)

___

### id

• `Optional` **id**: `string`

#### Inherited from

[IComponent](IComponent.md).[id](IComponent.md#id)

#### Defined in

[packages/types/src/component.ts:5](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/component.ts#L5)

___

### inputStream

• **inputStream**: [`ReadableStream`](ReadableStream.md)<`any`\>

#### Defined in

[packages/types/src/csh-connector.ts:28](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/csh-connector.ts#L28)

___

### logStream

• **logStream**: [`WritableStream`](WritableStream.md)<`any`\>

#### Defined in

[packages/types/src/csh-connector.ts:32](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/csh-connector.ts#L32)

___

### logger

• **logger**: [`IObjectLogger`](IObjectLogger.md)

#### Inherited from

[IComponent](IComponent.md).[logger](IComponent.md#logger)

#### Defined in

[packages/types/src/component.ts:4](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/component.ts#L4)

___

### monitorStream

• **monitorStream**: [`WritableStream`](WritableStream.md)<`string`\>

#### Defined in

[packages/types/src/csh-connector.ts:26](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/csh-connector.ts#L26)

___

### outputStream

• **outputStream**: [`WritableStream`](WritableStream.md)<`any`\>

#### Defined in

[packages/types/src/csh-connector.ts:30](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/csh-connector.ts#L30)

___

### packageStream

• **packageStream**: `undefined` \| [`ReadableStream`](ReadableStream.md)<`Buffer`\>

#### Defined in

[packages/types/src/csh-connector.ts:34](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/csh-connector.ts#L34)

___

### stderrStream

• **stderrStream**: [`WritableStream`](WritableStream.md)<`string`\>

#### Defined in

[packages/types/src/csh-connector.ts:22](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/csh-connector.ts#L22)

___

### stdinStream

• **stdinStream**: [`ReadableStream`](ReadableStream.md)<`string`\>

#### Defined in

[packages/types/src/csh-connector.ts:18](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/csh-connector.ts#L18)

___

### stdoutStream

• **stdoutStream**: [`WritableStream`](WritableStream.md)<`string`\>

#### Defined in

[packages/types/src/csh-connector.ts:20](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/csh-connector.ts#L20)

## Methods

### disconnect

▸ **disconnect**(): `Promise`<`void`\>

Disconnects from a host server.

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/types/src/csh-connector.ts:16](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/csh-connector.ts#L16)

___

### init

▸ **init**(`id`): `MaybePromise`<`void`\>

Interface used by Runner to communicate with Host.

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` |

#### Returns

`MaybePromise`<`void`\>

#### Defined in

[packages/types/src/csh-connector.ts:11](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/csh-connector.ts#L11)
