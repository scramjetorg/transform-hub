[@scramjet/types](../README.md) / ICSHClient

# Interface: ICSHClient

## Hierarchy

- [`IComponent`](icomponent.md)

  ↳ **`ICSHClient`**

## Table of contents

### Properties

- [controlStream](icshclient.md#controlstream)
- [inputStream](icshclient.md#inputstream)
- [logStream](icshclient.md#logstream)
- [logger](icshclient.md#logger)
- [monitorStream](icshclient.md#monitorstream)
- [outputStream](icshclient.md#outputstream)
- [packageStream](icshclient.md#packagestream)
- [stderrStream](icshclient.md#stderrstream)
- [stdinStream](icshclient.md#stdinstream)
- [stdoutStream](icshclient.md#stdoutstream)

### Methods

- [disconnect](icshclient.md#disconnect)
- [init](icshclient.md#init)

## Properties

### controlStream

• **controlStream**: [`ReadableStream`](readablestream.md)<`string`\>

#### Defined in

[packages/types/src/csh-connector.ts:25](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/csh-connector.ts#L25)

___

### inputStream

• **inputStream**: [`ReadableStream`](readablestream.md)<`any`\>

#### Defined in

[packages/types/src/csh-connector.ts:29](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/csh-connector.ts#L29)

___

### logStream

• **logStream**: [`WritableStream`](writablestream.md)<`any`\>

#### Defined in

[packages/types/src/csh-connector.ts:33](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/csh-connector.ts#L33)

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

[packages/types/src/csh-connector.ts:27](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/csh-connector.ts#L27)

___

### outputStream

• **outputStream**: [`WritableStream`](writablestream.md)<`any`\>

#### Defined in

[packages/types/src/csh-connector.ts:31](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/csh-connector.ts#L31)

___

### packageStream

• **packageStream**: `undefined` \| [`ReadableStream`](readablestream.md)<`Buffer`\>

#### Defined in

[packages/types/src/csh-connector.ts:35](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/csh-connector.ts#L35)

___

### stderrStream

• **stderrStream**: [`WritableStream`](writablestream.md)<`string`\>

#### Defined in

[packages/types/src/csh-connector.ts:23](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/csh-connector.ts#L23)

___

### stdinStream

• **stdinStream**: [`ReadableStream`](readablestream.md)<`string`\>

#### Defined in

[packages/types/src/csh-connector.ts:19](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/csh-connector.ts#L19)

___

### stdoutStream

• **stdoutStream**: [`WritableStream`](writablestream.md)<`string`\>

#### Defined in

[packages/types/src/csh-connector.ts:21](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/csh-connector.ts#L21)

## Methods

### disconnect

▸ **disconnect**(): `Promise`<`void`\>

Disconnects from a host server.

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/types/src/csh-connector.ts:17](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/csh-connector.ts#L17)

___

### init

▸ **init**(`id`): `MaybePromise`<`void`\>

ICSHClient is the interface used by the LifeCycle Controller (LCC)
to communicate with the Cloud Server Host (CSH).

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` |

#### Returns

`MaybePromise`<`void`\>

#### Defined in

[packages/types/src/csh-connector.ts:12](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/csh-connector.ts#L12)
