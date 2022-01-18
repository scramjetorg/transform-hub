[@scramjet/types](../README.md) / [Exports](../modules.md) / WritableStream

# Interface: WritableStream<Consumes\>

Writable stream representation with generic chunks.

**`see`** https://nodejs.org/api/stream.html#stream_writable_streams Node.js Writable stream documentation

## Type parameters

| Name |
| :------ |
| `Consumes` |

## Hierarchy

- `Writable`

  ↳ **`WritableStream`**

## Table of contents

### Methods

- [\_construct](writablestream.md#_construct)
- [\_destroy](writablestream.md#_destroy)
- [\_final](writablestream.md#_final)
- [\_write](writablestream.md#_write)
- [\_writev](writablestream.md#_writev)
- [addListener](writablestream.md#addlistener)
- [cork](writablestream.md#cork)
- [destroy](writablestream.md#destroy)
- [emit](writablestream.md#emit)
- [end](writablestream.md#end)
- [eventNames](writablestream.md#eventnames)
- [getMaxListeners](writablestream.md#getmaxlisteners)
- [listenerCount](writablestream.md#listenercount)
- [listeners](writablestream.md#listeners)
- [off](writablestream.md#off)
- [on](writablestream.md#on)
- [once](writablestream.md#once)
- [pipe](writablestream.md#pipe)
- [prependListener](writablestream.md#prependlistener)
- [prependOnceListener](writablestream.md#prependoncelistener)
- [rawListeners](writablestream.md#rawlisteners)
- [removeAllListeners](writablestream.md#removealllisteners)
- [removeListener](writablestream.md#removelistener)
- [setDefaultEncoding](writablestream.md#setdefaultencoding)
- [setMaxListeners](writablestream.md#setmaxlisteners)
- [uncork](writablestream.md#uncork)
- [write](writablestream.md#write)

### Properties

- [destroyed](writablestream.md#destroyed)
- [objectMode](writablestream.md#objectmode)
- [writable](writablestream.md#writable)
- [writableCorked](writablestream.md#writablecorked)
- [writableEnded](writablestream.md#writableended)
- [writableFinished](writablestream.md#writablefinished)
- [writableHighWaterMark](writablestream.md#writablehighwatermark)
- [writableLength](writablestream.md#writablelength)
- [writableObjectMode](writablestream.md#writableobjectmode)

## Methods

### \_construct

▸ `Optional` **_construct**(`callback`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `callback` | (`error?`: ``null`` \| `Error`) => `void` |

#### Returns

`void`

#### Inherited from

Writable.\_construct

#### Defined in

node_modules/@types/node/stream.d.ts:154

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

Writable.\_destroy

#### Defined in

node_modules/@types/node/stream.d.ts:155

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

Writable.\_final

#### Defined in

node_modules/@types/node/stream.d.ts:156

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

Writable.\_write

#### Defined in

node_modules/@types/node/stream.d.ts:152

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

Writable.\_writev

#### Defined in

node_modules/@types/node/stream.d.ts:153

___

### addListener

▸ **addListener**(`event`, `listener`): [`WritableStream`](writablestream.md)<`Consumes`\>

Event emitter
The defined events on documents including:
1. close
2. drain
3. error
4. finish
5. pipe
6. unpipe

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"close"`` |
| `listener` | () => `void` |

#### Returns

[`WritableStream`](writablestream.md)<`Consumes`\>

#### Inherited from

Writable.addListener

#### Defined in

node_modules/@types/node/stream.d.ts:177

▸ **addListener**(`event`, `listener`): [`WritableStream`](writablestream.md)<`Consumes`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"drain"`` |
| `listener` | () => `void` |

#### Returns

[`WritableStream`](writablestream.md)<`Consumes`\>

#### Inherited from

Writable.addListener

#### Defined in

node_modules/@types/node/stream.d.ts:178

▸ **addListener**(`event`, `listener`): [`WritableStream`](writablestream.md)<`Consumes`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"error"`` |
| `listener` | (`err`: `Error`) => `void` |

#### Returns

[`WritableStream`](writablestream.md)<`Consumes`\>

#### Inherited from

Writable.addListener

#### Defined in

node_modules/@types/node/stream.d.ts:179

▸ **addListener**(`event`, `listener`): [`WritableStream`](writablestream.md)<`Consumes`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"finish"`` |
| `listener` | () => `void` |

#### Returns

[`WritableStream`](writablestream.md)<`Consumes`\>

#### Inherited from

Writable.addListener

#### Defined in

node_modules/@types/node/stream.d.ts:180

▸ **addListener**(`event`, `listener`): [`WritableStream`](writablestream.md)<`Consumes`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"pipe"`` |
| `listener` | (`src`: `Readable`) => `void` |

#### Returns

[`WritableStream`](writablestream.md)<`Consumes`\>

#### Inherited from

Writable.addListener

#### Defined in

node_modules/@types/node/stream.d.ts:181

▸ **addListener**(`event`, `listener`): [`WritableStream`](writablestream.md)<`Consumes`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"unpipe"`` |
| `listener` | (`src`: `Readable`) => `void` |

#### Returns

[`WritableStream`](writablestream.md)<`Consumes`\>

#### Inherited from

Writable.addListener

#### Defined in

node_modules/@types/node/stream.d.ts:182

▸ **addListener**(`event`, `listener`): [`WritableStream`](writablestream.md)<`Consumes`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`WritableStream`](writablestream.md)<`Consumes`\>

#### Inherited from

Writable.addListener

#### Defined in

node_modules/@types/node/stream.d.ts:183

___

### cork

▸ **cork**(): `void`

#### Returns

`void`

#### Inherited from

Writable.cork

#### Defined in

node_modules/@types/node/stream.d.ts:163

___

### destroy

▸ **destroy**(): `void`

#### Returns

`void`

#### Overrides

Writable.destroy

#### Defined in

[packages/types/src/utils.ts:57](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/utils.ts#L57)

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

Writable.emit

#### Defined in

node_modules/@types/node/stream.d.ts:185

▸ **emit**(`event`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"drain"`` |

#### Returns

`boolean`

#### Inherited from

Writable.emit

#### Defined in

node_modules/@types/node/stream.d.ts:186

▸ **emit**(`event`, `err`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"error"`` |
| `err` | `Error` |

#### Returns

`boolean`

#### Inherited from

Writable.emit

#### Defined in

node_modules/@types/node/stream.d.ts:187

▸ **emit**(`event`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"finish"`` |

#### Returns

`boolean`

#### Inherited from

Writable.emit

#### Defined in

node_modules/@types/node/stream.d.ts:188

▸ **emit**(`event`, `src`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"pipe"`` |
| `src` | `Readable` |

#### Returns

`boolean`

#### Inherited from

Writable.emit

#### Defined in

node_modules/@types/node/stream.d.ts:189

▸ **emit**(`event`, `src`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"unpipe"`` |
| `src` | `Readable` |

#### Returns

`boolean`

#### Inherited from

Writable.emit

#### Defined in

node_modules/@types/node/stream.d.ts:190

▸ **emit**(`event`, ...`args`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `...args` | `any`[] |

#### Returns

`boolean`

#### Inherited from

Writable.emit

#### Defined in

node_modules/@types/node/stream.d.ts:191

___

### end

▸ **end**(`cb?`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `cb?` | () => `void` |

#### Returns

`void`

#### Overrides

Writable.end

#### Defined in

[packages/types/src/utils.ts:60](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/utils.ts#L60)

▸ **end**(`data`, `cb?`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `data` | `Consumes` |
| `cb?` | () => `void` |

#### Returns

`void`

#### Overrides

Writable.end

#### Defined in

[packages/types/src/utils.ts:61](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/utils.ts#L61)

▸ **end**(`str`, `encoding`, `cb?`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `str` | `never` |
| `encoding` | `never` |
| `cb?` | () => `void` |

#### Returns

`void`

#### Overrides

Writable.end

#### Defined in

[packages/types/src/utils.ts:62](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/utils.ts#L62)

___

### eventNames

▸ **eventNames**(): (`string` \| `symbol`)[]

#### Returns

(`string` \| `symbol`)[]

#### Inherited from

Writable.eventNames

#### Defined in

node_modules/@types/node/events.d.ts:87

___

### getMaxListeners

▸ **getMaxListeners**(): `number`

#### Returns

`number`

#### Inherited from

Writable.getMaxListeners

#### Defined in

node_modules/@types/node/events.d.ts:79

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

Writable.listenerCount

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

Writable.listeners

#### Defined in

node_modules/@types/node/events.d.ts:80

___

### off

▸ **off**(`event`, `listener`): [`WritableStream`](writablestream.md)<`Consumes`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`WritableStream`](writablestream.md)<`Consumes`\>

#### Inherited from

Writable.off

#### Defined in

node_modules/@types/node/events.d.ts:76

___

### on

▸ **on**(`event`, `listener`): [`WritableStream`](writablestream.md)<`Consumes`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"close"`` |
| `listener` | () => `void` |

#### Returns

[`WritableStream`](writablestream.md)<`Consumes`\>

#### Inherited from

Writable.on

#### Defined in

node_modules/@types/node/stream.d.ts:193

▸ **on**(`event`, `listener`): [`WritableStream`](writablestream.md)<`Consumes`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"drain"`` |
| `listener` | () => `void` |

#### Returns

[`WritableStream`](writablestream.md)<`Consumes`\>

#### Inherited from

Writable.on

#### Defined in

node_modules/@types/node/stream.d.ts:194

▸ **on**(`event`, `listener`): [`WritableStream`](writablestream.md)<`Consumes`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"error"`` |
| `listener` | (`err`: `Error`) => `void` |

#### Returns

[`WritableStream`](writablestream.md)<`Consumes`\>

#### Inherited from

Writable.on

#### Defined in

node_modules/@types/node/stream.d.ts:195

▸ **on**(`event`, `listener`): [`WritableStream`](writablestream.md)<`Consumes`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"finish"`` |
| `listener` | () => `void` |

#### Returns

[`WritableStream`](writablestream.md)<`Consumes`\>

#### Inherited from

Writable.on

#### Defined in

node_modules/@types/node/stream.d.ts:196

▸ **on**(`event`, `listener`): [`WritableStream`](writablestream.md)<`Consumes`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"pipe"`` |
| `listener` | (`src`: `Readable`) => `void` |

#### Returns

[`WritableStream`](writablestream.md)<`Consumes`\>

#### Inherited from

Writable.on

#### Defined in

node_modules/@types/node/stream.d.ts:197

▸ **on**(`event`, `listener`): [`WritableStream`](writablestream.md)<`Consumes`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"unpipe"`` |
| `listener` | (`src`: `Readable`) => `void` |

#### Returns

[`WritableStream`](writablestream.md)<`Consumes`\>

#### Inherited from

Writable.on

#### Defined in

node_modules/@types/node/stream.d.ts:198

▸ **on**(`event`, `listener`): [`WritableStream`](writablestream.md)<`Consumes`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`WritableStream`](writablestream.md)<`Consumes`\>

#### Inherited from

Writable.on

#### Defined in

node_modules/@types/node/stream.d.ts:199

___

### once

▸ **once**(`event`, `listener`): [`WritableStream`](writablestream.md)<`Consumes`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"close"`` |
| `listener` | () => `void` |

#### Returns

[`WritableStream`](writablestream.md)<`Consumes`\>

#### Inherited from

Writable.once

#### Defined in

node_modules/@types/node/stream.d.ts:201

▸ **once**(`event`, `listener`): [`WritableStream`](writablestream.md)<`Consumes`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"drain"`` |
| `listener` | () => `void` |

#### Returns

[`WritableStream`](writablestream.md)<`Consumes`\>

#### Inherited from

Writable.once

#### Defined in

node_modules/@types/node/stream.d.ts:202

▸ **once**(`event`, `listener`): [`WritableStream`](writablestream.md)<`Consumes`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"error"`` |
| `listener` | (`err`: `Error`) => `void` |

#### Returns

[`WritableStream`](writablestream.md)<`Consumes`\>

#### Inherited from

Writable.once

#### Defined in

node_modules/@types/node/stream.d.ts:203

▸ **once**(`event`, `listener`): [`WritableStream`](writablestream.md)<`Consumes`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"finish"`` |
| `listener` | () => `void` |

#### Returns

[`WritableStream`](writablestream.md)<`Consumes`\>

#### Inherited from

Writable.once

#### Defined in

node_modules/@types/node/stream.d.ts:204

▸ **once**(`event`, `listener`): [`WritableStream`](writablestream.md)<`Consumes`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"pipe"`` |
| `listener` | (`src`: `Readable`) => `void` |

#### Returns

[`WritableStream`](writablestream.md)<`Consumes`\>

#### Inherited from

Writable.once

#### Defined in

node_modules/@types/node/stream.d.ts:205

▸ **once**(`event`, `listener`): [`WritableStream`](writablestream.md)<`Consumes`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"unpipe"`` |
| `listener` | (`src`: `Readable`) => `void` |

#### Returns

[`WritableStream`](writablestream.md)<`Consumes`\>

#### Inherited from

Writable.once

#### Defined in

node_modules/@types/node/stream.d.ts:206

▸ **once**(`event`, `listener`): [`WritableStream`](writablestream.md)<`Consumes`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`WritableStream`](writablestream.md)<`Consumes`\>

#### Inherited from

Writable.once

#### Defined in

node_modules/@types/node/stream.d.ts:207

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

Writable.pipe

#### Defined in

node_modules/@types/node/stream.d.ts:6

___

### prependListener

▸ **prependListener**(`event`, `listener`): [`WritableStream`](writablestream.md)<`Consumes`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"close"`` |
| `listener` | () => `void` |

#### Returns

[`WritableStream`](writablestream.md)<`Consumes`\>

#### Inherited from

Writable.prependListener

#### Defined in

node_modules/@types/node/stream.d.ts:209

▸ **prependListener**(`event`, `listener`): [`WritableStream`](writablestream.md)<`Consumes`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"drain"`` |
| `listener` | () => `void` |

#### Returns

[`WritableStream`](writablestream.md)<`Consumes`\>

#### Inherited from

Writable.prependListener

#### Defined in

node_modules/@types/node/stream.d.ts:210

▸ **prependListener**(`event`, `listener`): [`WritableStream`](writablestream.md)<`Consumes`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"error"`` |
| `listener` | (`err`: `Error`) => `void` |

#### Returns

[`WritableStream`](writablestream.md)<`Consumes`\>

#### Inherited from

Writable.prependListener

#### Defined in

node_modules/@types/node/stream.d.ts:211

▸ **prependListener**(`event`, `listener`): [`WritableStream`](writablestream.md)<`Consumes`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"finish"`` |
| `listener` | () => `void` |

#### Returns

[`WritableStream`](writablestream.md)<`Consumes`\>

#### Inherited from

Writable.prependListener

#### Defined in

node_modules/@types/node/stream.d.ts:212

▸ **prependListener**(`event`, `listener`): [`WritableStream`](writablestream.md)<`Consumes`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"pipe"`` |
| `listener` | (`src`: `Readable`) => `void` |

#### Returns

[`WritableStream`](writablestream.md)<`Consumes`\>

#### Inherited from

Writable.prependListener

#### Defined in

node_modules/@types/node/stream.d.ts:213

▸ **prependListener**(`event`, `listener`): [`WritableStream`](writablestream.md)<`Consumes`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"unpipe"`` |
| `listener` | (`src`: `Readable`) => `void` |

#### Returns

[`WritableStream`](writablestream.md)<`Consumes`\>

#### Inherited from

Writable.prependListener

#### Defined in

node_modules/@types/node/stream.d.ts:214

▸ **prependListener**(`event`, `listener`): [`WritableStream`](writablestream.md)<`Consumes`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`WritableStream`](writablestream.md)<`Consumes`\>

#### Inherited from

Writable.prependListener

#### Defined in

node_modules/@types/node/stream.d.ts:215

___

### prependOnceListener

▸ **prependOnceListener**(`event`, `listener`): [`WritableStream`](writablestream.md)<`Consumes`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"close"`` |
| `listener` | () => `void` |

#### Returns

[`WritableStream`](writablestream.md)<`Consumes`\>

#### Inherited from

Writable.prependOnceListener

#### Defined in

node_modules/@types/node/stream.d.ts:217

▸ **prependOnceListener**(`event`, `listener`): [`WritableStream`](writablestream.md)<`Consumes`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"drain"`` |
| `listener` | () => `void` |

#### Returns

[`WritableStream`](writablestream.md)<`Consumes`\>

#### Inherited from

Writable.prependOnceListener

#### Defined in

node_modules/@types/node/stream.d.ts:218

▸ **prependOnceListener**(`event`, `listener`): [`WritableStream`](writablestream.md)<`Consumes`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"error"`` |
| `listener` | (`err`: `Error`) => `void` |

#### Returns

[`WritableStream`](writablestream.md)<`Consumes`\>

#### Inherited from

Writable.prependOnceListener

#### Defined in

node_modules/@types/node/stream.d.ts:219

▸ **prependOnceListener**(`event`, `listener`): [`WritableStream`](writablestream.md)<`Consumes`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"finish"`` |
| `listener` | () => `void` |

#### Returns

[`WritableStream`](writablestream.md)<`Consumes`\>

#### Inherited from

Writable.prependOnceListener

#### Defined in

node_modules/@types/node/stream.d.ts:220

▸ **prependOnceListener**(`event`, `listener`): [`WritableStream`](writablestream.md)<`Consumes`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"pipe"`` |
| `listener` | (`src`: `Readable`) => `void` |

#### Returns

[`WritableStream`](writablestream.md)<`Consumes`\>

#### Inherited from

Writable.prependOnceListener

#### Defined in

node_modules/@types/node/stream.d.ts:221

▸ **prependOnceListener**(`event`, `listener`): [`WritableStream`](writablestream.md)<`Consumes`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"unpipe"`` |
| `listener` | (`src`: `Readable`) => `void` |

#### Returns

[`WritableStream`](writablestream.md)<`Consumes`\>

#### Inherited from

Writable.prependOnceListener

#### Defined in

node_modules/@types/node/stream.d.ts:222

▸ **prependOnceListener**(`event`, `listener`): [`WritableStream`](writablestream.md)<`Consumes`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`WritableStream`](writablestream.md)<`Consumes`\>

#### Inherited from

Writable.prependOnceListener

#### Defined in

node_modules/@types/node/stream.d.ts:223

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

Writable.rawListeners

#### Defined in

node_modules/@types/node/events.d.ts:81

___

### removeAllListeners

▸ **removeAllListeners**(`event?`): [`WritableStream`](writablestream.md)<`Consumes`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event?` | `string` \| `symbol` |

#### Returns

[`WritableStream`](writablestream.md)<`Consumes`\>

#### Inherited from

Writable.removeAllListeners

#### Defined in

node_modules/@types/node/events.d.ts:77

___

### removeListener

▸ **removeListener**(`event`, `listener`): [`WritableStream`](writablestream.md)<`Consumes`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"close"`` |
| `listener` | () => `void` |

#### Returns

[`WritableStream`](writablestream.md)<`Consumes`\>

#### Inherited from

Writable.removeListener

#### Defined in

node_modules/@types/node/stream.d.ts:225

▸ **removeListener**(`event`, `listener`): [`WritableStream`](writablestream.md)<`Consumes`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"drain"`` |
| `listener` | () => `void` |

#### Returns

[`WritableStream`](writablestream.md)<`Consumes`\>

#### Inherited from

Writable.removeListener

#### Defined in

node_modules/@types/node/stream.d.ts:226

▸ **removeListener**(`event`, `listener`): [`WritableStream`](writablestream.md)<`Consumes`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"error"`` |
| `listener` | (`err`: `Error`) => `void` |

#### Returns

[`WritableStream`](writablestream.md)<`Consumes`\>

#### Inherited from

Writable.removeListener

#### Defined in

node_modules/@types/node/stream.d.ts:227

▸ **removeListener**(`event`, `listener`): [`WritableStream`](writablestream.md)<`Consumes`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"finish"`` |
| `listener` | () => `void` |

#### Returns

[`WritableStream`](writablestream.md)<`Consumes`\>

#### Inherited from

Writable.removeListener

#### Defined in

node_modules/@types/node/stream.d.ts:228

▸ **removeListener**(`event`, `listener`): [`WritableStream`](writablestream.md)<`Consumes`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"pipe"`` |
| `listener` | (`src`: `Readable`) => `void` |

#### Returns

[`WritableStream`](writablestream.md)<`Consumes`\>

#### Inherited from

Writable.removeListener

#### Defined in

node_modules/@types/node/stream.d.ts:229

▸ **removeListener**(`event`, `listener`): [`WritableStream`](writablestream.md)<`Consumes`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"unpipe"`` |
| `listener` | (`src`: `Readable`) => `void` |

#### Returns

[`WritableStream`](writablestream.md)<`Consumes`\>

#### Inherited from

Writable.removeListener

#### Defined in

node_modules/@types/node/stream.d.ts:230

▸ **removeListener**(`event`, `listener`): [`WritableStream`](writablestream.md)<`Consumes`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`WritableStream`](writablestream.md)<`Consumes`\>

#### Inherited from

Writable.removeListener

#### Defined in

node_modules/@types/node/stream.d.ts:231

___

### setDefaultEncoding

▸ **setDefaultEncoding**(`encoding`): [`WritableStream`](writablestream.md)<`Consumes`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `encoding` | `BufferEncoding` |

#### Returns

[`WritableStream`](writablestream.md)<`Consumes`\>

#### Inherited from

Writable.setDefaultEncoding

#### Defined in

node_modules/@types/node/stream.d.ts:159

___

### setMaxListeners

▸ **setMaxListeners**(`n`): [`WritableStream`](writablestream.md)<`Consumes`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `n` | `number` |

#### Returns

[`WritableStream`](writablestream.md)<`Consumes`\>

#### Inherited from

Writable.setMaxListeners

#### Defined in

node_modules/@types/node/events.d.ts:78

___

### uncork

▸ **uncork**(): `void`

#### Returns

`void`

#### Inherited from

Writable.uncork

#### Defined in

node_modules/@types/node/stream.d.ts:164

___

### write

▸ **write**(`item`, `cb?`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `item` | `Consumes` |
| `cb?` | (`err?`: ``null`` \| `Error`) => `void` |

#### Returns

`boolean`

#### Overrides

Writable.write

#### Defined in

[packages/types/src/utils.ts:58](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/utils.ts#L58)

▸ **write**(`str`, `encoding`, `cb?`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `str` | `never` |
| `encoding` | `never` |
| `cb?` | (`err?`: ``null`` \| `Error`) => `void` |

#### Returns

`boolean`

#### Overrides

Writable.write

#### Defined in

[packages/types/src/utils.ts:59](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/utils.ts#L59)

## Properties

### destroyed

• **destroyed**: `boolean`

#### Inherited from

Writable.destroyed

#### Defined in

node_modules/@types/node/stream.d.ts:150

___

### objectMode

• `Optional` **objectMode**: ``true``

#### Defined in

[packages/types/src/utils.ts:55](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/utils.ts#L55)

___

### writable

• **writable**: `boolean`

#### Overrides

Writable.writable

#### Defined in

[packages/types/src/utils.ts:56](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/utils.ts#L56)

___

### writableCorked

• `Readonly` **writableCorked**: `number`

#### Inherited from

Writable.writableCorked

#### Defined in

node_modules/@types/node/stream.d.ts:149

___

### writableEnded

• `Readonly` **writableEnded**: `boolean`

#### Inherited from

Writable.writableEnded

#### Defined in

node_modules/@types/node/stream.d.ts:144

___

### writableFinished

• `Readonly` **writableFinished**: `boolean`

#### Inherited from

Writable.writableFinished

#### Defined in

node_modules/@types/node/stream.d.ts:145

___

### writableHighWaterMark

• `Readonly` **writableHighWaterMark**: `number`

#### Inherited from

Writable.writableHighWaterMark

#### Defined in

node_modules/@types/node/stream.d.ts:146

___

### writableLength

• `Readonly` **writableLength**: `number`

#### Inherited from

Writable.writableLength

#### Defined in

node_modules/@types/node/stream.d.ts:147

___

### writableObjectMode

• `Readonly` **writableObjectMode**: `boolean`

#### Inherited from

Writable.writableObjectMode

#### Defined in

node_modules/@types/node/stream.d.ts:148
