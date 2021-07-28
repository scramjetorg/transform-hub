[@scramjet/api-server](../README.md) / [lib/duplex-stream](../modules/lib_duplex_stream.md) / DuplexStream

# Class: DuplexStream

[lib/duplex-stream](../modules/lib_duplex_stream.md).DuplexStream

## Hierarchy

- `Duplex`

  ↳ **`DuplexStream`**

## Table of contents

### Constructors

- [constructor](lib_duplex_stream.DuplexStream.md#constructor)

### Properties

- [destroyed](lib_duplex_stream.DuplexStream.md#destroyed)
- [input](lib_duplex_stream.DuplexStream.md#input)
- [output](lib_duplex_stream.DuplexStream.md#output)
- [readable](lib_duplex_stream.DuplexStream.md#readable)
- [readableEncoding](lib_duplex_stream.DuplexStream.md#readableencoding)
- [readableEnded](lib_duplex_stream.DuplexStream.md#readableended)
- [readableFlowing](lib_duplex_stream.DuplexStream.md#readableflowing)
- [readableHighWaterMark](lib_duplex_stream.DuplexStream.md#readablehighwatermark)
- [readableLength](lib_duplex_stream.DuplexStream.md#readablelength)
- [readableObjectMode](lib_duplex_stream.DuplexStream.md#readableobjectmode)
- [writable](lib_duplex_stream.DuplexStream.md#writable)
- [writableCorked](lib_duplex_stream.DuplexStream.md#writablecorked)
- [writableEnded](lib_duplex_stream.DuplexStream.md#writableended)
- [writableFinished](lib_duplex_stream.DuplexStream.md#writablefinished)
- [writableHighWaterMark](lib_duplex_stream.DuplexStream.md#writablehighwatermark)
- [writableLength](lib_duplex_stream.DuplexStream.md#writablelength)
- [writableObjectMode](lib_duplex_stream.DuplexStream.md#writableobjectmode)
- [captureRejectionSymbol](lib_duplex_stream.DuplexStream.md#capturerejectionsymbol)
- [captureRejections](lib_duplex_stream.DuplexStream.md#capturerejections)
- [defaultMaxListeners](lib_duplex_stream.DuplexStream.md#defaultmaxlisteners)
- [errorMonitor](lib_duplex_stream.DuplexStream.md#errormonitor)

### Methods

- [[asyncIterator]](lib_duplex_stream.DuplexStream.md#[asynciterator])
- [\_construct](lib_duplex_stream.DuplexStream.md#_construct)
- [\_destroy](lib_duplex_stream.DuplexStream.md#_destroy)
- [\_final](lib_duplex_stream.DuplexStream.md#_final)
- [\_read](lib_duplex_stream.DuplexStream.md#_read)
- [\_write](lib_duplex_stream.DuplexStream.md#_write)
- [\_writev](lib_duplex_stream.DuplexStream.md#_writev)
- [addListener](lib_duplex_stream.DuplexStream.md#addlistener)
- [cork](lib_duplex_stream.DuplexStream.md#cork)
- [destroy](lib_duplex_stream.DuplexStream.md#destroy)
- [emit](lib_duplex_stream.DuplexStream.md#emit)
- [end](lib_duplex_stream.DuplexStream.md#end)
- [eventNames](lib_duplex_stream.DuplexStream.md#eventnames)
- [getMaxListeners](lib_duplex_stream.DuplexStream.md#getmaxlisteners)
- [isPaused](lib_duplex_stream.DuplexStream.md#ispaused)
- [listenerCount](lib_duplex_stream.DuplexStream.md#listenercount)
- [listeners](lib_duplex_stream.DuplexStream.md#listeners)
- [off](lib_duplex_stream.DuplexStream.md#off)
- [on](lib_duplex_stream.DuplexStream.md#on)
- [once](lib_duplex_stream.DuplexStream.md#once)
- [pause](lib_duplex_stream.DuplexStream.md#pause)
- [pipe](lib_duplex_stream.DuplexStream.md#pipe)
- [prependListener](lib_duplex_stream.DuplexStream.md#prependlistener)
- [prependOnceListener](lib_duplex_stream.DuplexStream.md#prependoncelistener)
- [push](lib_duplex_stream.DuplexStream.md#push)
- [rawListeners](lib_duplex_stream.DuplexStream.md#rawlisteners)
- [read](lib_duplex_stream.DuplexStream.md#read)
- [removeAllListeners](lib_duplex_stream.DuplexStream.md#removealllisteners)
- [removeListener](lib_duplex_stream.DuplexStream.md#removelistener)
- [resume](lib_duplex_stream.DuplexStream.md#resume)
- [setDefaultEncoding](lib_duplex_stream.DuplexStream.md#setdefaultencoding)
- [setEncoding](lib_duplex_stream.DuplexStream.md#setencoding)
- [setMaxListeners](lib_duplex_stream.DuplexStream.md#setmaxlisteners)
- [uncork](lib_duplex_stream.DuplexStream.md#uncork)
- [unpipe](lib_duplex_stream.DuplexStream.md#unpipe)
- [unshift](lib_duplex_stream.DuplexStream.md#unshift)
- [wrap](lib_duplex_stream.DuplexStream.md#wrap)
- [write](lib_duplex_stream.DuplexStream.md#write)
- [from](lib_duplex_stream.DuplexStream.md#from)
- [getEventListener](lib_duplex_stream.DuplexStream.md#geteventlistener)
- [listenerCount](lib_duplex_stream.DuplexStream.md#listenercount)
- [on](lib_duplex_stream.DuplexStream.md#on)
- [once](lib_duplex_stream.DuplexStream.md#once)

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

[packages/api-server/src/lib/duplex-stream.ts:7](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/api-server/src/lib/duplex-stream.ts#L7)

## Properties

### destroyed

• **destroyed**: `boolean`

#### Inherited from

Duplex.destroyed

#### Defined in

node_modules/@types/node/stream.d.ts:41

___

### input

• **input**: `Readable`

#### Defined in

[packages/api-server/src/lib/duplex-stream.ts:4](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/api-server/src/lib/duplex-stream.ts#L4)

___

### output

• **output**: `Writable`

#### Defined in

[packages/api-server/src/lib/duplex-stream.ts:5](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/api-server/src/lib/duplex-stream.ts#L5)

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

___

### captureRejectionSymbol

▪ `Static` `Readonly` **captureRejectionSymbol**: typeof [`captureRejectionSymbol`](lib_duplex_stream.DuplexStream.md#capturerejectionsymbol)

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

### errorMonitor

▪ `Static` `Readonly` **errorMonitor**: typeof [`errorMonitor`](lib_duplex_stream.DuplexStream.md#errormonitor)

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

## Methods

### [asyncIterator]

▸ **[asyncIterator]**(): `AsyncIterableIterator`<`any`\>

#### Returns

`AsyncIterableIterator`<`any`\>

#### Inherited from

Duplex.\_\_@asyncIterator@3267

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

[packages/api-server/src/lib/duplex-stream.ts:33](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/api-server/src/lib/duplex-stream.ts#L33)

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

[packages/api-server/src/lib/duplex-stream.ts:20](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/api-server/src/lib/duplex-stream.ts#L20)

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

▸ **addListener**(`event`, `listener`): [`DuplexStream`](lib_duplex_stream.DuplexStream.md)

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

[`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Inherited from

Duplex.addListener

#### Defined in

node_modules/@types/node/stream.d.ts:68

▸ **addListener**(`event`, `listener`): [`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"data"`` |
| `listener` | (`chunk`: `any`) => `void` |

#### Returns

[`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Inherited from

Duplex.addListener

#### Defined in

node_modules/@types/node/stream.d.ts:69

▸ **addListener**(`event`, `listener`): [`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"end"`` |
| `listener` | () => `void` |

#### Returns

[`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Inherited from

Duplex.addListener

#### Defined in

node_modules/@types/node/stream.d.ts:70

▸ **addListener**(`event`, `listener`): [`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"error"`` |
| `listener` | (`err`: `Error`) => `void` |

#### Returns

[`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Inherited from

Duplex.addListener

#### Defined in

node_modules/@types/node/stream.d.ts:71

▸ **addListener**(`event`, `listener`): [`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"pause"`` |
| `listener` | () => `void` |

#### Returns

[`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Inherited from

Duplex.addListener

#### Defined in

node_modules/@types/node/stream.d.ts:72

▸ **addListener**(`event`, `listener`): [`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"readable"`` |
| `listener` | () => `void` |

#### Returns

[`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Inherited from

Duplex.addListener

#### Defined in

node_modules/@types/node/stream.d.ts:73

▸ **addListener**(`event`, `listener`): [`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"resume"`` |
| `listener` | () => `void` |

#### Returns

[`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Inherited from

Duplex.addListener

#### Defined in

node_modules/@types/node/stream.d.ts:74

▸ **addListener**(`event`, `listener`): [`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`DuplexStream`](lib_duplex_stream.DuplexStream.md)

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

▸ **off**(`event`, `listener`): [`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Inherited from

Duplex.off

#### Defined in

node_modules/@types/node/events.d.ts:76

___

### on

▸ **on**(`event`, `listener`): [`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"close"`` |
| `listener` | () => `void` |

#### Returns

[`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Inherited from

Duplex.on

#### Defined in

node_modules/@types/node/stream.d.ts:86

▸ **on**(`event`, `listener`): [`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"data"`` |
| `listener` | (`chunk`: `any`) => `void` |

#### Returns

[`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Inherited from

Duplex.on

#### Defined in

node_modules/@types/node/stream.d.ts:87

▸ **on**(`event`, `listener`): [`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"end"`` |
| `listener` | () => `void` |

#### Returns

[`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Inherited from

Duplex.on

#### Defined in

node_modules/@types/node/stream.d.ts:88

▸ **on**(`event`, `listener`): [`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"error"`` |
| `listener` | (`err`: `Error`) => `void` |

#### Returns

[`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Inherited from

Duplex.on

#### Defined in

node_modules/@types/node/stream.d.ts:89

▸ **on**(`event`, `listener`): [`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"pause"`` |
| `listener` | () => `void` |

#### Returns

[`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Inherited from

Duplex.on

#### Defined in

node_modules/@types/node/stream.d.ts:90

▸ **on**(`event`, `listener`): [`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"readable"`` |
| `listener` | () => `void` |

#### Returns

[`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Inherited from

Duplex.on

#### Defined in

node_modules/@types/node/stream.d.ts:91

▸ **on**(`event`, `listener`): [`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"resume"`` |
| `listener` | () => `void` |

#### Returns

[`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Inherited from

Duplex.on

#### Defined in

node_modules/@types/node/stream.d.ts:92

▸ **on**(`event`, `listener`): [`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Inherited from

Duplex.on

#### Defined in

node_modules/@types/node/stream.d.ts:93

___

### once

▸ **once**(`event`, `listener`): [`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"close"`` |
| `listener` | () => `void` |

#### Returns

[`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Inherited from

Duplex.once

#### Defined in

node_modules/@types/node/stream.d.ts:95

▸ **once**(`event`, `listener`): [`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"data"`` |
| `listener` | (`chunk`: `any`) => `void` |

#### Returns

[`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Inherited from

Duplex.once

#### Defined in

node_modules/@types/node/stream.d.ts:96

▸ **once**(`event`, `listener`): [`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"end"`` |
| `listener` | () => `void` |

#### Returns

[`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Inherited from

Duplex.once

#### Defined in

node_modules/@types/node/stream.d.ts:97

▸ **once**(`event`, `listener`): [`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"error"`` |
| `listener` | (`err`: `Error`) => `void` |

#### Returns

[`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Inherited from

Duplex.once

#### Defined in

node_modules/@types/node/stream.d.ts:98

▸ **once**(`event`, `listener`): [`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"pause"`` |
| `listener` | () => `void` |

#### Returns

[`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Inherited from

Duplex.once

#### Defined in

node_modules/@types/node/stream.d.ts:99

▸ **once**(`event`, `listener`): [`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"readable"`` |
| `listener` | () => `void` |

#### Returns

[`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Inherited from

Duplex.once

#### Defined in

node_modules/@types/node/stream.d.ts:100

▸ **once**(`event`, `listener`): [`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"resume"`` |
| `listener` | () => `void` |

#### Returns

[`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Inherited from

Duplex.once

#### Defined in

node_modules/@types/node/stream.d.ts:101

▸ **once**(`event`, `listener`): [`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Inherited from

Duplex.once

#### Defined in

node_modules/@types/node/stream.d.ts:102

___

### pause

▸ **pause**(): [`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Returns

[`DuplexStream`](lib_duplex_stream.DuplexStream.md)

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

▸ **prependListener**(`event`, `listener`): [`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"close"`` |
| `listener` | () => `void` |

#### Returns

[`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Inherited from

Duplex.prependListener

#### Defined in

node_modules/@types/node/stream.d.ts:104

▸ **prependListener**(`event`, `listener`): [`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"data"`` |
| `listener` | (`chunk`: `any`) => `void` |

#### Returns

[`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Inherited from

Duplex.prependListener

#### Defined in

node_modules/@types/node/stream.d.ts:105

▸ **prependListener**(`event`, `listener`): [`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"end"`` |
| `listener` | () => `void` |

#### Returns

[`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Inherited from

Duplex.prependListener

#### Defined in

node_modules/@types/node/stream.d.ts:106

▸ **prependListener**(`event`, `listener`): [`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"error"`` |
| `listener` | (`err`: `Error`) => `void` |

#### Returns

[`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Inherited from

Duplex.prependListener

#### Defined in

node_modules/@types/node/stream.d.ts:107

▸ **prependListener**(`event`, `listener`): [`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"pause"`` |
| `listener` | () => `void` |

#### Returns

[`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Inherited from

Duplex.prependListener

#### Defined in

node_modules/@types/node/stream.d.ts:108

▸ **prependListener**(`event`, `listener`): [`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"readable"`` |
| `listener` | () => `void` |

#### Returns

[`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Inherited from

Duplex.prependListener

#### Defined in

node_modules/@types/node/stream.d.ts:109

▸ **prependListener**(`event`, `listener`): [`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"resume"`` |
| `listener` | () => `void` |

#### Returns

[`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Inherited from

Duplex.prependListener

#### Defined in

node_modules/@types/node/stream.d.ts:110

▸ **prependListener**(`event`, `listener`): [`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Inherited from

Duplex.prependListener

#### Defined in

node_modules/@types/node/stream.d.ts:111

___

### prependOnceListener

▸ **prependOnceListener**(`event`, `listener`): [`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"close"`` |
| `listener` | () => `void` |

#### Returns

[`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Inherited from

Duplex.prependOnceListener

#### Defined in

node_modules/@types/node/stream.d.ts:113

▸ **prependOnceListener**(`event`, `listener`): [`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"data"`` |
| `listener` | (`chunk`: `any`) => `void` |

#### Returns

[`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Inherited from

Duplex.prependOnceListener

#### Defined in

node_modules/@types/node/stream.d.ts:114

▸ **prependOnceListener**(`event`, `listener`): [`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"end"`` |
| `listener` | () => `void` |

#### Returns

[`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Inherited from

Duplex.prependOnceListener

#### Defined in

node_modules/@types/node/stream.d.ts:115

▸ **prependOnceListener**(`event`, `listener`): [`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"error"`` |
| `listener` | (`err`: `Error`) => `void` |

#### Returns

[`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Inherited from

Duplex.prependOnceListener

#### Defined in

node_modules/@types/node/stream.d.ts:116

▸ **prependOnceListener**(`event`, `listener`): [`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"pause"`` |
| `listener` | () => `void` |

#### Returns

[`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Inherited from

Duplex.prependOnceListener

#### Defined in

node_modules/@types/node/stream.d.ts:117

▸ **prependOnceListener**(`event`, `listener`): [`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"readable"`` |
| `listener` | () => `void` |

#### Returns

[`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Inherited from

Duplex.prependOnceListener

#### Defined in

node_modules/@types/node/stream.d.ts:118

▸ **prependOnceListener**(`event`, `listener`): [`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"resume"`` |
| `listener` | () => `void` |

#### Returns

[`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Inherited from

Duplex.prependOnceListener

#### Defined in

node_modules/@types/node/stream.d.ts:119

▸ **prependOnceListener**(`event`, `listener`): [`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`DuplexStream`](lib_duplex_stream.DuplexStream.md)

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

▸ **removeAllListeners**(`event?`): [`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event?` | `string` \| `symbol` |

#### Returns

[`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Inherited from

Duplex.removeAllListeners

#### Defined in

node_modules/@types/node/events.d.ts:77

___

### removeListener

▸ **removeListener**(`event`, `listener`): [`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"close"`` |
| `listener` | () => `void` |

#### Returns

[`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Inherited from

Duplex.removeListener

#### Defined in

node_modules/@types/node/stream.d.ts:122

▸ **removeListener**(`event`, `listener`): [`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"data"`` |
| `listener` | (`chunk`: `any`) => `void` |

#### Returns

[`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Inherited from

Duplex.removeListener

#### Defined in

node_modules/@types/node/stream.d.ts:123

▸ **removeListener**(`event`, `listener`): [`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"end"`` |
| `listener` | () => `void` |

#### Returns

[`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Inherited from

Duplex.removeListener

#### Defined in

node_modules/@types/node/stream.d.ts:124

▸ **removeListener**(`event`, `listener`): [`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"error"`` |
| `listener` | (`err`: `Error`) => `void` |

#### Returns

[`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Inherited from

Duplex.removeListener

#### Defined in

node_modules/@types/node/stream.d.ts:125

▸ **removeListener**(`event`, `listener`): [`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"pause"`` |
| `listener` | () => `void` |

#### Returns

[`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Inherited from

Duplex.removeListener

#### Defined in

node_modules/@types/node/stream.d.ts:126

▸ **removeListener**(`event`, `listener`): [`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"readable"`` |
| `listener` | () => `void` |

#### Returns

[`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Inherited from

Duplex.removeListener

#### Defined in

node_modules/@types/node/stream.d.ts:127

▸ **removeListener**(`event`, `listener`): [`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"resume"`` |
| `listener` | () => `void` |

#### Returns

[`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Inherited from

Duplex.removeListener

#### Defined in

node_modules/@types/node/stream.d.ts:128

▸ **removeListener**(`event`, `listener`): [`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Inherited from

Duplex.removeListener

#### Defined in

node_modules/@types/node/stream.d.ts:129

___

### resume

▸ **resume**(): [`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Returns

[`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Inherited from

Duplex.resume

#### Defined in

node_modules/@types/node/stream.d.ts:48

___

### setDefaultEncoding

▸ **setDefaultEncoding**(`encoding`): [`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `encoding` | `BufferEncoding` |

#### Returns

[`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Inherited from

Duplex.setDefaultEncoding

#### Defined in

node_modules/@types/node/stream.d.ts:265

___

### setEncoding

▸ **setEncoding**(`encoding`): [`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `encoding` | `BufferEncoding` |

#### Returns

[`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Inherited from

Duplex.setEncoding

#### Defined in

node_modules/@types/node/stream.d.ts:46

___

### setMaxListeners

▸ **setMaxListeners**(`n`): [`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `n` | `number` |

#### Returns

[`DuplexStream`](lib_duplex_stream.DuplexStream.md)

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

▸ **unpipe**(`destination?`): [`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `destination?` | `WritableStream` |

#### Returns

[`DuplexStream`](lib_duplex_stream.DuplexStream.md)

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

▸ **wrap**(`oldStream`): [`DuplexStream`](lib_duplex_stream.DuplexStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `oldStream` | `ReadableStream` |

#### Returns

[`DuplexStream`](lib_duplex_stream.DuplexStream.md)

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

### listenerCount

▸ `Static` **listenerCount**(`emitter`, `event`): `number`

**`deprecated`** since v4.0.0

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
