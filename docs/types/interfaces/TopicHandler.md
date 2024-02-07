[@scramjet/types](../README.md) / [Exports](../modules.md) / TopicHandler

# Interface: TopicHandler

## Hierarchy

- `Duplex`

- [`StreamHandler`](StreamHandler.md)

  ↳ **`TopicHandler`**

## Table of contents

### Methods

- [[asyncIterator]](TopicHandler.md#[asynciterator])
- [\_construct](TopicHandler.md#_construct)
- [\_destroy](TopicHandler.md#_destroy)
- [\_final](TopicHandler.md#_final)
- [\_read](TopicHandler.md#_read)
- [\_write](TopicHandler.md#_write)
- [\_writev](TopicHandler.md#_writev)
- [addListener](TopicHandler.md#addlistener)
- [cork](TopicHandler.md#cork)
- [destroy](TopicHandler.md#destroy)
- [emit](TopicHandler.md#emit)
- [end](TopicHandler.md#end)
- [eventNames](TopicHandler.md#eventnames)
- [getMaxListeners](TopicHandler.md#getmaxlisteners)
- [id](TopicHandler.md#id)
- [isPaused](TopicHandler.md#ispaused)
- [listenerCount](TopicHandler.md#listenercount)
- [listeners](TopicHandler.md#listeners)
- [off](TopicHandler.md#off)
- [on](TopicHandler.md#on)
- [once](TopicHandler.md#once)
- [options](TopicHandler.md#options)
- [origin](TopicHandler.md#origin)
- [pause](TopicHandler.md#pause)
- [pipe](TopicHandler.md#pipe)
- [prependListener](TopicHandler.md#prependlistener)
- [prependOnceListener](TopicHandler.md#prependoncelistener)
- [push](TopicHandler.md#push)
- [rawListeners](TopicHandler.md#rawlisteners)
- [read](TopicHandler.md#read)
- [removeAllListeners](TopicHandler.md#removealllisteners)
- [removeListener](TopicHandler.md#removelistener)
- [resume](TopicHandler.md#resume)
- [setDefaultEncoding](TopicHandler.md#setdefaultencoding)
- [setEncoding](TopicHandler.md#setencoding)
- [setMaxListeners](TopicHandler.md#setmaxlisteners)
- [state](TopicHandler.md#state)
- [type](TopicHandler.md#type)
- [uncork](TopicHandler.md#uncork)
- [unpipe](TopicHandler.md#unpipe)
- [unshift](TopicHandler.md#unshift)
- [wrap](TopicHandler.md#wrap)
- [write](TopicHandler.md#write)

### Properties

- [destroyed](TopicHandler.md#destroyed)
- [readable](TopicHandler.md#readable)
- [readableEncoding](TopicHandler.md#readableencoding)
- [readableEnded](TopicHandler.md#readableended)
- [readableFlowing](TopicHandler.md#readableflowing)
- [readableHighWaterMark](TopicHandler.md#readablehighwatermark)
- [readableLength](TopicHandler.md#readablelength)
- [readableObjectMode](TopicHandler.md#readableobjectmode)
- [writable](TopicHandler.md#writable)
- [writableCorked](TopicHandler.md#writablecorked)
- [writableEnded](TopicHandler.md#writableended)
- [writableFinished](TopicHandler.md#writablefinished)
- [writableHighWaterMark](TopicHandler.md#writablehighwatermark)
- [writableLength](TopicHandler.md#writablelength)
- [writableObjectMode](TopicHandler.md#writableobjectmode)

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

▸ **_read**(`size`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `size` | `number` |

#### Returns

`void`

#### Inherited from

Duplex.\_read

#### Defined in

node_modules/@types/node/stream.d.ts:44

___

### \_write

▸ **_write**(`chunk`, `encoding`, `callback`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `chunk` | `any` |
| `encoding` | `BufferEncoding` |
| `callback` | (`error?`: ``null`` \| `Error`) => `void` |

#### Returns

`void`

#### Inherited from

Duplex.\_write

#### Defined in

node_modules/@types/node/stream.d.ts:259

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

▸ **addListener**(`event`, `listener`): [`TopicHandler`](TopicHandler.md)

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

[`TopicHandler`](TopicHandler.md)

#### Inherited from

Duplex.addListener

#### Defined in

node_modules/@types/node/stream.d.ts:68

▸ **addListener**(`event`, `listener`): [`TopicHandler`](TopicHandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"data"`` |
| `listener` | (`chunk`: `any`) => `void` |

#### Returns

[`TopicHandler`](TopicHandler.md)

#### Inherited from

Duplex.addListener

#### Defined in

node_modules/@types/node/stream.d.ts:69

▸ **addListener**(`event`, `listener`): [`TopicHandler`](TopicHandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"end"`` |
| `listener` | () => `void` |

#### Returns

[`TopicHandler`](TopicHandler.md)

#### Inherited from

Duplex.addListener

#### Defined in

node_modules/@types/node/stream.d.ts:70

▸ **addListener**(`event`, `listener`): [`TopicHandler`](TopicHandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"error"`` |
| `listener` | (`err`: `Error`) => `void` |

#### Returns

[`TopicHandler`](TopicHandler.md)

#### Inherited from

Duplex.addListener

#### Defined in

node_modules/@types/node/stream.d.ts:71

▸ **addListener**(`event`, `listener`): [`TopicHandler`](TopicHandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"pause"`` |
| `listener` | () => `void` |

#### Returns

[`TopicHandler`](TopicHandler.md)

#### Inherited from

Duplex.addListener

#### Defined in

node_modules/@types/node/stream.d.ts:72

▸ **addListener**(`event`, `listener`): [`TopicHandler`](TopicHandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"readable"`` |
| `listener` | () => `void` |

#### Returns

[`TopicHandler`](TopicHandler.md)

#### Inherited from

Duplex.addListener

#### Defined in

node_modules/@types/node/stream.d.ts:73

▸ **addListener**(`event`, `listener`): [`TopicHandler`](TopicHandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"resume"`` |
| `listener` | () => `void` |

#### Returns

[`TopicHandler`](TopicHandler.md)

#### Inherited from

Duplex.addListener

#### Defined in

node_modules/@types/node/stream.d.ts:74

▸ **addListener**(`event`, `listener`): [`TopicHandler`](TopicHandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`TopicHandler`](TopicHandler.md)

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

### id

▸ **id**(): `string`

#### Returns

`string`

#### Inherited from

[StreamHandler](StreamHandler.md).[id](StreamHandler.md#id)

#### Defined in

[packages/types/src/sd-stream-handler.ts:37](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sd-stream-handler.ts#L37)

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

▸ **off**(`event`, `listener`): [`TopicHandler`](TopicHandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`TopicHandler`](TopicHandler.md)

#### Inherited from

Duplex.off

#### Defined in

node_modules/@types/node/events.d.ts:76

___

### on

▸ **on**(`event`, `listener`): [`TopicHandler`](TopicHandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"close"`` |
| `listener` | () => `void` |

#### Returns

[`TopicHandler`](TopicHandler.md)

#### Inherited from

Duplex.on

#### Defined in

node_modules/@types/node/stream.d.ts:86

▸ **on**(`event`, `listener`): [`TopicHandler`](TopicHandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"data"`` |
| `listener` | (`chunk`: `any`) => `void` |

#### Returns

[`TopicHandler`](TopicHandler.md)

#### Inherited from

Duplex.on

#### Defined in

node_modules/@types/node/stream.d.ts:87

▸ **on**(`event`, `listener`): [`TopicHandler`](TopicHandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"end"`` |
| `listener` | () => `void` |

#### Returns

[`TopicHandler`](TopicHandler.md)

#### Inherited from

Duplex.on

#### Defined in

node_modules/@types/node/stream.d.ts:88

▸ **on**(`event`, `listener`): [`TopicHandler`](TopicHandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"error"`` |
| `listener` | (`err`: `Error`) => `void` |

#### Returns

[`TopicHandler`](TopicHandler.md)

#### Inherited from

Duplex.on

#### Defined in

node_modules/@types/node/stream.d.ts:89

▸ **on**(`event`, `listener`): [`TopicHandler`](TopicHandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"pause"`` |
| `listener` | () => `void` |

#### Returns

[`TopicHandler`](TopicHandler.md)

#### Inherited from

Duplex.on

#### Defined in

node_modules/@types/node/stream.d.ts:90

▸ **on**(`event`, `listener`): [`TopicHandler`](TopicHandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"readable"`` |
| `listener` | () => `void` |

#### Returns

[`TopicHandler`](TopicHandler.md)

#### Inherited from

Duplex.on

#### Defined in

node_modules/@types/node/stream.d.ts:91

▸ **on**(`event`, `listener`): [`TopicHandler`](TopicHandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"resume"`` |
| `listener` | () => `void` |

#### Returns

[`TopicHandler`](TopicHandler.md)

#### Inherited from

Duplex.on

#### Defined in

node_modules/@types/node/stream.d.ts:92

▸ **on**(`event`, `listener`): [`TopicHandler`](TopicHandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`TopicHandler`](TopicHandler.md)

#### Inherited from

Duplex.on

#### Defined in

node_modules/@types/node/stream.d.ts:93

___

### once

▸ **once**(`event`, `listener`): [`TopicHandler`](TopicHandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"close"`` |
| `listener` | () => `void` |

#### Returns

[`TopicHandler`](TopicHandler.md)

#### Inherited from

Duplex.once

#### Defined in

node_modules/@types/node/stream.d.ts:95

▸ **once**(`event`, `listener`): [`TopicHandler`](TopicHandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"data"`` |
| `listener` | (`chunk`: `any`) => `void` |

#### Returns

[`TopicHandler`](TopicHandler.md)

#### Inherited from

Duplex.once

#### Defined in

node_modules/@types/node/stream.d.ts:96

▸ **once**(`event`, `listener`): [`TopicHandler`](TopicHandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"end"`` |
| `listener` | () => `void` |

#### Returns

[`TopicHandler`](TopicHandler.md)

#### Inherited from

Duplex.once

#### Defined in

node_modules/@types/node/stream.d.ts:97

▸ **once**(`event`, `listener`): [`TopicHandler`](TopicHandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"error"`` |
| `listener` | (`err`: `Error`) => `void` |

#### Returns

[`TopicHandler`](TopicHandler.md)

#### Inherited from

Duplex.once

#### Defined in

node_modules/@types/node/stream.d.ts:98

▸ **once**(`event`, `listener`): [`TopicHandler`](TopicHandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"pause"`` |
| `listener` | () => `void` |

#### Returns

[`TopicHandler`](TopicHandler.md)

#### Inherited from

Duplex.once

#### Defined in

node_modules/@types/node/stream.d.ts:99

▸ **once**(`event`, `listener`): [`TopicHandler`](TopicHandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"readable"`` |
| `listener` | () => `void` |

#### Returns

[`TopicHandler`](TopicHandler.md)

#### Inherited from

Duplex.once

#### Defined in

node_modules/@types/node/stream.d.ts:100

▸ **once**(`event`, `listener`): [`TopicHandler`](TopicHandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"resume"`` |
| `listener` | () => `void` |

#### Returns

[`TopicHandler`](TopicHandler.md)

#### Inherited from

Duplex.once

#### Defined in

node_modules/@types/node/stream.d.ts:101

▸ **once**(`event`, `listener`): [`TopicHandler`](TopicHandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`TopicHandler`](TopicHandler.md)

#### Inherited from

Duplex.once

#### Defined in

node_modules/@types/node/stream.d.ts:102

___

### options

▸ **options**(): [`TopicOptions`](../modules.md#topicoptions)

#### Returns

[`TopicOptions`](../modules.md#topicoptions)

#### Overrides

[StreamHandler](StreamHandler.md).[options](StreamHandler.md#options)

#### Defined in

[packages/types/src/sd-topic-handler.ts:13](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sd-topic-handler.ts#L13)

___

### origin

▸ **origin**(): [`StreamOrigin`](../modules.md#streamorigin)

#### Returns

[`StreamOrigin`](../modules.md#streamorigin)

#### Inherited from

[StreamHandler](StreamHandler.md).[origin](StreamHandler.md#origin)

#### Defined in

[packages/types/src/sd-stream-handler.ts:41](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sd-stream-handler.ts#L41)

___

### pause

▸ **pause**(): [`TopicHandler`](TopicHandler.md)

#### Returns

[`TopicHandler`](TopicHandler.md)

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

▸ **prependListener**(`event`, `listener`): [`TopicHandler`](TopicHandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"close"`` |
| `listener` | () => `void` |

#### Returns

[`TopicHandler`](TopicHandler.md)

#### Inherited from

Duplex.prependListener

#### Defined in

node_modules/@types/node/stream.d.ts:104

▸ **prependListener**(`event`, `listener`): [`TopicHandler`](TopicHandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"data"`` |
| `listener` | (`chunk`: `any`) => `void` |

#### Returns

[`TopicHandler`](TopicHandler.md)

#### Inherited from

Duplex.prependListener

#### Defined in

node_modules/@types/node/stream.d.ts:105

▸ **prependListener**(`event`, `listener`): [`TopicHandler`](TopicHandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"end"`` |
| `listener` | () => `void` |

#### Returns

[`TopicHandler`](TopicHandler.md)

#### Inherited from

Duplex.prependListener

#### Defined in

node_modules/@types/node/stream.d.ts:106

▸ **prependListener**(`event`, `listener`): [`TopicHandler`](TopicHandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"error"`` |
| `listener` | (`err`: `Error`) => `void` |

#### Returns

[`TopicHandler`](TopicHandler.md)

#### Inherited from

Duplex.prependListener

#### Defined in

node_modules/@types/node/stream.d.ts:107

▸ **prependListener**(`event`, `listener`): [`TopicHandler`](TopicHandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"pause"`` |
| `listener` | () => `void` |

#### Returns

[`TopicHandler`](TopicHandler.md)

#### Inherited from

Duplex.prependListener

#### Defined in

node_modules/@types/node/stream.d.ts:108

▸ **prependListener**(`event`, `listener`): [`TopicHandler`](TopicHandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"readable"`` |
| `listener` | () => `void` |

#### Returns

[`TopicHandler`](TopicHandler.md)

#### Inherited from

Duplex.prependListener

#### Defined in

node_modules/@types/node/stream.d.ts:109

▸ **prependListener**(`event`, `listener`): [`TopicHandler`](TopicHandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"resume"`` |
| `listener` | () => `void` |

#### Returns

[`TopicHandler`](TopicHandler.md)

#### Inherited from

Duplex.prependListener

#### Defined in

node_modules/@types/node/stream.d.ts:110

▸ **prependListener**(`event`, `listener`): [`TopicHandler`](TopicHandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`TopicHandler`](TopicHandler.md)

#### Inherited from

Duplex.prependListener

#### Defined in

node_modules/@types/node/stream.d.ts:111

___

### prependOnceListener

▸ **prependOnceListener**(`event`, `listener`): [`TopicHandler`](TopicHandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"close"`` |
| `listener` | () => `void` |

#### Returns

[`TopicHandler`](TopicHandler.md)

#### Inherited from

Duplex.prependOnceListener

#### Defined in

node_modules/@types/node/stream.d.ts:113

▸ **prependOnceListener**(`event`, `listener`): [`TopicHandler`](TopicHandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"data"`` |
| `listener` | (`chunk`: `any`) => `void` |

#### Returns

[`TopicHandler`](TopicHandler.md)

#### Inherited from

Duplex.prependOnceListener

#### Defined in

node_modules/@types/node/stream.d.ts:114

▸ **prependOnceListener**(`event`, `listener`): [`TopicHandler`](TopicHandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"end"`` |
| `listener` | () => `void` |

#### Returns

[`TopicHandler`](TopicHandler.md)

#### Inherited from

Duplex.prependOnceListener

#### Defined in

node_modules/@types/node/stream.d.ts:115

▸ **prependOnceListener**(`event`, `listener`): [`TopicHandler`](TopicHandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"error"`` |
| `listener` | (`err`: `Error`) => `void` |

#### Returns

[`TopicHandler`](TopicHandler.md)

#### Inherited from

Duplex.prependOnceListener

#### Defined in

node_modules/@types/node/stream.d.ts:116

▸ **prependOnceListener**(`event`, `listener`): [`TopicHandler`](TopicHandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"pause"`` |
| `listener` | () => `void` |

#### Returns

[`TopicHandler`](TopicHandler.md)

#### Inherited from

Duplex.prependOnceListener

#### Defined in

node_modules/@types/node/stream.d.ts:117

▸ **prependOnceListener**(`event`, `listener`): [`TopicHandler`](TopicHandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"readable"`` |
| `listener` | () => `void` |

#### Returns

[`TopicHandler`](TopicHandler.md)

#### Inherited from

Duplex.prependOnceListener

#### Defined in

node_modules/@types/node/stream.d.ts:118

▸ **prependOnceListener**(`event`, `listener`): [`TopicHandler`](TopicHandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"resume"`` |
| `listener` | () => `void` |

#### Returns

[`TopicHandler`](TopicHandler.md)

#### Inherited from

Duplex.prependOnceListener

#### Defined in

node_modules/@types/node/stream.d.ts:119

▸ **prependOnceListener**(`event`, `listener`): [`TopicHandler`](TopicHandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`TopicHandler`](TopicHandler.md)

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

▸ **removeAllListeners**(`event?`): [`TopicHandler`](TopicHandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event?` | `string` \| `symbol` |

#### Returns

[`TopicHandler`](TopicHandler.md)

#### Inherited from

Duplex.removeAllListeners

#### Defined in

node_modules/@types/node/events.d.ts:77

___

### removeListener

▸ **removeListener**(`event`, `listener`): [`TopicHandler`](TopicHandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"close"`` |
| `listener` | () => `void` |

#### Returns

[`TopicHandler`](TopicHandler.md)

#### Inherited from

Duplex.removeListener

#### Defined in

node_modules/@types/node/stream.d.ts:122

▸ **removeListener**(`event`, `listener`): [`TopicHandler`](TopicHandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"data"`` |
| `listener` | (`chunk`: `any`) => `void` |

#### Returns

[`TopicHandler`](TopicHandler.md)

#### Inherited from

Duplex.removeListener

#### Defined in

node_modules/@types/node/stream.d.ts:123

▸ **removeListener**(`event`, `listener`): [`TopicHandler`](TopicHandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"end"`` |
| `listener` | () => `void` |

#### Returns

[`TopicHandler`](TopicHandler.md)

#### Inherited from

Duplex.removeListener

#### Defined in

node_modules/@types/node/stream.d.ts:124

▸ **removeListener**(`event`, `listener`): [`TopicHandler`](TopicHandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"error"`` |
| `listener` | (`err`: `Error`) => `void` |

#### Returns

[`TopicHandler`](TopicHandler.md)

#### Inherited from

Duplex.removeListener

#### Defined in

node_modules/@types/node/stream.d.ts:125

▸ **removeListener**(`event`, `listener`): [`TopicHandler`](TopicHandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"pause"`` |
| `listener` | () => `void` |

#### Returns

[`TopicHandler`](TopicHandler.md)

#### Inherited from

Duplex.removeListener

#### Defined in

node_modules/@types/node/stream.d.ts:126

▸ **removeListener**(`event`, `listener`): [`TopicHandler`](TopicHandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"readable"`` |
| `listener` | () => `void` |

#### Returns

[`TopicHandler`](TopicHandler.md)

#### Inherited from

Duplex.removeListener

#### Defined in

node_modules/@types/node/stream.d.ts:127

▸ **removeListener**(`event`, `listener`): [`TopicHandler`](TopicHandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"resume"`` |
| `listener` | () => `void` |

#### Returns

[`TopicHandler`](TopicHandler.md)

#### Inherited from

Duplex.removeListener

#### Defined in

node_modules/@types/node/stream.d.ts:128

▸ **removeListener**(`event`, `listener`): [`TopicHandler`](TopicHandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`TopicHandler`](TopicHandler.md)

#### Inherited from

Duplex.removeListener

#### Defined in

node_modules/@types/node/stream.d.ts:129

___

### resume

▸ **resume**(): [`TopicHandler`](TopicHandler.md)

#### Returns

[`TopicHandler`](TopicHandler.md)

#### Inherited from

Duplex.resume

#### Defined in

node_modules/@types/node/stream.d.ts:48

___

### setDefaultEncoding

▸ **setDefaultEncoding**(`encoding`): [`TopicHandler`](TopicHandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `encoding` | `BufferEncoding` |

#### Returns

[`TopicHandler`](TopicHandler.md)

#### Inherited from

Duplex.setDefaultEncoding

#### Defined in

node_modules/@types/node/stream.d.ts:265

___

### setEncoding

▸ **setEncoding**(`encoding`): [`TopicHandler`](TopicHandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `encoding` | `BufferEncoding` |

#### Returns

[`TopicHandler`](TopicHandler.md)

#### Inherited from

Duplex.setEncoding

#### Defined in

node_modules/@types/node/stream.d.ts:46

___

### setMaxListeners

▸ **setMaxListeners**(`n`): [`TopicHandler`](TopicHandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `n` | `number` |

#### Returns

[`TopicHandler`](TopicHandler.md)

#### Inherited from

Duplex.setMaxListeners

#### Defined in

node_modules/@types/node/events.d.ts:78

___

### state

▸ **state**(): [`StreamState`](../modules.md#streamstate)

#### Returns

[`StreamState`](../modules.md#streamstate)

#### Inherited from

[StreamHandler](StreamHandler.md).[state](StreamHandler.md#state)

#### Defined in

[packages/types/src/sd-stream-handler.ts:38](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sd-stream-handler.ts#L38)

___

### type

▸ **type**(): [`StreamType`](../enums/StreamType.md)

#### Returns

[`StreamType`](../enums/StreamType.md)

#### Inherited from

[StreamHandler](StreamHandler.md).[type](StreamHandler.md#type)

#### Defined in

[packages/types/src/sd-stream-handler.ts:39](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sd-stream-handler.ts#L39)

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

▸ **unpipe**(`destination?`): [`TopicHandler`](TopicHandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `destination?` | `WritableStream` |

#### Returns

[`TopicHandler`](TopicHandler.md)

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

▸ **wrap**(`oldStream`): [`TopicHandler`](TopicHandler.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `oldStream` | `ReadableStream` |

#### Returns

[`TopicHandler`](TopicHandler.md)

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

### destroyed

• **destroyed**: `boolean`

#### Inherited from

Duplex.destroyed

#### Defined in

node_modules/@types/node/stream.d.ts:41

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
