[@scramjet/api-server](../README.md) / [Modules](../modules.md) / DuplexStream

# Class: DuplexStream

## Hierarchy

- `Duplex`

  ↳ **`DuplexStream`**

## Table of contents

### Methods

- [[asyncIterator]](DuplexStream.md#[asynciterator])
- [\_construct](DuplexStream.md#_construct)
- [\_destroy](DuplexStream.md#_destroy)
- [\_final](DuplexStream.md#_final)
- [\_read](DuplexStream.md#_read)
- [\_write](DuplexStream.md#_write)
- [\_writev](DuplexStream.md#_writev)
- [addListener](DuplexStream.md#addlistener)
- [cork](DuplexStream.md#cork)
- [destroy](DuplexStream.md#destroy)
- [emit](DuplexStream.md#emit)
- [end](DuplexStream.md#end)
- [eventNames](DuplexStream.md#eventnames)
- [from](DuplexStream.md#from)
- [getEventListener](DuplexStream.md#geteventlistener)
- [getMaxListeners](DuplexStream.md#getmaxlisteners)
- [isPaused](DuplexStream.md#ispaused)
- [listenerCount](DuplexStream.md#listenercount)
- [listenerCount](DuplexStream.md#listenercount-1)
- [listeners](DuplexStream.md#listeners)
- [off](DuplexStream.md#off)
- [on](DuplexStream.md#on)
- [on](DuplexStream.md#on-1)
- [once](DuplexStream.md#once)
- [once](DuplexStream.md#once-1)
- [pause](DuplexStream.md#pause)
- [pipe](DuplexStream.md#pipe)
- [prependListener](DuplexStream.md#prependlistener)
- [prependOnceListener](DuplexStream.md#prependoncelistener)
- [push](DuplexStream.md#push)
- [rawListeners](DuplexStream.md#rawlisteners)
- [read](DuplexStream.md#read)
- [removeAllListeners](DuplexStream.md#removealllisteners)
- [removeListener](DuplexStream.md#removelistener)
- [resume](DuplexStream.md#resume)
- [setDefaultEncoding](DuplexStream.md#setdefaultencoding)
- [setEncoding](DuplexStream.md#setencoding)
- [setMaxListeners](DuplexStream.md#setmaxlisteners)
- [uncork](DuplexStream.md#uncork)
- [unpipe](DuplexStream.md#unpipe)
- [unshift](DuplexStream.md#unshift)
- [wrap](DuplexStream.md#wrap)
- [write](DuplexStream.md#write)

### Properties

- [captureRejectionSymbol](DuplexStream.md#capturerejectionsymbol)
- [captureRejections](DuplexStream.md#capturerejections)
- [defaultMaxListeners](DuplexStream.md#defaultmaxlisteners)
- [destroyed](DuplexStream.md#destroyed)
- [errorMonitor](DuplexStream.md#errormonitor)
- [input](DuplexStream.md#input)
- [output](DuplexStream.md#output)
- [readable](DuplexStream.md#readable)
- [readableEncoding](DuplexStream.md#readableencoding)
- [readableEnded](DuplexStream.md#readableended)
- [readableFlowing](DuplexStream.md#readableflowing)
- [readableHighWaterMark](DuplexStream.md#readablehighwatermark)
- [readableLength](DuplexStream.md#readablelength)
- [readableObjectMode](DuplexStream.md#readableobjectmode)
- [writable](DuplexStream.md#writable)
- [writableCorked](DuplexStream.md#writablecorked)
- [writableEnded](DuplexStream.md#writableended)
- [writableFinished](DuplexStream.md#writablefinished)
- [writableHighWaterMark](DuplexStream.md#writablehighwatermark)
- [writableLength](DuplexStream.md#writablelength)
- [writableObjectMode](DuplexStream.md#writableobjectmode)

### Constructors

- [constructor](DuplexStream.md#constructor)

## Methods

### [asyncIterator]

▸ **[asyncIterator]**(): `AsyncIterableIterator`<`any`\>

#### Returns

`AsyncIterableIterator`<`any`\>

#### Inherited from

Duplex.\_\_@asyncIterator@21293

#### Defined in

node_modules/@types/node/stream.d.ts:131

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

Duplex.\_construct

#### Defined in

node_modules/@types/node/stream.d.ts:43

___

### \_destroy

▸ **_destroy**(`error`, `callback`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `error` | ``null`` \| `Error` |
| `callback` | (`error`: ``null`` \| `Error`) => `void` |

#### Returns

`void`

#### Inherited from

Duplex.\_destroy

#### Defined in

node_modules/@types/node/stream.d.ts:261

___

### \_final

▸ **_final**(`callback`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `callback` | (`error?`: ``null`` \| `Error`) => `void` |

#### Returns

`void`

#### Inherited from

Duplex.\_final

#### Defined in

node_modules/@types/node/stream.d.ts:262

___

### \_read

▸ **_read**(): `void`

#### Returns

`void`

#### Overrides

Duplex.\_read

#### Defined in

[packages/api-server/src/lib/duplex-stream.ts:37](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-server/src/lib/duplex-stream.ts#L37)

___

### \_write

▸ **_write**(`chunk`, `enc`, `next`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `chunk` | `any` |
| `enc` | `any` |
| `next` | `Function` |

#### Returns

`void`

#### Overrides

Duplex.\_write

#### Defined in

[packages/api-server/src/lib/duplex-stream.ts:23](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-server/src/lib/duplex-stream.ts#L23)

___

### \_writev

▸ `Optional` **_writev**(`chunks`, `callback`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `chunks` | { `chunk`: `any` ; `encoding`: `BufferEncoding`  }[] |
| `callback` | (`error?`: ``null`` \| `Error`) => `void` |

#### Returns

`void`

#### Inherited from

Duplex.\_writev

#### Defined in

node_modules/@types/node/stream.d.ts:260

___

### addListener

▸ **addListener**(`event`, `listener`): [`DuplexStream`](DuplexStream.md)

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

[`DuplexStream`](DuplexStream.md)

#### Inherited from

Duplex.addListener

#### Defined in

node_modules/@types/node/stream.d.ts:68

▸ **addListener**(`event`, `listener`): [`DuplexStream`](DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"data"`` |
| `listener` | (`chunk`: `any`) => `void` |

#### Returns

[`DuplexStream`](DuplexStream.md)

#### Inherited from

Duplex.addListener

#### Defined in

node_modules/@types/node/stream.d.ts:69

▸ **addListener**(`event`, `listener`): [`DuplexStream`](DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"end"`` |
| `listener` | () => `void` |

#### Returns

[`DuplexStream`](DuplexStream.md)

#### Inherited from

Duplex.addListener

#### Defined in

node_modules/@types/node/stream.d.ts:70

▸ **addListener**(`event`, `listener`): [`DuplexStream`](DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"error"`` |
| `listener` | (`err`: `Error`) => `void` |

#### Returns

[`DuplexStream`](DuplexStream.md)

#### Inherited from

Duplex.addListener

#### Defined in

node_modules/@types/node/stream.d.ts:71

▸ **addListener**(`event`, `listener`): [`DuplexStream`](DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"pause"`` |
| `listener` | () => `void` |

#### Returns

[`DuplexStream`](DuplexStream.md)

#### Inherited from

Duplex.addListener

#### Defined in

node_modules/@types/node/stream.d.ts:72

▸ **addListener**(`event`, `listener`): [`DuplexStream`](DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"readable"`` |
| `listener` | () => `void` |

#### Returns

[`DuplexStream`](DuplexStream.md)

#### Inherited from

Duplex.addListener

#### Defined in

node_modules/@types/node/stream.d.ts:73

▸ **addListener**(`event`, `listener`): [`DuplexStream`](DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"resume"`` |
| `listener` | () => `void` |

#### Returns

[`DuplexStream`](DuplexStream.md)

#### Inherited from

Duplex.addListener

#### Defined in

node_modules/@types/node/stream.d.ts:74

▸ **addListener**(`event`, `listener`): [`DuplexStream`](DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`DuplexStream`](DuplexStream.md)

#### Inherited from

Duplex.addListener

#### Defined in

node_modules/@types/node/stream.d.ts:75

___

### cork

▸ **cork**(): `void`

#### Returns

`void`

#### Inherited from

Duplex.cork

#### Defined in

node_modules/@types/node/stream.d.ts:269

___

### destroy

▸ **destroy**(`error?`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `error?` | `Error` |

#### Returns

`void`

#### Inherited from

Duplex.destroy

#### Defined in

node_modules/@types/node/stream.d.ts:55

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

Duplex.emit

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

Duplex.emit

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

Duplex.emit

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

Duplex.emit

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

Duplex.emit

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

Duplex.emit

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

Duplex.emit

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

Duplex.emit

#### Defined in

node_modules/@types/node/stream.d.ts:84

___

### end

▸ **end**(`cb?`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `cb?` | () => `void` |

#### Returns

`void`

#### Inherited from

Duplex.end

#### Defined in

node_modules/@types/node/stream.d.ts:266

▸ **end**(`chunk`, `cb?`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `chunk` | `any` |
| `cb?` | () => `void` |

#### Returns

`void`

#### Inherited from

Duplex.end

#### Defined in

node_modules/@types/node/stream.d.ts:267

▸ **end**(`chunk`, `encoding?`, `cb?`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `chunk` | `any` |
| `encoding?` | `BufferEncoding` |
| `cb?` | () => `void` |

#### Returns

`void`

#### Inherited from

Duplex.end

#### Defined in

node_modules/@types/node/stream.d.ts:268

___

### eventNames

▸ **eventNames**(): (`string` \| `symbol`)[]

#### Returns

(`string` \| `symbol`)[]

#### Inherited from

Duplex.eventNames

#### Defined in

node_modules/@types/node/events.d.ts:87

___

### from

▸ `Static` **from**(`iterable`, `options?`): `Readable`

A utility method for creating Readable Streams out of iterators.

#### Parameters

| Name | Type |
| :------ | :------ |
| `iterable` | `Iterable`<`any`\> \| `AsyncIterable`<`any`\> |
| `options?` | `ReadableOptions` |

#### Returns

`Readable`

#### Inherited from

Duplex.from

#### Defined in

node_modules/@types/node/stream.d.ts:32

___

### getEventListener

▸ `Static` **getEventListener**(`emitter`, `name`): `Function`[]

Returns a list listener for a specific emitter event name.

#### Parameters

| Name | Type |
| :------ | :------ |
| `emitter` | `EventEmitter` \| `DOMEventTarget` |
| `name` | `string` \| `symbol` |

#### Returns

`Function`[]

#### Inherited from

Duplex.getEventListener

#### Defined in

node_modules/@types/node/events.d.ts:34

___

### getMaxListeners

▸ **getMaxListeners**(): `number`

#### Returns

`number`

#### Inherited from

Duplex.getMaxListeners

#### Defined in

node_modules/@types/node/events.d.ts:79

___

### isPaused

▸ **isPaused**(): `boolean`

#### Returns

`boolean`

#### Inherited from

Duplex.isPaused

#### Defined in

node_modules/@types/node/stream.d.ts:49

___

### listenerCount

▸ `Static` **listenerCount**(`emitter`, `event`): `number`

**`Deprecated`**

since v4.0.0

#### Parameters

| Name | Type |
| :------ | :------ |
| `emitter` | `EventEmitter` |
| `event` | `string` \| `symbol` |

#### Returns

`number`

#### Inherited from

Duplex.listenerCount

#### Defined in

node_modules/@types/node/events.d.ts:30

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

Duplex.listenerCount

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

Duplex.listeners

#### Defined in

node_modules/@types/node/events.d.ts:80

___

### off

▸ **off**(`event`, `listener`): [`DuplexStream`](DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`DuplexStream`](DuplexStream.md)

#### Inherited from

Duplex.off

#### Defined in

node_modules/@types/node/events.d.ts:76

___

### on

▸ `Static` **on**(`emitter`, `event`, `options?`): `AsyncIterableIterator`<`any`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `emitter` | `EventEmitter` |
| `event` | `string` |
| `options?` | `StaticEventEmitterOptions` |

#### Returns

`AsyncIterableIterator`<`any`\>

#### Inherited from

Duplex.on

#### Defined in

node_modules/@types/node/events.d.ts:27

___

### on

▸ **on**(`event`, `listener`): [`DuplexStream`](DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"close"`` |
| `listener` | () => `void` |

#### Returns

[`DuplexStream`](DuplexStream.md)

#### Inherited from

Duplex.on

#### Defined in

node_modules/@types/node/stream.d.ts:86

▸ **on**(`event`, `listener`): [`DuplexStream`](DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"data"`` |
| `listener` | (`chunk`: `any`) => `void` |

#### Returns

[`DuplexStream`](DuplexStream.md)

#### Inherited from

Duplex.on

#### Defined in

node_modules/@types/node/stream.d.ts:87

▸ **on**(`event`, `listener`): [`DuplexStream`](DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"end"`` |
| `listener` | () => `void` |

#### Returns

[`DuplexStream`](DuplexStream.md)

#### Inherited from

Duplex.on

#### Defined in

node_modules/@types/node/stream.d.ts:88

▸ **on**(`event`, `listener`): [`DuplexStream`](DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"error"`` |
| `listener` | (`err`: `Error`) => `void` |

#### Returns

[`DuplexStream`](DuplexStream.md)

#### Inherited from

Duplex.on

#### Defined in

node_modules/@types/node/stream.d.ts:89

▸ **on**(`event`, `listener`): [`DuplexStream`](DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"pause"`` |
| `listener` | () => `void` |

#### Returns

[`DuplexStream`](DuplexStream.md)

#### Inherited from

Duplex.on

#### Defined in

node_modules/@types/node/stream.d.ts:90

▸ **on**(`event`, `listener`): [`DuplexStream`](DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"readable"`` |
| `listener` | () => `void` |

#### Returns

[`DuplexStream`](DuplexStream.md)

#### Inherited from

Duplex.on

#### Defined in

node_modules/@types/node/stream.d.ts:91

▸ **on**(`event`, `listener`): [`DuplexStream`](DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"resume"`` |
| `listener` | () => `void` |

#### Returns

[`DuplexStream`](DuplexStream.md)

#### Inherited from

Duplex.on

#### Defined in

node_modules/@types/node/stream.d.ts:92

▸ **on**(`event`, `listener`): [`DuplexStream`](DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`DuplexStream`](DuplexStream.md)

#### Inherited from

Duplex.on

#### Defined in

node_modules/@types/node/stream.d.ts:93

___

### once

▸ `Static` **once**(`emitter`, `event`, `options?`): `Promise`<`any`[]\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `emitter` | `NodeEventTarget` |
| `event` | `string` \| `symbol` |
| `options?` | `StaticEventEmitterOptions` |

#### Returns

`Promise`<`any`[]\>

#### Inherited from

Duplex.once

#### Defined in

node_modules/@types/node/events.d.ts:25

▸ `Static` **once**(`emitter`, `event`, `options?`): `Promise`<`any`[]\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `emitter` | `DOMEventTarget` |
| `event` | `string` |
| `options?` | `StaticEventEmitterOptions` |

#### Returns

`Promise`<`any`[]\>

#### Inherited from

Duplex.once

#### Defined in

node_modules/@types/node/events.d.ts:26

___

### once

▸ **once**(`event`, `listener`): [`DuplexStream`](DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"close"`` |
| `listener` | () => `void` |

#### Returns

[`DuplexStream`](DuplexStream.md)

#### Inherited from

Duplex.once

#### Defined in

node_modules/@types/node/stream.d.ts:95

▸ **once**(`event`, `listener`): [`DuplexStream`](DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"data"`` |
| `listener` | (`chunk`: `any`) => `void` |

#### Returns

[`DuplexStream`](DuplexStream.md)

#### Inherited from

Duplex.once

#### Defined in

node_modules/@types/node/stream.d.ts:96

▸ **once**(`event`, `listener`): [`DuplexStream`](DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"end"`` |
| `listener` | () => `void` |

#### Returns

[`DuplexStream`](DuplexStream.md)

#### Inherited from

Duplex.once

#### Defined in

node_modules/@types/node/stream.d.ts:97

▸ **once**(`event`, `listener`): [`DuplexStream`](DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"error"`` |
| `listener` | (`err`: `Error`) => `void` |

#### Returns

[`DuplexStream`](DuplexStream.md)

#### Inherited from

Duplex.once

#### Defined in

node_modules/@types/node/stream.d.ts:98

▸ **once**(`event`, `listener`): [`DuplexStream`](DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"pause"`` |
| `listener` | () => `void` |

#### Returns

[`DuplexStream`](DuplexStream.md)

#### Inherited from

Duplex.once

#### Defined in

node_modules/@types/node/stream.d.ts:99

▸ **once**(`event`, `listener`): [`DuplexStream`](DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"readable"`` |
| `listener` | () => `void` |

#### Returns

[`DuplexStream`](DuplexStream.md)

#### Inherited from

Duplex.once

#### Defined in

node_modules/@types/node/stream.d.ts:100

▸ **once**(`event`, `listener`): [`DuplexStream`](DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"resume"`` |
| `listener` | () => `void` |

#### Returns

[`DuplexStream`](DuplexStream.md)

#### Inherited from

Duplex.once

#### Defined in

node_modules/@types/node/stream.d.ts:101

▸ **once**(`event`, `listener`): [`DuplexStream`](DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`DuplexStream`](DuplexStream.md)

#### Inherited from

Duplex.once

#### Defined in

node_modules/@types/node/stream.d.ts:102

___

### pause

▸ **pause**(): [`DuplexStream`](DuplexStream.md)

#### Returns

[`DuplexStream`](DuplexStream.md)

#### Inherited from

Duplex.pause

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

Duplex.pipe

#### Defined in

node_modules/@types/node/stream.d.ts:6

___

### prependListener

▸ **prependListener**(`event`, `listener`): [`DuplexStream`](DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"close"`` |
| `listener` | () => `void` |

#### Returns

[`DuplexStream`](DuplexStream.md)

#### Inherited from

Duplex.prependListener

#### Defined in

node_modules/@types/node/stream.d.ts:104

▸ **prependListener**(`event`, `listener`): [`DuplexStream`](DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"data"`` |
| `listener` | (`chunk`: `any`) => `void` |

#### Returns

[`DuplexStream`](DuplexStream.md)

#### Inherited from

Duplex.prependListener

#### Defined in

node_modules/@types/node/stream.d.ts:105

▸ **prependListener**(`event`, `listener`): [`DuplexStream`](DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"end"`` |
| `listener` | () => `void` |

#### Returns

[`DuplexStream`](DuplexStream.md)

#### Inherited from

Duplex.prependListener

#### Defined in

node_modules/@types/node/stream.d.ts:106

▸ **prependListener**(`event`, `listener`): [`DuplexStream`](DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"error"`` |
| `listener` | (`err`: `Error`) => `void` |

#### Returns

[`DuplexStream`](DuplexStream.md)

#### Inherited from

Duplex.prependListener

#### Defined in

node_modules/@types/node/stream.d.ts:107

▸ **prependListener**(`event`, `listener`): [`DuplexStream`](DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"pause"`` |
| `listener` | () => `void` |

#### Returns

[`DuplexStream`](DuplexStream.md)

#### Inherited from

Duplex.prependListener

#### Defined in

node_modules/@types/node/stream.d.ts:108

▸ **prependListener**(`event`, `listener`): [`DuplexStream`](DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"readable"`` |
| `listener` | () => `void` |

#### Returns

[`DuplexStream`](DuplexStream.md)

#### Inherited from

Duplex.prependListener

#### Defined in

node_modules/@types/node/stream.d.ts:109

▸ **prependListener**(`event`, `listener`): [`DuplexStream`](DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"resume"`` |
| `listener` | () => `void` |

#### Returns

[`DuplexStream`](DuplexStream.md)

#### Inherited from

Duplex.prependListener

#### Defined in

node_modules/@types/node/stream.d.ts:110

▸ **prependListener**(`event`, `listener`): [`DuplexStream`](DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`DuplexStream`](DuplexStream.md)

#### Inherited from

Duplex.prependListener

#### Defined in

node_modules/@types/node/stream.d.ts:111

___

### prependOnceListener

▸ **prependOnceListener**(`event`, `listener`): [`DuplexStream`](DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"close"`` |
| `listener` | () => `void` |

#### Returns

[`DuplexStream`](DuplexStream.md)

#### Inherited from

Duplex.prependOnceListener

#### Defined in

node_modules/@types/node/stream.d.ts:113

▸ **prependOnceListener**(`event`, `listener`): [`DuplexStream`](DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"data"`` |
| `listener` | (`chunk`: `any`) => `void` |

#### Returns

[`DuplexStream`](DuplexStream.md)

#### Inherited from

Duplex.prependOnceListener

#### Defined in

node_modules/@types/node/stream.d.ts:114

▸ **prependOnceListener**(`event`, `listener`): [`DuplexStream`](DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"end"`` |
| `listener` | () => `void` |

#### Returns

[`DuplexStream`](DuplexStream.md)

#### Inherited from

Duplex.prependOnceListener

#### Defined in

node_modules/@types/node/stream.d.ts:115

▸ **prependOnceListener**(`event`, `listener`): [`DuplexStream`](DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"error"`` |
| `listener` | (`err`: `Error`) => `void` |

#### Returns

[`DuplexStream`](DuplexStream.md)

#### Inherited from

Duplex.prependOnceListener

#### Defined in

node_modules/@types/node/stream.d.ts:116

▸ **prependOnceListener**(`event`, `listener`): [`DuplexStream`](DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"pause"`` |
| `listener` | () => `void` |

#### Returns

[`DuplexStream`](DuplexStream.md)

#### Inherited from

Duplex.prependOnceListener

#### Defined in

node_modules/@types/node/stream.d.ts:117

▸ **prependOnceListener**(`event`, `listener`): [`DuplexStream`](DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"readable"`` |
| `listener` | () => `void` |

#### Returns

[`DuplexStream`](DuplexStream.md)

#### Inherited from

Duplex.prependOnceListener

#### Defined in

node_modules/@types/node/stream.d.ts:118

▸ **prependOnceListener**(`event`, `listener`): [`DuplexStream`](DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"resume"`` |
| `listener` | () => `void` |

#### Returns

[`DuplexStream`](DuplexStream.md)

#### Inherited from

Duplex.prependOnceListener

#### Defined in

node_modules/@types/node/stream.d.ts:119

▸ **prependOnceListener**(`event`, `listener`): [`DuplexStream`](DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`DuplexStream`](DuplexStream.md)

#### Inherited from

Duplex.prependOnceListener

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

Duplex.push

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

Duplex.rawListeners

#### Defined in

node_modules/@types/node/events.d.ts:81

___

### read

▸ **read**(`size?`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `size?` | `number` |

#### Returns

`any`

#### Inherited from

Duplex.read

#### Defined in

node_modules/@types/node/stream.d.ts:45

___

### removeAllListeners

▸ **removeAllListeners**(`event?`): [`DuplexStream`](DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event?` | `string` \| `symbol` |

#### Returns

[`DuplexStream`](DuplexStream.md)

#### Inherited from

Duplex.removeAllListeners

#### Defined in

node_modules/@types/node/events.d.ts:77

___

### removeListener

▸ **removeListener**(`event`, `listener`): [`DuplexStream`](DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"close"`` |
| `listener` | () => `void` |

#### Returns

[`DuplexStream`](DuplexStream.md)

#### Inherited from

Duplex.removeListener

#### Defined in

node_modules/@types/node/stream.d.ts:122

▸ **removeListener**(`event`, `listener`): [`DuplexStream`](DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"data"`` |
| `listener` | (`chunk`: `any`) => `void` |

#### Returns

[`DuplexStream`](DuplexStream.md)

#### Inherited from

Duplex.removeListener

#### Defined in

node_modules/@types/node/stream.d.ts:123

▸ **removeListener**(`event`, `listener`): [`DuplexStream`](DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"end"`` |
| `listener` | () => `void` |

#### Returns

[`DuplexStream`](DuplexStream.md)

#### Inherited from

Duplex.removeListener

#### Defined in

node_modules/@types/node/stream.d.ts:124

▸ **removeListener**(`event`, `listener`): [`DuplexStream`](DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"error"`` |
| `listener` | (`err`: `Error`) => `void` |

#### Returns

[`DuplexStream`](DuplexStream.md)

#### Inherited from

Duplex.removeListener

#### Defined in

node_modules/@types/node/stream.d.ts:125

▸ **removeListener**(`event`, `listener`): [`DuplexStream`](DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"pause"`` |
| `listener` | () => `void` |

#### Returns

[`DuplexStream`](DuplexStream.md)

#### Inherited from

Duplex.removeListener

#### Defined in

node_modules/@types/node/stream.d.ts:126

▸ **removeListener**(`event`, `listener`): [`DuplexStream`](DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"readable"`` |
| `listener` | () => `void` |

#### Returns

[`DuplexStream`](DuplexStream.md)

#### Inherited from

Duplex.removeListener

#### Defined in

node_modules/@types/node/stream.d.ts:127

▸ **removeListener**(`event`, `listener`): [`DuplexStream`](DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"resume"`` |
| `listener` | () => `void` |

#### Returns

[`DuplexStream`](DuplexStream.md)

#### Inherited from

Duplex.removeListener

#### Defined in

node_modules/@types/node/stream.d.ts:128

▸ **removeListener**(`event`, `listener`): [`DuplexStream`](DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`DuplexStream`](DuplexStream.md)

#### Inherited from

Duplex.removeListener

#### Defined in

node_modules/@types/node/stream.d.ts:129

___

### resume

▸ **resume**(): [`DuplexStream`](DuplexStream.md)

#### Returns

[`DuplexStream`](DuplexStream.md)

#### Inherited from

Duplex.resume

#### Defined in

node_modules/@types/node/stream.d.ts:48

___

### setDefaultEncoding

▸ **setDefaultEncoding**(`encoding`): [`DuplexStream`](DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `encoding` | `BufferEncoding` |

#### Returns

[`DuplexStream`](DuplexStream.md)

#### Inherited from

Duplex.setDefaultEncoding

#### Defined in

node_modules/@types/node/stream.d.ts:265

___

### setEncoding

▸ **setEncoding**(`encoding`): [`DuplexStream`](DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `encoding` | `BufferEncoding` |

#### Returns

[`DuplexStream`](DuplexStream.md)

#### Inherited from

Duplex.setEncoding

#### Defined in

node_modules/@types/node/stream.d.ts:46

___

### setMaxListeners

▸ **setMaxListeners**(`n`): [`DuplexStream`](DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `n` | `number` |

#### Returns

[`DuplexStream`](DuplexStream.md)

#### Inherited from

Duplex.setMaxListeners

#### Defined in

node_modules/@types/node/events.d.ts:78

___

### uncork

▸ **uncork**(): `void`

#### Returns

`void`

#### Inherited from

Duplex.uncork

#### Defined in

node_modules/@types/node/stream.d.ts:270

___

### unpipe

▸ **unpipe**(`destination?`): [`DuplexStream`](DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `destination?` | `WritableStream` |

#### Returns

[`DuplexStream`](DuplexStream.md)

#### Inherited from

Duplex.unpipe

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

Duplex.unshift

#### Defined in

node_modules/@types/node/stream.d.ts:51

___

### wrap

▸ **wrap**(`oldStream`): [`DuplexStream`](DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `oldStream` | `ReadableStream` |

#### Returns

[`DuplexStream`](DuplexStream.md)

#### Inherited from

Duplex.wrap

#### Defined in

node_modules/@types/node/stream.d.ts:52

___

### write

▸ **write**(`chunk`, `encoding?`, `cb?`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `chunk` | `any` |
| `encoding?` | `BufferEncoding` |
| `cb?` | (`error`: `undefined` \| ``null`` \| `Error`) => `void` |

#### Returns

`boolean`

#### Inherited from

Duplex.write

#### Defined in

node_modules/@types/node/stream.d.ts:263

▸ **write**(`chunk`, `cb?`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `chunk` | `any` |
| `cb?` | (`error`: `undefined` \| ``null`` \| `Error`) => `void` |

#### Returns

`boolean`

#### Inherited from

Duplex.write

#### Defined in

node_modules/@types/node/stream.d.ts:264

## Properties

### captureRejectionSymbol

▪ `Static` `Readonly` **captureRejectionSymbol**: typeof [`captureRejectionSymbol`](DuplexStream.md#capturerejectionsymbol)

#### Inherited from

Duplex.captureRejectionSymbol

#### Defined in

node_modules/@types/node/events.d.ts:46

___

### captureRejections

▪ `Static` **captureRejections**: `boolean`

Sets or gets the default captureRejection value for all emitters.

#### Inherited from

Duplex.captureRejections

#### Defined in

node_modules/@types/node/events.d.ts:52

___

### defaultMaxListeners

▪ `Static` **defaultMaxListeners**: `number`

#### Inherited from

Duplex.defaultMaxListeners

#### Defined in

node_modules/@types/node/events.d.ts:53

___

### destroyed

• **destroyed**: `boolean`

#### Inherited from

Duplex.destroyed

#### Defined in

node_modules/@types/node/stream.d.ts:41

___

### errorMonitor

▪ `Static` `Readonly` **errorMonitor**: typeof [`errorMonitor`](DuplexStream.md#errormonitor)

This symbol shall be used to install a listener for only monitoring `'error'`
events. Listeners installed using this symbol are called before the regular
`'error'` listeners are called.

Installing a listener using this symbol does not change the behavior once an
`'error'` event is emitted, therefore the process will still crash if no
regular `'error'` listener is installed.

#### Inherited from

Duplex.errorMonitor

#### Defined in

node_modules/@types/node/events.d.ts:45

___

### input

• **input**: `Readable`

#### Defined in

[packages/api-server/src/lib/duplex-stream.ts:4](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-server/src/lib/duplex-stream.ts#L4)

___

### output

• **output**: `Writable`

#### Defined in

[packages/api-server/src/lib/duplex-stream.ts:5](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-server/src/lib/duplex-stream.ts#L5)

___

### readable

• **readable**: `boolean`

#### Inherited from

Duplex.readable

#### Defined in

node_modules/@types/node/stream.d.ts:34

___

### readableEncoding

• `Readonly` **readableEncoding**: ``null`` \| `BufferEncoding`

#### Inherited from

Duplex.readableEncoding

#### Defined in

node_modules/@types/node/stream.d.ts:35

___

### readableEnded

• `Readonly` **readableEnded**: `boolean`

#### Inherited from

Duplex.readableEnded

#### Defined in

node_modules/@types/node/stream.d.ts:36

___

### readableFlowing

• `Readonly` **readableFlowing**: ``null`` \| `boolean`

#### Inherited from

Duplex.readableFlowing

#### Defined in

node_modules/@types/node/stream.d.ts:37

___

### readableHighWaterMark

• `Readonly` **readableHighWaterMark**: `number`

#### Inherited from

Duplex.readableHighWaterMark

#### Defined in

node_modules/@types/node/stream.d.ts:38

___

### readableLength

• `Readonly` **readableLength**: `number`

#### Inherited from

Duplex.readableLength

#### Defined in

node_modules/@types/node/stream.d.ts:39

___

### readableObjectMode

• `Readonly` **readableObjectMode**: `boolean`

#### Inherited from

Duplex.readableObjectMode

#### Defined in

node_modules/@types/node/stream.d.ts:40

___

### writable

• `Readonly` **writable**: `boolean`

#### Inherited from

Duplex.writable

#### Defined in

node_modules/@types/node/stream.d.ts:251

___

### writableCorked

• `Readonly` **writableCorked**: `number`

#### Inherited from

Duplex.writableCorked

#### Defined in

node_modules/@types/node/stream.d.ts:257

___

### writableEnded

• `Readonly` **writableEnded**: `boolean`

#### Inherited from

Duplex.writableEnded

#### Defined in

node_modules/@types/node/stream.d.ts:252

___

### writableFinished

• `Readonly` **writableFinished**: `boolean`

#### Inherited from

Duplex.writableFinished

#### Defined in

node_modules/@types/node/stream.d.ts:253

___

### writableHighWaterMark

• `Readonly` **writableHighWaterMark**: `number`

#### Inherited from

Duplex.writableHighWaterMark

#### Defined in

node_modules/@types/node/stream.d.ts:254

___

### writableLength

• `Readonly` **writableLength**: `number`

#### Inherited from

Duplex.writableLength

#### Defined in

node_modules/@types/node/stream.d.ts:255

___

### writableObjectMode

• `Readonly` **writableObjectMode**: `boolean`

#### Inherited from

Duplex.writableObjectMode

#### Defined in

node_modules/@types/node/stream.d.ts:256

## Constructors

### constructor

• **new DuplexStream**(`options`, `input`, `output`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | `DuplexOptions` |
| `input` | `Readable` |
| `output` | `Writable` |

#### Overrides

Duplex.constructor

#### Defined in

[packages/api-server/src/lib/duplex-stream.ts:7](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-server/src/lib/duplex-stream.ts#L7)
