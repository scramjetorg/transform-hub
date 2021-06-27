[@scramjet/types](../README.md) / ReadableStream

# Interface: ReadableStream<Produces\>

A readable stream representation with generic chunks.

**`see`** https://nodejs.org/api/stream.html#stream_readable_streams Node.js Readable stream documentation

## Type parameters

| Name |
| :------ |
| `Produces` |

## Hierarchy

- *PipeableStream*<Produces\>

  ↳ **ReadableStream**

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

- [[Symbol.asyncIterator]](readablestream.md#[symbol.asynciterator])
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

• **destroyed**: *boolean*

Inherited from: PipeableStream.destroyed

Defined in: node_modules/@types/node/stream.d.ts:35

___

### readable

• **readable**: *boolean*

Inherited from: PipeableStream.readable

Defined in: node_modules/@types/node/stream.d.ts:28

___

### readableEncoding

• `Readonly` **readableEncoding**: ``null`` \| ``"ascii"`` \| ``"utf8"`` \| ``"utf-8"`` \| ``"utf16le"`` \| ``"ucs2"`` \| ``"ucs-2"`` \| ``"base64"`` \| ``"latin1"`` \| ``"binary"`` \| ``"hex"``

Inherited from: PipeableStream.readableEncoding

Defined in: node_modules/@types/node/stream.d.ts:29

___

### readableEnded

• `Readonly` **readableEnded**: *boolean*

Inherited from: PipeableStream.readableEnded

Defined in: node_modules/@types/node/stream.d.ts:30

___

### readableFlowing

• `Readonly` **readableFlowing**: ``null`` \| *boolean*

Inherited from: PipeableStream.readableFlowing

Defined in: node_modules/@types/node/stream.d.ts:31

___

### readableHighWaterMark

• `Readonly` **readableHighWaterMark**: *number*

Inherited from: PipeableStream.readableHighWaterMark

Defined in: node_modules/@types/node/stream.d.ts:32

___

### readableLength

• `Readonly` **readableLength**: *number*

Inherited from: PipeableStream.readableLength

Defined in: node_modules/@types/node/stream.d.ts:33

___

### readableObjectMode

• `Readonly` **readableObjectMode**: *boolean*

Inherited from: PipeableStream.readableObjectMode

Defined in: node_modules/@types/node/stream.d.ts:34

## Methods

### [Symbol.asyncIterator]

▸ **[Symbol.asyncIterator]**(): *AsyncIterableIterator*<Produces\>

**Returns:** *AsyncIterableIterator*<Produces\>

Overrides: PipeableStream.\_\_@asyncIterator

Defined in: [packages/types/src/utils.ts:45](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/types/src/utils.ts#L45)

___

### \_destroy

▸ **_destroy**(`error`: ``null`` \| Error, `callback`: (`error?`: ``null`` \| Error) => *void*): *void*

#### Parameters

| Name | Type |
| :------ | :------ |
| `error` | ``null`` \| Error |
| `callback` | (`error?`: ``null`` \| Error) => *void* |

**Returns:** *void*

Inherited from: PipeableStream.\_destroy

Defined in: node_modules/@types/node/stream.d.ts:47

___

### \_read

▸ **_read**(`size`: *number*): *void*

#### Parameters

| Name | Type |
| :------ | :------ |
| `size` | *number* |

**Returns:** *void*

Inherited from: PipeableStream.\_read

Defined in: node_modules/@types/node/stream.d.ts:37

___

### addListener

▸ **addListener**(`event`: ``"close"``, `listener`: () => *void*): [*ReadableStream*](readablestream.md)<Produces\>

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
| `listener` | () => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Inherited from: PipeableStream.addListener

Defined in: node_modules/@types/node/stream.d.ts:61

▸ **addListener**(`event`: ``"data"``, `listener`: (`chunk`: *any*) => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"data"`` |
| `listener` | (`chunk`: *any*) => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Inherited from: PipeableStream.addListener

Defined in: node_modules/@types/node/stream.d.ts:62

▸ **addListener**(`event`: ``"end"``, `listener`: () => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"end"`` |
| `listener` | () => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Inherited from: PipeableStream.addListener

Defined in: node_modules/@types/node/stream.d.ts:63

▸ **addListener**(`event`: ``"error"``, `listener`: (`err`: Error) => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"error"`` |
| `listener` | (`err`: Error) => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Inherited from: PipeableStream.addListener

Defined in: node_modules/@types/node/stream.d.ts:64

▸ **addListener**(`event`: ``"pause"``, `listener`: () => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"pause"`` |
| `listener` | () => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Inherited from: PipeableStream.addListener

Defined in: node_modules/@types/node/stream.d.ts:65

▸ **addListener**(`event`: ``"readable"``, `listener`: () => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"readable"`` |
| `listener` | () => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Inherited from: PipeableStream.addListener

Defined in: node_modules/@types/node/stream.d.ts:66

▸ **addListener**(`event`: ``"resume"``, `listener`: () => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"resume"`` |
| `listener` | () => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Inherited from: PipeableStream.addListener

Defined in: node_modules/@types/node/stream.d.ts:67

▸ **addListener**(`event`: *string* \| *symbol*, `listener`: (...`args`: *any*[]) => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | *string* \| *symbol* |
| `listener` | (...`args`: *any*[]) => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Inherited from: PipeableStream.addListener

Defined in: node_modules/@types/node/stream.d.ts:68

___

### destroy

▸ **destroy**(): *void*

**Returns:** *void*

Overrides: PipeableStream.destroy

Defined in: [packages/types/src/utils.ts:46](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/types/src/utils.ts#L46)

___

### emit

▸ **emit**(`event`: ``"close"``): *boolean*

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"close"`` |

**Returns:** *boolean*

Inherited from: PipeableStream.emit

Defined in: node_modules/@types/node/stream.d.ts:70

▸ **emit**(`event`: ``"data"``, `chunk`: *any*): *boolean*

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"data"`` |
| `chunk` | *any* |

**Returns:** *boolean*

Inherited from: PipeableStream.emit

Defined in: node_modules/@types/node/stream.d.ts:71

▸ **emit**(`event`: ``"end"``): *boolean*

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"end"`` |

**Returns:** *boolean*

Inherited from: PipeableStream.emit

Defined in: node_modules/@types/node/stream.d.ts:72

▸ **emit**(`event`: ``"error"``, `err`: Error): *boolean*

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"error"`` |
| `err` | Error |

**Returns:** *boolean*

Inherited from: PipeableStream.emit

Defined in: node_modules/@types/node/stream.d.ts:73

▸ **emit**(`event`: ``"pause"``): *boolean*

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"pause"`` |

**Returns:** *boolean*

Inherited from: PipeableStream.emit

Defined in: node_modules/@types/node/stream.d.ts:74

▸ **emit**(`event`: ``"readable"``): *boolean*

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"readable"`` |

**Returns:** *boolean*

Inherited from: PipeableStream.emit

Defined in: node_modules/@types/node/stream.d.ts:75

▸ **emit**(`event`: ``"resume"``): *boolean*

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"resume"`` |

**Returns:** *boolean*

Inherited from: PipeableStream.emit

Defined in: node_modules/@types/node/stream.d.ts:76

▸ **emit**(`event`: *string* \| *symbol*, ...`args`: *any*[]): *boolean*

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | *string* \| *symbol* |
| `...args` | *any*[] |

**Returns:** *boolean*

Inherited from: PipeableStream.emit

Defined in: node_modules/@types/node/stream.d.ts:77

___

### eventNames

▸ **eventNames**(): (*string* \| *symbol*)[]

**Returns:** (*string* \| *symbol*)[]

Inherited from: PipeableStream.eventNames

Defined in: node_modules/@types/node/events.d.ts:72

___

### getMaxListeners

▸ **getMaxListeners**(): *number*

**Returns:** *number*

Inherited from: PipeableStream.getMaxListeners

Defined in: node_modules/@types/node/events.d.ts:64

___

### isPaused

▸ **isPaused**(): *boolean*

**Returns:** *boolean*

Inherited from: PipeableStream.isPaused

Defined in: node_modules/@types/node/stream.d.ts:42

___

### listenerCount

▸ **listenerCount**(`event`: *string* \| *symbol*): *number*

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | *string* \| *symbol* |

**Returns:** *number*

Inherited from: PipeableStream.listenerCount

Defined in: node_modules/@types/node/events.d.ts:68

___

### listeners

▸ **listeners**(`event`: *string* \| *symbol*): Function[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | *string* \| *symbol* |

**Returns:** Function[]

Inherited from: PipeableStream.listeners

Defined in: node_modules/@types/node/events.d.ts:65

___

### off

▸ **off**(`event`: *string* \| *symbol*, `listener`: (...`args`: *any*[]) => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | *string* \| *symbol* |
| `listener` | (...`args`: *any*[]) => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Inherited from: PipeableStream.off

Defined in: node_modules/@types/node/events.d.ts:61

___

### on

▸ **on**(`event`: ``"close"``, `listener`: () => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"close"`` |
| `listener` | () => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Inherited from: PipeableStream.on

Defined in: node_modules/@types/node/stream.d.ts:79

▸ **on**(`event`: ``"data"``, `listener`: (`chunk`: *any*) => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"data"`` |
| `listener` | (`chunk`: *any*) => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Inherited from: PipeableStream.on

Defined in: node_modules/@types/node/stream.d.ts:80

▸ **on**(`event`: ``"end"``, `listener`: () => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"end"`` |
| `listener` | () => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Inherited from: PipeableStream.on

Defined in: node_modules/@types/node/stream.d.ts:81

▸ **on**(`event`: ``"error"``, `listener`: (`err`: Error) => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"error"`` |
| `listener` | (`err`: Error) => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Inherited from: PipeableStream.on

Defined in: node_modules/@types/node/stream.d.ts:82

▸ **on**(`event`: ``"pause"``, `listener`: () => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"pause"`` |
| `listener` | () => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Inherited from: PipeableStream.on

Defined in: node_modules/@types/node/stream.d.ts:83

▸ **on**(`event`: ``"readable"``, `listener`: () => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"readable"`` |
| `listener` | () => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Inherited from: PipeableStream.on

Defined in: node_modules/@types/node/stream.d.ts:84

▸ **on**(`event`: ``"resume"``, `listener`: () => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"resume"`` |
| `listener` | () => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Inherited from: PipeableStream.on

Defined in: node_modules/@types/node/stream.d.ts:85

▸ **on**(`event`: *string* \| *symbol*, `listener`: (...`args`: *any*[]) => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | *string* \| *symbol* |
| `listener` | (...`args`: *any*[]) => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Inherited from: PipeableStream.on

Defined in: node_modules/@types/node/stream.d.ts:86

___

### once

▸ **once**(`event`: ``"close"``, `listener`: () => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"close"`` |
| `listener` | () => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Inherited from: PipeableStream.once

Defined in: node_modules/@types/node/stream.d.ts:88

▸ **once**(`event`: ``"data"``, `listener`: (`chunk`: *any*) => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"data"`` |
| `listener` | (`chunk`: *any*) => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Inherited from: PipeableStream.once

Defined in: node_modules/@types/node/stream.d.ts:89

▸ **once**(`event`: ``"end"``, `listener`: () => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"end"`` |
| `listener` | () => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Inherited from: PipeableStream.once

Defined in: node_modules/@types/node/stream.d.ts:90

▸ **once**(`event`: ``"error"``, `listener`: (`err`: Error) => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"error"`` |
| `listener` | (`err`: Error) => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Inherited from: PipeableStream.once

Defined in: node_modules/@types/node/stream.d.ts:91

▸ **once**(`event`: ``"pause"``, `listener`: () => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"pause"`` |
| `listener` | () => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Inherited from: PipeableStream.once

Defined in: node_modules/@types/node/stream.d.ts:92

▸ **once**(`event`: ``"readable"``, `listener`: () => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"readable"`` |
| `listener` | () => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Inherited from: PipeableStream.once

Defined in: node_modules/@types/node/stream.d.ts:93

▸ **once**(`event`: ``"resume"``, `listener`: () => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"resume"`` |
| `listener` | () => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Inherited from: PipeableStream.once

Defined in: node_modules/@types/node/stream.d.ts:94

▸ **once**(`event`: *string* \| *symbol*, `listener`: (...`args`: *any*[]) => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | *string* \| *symbol* |
| `listener` | (...`args`: *any*[]) => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Inherited from: PipeableStream.once

Defined in: node_modules/@types/node/stream.d.ts:95

___

### pause

▸ **pause**(): [*ReadableStream*](readablestream.md)<Produces\>

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Inherited from: PipeableStream.pause

Defined in: node_modules/@types/node/stream.d.ts:40

___

### pipe

▸ **pipe**<T\>(`destination`: T, `options?`: { `end?`: *boolean*  }): T

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | *WritableStream*<T\> |

#### Parameters

| Name | Type |
| :------ | :------ |
| `destination` | T |
| `options?` | *object* |
| `options.end?` | *boolean* |

**Returns:** T

Inherited from: PipeableStream.pipe

Defined in: [packages/types/src/utils.ts:33](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/types/src/utils.ts#L33)

▸ **pipe**<T\>(`destination`: T, `options?`: { `end?`: *boolean*  }): T

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | [*WritableStream*](writablestream.md)<Produces, T\> |

#### Parameters

| Name | Type |
| :------ | :------ |
| `destination` | T |
| `options?` | *object* |
| `options.end?` | *boolean* |

**Returns:** T

Inherited from: PipeableStream.pipe

Defined in: [packages/types/src/utils.ts:36](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/types/src/utils.ts#L36)

___

### prependListener

▸ **prependListener**(`event`: ``"close"``, `listener`: () => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"close"`` |
| `listener` | () => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Inherited from: PipeableStream.prependListener

Defined in: node_modules/@types/node/stream.d.ts:97

▸ **prependListener**(`event`: ``"data"``, `listener`: (`chunk`: *any*) => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"data"`` |
| `listener` | (`chunk`: *any*) => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Inherited from: PipeableStream.prependListener

Defined in: node_modules/@types/node/stream.d.ts:98

▸ **prependListener**(`event`: ``"end"``, `listener`: () => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"end"`` |
| `listener` | () => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Inherited from: PipeableStream.prependListener

Defined in: node_modules/@types/node/stream.d.ts:99

▸ **prependListener**(`event`: ``"error"``, `listener`: (`err`: Error) => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"error"`` |
| `listener` | (`err`: Error) => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Inherited from: PipeableStream.prependListener

Defined in: node_modules/@types/node/stream.d.ts:100

▸ **prependListener**(`event`: ``"pause"``, `listener`: () => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"pause"`` |
| `listener` | () => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Inherited from: PipeableStream.prependListener

Defined in: node_modules/@types/node/stream.d.ts:101

▸ **prependListener**(`event`: ``"readable"``, `listener`: () => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"readable"`` |
| `listener` | () => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Inherited from: PipeableStream.prependListener

Defined in: node_modules/@types/node/stream.d.ts:102

▸ **prependListener**(`event`: ``"resume"``, `listener`: () => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"resume"`` |
| `listener` | () => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Inherited from: PipeableStream.prependListener

Defined in: node_modules/@types/node/stream.d.ts:103

▸ **prependListener**(`event`: *string* \| *symbol*, `listener`: (...`args`: *any*[]) => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | *string* \| *symbol* |
| `listener` | (...`args`: *any*[]) => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Inherited from: PipeableStream.prependListener

Defined in: node_modules/@types/node/stream.d.ts:104

___

### prependOnceListener

▸ **prependOnceListener**(`event`: ``"close"``, `listener`: () => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"close"`` |
| `listener` | () => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Inherited from: PipeableStream.prependOnceListener

Defined in: node_modules/@types/node/stream.d.ts:106

▸ **prependOnceListener**(`event`: ``"data"``, `listener`: (`chunk`: *any*) => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"data"`` |
| `listener` | (`chunk`: *any*) => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Inherited from: PipeableStream.prependOnceListener

Defined in: node_modules/@types/node/stream.d.ts:107

▸ **prependOnceListener**(`event`: ``"end"``, `listener`: () => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"end"`` |
| `listener` | () => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Inherited from: PipeableStream.prependOnceListener

Defined in: node_modules/@types/node/stream.d.ts:108

▸ **prependOnceListener**(`event`: ``"error"``, `listener`: (`err`: Error) => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"error"`` |
| `listener` | (`err`: Error) => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Inherited from: PipeableStream.prependOnceListener

Defined in: node_modules/@types/node/stream.d.ts:109

▸ **prependOnceListener**(`event`: ``"pause"``, `listener`: () => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"pause"`` |
| `listener` | () => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Inherited from: PipeableStream.prependOnceListener

Defined in: node_modules/@types/node/stream.d.ts:110

▸ **prependOnceListener**(`event`: ``"readable"``, `listener`: () => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"readable"`` |
| `listener` | () => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Inherited from: PipeableStream.prependOnceListener

Defined in: node_modules/@types/node/stream.d.ts:111

▸ **prependOnceListener**(`event`: ``"resume"``, `listener`: () => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"resume"`` |
| `listener` | () => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Inherited from: PipeableStream.prependOnceListener

Defined in: node_modules/@types/node/stream.d.ts:112

▸ **prependOnceListener**(`event`: *string* \| *symbol*, `listener`: (...`args`: *any*[]) => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | *string* \| *symbol* |
| `listener` | (...`args`: *any*[]) => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Inherited from: PipeableStream.prependOnceListener

Defined in: node_modules/@types/node/stream.d.ts:113

___

### push

▸ **push**(`chunk`: *any*, `encoding?`: ``"ascii"`` \| ``"utf8"`` \| ``"utf-8"`` \| ``"utf16le"`` \| ``"ucs2"`` \| ``"ucs-2"`` \| ``"base64"`` \| ``"latin1"`` \| ``"binary"`` \| ``"hex"``): *boolean*

#### Parameters

| Name | Type |
| :------ | :------ |
| `chunk` | *any* |
| `encoding?` | ``"ascii"`` \| ``"utf8"`` \| ``"utf-8"`` \| ``"utf16le"`` \| ``"ucs2"`` \| ``"ucs-2"`` \| ``"base64"`` \| ``"latin1"`` \| ``"binary"`` \| ``"hex"`` |

**Returns:** *boolean*

Inherited from: PipeableStream.push

Defined in: node_modules/@types/node/stream.d.ts:46

___

### rawListeners

▸ **rawListeners**(`event`: *string* \| *symbol*): Function[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | *string* \| *symbol* |

**Returns:** Function[]

Inherited from: PipeableStream.rawListeners

Defined in: node_modules/@types/node/events.d.ts:66

___

### read

▸ **read**(`count?`: *number*): ``null`` \| Produces[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `count?` | *number* |

**Returns:** ``null`` \| Produces[]

Inherited from: PipeableStream.read

Defined in: [packages/types/src/utils.ts:32](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/types/src/utils.ts#L32)

___

### removeAllListeners

▸ **removeAllListeners**(`event?`: *string* \| *symbol*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event?` | *string* \| *symbol* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Inherited from: PipeableStream.removeAllListeners

Defined in: node_modules/@types/node/events.d.ts:62

___

### removeListener

▸ **removeListener**(`event`: ``"close"``, `listener`: () => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"close"`` |
| `listener` | () => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Inherited from: PipeableStream.removeListener

Defined in: node_modules/@types/node/stream.d.ts:115

▸ **removeListener**(`event`: ``"data"``, `listener`: (`chunk`: *any*) => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"data"`` |
| `listener` | (`chunk`: *any*) => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Inherited from: PipeableStream.removeListener

Defined in: node_modules/@types/node/stream.d.ts:116

▸ **removeListener**(`event`: ``"end"``, `listener`: () => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"end"`` |
| `listener` | () => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Inherited from: PipeableStream.removeListener

Defined in: node_modules/@types/node/stream.d.ts:117

▸ **removeListener**(`event`: ``"error"``, `listener`: (`err`: Error) => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"error"`` |
| `listener` | (`err`: Error) => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Inherited from: PipeableStream.removeListener

Defined in: node_modules/@types/node/stream.d.ts:118

▸ **removeListener**(`event`: ``"pause"``, `listener`: () => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"pause"`` |
| `listener` | () => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Inherited from: PipeableStream.removeListener

Defined in: node_modules/@types/node/stream.d.ts:119

▸ **removeListener**(`event`: ``"readable"``, `listener`: () => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"readable"`` |
| `listener` | () => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Inherited from: PipeableStream.removeListener

Defined in: node_modules/@types/node/stream.d.ts:120

▸ **removeListener**(`event`: ``"resume"``, `listener`: () => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"resume"`` |
| `listener` | () => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Inherited from: PipeableStream.removeListener

Defined in: node_modules/@types/node/stream.d.ts:121

▸ **removeListener**(`event`: *string* \| *symbol*, `listener`: (...`args`: *any*[]) => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | *string* \| *symbol* |
| `listener` | (...`args`: *any*[]) => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Inherited from: PipeableStream.removeListener

Defined in: node_modules/@types/node/stream.d.ts:122

___

### resume

▸ **resume**(): [*ReadableStream*](readablestream.md)<Produces\>

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Inherited from: PipeableStream.resume

Defined in: node_modules/@types/node/stream.d.ts:41

___

### setEncoding

▸ **setEncoding**(`encoding`: BufferEncoding): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `encoding` | BufferEncoding |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Inherited from: PipeableStream.setEncoding

Defined in: node_modules/@types/node/stream.d.ts:39

___

### setMaxListeners

▸ **setMaxListeners**(`n`: *number*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `n` | *number* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Inherited from: PipeableStream.setMaxListeners

Defined in: node_modules/@types/node/events.d.ts:63

___

### unpipe

▸ **unpipe**(`destination?`: *WritableStream*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `destination?` | *WritableStream* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Inherited from: PipeableStream.unpipe

Defined in: node_modules/@types/node/stream.d.ts:43

___

### unshift

▸ **unshift**(`chunk`: *any*, `encoding?`: ``"ascii"`` \| ``"utf8"`` \| ``"utf-8"`` \| ``"utf16le"`` \| ``"ucs2"`` \| ``"ucs-2"`` \| ``"base64"`` \| ``"latin1"`` \| ``"binary"`` \| ``"hex"``): *void*

#### Parameters

| Name | Type |
| :------ | :------ |
| `chunk` | *any* |
| `encoding?` | ``"ascii"`` \| ``"utf8"`` \| ``"utf-8"`` \| ``"utf16le"`` \| ``"ucs2"`` \| ``"ucs-2"`` \| ``"base64"`` \| ``"latin1"`` \| ``"binary"`` \| ``"hex"`` |

**Returns:** *void*

Inherited from: PipeableStream.unshift

Defined in: node_modules/@types/node/stream.d.ts:44

___

### wrap

▸ **wrap**(`oldStream`: *ReadableStream*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `oldStream` | *ReadableStream* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Inherited from: PipeableStream.wrap

Defined in: node_modules/@types/node/stream.d.ts:45
