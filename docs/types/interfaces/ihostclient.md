[@scramjet/types](../README.md) / [Exports](../modules.md) / IHostClient

# Interface: IHostClient

## Hierarchy

- [`IComponent`](icomponent.md)

  ↳ **`IHostClient`**

## Table of contents

### Properties

- [controlStream](ihostclient.md#controlstream)
- [inputStream](ihostclient.md#inputstream)
- [logStream](ihostclient.md#logstream)
- [logger](ihostclient.md#logger)
- [monitorStream](ihostclient.md#monitorstream)
- [outputStream](ihostclient.md#outputstream)
- [packageStream](ihostclient.md#packagestream)
- [stderrStream](ihostclient.md#stderrstream)
- [stdinStream](ihostclient.md#stdinstream)
- [stdoutStream](ihostclient.md#stdoutstream)

### Methods

- [disconnect](ihostclient.md#disconnect)
- [init](ihostclient.md#init)

## Properties

### controlStream

• **controlStream**: [`ReadableStream`](readablestream.md)<`string`\>

#### Defined in

[packages/types/src/csh-connector.ts:24](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/csh-connector.ts#L24)

___

### inputStream

• **inputStream**: [`ReadableStream`](readablestream.md)<`any`\>

#### Defined in

[packages/types/src/csh-connector.ts:28](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/csh-connector.ts#L28)

___

### logStream

• **logStream**: [`WritableStream`](writablestream.md)<`any`\>

#### Defined in

[packages/types/src/csh-connector.ts:32](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/csh-connector.ts#L32)

___

### logger

• **logger**: `Console`

#### Inherited from

[IComponent](icomponent.md).[logger](icomponent.md#logger)

#### Defined in

[packages/types/src/component.ts:2](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/component.ts#L2)

___

### monitorStream

• **monitorStream**: [`WritableStream`](writablestream.md)<`string`\>

#### Defined in

[packages/types/src/csh-connector.ts:26](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/csh-connector.ts#L26)

___

### outputStream

• **outputStream**: [`WritableStream`](writablestream.md)<`any`\>

#### Defined in

[packages/types/src/csh-connector.ts:30](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/csh-connector.ts#L30)

___

### packageStream

• **packageStream**: `undefined` \| [`ReadableStream`](readablestream.md)<`Buffer`\>

#### Defined in

[packages/types/src/csh-connector.ts:34](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/csh-connector.ts#L34)

___

### stderrStream

• **stderrStream**: [`WritableStream`](writablestream.md)<`string`\>

#### Defined in

[packages/types/src/csh-connector.ts:22](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/csh-connector.ts#L22)

___

### stdinStream

• **stdinStream**: [`ReadableStream`](readablestream.md)<`string`\>

#### Defined in

[packages/types/src/csh-connector.ts:18](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/csh-connector.ts#L18)

___

### stdoutStream

• **stdoutStream**: [`WritableStream`](writablestream.md)<`string`\>

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
