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
- [getAgent](IHostClient.md#getagent)
- [init](IHostClient.md#init)

## Properties

### controlStream

• **controlStream**: [`ReadableStream`](ReadableStream.md)<`string`\>

#### Defined in

[packages/types/src/csh-connector.ts:25](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/csh-connector.ts#L25)

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

[packages/types/src/csh-connector.ts:29](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/csh-connector.ts#L29)

___

### logStream

• **logStream**: [`WritableStream`](WritableStream.md)<`any`\>

#### Defined in

[packages/types/src/csh-connector.ts:33](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/csh-connector.ts#L33)

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

[packages/types/src/csh-connector.ts:27](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/csh-connector.ts#L27)

___

### outputStream

• **outputStream**: [`WritableStream`](WritableStream.md)<`any`\>

#### Defined in

[packages/types/src/csh-connector.ts:31](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/csh-connector.ts#L31)

___

### packageStream

• **packageStream**: `undefined` \| [`ReadableStream`](ReadableStream.md)<`Buffer`\>

#### Defined in

[packages/types/src/csh-connector.ts:35](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/csh-connector.ts#L35)

___

### stderrStream

• **stderrStream**: [`WritableStream`](WritableStream.md)<`string`\>

#### Defined in

[packages/types/src/csh-connector.ts:23](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/csh-connector.ts#L23)

___

### stdinStream

• **stdinStream**: [`ReadableStream`](ReadableStream.md)<`string`\>

#### Defined in

[packages/types/src/csh-connector.ts:19](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/csh-connector.ts#L19)

___

### stdoutStream

• **stdoutStream**: [`WritableStream`](WritableStream.md)<`string`\>

#### Defined in

[packages/types/src/csh-connector.ts:21](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/csh-connector.ts#L21)

## Methods

### disconnect

▸ **disconnect**(`hard`): `Promise`<`void`\>

Disconnects from a host server.

#### Parameters

| Name | Type |
| :------ | :------ |
| `hard` | `boolean` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/types/src/csh-connector.ts:16](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/csh-connector.ts#L16)

___

### getAgent

▸ **getAgent**(): `Agent`

#### Returns

`Agent`

#### Defined in

[packages/types/src/csh-connector.ts:17](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/csh-connector.ts#L17)

___

### init

▸ **init**(`id`): `Promise`<`void`\>

Interface used by Runner to communicate with Host.

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/types/src/csh-connector.ts:11](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/csh-connector.ts#L11)
