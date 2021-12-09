[@scramjet/types](../README.md) / ReadableStream

# Interface: ReadableStream<Produces\>

A readable stream representation with generic chunks.

**`see`** https://nodejs.org/api/stream.html#stream_readable_streams Node.js Readable stream documentation

## Type parameters

| Name |
| :------ |
| `Produces` |

## Hierarchy

- `PipeableStream`<`Produces`\>

  ↳ **`ReadableStream`**

## Table of contents

### Properties

- [destroyed](readablestream.md#destroyed)
- [readable](readablestream.md#readable)
- [readableEncoding](readablestream.md#readableencoding)
- [readableEnded](readablestream.md#readableended)
- [readableFlowing](readablestream.md#readableflowing)
- [readableHighWaterMark](readablestream.md#readablehighwatermark)
- [readableLength](readablestream.md#readablelength)
- [readableObjectMode](readablestream.md#readableobjectmode)

### Methods

- [[asyncIterator]](readablestream.md#[asynciterator])
- [\_construct](readablestream.md#_construct)
- [\_destroy](readablestream.md#_destroy)
- [\_read](readablestream.md#_read)
- [addListener](readablestream.md#addlistener)
- [destroy](readablestream.md#destroy)
- [emit](readablestream.md#emit)
- [eventNames](readablestream.md#eventnames)
- [getMaxListeners](readablestream.md#getmaxlisteners)
- [isPaused](readablestream.md#ispaused)
- [listenerCount](readablestream.md#listenercount)
- [listeners](readablestream.md#listeners)
- [off](readablestream.md#off)
- [on](readablestream.md#on)
- [once](readablestream.md#once)
- [pause](readablestream.md#pause)
- [pipe](readablestream.md#pipe)
- [prependListener](readablestream.md#prependlistener)
- [prependOnceListener](readablestream.md#prependoncelistener)
- [push](readablestream.md#push)
- [rawListeners](readablestream.md#rawlisteners)
- [read](readablestream.md#read)
- [removeAllListeners](readablestream.md#removealllisteners)
- [removeListener](readablestream.md#removelistener)
- [resume](readablestream.md#resume)
- [setEncoding](readablestream.md#setencoding)
- [setMaxListeners](readablestream.md#setmaxlisteners)
- [unpipe](readablestream.md#unpipe)
- [unshift](readablestream.md#unshift)
- [wrap](readablestream.md#wrap)

## Properties

### destroyed

• **destroyed**: `boolean`

#### Inherited from

PipeableStream.destroyed

#### Defined in

node_modules/@types/node/stream.d.ts:41

___

### readable

• **readable**: `boolean`

#### Inherited from

PipeableStream.readable

#### Defined in

node_modules/@types/node/stream.d.ts:34

___

### readableEncoding

• `Readonly` **readableEncoding**: ``null`` \| `BufferEncoding`

#### Inherited from

PipeableStream.readableEncoding

#### Defined in

node_modules/@types/node/stream.d.ts:35

___

### readableEnded

• `Readonly` **readableEnded**: `boolean`

#### Inherited from

PipeableStream.readableEnded

#### Defined in

node_modules/@types/node/stream.d.ts:36

___

### readableFlowing

• `Readonly` **readableFlowing**: ``null`` \| `boolean`

#### Inherited from

PipeableStream.readableFlowing

#### Defined in

node_modules/@types/node/stream.d.ts:37

___

### readableHighWaterMark

• `Readonly` **readableHighWaterMark**: `number`

#### Inherited from

PipeableStream.readableHighWaterMark

#### Defined in

node_modules/@types/node/stream.d.ts:38

___

### readableLength

• `Readonly` **readableLength**: `number`

#### Inherited from

PipeableStream.readableLength

#### Defined in

node_modules/@types/node/stream.d.ts:39

___

### readableObjectMode

• `Readonly` **readableObjectMode**: `boolean`

#### Inherited from

PipeableStream.readableObjectMode

#### Defined in

node_modules/@types/node/stream.d.ts:40

## Methods

### [asyncIterator]

▸ **[asyncIterator]**(): `AsyncIterableIterator`<`Produces`\>

#### Returns

`AsyncIterableIterator`<`Produces`\>

#### Overrides

PipeableStream.\_\_@asyncIterator@3227

#### Defined in

[packages/types/src/utils.ts:45](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/utils.ts#L45)

___

### \_construct

▸ `Optional` **_construct**(`callback`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `callback` | (`error?`: ``null`` \| `Error`) => `void` |

#### Returns

`void`

#### Inherited from

PipeableStream.\_construct

#### Defined in

node_modules/@types/node/stream.d.ts:43

___

### \_destroy

▸ **_destroy**(`error`, `callback`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `error` | ``null`` \| `Error` |
| `callback` | (`error?`: ``null`` \| `Error`) => `void` |

#### Returns

`void`

#### Inherited from

PipeableStream.\_destroy

#### Defined in

node_modules/@types/node/stream.d.ts:54

___

### \_read

▸ **_read**(`size`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `size` | `number` |

#### Returns

`void`

#### Inherited from

PipeableStream.\_read

#### Defined in

node_modules/@types/node/stream.d.ts:44

___

### addListener

▸ **addListener**(`event`, `listener`): [`ReadableStream`](readablestream.md)<`Produces`\>

Event emitter
The defined events on documents including:
1. close
2. data
3. end
4. error
5. pause
6. readable
7. resume

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"close"`` |
| `listener` | () => `void` |

#### Returns

[`ReadableStream`](readablestream.md)<`Produces`\>

#### Inherited from

PipeableStream.addListener

#### Defined in

node_modules/@types/node/stream.d.ts:68

▸ **addListener**(`event`, `listener`): [`ReadableStream`](readablestream.md)<`Produces`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"data"`` |
| `listener` | (`chunk`: `any`) => `void` |

#### Returns

[`ReadableStream`](readablestream.md)<`Produces`\>

#### Inherited from

PipeableStream.addListener

#### Defined in

node_modules/@types/node/stream.d.ts:69

▸ **addListener**(`event`, `listener`): [`ReadableStream`](readablestream.md)<`Produces`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"end"`` |
| `listener` | () => `void` |

#### Returns

[`ReadableStream`](readablestream.md)<`Produces`\>

#### Inherited from

PipeableStream.addListener

#### Defined in

node_modules/@types/node/stream.d.ts:70

▸ **addListener**(`event`, `listener`): [`ReadableStream`](readablestream.md)<`Produces`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"error"`` |
| `listener` | (`err`: `Error`) => `void` |

#### Returns

[`ReadableStream`](readablestream.md)<`Produces`\>

#### Inherited from

PipeableStream.addListener

#### Defined in

node_modules/@types/node/stream.d.ts:71

▸ **addListener**(`event`, `listener`): [`ReadableStream`](readablestream.md)<`Produces`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"pause"`` |
| `listener` | () => `void` |

#### Returns

[`ReadableStream`](readablestream.md)<`Produces`\>

#### Inherited from

PipeableStream.addListener

#### Defined in

node_modules/@types/node/stream.d.ts:72

▸ **addListener**(`event`, `listener`): [`ReadableStream`](readablestream.md)<`Produces`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"readable"`` |
| `listener` | () => `void` |

#### Returns

[`ReadableStream`](readablestream.md)<`Produces`\>

#### Inherited from

PipeableStream.addListener

#### Defined in

node_modules/@types/node/stream.d.ts:73

▸ **addListener**(`event`, `listener`): [`ReadableStream`](readablestream.md)<`Produces`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"resume"`` |
| `listener` | () => `void` |

#### Returns

[`ReadableStream`](readablestream.md)<`Produces`\>

#### Inherited from

PipeableStream.addListener

#### Defined in

node_modules/@types/node/stream.d.ts:74

▸ **addListener**(`event`, `listener`): [`ReadableStream`](readablestream.md)<`Produces`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`ReadableStream`](readablestream.md)<`Produces`\>

#### Inherited from

PipeableStream.addListener

#### Defined in

node_modules/@types/node/stream.d.ts:75

___

### destroy

▸ **destroy**(): `void`

#### Returns

`void`

#### Overrides

PipeableStream.destroy

#### Defined in

[packages/types/src/utils.ts:46](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/utils.ts#L46)

___

### emit

▸ **emit**(`event`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"close"`` |

#### Returns

`boolean`

#### Inherited from

PipeableStream.emit

#### Defined in

node_modules/@types/node/stream.d.ts:77

▸ **emit**(`event`, `chunk`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"data"`` |
| `chunk` | `any` |

#### Returns

`boolean`

#### Inherited from

PipeableStream.emit

#### Defined in

node_modules/@types/node/stream.d.ts:78

▸ **emit**(`event`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"end"`` |

#### Returns

`boolean`

#### Inherited from

PipeableStream.emit

#### Defined in

node_modules/@types/node/stream.d.ts:79

▸ **emit**(`event`, `err`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"error"`` |
| `err` | `Error` |

#### Returns

`boolean`

#### Inherited from

PipeableStream.emit

#### Defined in

node_modules/@types/node/stream.d.ts:80

▸ **emit**(`event`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"pause"`` |

#### Returns

`boolean`

#### Inherited from

PipeableStream.emit

#### Defined in

node_modules/@types/node/stream.d.ts:81

▸ **emit**(`event`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"readable"`` |

#### Returns

`boolean`

#### Inherited from

PipeableStream.emit

#### Defined in

node_modules/@types/node/stream.d.ts:82

▸ **emit**(`event`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"resume"`` |

#### Returns

`boolean`

#### Inherited from

PipeableStream.emit

#### Defined in

node_modules/@types/node/stream.d.ts:83

▸ **emit**(`event`, ...`args`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `...args` | `any`[] |

#### Returns

`boolean`

#### Inherited from

PipeableStream.emit

#### Defined in

node_modules/@types/node/stream.d.ts:84

___

### eventNames

▸ **eventNames**(): (`string` \| `symbol`)[]

#### Returns

(`string` \| `symbol`)[]

#### Inherited from

PipeableStream.eventNames

#### Defined in

node_modules/@types/node/events.d.ts:87

___

### getMaxListeners

▸ **getMaxListeners**(): `number`

#### Returns

`number`

#### Inherited from

PipeableStream.getMaxListeners

#### Defined in

node_modules/@types/node/events.d.ts:79

___

### isPaused

▸ **isPaused**(): `boolean`

#### Returns

`boolean`

#### Inherited from

PipeableStream.isPaused

#### Defined in

node_modules/@types/node/stream.d.ts:49

___

### listenerCount

▸ **listenerCount**(`event`): `number`

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |

#### Returns

`number`

#### Inherited from

PipeableStream.listenerCount

#### Defined in

node_modules/@types/node/events.d.ts:83

___

### listeners

▸ **listeners**(`event`): `Function`[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |

#### Returns

`Function`[]

#### Inherited from

PipeableStream.listeners

#### Defined in

node_modules/@types/node/events.d.ts:80

___

### off

▸ **off**(`event`, `listener`): [`ReadableStream`](readablestream.md)<`Produces`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`ReadableStream`](readablestream.md)<`Produces`\>

#### Inherited from

PipeableStream.off

#### Defined in

node_modules/@types/node/events.d.ts:76

___

### on

▸ **on**(`event`, `listener`): [`ReadableStream`](readablestream.md)<`Produces`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"close"`` |
| `listener` | () => `void` |

#### Returns

[`ReadableStream`](readablestream.md)<`Produces`\>

#### Inherited from

PipeableStream.on

#### Defined in

node_modules/@types/node/stream.d.ts:86

▸ **on**(`event`, `listener`): [`ReadableStream`](readablestream.md)<`Produces`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"data"`` |
| `listener` | (`chunk`: `any`) => `void` |

#### Returns

[`ReadableStream`](readablestream.md)<`Produces`\>

#### Inherited from

PipeableStream.on

#### Defined in

node_modules/@types/node/stream.d.ts:87

▸ **on**(`event`, `listener`): [`ReadableStream`](readablestream.md)<`Produces`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"end"`` |
| `listener` | () => `void` |

#### Returns

[`ReadableStream`](readablestream.md)<`Produces`\>

#### Inherited from

PipeableStream.on

#### Defined in

node_modules/@types/node/stream.d.ts:88

▸ **on**(`event`, `listener`): [`ReadableStream`](readablestream.md)<`Produces`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"error"`` |
| `listener` | (`err`: `Error`) => `void` |

#### Returns

[`ReadableStream`](readablestream.md)<`Produces`\>

#### Inherited from

PipeableStream.on

#### Defined in

node_modules/@types/node/stream.d.ts:89

▸ **on**(`event`, `listener`): [`ReadableStream`](readablestream.md)<`Produces`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"pause"`` |
| `listener` | () => `void` |

#### Returns

[`ReadableStream`](readablestream.md)<`Produces`\>

#### Inherited from

PipeableStream.on

#### Defined in

node_modules/@types/node/stream.d.ts:90

▸ **on**(`event`, `listener`): [`ReadableStream`](readablestream.md)<`Produces`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"readable"`` |
| `listener` | () => `void` |

#### Returns

[`ReadableStream`](readablestream.md)<`Produces`\>

#### Inherited from

PipeableStream.on

#### Defined in

node_modules/@types/node/stream.d.ts:91

▸ **on**(`event`, `listener`): [`ReadableStream`](readablestream.md)<`Produces`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"resume"`` |
| `listener` | () => `void` |

#### Returns

[`ReadableStream`](readablestream.md)<`Produces`\>

#### Inherited from

PipeableStream.on

#### Defined in

node_modules/@types/node/stream.d.ts:92

▸ **on**(`event`, `listener`): [`ReadableStream`](readablestream.md)<`Produces`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`ReadableStream`](readablestream.md)<`Produces`\>

#### Inherited from

PipeableStream.on

#### Defined in

node_modules/@types/node/stream.d.ts:93

___

### once

▸ **once**(`event`, `listener`): [`ReadableStream`](readablestream.md)<`Produces`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"close"`` |
| `listener` | () => `void` |

#### Returns

[`ReadableStream`](readablestream.md)<`Produces`\>

#### Inherited from

PipeableStream.once

#### Defined in

node_modules/@types/node/stream.d.ts:95

▸ **once**(`event`, `listener`): [`ReadableStream`](readablestream.md)<`Produces`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"data"`` |
| `listener` | (`chunk`: `any`) => `void` |

#### Returns

[`ReadableStream`](readablestream.md)<`Produces`\>

#### Inherited from

PipeableStream.once

#### Defined in

node_modules/@types/node/stream.d.ts:96

▸ **once**(`event`, `listener`): [`ReadableStream`](readablestream.md)<`Produces`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"end"`` |
| `listener` | () => `void` |

#### Returns

[`ReadableStream`](readablestream.md)<`Produces`\>

#### Inherited from

PipeableStream.once

#### Defined in

node_modules/@types/node/stream.d.ts:97

▸ **once**(`event`, `listener`): [`ReadableStream`](readablestream.md)<`Produces`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"error"`` |
| `listener` | (`err`: `Error`) => `void` |

#### Returns

[`ReadableStream`](readablestream.md)<`Produces`\>

#### Inherited from

PipeableStream.once

#### Defined in

node_modules/@types/node/stream.d.ts:98

▸ **once**(`event`, `listener`): [`ReadableStream`](readablestream.md)<`Produces`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"pause"`` |
| `listener` | () => `void` |

#### Returns

[`ReadableStream`](readablestream.md)<`Produces`\>

#### Inherited from

PipeableStream.once

#### Defined in

node_modules/@types/node/stream.d.ts:99

▸ **once**(`event`, `listener`): [`ReadableStream`](readablestream.md)<`Produces`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"readable"`` |
| `listener` | () => `void` |

#### Returns

[`ReadableStream`](readablestream.md)<`Produces`\>

#### Inherited from

PipeableStream.once

#### Defined in

node_modules/@types/node/stream.d.ts:100

▸ **once**(`event`, `listener`): [`ReadableStream`](readablestream.md)<`Produces`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"resume"`` |
| `listener` | () => `void` |

#### Returns

[`ReadableStream`](readablestream.md)<`Produces`\>

#### Inherited from

PipeableStream.once

#### Defined in

node_modules/@types/node/stream.d.ts:101

▸ **once**(`event`, `listener`): [`ReadableStream`](readablestream.md)<`Produces`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`ReadableStream`](readablestream.md)<`Produces`\>

#### Inherited from

PipeableStream.once

#### Defined in

node_modules/@types/node/stream.d.ts:102

___

### pause

▸ **pause**(): [`ReadableStream`](readablestream.md)<`Produces`\>

#### Returns

[`ReadableStream`](readablestream.md)<`Produces`\>

#### Inherited from

PipeableStream.pause

#### Defined in

node_modules/@types/node/stream.d.ts:47

___

### pipe

▸ **pipe**<`T`\>(`destination`, `options?`): `T`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends `WritableStream`<`T`\> |

#### Parameters

| Name | Type |
| :------ | :------ |
| `destination` | `T` |
| `options?` | `Object` |
| `options.end?` | `boolean` |

#### Returns

`T`

#### Inherited from

PipeableStream.pipe

#### Defined in

[packages/types/src/utils.ts:33](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/utils.ts#L33)

▸ **pipe**<`T`\>(`destination`, `options?`): `T`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`WritableStream`](writablestream.md)<`Produces`, `T`\> |

#### Parameters

| Name | Type |
| :------ | :------ |
| `destination` | `T` |
| `options?` | `Object` |
| `options.end?` | `boolean` |

#### Returns

`T`

#### Inherited from

PipeableStream.pipe

#### Defined in

[packages/types/src/utils.ts:36](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/utils.ts#L36)

___

### prependListener

▸ **prependListener**(`event`, `listener`): [`ReadableStream`](readablestream.md)<`Produces`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"close"`` |
| `listener` | () => `void` |

#### Returns

[`ReadableStream`](readablestream.md)<`Produces`\>

#### Inherited from

PipeableStream.prependListener

#### Defined in

node_modules/@types/node/stream.d.ts:104

▸ **prependListener**(`event`, `listener`): [`ReadableStream`](readablestream.md)<`Produces`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"data"`` |
| `listener` | (`chunk`: `any`) => `void` |

#### Returns

[`ReadableStream`](readablestream.md)<`Produces`\>

#### Inherited from

PipeableStream.prependListener

#### Defined in

node_modules/@types/node/stream.d.ts:105

▸ **prependListener**(`event`, `listener`): [`ReadableStream`](readablestream.md)<`Produces`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"end"`` |
| `listener` | () => `void` |

#### Returns

[`ReadableStream`](readablestream.md)<`Produces`\>

#### Inherited from

PipeableStream.prependListener

#### Defined in

node_modules/@types/node/stream.d.ts:106

▸ **prependListener**(`event`, `listener`): [`ReadableStream`](readablestream.md)<`Produces`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"error"`` |
| `listener` | (`err`: `Error`) => `void` |

#### Returns

[`ReadableStream`](readablestream.md)<`Produces`\>

#### Inherited from

PipeableStream.prependListener

#### Defined in

node_modules/@types/node/stream.d.ts:107

▸ **prependListener**(`event`, `listener`): [`ReadableStream`](readablestream.md)<`Produces`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"pause"`` |
| `listener` | () => `void` |

#### Returns

[`ReadableStream`](readablestream.md)<`Produces`\>

#### Inherited from

PipeableStream.prependListener

#### Defined in

node_modules/@types/node/stream.d.ts:108

▸ **prependListener**(`event`, `listener`): [`ReadableStream`](readablestream.md)<`Produces`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"readable"`` |
| `listener` | () => `void` |

#### Returns

[`ReadableStream`](readablestream.md)<`Produces`\>

#### Inherited from

PipeableStream.prependListener

#### Defined in

node_modules/@types/node/stream.d.ts:109

▸ **prependListener**(`event`, `listener`): [`ReadableStream`](readablestream.md)<`Produces`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"resume"`` |
| `listener` | () => `void` |

#### Returns

[`ReadableStream`](readablestream.md)<`Produces`\>

#### Inherited from

PipeableStream.prependListener

#### Defined in

node_modules/@types/node/stream.d.ts:110

▸ **prependListener**(`event`, `listener`): [`ReadableStream`](readablestream.md)<`Produces`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`ReadableStream`](readablestream.md)<`Produces`\>

#### Inherited from

PipeableStream.prependListener

#### Defined in

node_modules/@types/node/stream.d.ts:111

___

### prependOnceListener

▸ **prependOnceListener**(`event`, `listener`): [`ReadableStream`](readablestream.md)<`Produces`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"close"`` |
| `listener` | () => `void` |

#### Returns

[`ReadableStream`](readablestream.md)<`Produces`\>

#### Inherited from

PipeableStream.prependOnceListener

#### Defined in

node_modules/@types/node/stream.d.ts:113

▸ **prependOnceListener**(`event`, `listener`): [`ReadableStream`](readablestream.md)<`Produces`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"data"`` |
| `listener` | (`chunk`: `any`) => `void` |

#### Returns

[`ReadableStream`](readablestream.md)<`Produces`\>

#### Inherited from

PipeableStream.prependOnceListener

#### Defined in

node_modules/@types/node/stream.d.ts:114

▸ **prependOnceListener**(`event`, `listener`): [`ReadableStream`](readablestream.md)<`Produces`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"end"`` |
| `listener` | () => `void` |

#### Returns

[`ReadableStream`](readablestream.md)<`Produces`\>

#### Inherited from

PipeableStream.prependOnceListener

#### Defined in

node_modules/@types/node/stream.d.ts:115

▸ **prependOnceListener**(`event`, `listener`): [`ReadableStream`](readablestream.md)<`Produces`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"error"`` |
| `listener` | (`err`: `Error`) => `void` |

#### Returns

[`ReadableStream`](readablestream.md)<`Produces`\>

#### Inherited from

PipeableStream.prependOnceListener

#### Defined in

node_modules/@types/node/stream.d.ts:116

▸ **prependOnceListener**(`event`, `listener`): [`ReadableStream`](readablestream.md)<`Produces`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"pause"`` |
| `listener` | () => `void` |

#### Returns

[`ReadableStream`](readablestream.md)<`Produces`\>

#### Inherited from

PipeableStream.prependOnceListener

#### Defined in

node_modules/@types/node/stream.d.ts:117

▸ **prependOnceListener**(`event`, `listener`): [`ReadableStream`](readablestream.md)<`Produces`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"readable"`` |
| `listener` | () => `void` |

#### Returns

[`ReadableStream`](readablestream.md)<`Produces`\>

#### Inherited from

PipeableStream.prependOnceListener

#### Defined in

node_modules/@types/node/stream.d.ts:118

▸ **prependOnceListener**(`event`, `listener`): [`ReadableStream`](readablestream.md)<`Produces`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"resume"`` |
| `listener` | () => `void` |

#### Returns

[`ReadableStream`](readablestream.md)<`Produces`\>

#### Inherited from

PipeableStream.prependOnceListener

#### Defined in

node_modules/@types/node/stream.d.ts:119

▸ **prependOnceListener**(`event`, `listener`): [`ReadableStream`](readablestream.md)<`Produces`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`ReadableStream`](readablestream.md)<`Produces`\>

#### Inherited from

PipeableStream.prependOnceListener

#### Defined in

node_modules/@types/node/stream.d.ts:120

___

### push

▸ **push**(`chunk`, `encoding?`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `chunk` | `any` |
| `encoding?` | `BufferEncoding` |

#### Returns

`boolean`

#### Inherited from

PipeableStream.push

#### Defined in

node_modules/@types/node/stream.d.ts:53

___

### rawListeners

▸ **rawListeners**(`event`): `Function`[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |

#### Returns

`Function`[]

#### Inherited from

PipeableStream.rawListeners

#### Defined in

node_modules/@types/node/events.d.ts:81

___

### read

▸ **read**(`count?`): ``null`` \| `Produces`[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `count?` | `number` |

#### Returns

``null`` \| `Produces`[]

#### Inherited from

PipeableStream.read

#### Defined in

[packages/types/src/utils.ts:32](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/utils.ts#L32)

___

### removeAllListeners

▸ **removeAllListeners**(`event?`): [`ReadableStream`](readablestream.md)<`Produces`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event?` | `string` \| `symbol` |

#### Returns

[`ReadableStream`](readablestream.md)<`Produces`\>

#### Inherited from

PipeableStream.removeAllListeners

#### Defined in

node_modules/@types/node/events.d.ts:77

___

### removeListener

▸ **removeListener**(`event`, `listener`): [`ReadableStream`](readablestream.md)<`Produces`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"close"`` |
| `listener` | () => `void` |

#### Returns

[`ReadableStream`](readablestream.md)<`Produces`\>

#### Inherited from

PipeableStream.removeListener

#### Defined in

node_modules/@types/node/stream.d.ts:122

▸ **removeListener**(`event`, `listener`): [`ReadableStream`](readablestream.md)<`Produces`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"data"`` |
| `listener` | (`chunk`: `any`) => `void` |

#### Returns

[`ReadableStream`](readablestream.md)<`Produces`\>

#### Inherited from

PipeableStream.removeListener

#### Defined in

node_modules/@types/node/stream.d.ts:123

▸ **removeListener**(`event`, `listener`): [`ReadableStream`](readablestream.md)<`Produces`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"end"`` |
| `listener` | () => `void` |

#### Returns

[`ReadableStream`](readablestream.md)<`Produces`\>

#### Inherited from

PipeableStream.removeListener

#### Defined in

node_modules/@types/node/stream.d.ts:124

▸ **removeListener**(`event`, `listener`): [`ReadableStream`](readablestream.md)<`Produces`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"error"`` |
| `listener` | (`err`: `Error`) => `void` |

#### Returns

[`ReadableStream`](readablestream.md)<`Produces`\>

#### Inherited from

PipeableStream.removeListener

#### Defined in

node_modules/@types/node/stream.d.ts:125

▸ **removeListener**(`event`, `listener`): [`ReadableStream`](readablestream.md)<`Produces`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"pause"`` |
| `listener` | () => `void` |

#### Returns

[`ReadableStream`](readablestream.md)<`Produces`\>

#### Inherited from

PipeableStream.removeListener

#### Defined in

node_modules/@types/node/stream.d.ts:126

▸ **removeListener**(`event`, `listener`): [`ReadableStream`](readablestream.md)<`Produces`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"readable"`` |
| `listener` | () => `void` |

#### Returns

[`ReadableStream`](readablestream.md)<`Produces`\>

#### Inherited from

PipeableStream.removeListener

#### Defined in

node_modules/@types/node/stream.d.ts:127

▸ **removeListener**(`event`, `listener`): [`ReadableStream`](readablestream.md)<`Produces`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"resume"`` |
| `listener` | () => `void` |

#### Returns

[`ReadableStream`](readablestream.md)<`Produces`\>

#### Inherited from

PipeableStream.removeListener

#### Defined in

node_modules/@types/node/stream.d.ts:128

▸ **removeListener**(`event`, `listener`): [`ReadableStream`](readablestream.md)<`Produces`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`ReadableStream`](readablestream.md)<`Produces`\>

#### Inherited from

PipeableStream.removeListener

#### Defined in

node_modules/@types/node/stream.d.ts:129

___

### resume

▸ **resume**(): [`ReadableStream`](readablestream.md)<`Produces`\>

#### Returns

[`ReadableStream`](readablestream.md)<`Produces`\>

#### Inherited from

PipeableStream.resume

#### Defined in

node_modules/@types/node/stream.d.ts:48

___

### setEncoding

▸ **setEncoding**(`encoding`): [`ReadableStream`](readablestream.md)<`Produces`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `encoding` | `BufferEncoding` |

#### Returns

[`ReadableStream`](readablestream.md)<`Produces`\>

#### Inherited from

PipeableStream.setEncoding

#### Defined in

node_modules/@types/node/stream.d.ts:46

___

### setMaxListeners

▸ **setMaxListeners**(`n`): [`ReadableStream`](readablestream.md)<`Produces`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `n` | `number` |

#### Returns

[`ReadableStream`](readablestream.md)<`Produces`\>

#### Inherited from

PipeableStream.setMaxListeners

#### Defined in

node_modules/@types/node/events.d.ts:78

___

### unpipe

▸ **unpipe**(`destination?`): [`ReadableStream`](readablestream.md)<`Produces`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `destination?` | `WritableStream` |

#### Returns

[`ReadableStream`](readablestream.md)<`Produces`\>

#### Inherited from

PipeableStream.unpipe

#### Defined in

node_modules/@types/node/stream.d.ts:50

___

### unshift

▸ **unshift**(`chunk`, `encoding?`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `chunk` | `any` |
| `encoding?` | `BufferEncoding` |

#### Returns

`void`

#### Inherited from

PipeableStream.unshift

#### Defined in

node_modules/@types/node/stream.d.ts:51

___

### wrap

▸ **wrap**(`oldStream`): [`ReadableStream`](readablestream.md)<`Produces`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `oldStream` | `ReadableStream` |

#### Returns

[`ReadableStream`](readablestream.md)<`Produces`\>

#### Inherited from

PipeableStream.wrap

#### Defined in

node_modules/@types/node/stream.d.ts:52
