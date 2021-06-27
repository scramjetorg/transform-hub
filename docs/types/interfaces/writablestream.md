[@scramjet/types](../README.md) / WritableStream

# Interface: WritableStream<Consumes\>

Writable stream representation with generic chunks.

**`see`** https://nodejs.org/api/stream.html#stream_writable_streams Node.js Writable stream documentation

## Type parameters

| Name |
| :------ |
| `Consumes` |

## Hierarchy

- *Writable*

  ↳ **WritableStream**

## Table of contents

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

### Methods

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

## Properties

### destroyed

• **destroyed**: *boolean*

Inherited from: Writable.destroyed

Defined in: node_modules/@types/node/stream.d.ts:148

___

### objectMode

• `Optional` **objectMode**: ``true``

Defined in: [packages/types/src/utils.ts:55](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/types/src/utils.ts#L55)

___

### writable

• **writable**: *boolean*

Overrides: Writable.writable

Defined in: [packages/types/src/utils.ts:56](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/types/src/utils.ts#L56)

___

### writableCorked

• `Readonly` **writableCorked**: *number*

Inherited from: Writable.writableCorked

Defined in: node_modules/@types/node/stream.d.ts:147

___

### writableEnded

• `Readonly` **writableEnded**: *boolean*

Inherited from: Writable.writableEnded

Defined in: node_modules/@types/node/stream.d.ts:142

___

### writableFinished

• `Readonly` **writableFinished**: *boolean*

Inherited from: Writable.writableFinished

Defined in: node_modules/@types/node/stream.d.ts:143

___

### writableHighWaterMark

• `Readonly` **writableHighWaterMark**: *number*

Inherited from: Writable.writableHighWaterMark

Defined in: node_modules/@types/node/stream.d.ts:144

___

### writableLength

• `Readonly` **writableLength**: *number*

Inherited from: Writable.writableLength

Defined in: node_modules/@types/node/stream.d.ts:145

___

### writableObjectMode

• `Readonly` **writableObjectMode**: *boolean*

Inherited from: Writable.writableObjectMode

Defined in: node_modules/@types/node/stream.d.ts:146

## Methods

### \_destroy

▸ **_destroy**(`error`: ``null`` \| Error, `callback`: (`error?`: ``null`` \| Error) => *void*): *void*

#### Parameters

| Name | Type |
| :------ | :------ |
| `error` | ``null`` \| Error |
| `callback` | (`error?`: ``null`` \| Error) => *void* |

**Returns:** *void*

Inherited from: Writable.\_destroy

Defined in: node_modules/@types/node/stream.d.ts:152

___

### \_final

▸ **_final**(`callback`: (`error?`: ``null`` \| Error) => *void*): *void*

#### Parameters

| Name | Type |
| :------ | :------ |
| `callback` | (`error?`: ``null`` \| Error) => *void* |

**Returns:** *void*

Inherited from: Writable.\_final

Defined in: node_modules/@types/node/stream.d.ts:153

___

### \_write

▸ **_write**(`chunk`: *any*, `encoding`: BufferEncoding, `callback`: (`error?`: ``null`` \| Error) => *void*): *void*

#### Parameters

| Name | Type |
| :------ | :------ |
| `chunk` | *any* |
| `encoding` | BufferEncoding |
| `callback` | (`error?`: ``null`` \| Error) => *void* |

**Returns:** *void*

Inherited from: Writable.\_write

Defined in: node_modules/@types/node/stream.d.ts:150

___

### \_writev

▸ `Optional` **_writev**(`chunks`: { `chunk`: *any* ; `encoding`: BufferEncoding  }[], `callback`: (`error?`: ``null`` \| Error) => *void*): *void*

#### Parameters

| Name | Type |
| :------ | :------ |
| `chunks` | { `chunk`: *any* ; `encoding`: BufferEncoding  }[] |
| `callback` | (`error?`: ``null`` \| Error) => *void* |

**Returns:** *void*

Inherited from: Writable.\_writev

Defined in: node_modules/@types/node/stream.d.ts:151

___

### addListener

▸ **addListener**(`event`: ``"close"``, `listener`: () => *void*): [*WritableStream*](writablestream.md)<Consumes\>

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
| `listener` | () => *void* |

**Returns:** [*WritableStream*](writablestream.md)<Consumes\>

Inherited from: Writable.addListener

Defined in: node_modules/@types/node/stream.d.ts:174

▸ **addListener**(`event`: ``"drain"``, `listener`: () => *void*): [*WritableStream*](writablestream.md)<Consumes\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"drain"`` |
| `listener` | () => *void* |

**Returns:** [*WritableStream*](writablestream.md)<Consumes\>

Inherited from: Writable.addListener

Defined in: node_modules/@types/node/stream.d.ts:175

▸ **addListener**(`event`: ``"error"``, `listener`: (`err`: Error) => *void*): [*WritableStream*](writablestream.md)<Consumes\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"error"`` |
| `listener` | (`err`: Error) => *void* |

**Returns:** [*WritableStream*](writablestream.md)<Consumes\>

Inherited from: Writable.addListener

Defined in: node_modules/@types/node/stream.d.ts:176

▸ **addListener**(`event`: ``"finish"``, `listener`: () => *void*): [*WritableStream*](writablestream.md)<Consumes\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"finish"`` |
| `listener` | () => *void* |

**Returns:** [*WritableStream*](writablestream.md)<Consumes\>

Inherited from: Writable.addListener

Defined in: node_modules/@types/node/stream.d.ts:177

▸ **addListener**(`event`: ``"pipe"``, `listener`: (`src`: *Readable*) => *void*): [*WritableStream*](writablestream.md)<Consumes\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"pipe"`` |
| `listener` | (`src`: *Readable*) => *void* |

**Returns:** [*WritableStream*](writablestream.md)<Consumes\>

Inherited from: Writable.addListener

Defined in: node_modules/@types/node/stream.d.ts:178

▸ **addListener**(`event`: ``"unpipe"``, `listener`: (`src`: *Readable*) => *void*): [*WritableStream*](writablestream.md)<Consumes\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"unpipe"`` |
| `listener` | (`src`: *Readable*) => *void* |

**Returns:** [*WritableStream*](writablestream.md)<Consumes\>

Inherited from: Writable.addListener

Defined in: node_modules/@types/node/stream.d.ts:179

▸ **addListener**(`event`: *string* \| *symbol*, `listener`: (...`args`: *any*[]) => *void*): [*WritableStream*](writablestream.md)<Consumes\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | *string* \| *symbol* |
| `listener` | (...`args`: *any*[]) => *void* |

**Returns:** [*WritableStream*](writablestream.md)<Consumes\>

Inherited from: Writable.addListener

Defined in: node_modules/@types/node/stream.d.ts:180

___

### cork

▸ **cork**(): *void*

**Returns:** *void*

Inherited from: Writable.cork

Defined in: node_modules/@types/node/stream.d.ts:160

___

### destroy

▸ **destroy**(): *void*

**Returns:** *void*

Overrides: Writable.destroy

Defined in: [packages/types/src/utils.ts:57](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/types/src/utils.ts#L57)

___

### emit

▸ **emit**(`event`: ``"close"``): *boolean*

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"close"`` |

**Returns:** *boolean*

Inherited from: Writable.emit

Defined in: node_modules/@types/node/stream.d.ts:182

▸ **emit**(`event`: ``"drain"``): *boolean*

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"drain"`` |

**Returns:** *boolean*

Inherited from: Writable.emit

Defined in: node_modules/@types/node/stream.d.ts:183

▸ **emit**(`event`: ``"error"``, `err`: Error): *boolean*

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"error"`` |
| `err` | Error |

**Returns:** *boolean*

Inherited from: Writable.emit

Defined in: node_modules/@types/node/stream.d.ts:184

▸ **emit**(`event`: ``"finish"``): *boolean*

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"finish"`` |

**Returns:** *boolean*

Inherited from: Writable.emit

Defined in: node_modules/@types/node/stream.d.ts:185

▸ **emit**(`event`: ``"pipe"``, `src`: *Readable*): *boolean*

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"pipe"`` |
| `src` | *Readable* |

**Returns:** *boolean*

Inherited from: Writable.emit

Defined in: node_modules/@types/node/stream.d.ts:186

▸ **emit**(`event`: ``"unpipe"``, `src`: *Readable*): *boolean*

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"unpipe"`` |
| `src` | *Readable* |

**Returns:** *boolean*

Inherited from: Writable.emit

Defined in: node_modules/@types/node/stream.d.ts:187

▸ **emit**(`event`: *string* \| *symbol*, ...`args`: *any*[]): *boolean*

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | *string* \| *symbol* |
| `...args` | *any*[] |

**Returns:** *boolean*

Inherited from: Writable.emit

Defined in: node_modules/@types/node/stream.d.ts:188

___

### end

▸ **end**(`cb?`: () => *void*): *void*

#### Parameters

| Name | Type |
| :------ | :------ |
| `cb?` | () => *void* |

**Returns:** *void*

Overrides: Writable.end

Defined in: [packages/types/src/utils.ts:60](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/types/src/utils.ts#L60)

▸ **end**(`data`: Consumes, `cb?`: () => *void*): *void*

#### Parameters

| Name | Type |
| :------ | :------ |
| `data` | Consumes |
| `cb?` | () => *void* |

**Returns:** *void*

Overrides: Writable.end

Defined in: [packages/types/src/utils.ts:61](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/types/src/utils.ts#L61)

▸ **end**(`str`: *never*, `encoding`: *never*, `cb?`: () => *void*): *void*

#### Parameters

| Name | Type |
| :------ | :------ |
| `str` | *never* |
| `encoding` | *never* |
| `cb?` | () => *void* |

**Returns:** *void*

Overrides: Writable.end

Defined in: [packages/types/src/utils.ts:62](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/types/src/utils.ts#L62)

___

### eventNames

▸ **eventNames**(): (*string* \| *symbol*)[]

**Returns:** (*string* \| *symbol*)[]

Inherited from: Writable.eventNames

Defined in: node_modules/@types/node/events.d.ts:72

___

### getMaxListeners

▸ **getMaxListeners**(): *number*

**Returns:** *number*

Inherited from: Writable.getMaxListeners

Defined in: node_modules/@types/node/events.d.ts:64

___

### listenerCount

▸ **listenerCount**(`event`: *string* \| *symbol*): *number*

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | *string* \| *symbol* |

**Returns:** *number*

Inherited from: Writable.listenerCount

Defined in: node_modules/@types/node/events.d.ts:68

___

### listeners

▸ **listeners**(`event`: *string* \| *symbol*): Function[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | *string* \| *symbol* |

**Returns:** Function[]

Inherited from: Writable.listeners

Defined in: node_modules/@types/node/events.d.ts:65

___

### off

▸ **off**(`event`: *string* \| *symbol*, `listener`: (...`args`: *any*[]) => *void*): [*WritableStream*](writablestream.md)<Consumes\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | *string* \| *symbol* |
| `listener` | (...`args`: *any*[]) => *void* |

**Returns:** [*WritableStream*](writablestream.md)<Consumes\>

Inherited from: Writable.off

Defined in: node_modules/@types/node/events.d.ts:61

___

### on

▸ **on**(`event`: ``"close"``, `listener`: () => *void*): [*WritableStream*](writablestream.md)<Consumes\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"close"`` |
| `listener` | () => *void* |

**Returns:** [*WritableStream*](writablestream.md)<Consumes\>

Inherited from: Writable.on

Defined in: node_modules/@types/node/stream.d.ts:190

▸ **on**(`event`: ``"drain"``, `listener`: () => *void*): [*WritableStream*](writablestream.md)<Consumes\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"drain"`` |
| `listener` | () => *void* |

**Returns:** [*WritableStream*](writablestream.md)<Consumes\>

Inherited from: Writable.on

Defined in: node_modules/@types/node/stream.d.ts:191

▸ **on**(`event`: ``"error"``, `listener`: (`err`: Error) => *void*): [*WritableStream*](writablestream.md)<Consumes\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"error"`` |
| `listener` | (`err`: Error) => *void* |

**Returns:** [*WritableStream*](writablestream.md)<Consumes\>

Inherited from: Writable.on

Defined in: node_modules/@types/node/stream.d.ts:192

▸ **on**(`event`: ``"finish"``, `listener`: () => *void*): [*WritableStream*](writablestream.md)<Consumes\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"finish"`` |
| `listener` | () => *void* |

**Returns:** [*WritableStream*](writablestream.md)<Consumes\>

Inherited from: Writable.on

Defined in: node_modules/@types/node/stream.d.ts:193

▸ **on**(`event`: ``"pipe"``, `listener`: (`src`: *Readable*) => *void*): [*WritableStream*](writablestream.md)<Consumes\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"pipe"`` |
| `listener` | (`src`: *Readable*) => *void* |

**Returns:** [*WritableStream*](writablestream.md)<Consumes\>

Inherited from: Writable.on

Defined in: node_modules/@types/node/stream.d.ts:194

▸ **on**(`event`: ``"unpipe"``, `listener`: (`src`: *Readable*) => *void*): [*WritableStream*](writablestream.md)<Consumes\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"unpipe"`` |
| `listener` | (`src`: *Readable*) => *void* |

**Returns:** [*WritableStream*](writablestream.md)<Consumes\>

Inherited from: Writable.on

Defined in: node_modules/@types/node/stream.d.ts:195

▸ **on**(`event`: *string* \| *symbol*, `listener`: (...`args`: *any*[]) => *void*): [*WritableStream*](writablestream.md)<Consumes\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | *string* \| *symbol* |
| `listener` | (...`args`: *any*[]) => *void* |

**Returns:** [*WritableStream*](writablestream.md)<Consumes\>

Inherited from: Writable.on

Defined in: node_modules/@types/node/stream.d.ts:196

___

### once

▸ **once**(`event`: ``"close"``, `listener`: () => *void*): [*WritableStream*](writablestream.md)<Consumes\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"close"`` |
| `listener` | () => *void* |

**Returns:** [*WritableStream*](writablestream.md)<Consumes\>

Inherited from: Writable.once

Defined in: node_modules/@types/node/stream.d.ts:198

▸ **once**(`event`: ``"drain"``, `listener`: () => *void*): [*WritableStream*](writablestream.md)<Consumes\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"drain"`` |
| `listener` | () => *void* |

**Returns:** [*WritableStream*](writablestream.md)<Consumes\>

Inherited from: Writable.once

Defined in: node_modules/@types/node/stream.d.ts:199

▸ **once**(`event`: ``"error"``, `listener`: (`err`: Error) => *void*): [*WritableStream*](writablestream.md)<Consumes\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"error"`` |
| `listener` | (`err`: Error) => *void* |

**Returns:** [*WritableStream*](writablestream.md)<Consumes\>

Inherited from: Writable.once

Defined in: node_modules/@types/node/stream.d.ts:200

▸ **once**(`event`: ``"finish"``, `listener`: () => *void*): [*WritableStream*](writablestream.md)<Consumes\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"finish"`` |
| `listener` | () => *void* |

**Returns:** [*WritableStream*](writablestream.md)<Consumes\>

Inherited from: Writable.once

Defined in: node_modules/@types/node/stream.d.ts:201

▸ **once**(`event`: ``"pipe"``, `listener`: (`src`: *Readable*) => *void*): [*WritableStream*](writablestream.md)<Consumes\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"pipe"`` |
| `listener` | (`src`: *Readable*) => *void* |

**Returns:** [*WritableStream*](writablestream.md)<Consumes\>

Inherited from: Writable.once

Defined in: node_modules/@types/node/stream.d.ts:202

▸ **once**(`event`: ``"unpipe"``, `listener`: (`src`: *Readable*) => *void*): [*WritableStream*](writablestream.md)<Consumes\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"unpipe"`` |
| `listener` | (`src`: *Readable*) => *void* |

**Returns:** [*WritableStream*](writablestream.md)<Consumes\>

Inherited from: Writable.once

Defined in: node_modules/@types/node/stream.d.ts:203

▸ **once**(`event`: *string* \| *symbol*, `listener`: (...`args`: *any*[]) => *void*): [*WritableStream*](writablestream.md)<Consumes\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | *string* \| *symbol* |
| `listener` | (...`args`: *any*[]) => *void* |

**Returns:** [*WritableStream*](writablestream.md)<Consumes\>

Inherited from: Writable.once

Defined in: node_modules/@types/node/stream.d.ts:204

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

Inherited from: Writable.pipe

Defined in: node_modules/@types/node/stream.d.ts:5

___

### prependListener

▸ **prependListener**(`event`: ``"close"``, `listener`: () => *void*): [*WritableStream*](writablestream.md)<Consumes\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"close"`` |
| `listener` | () => *void* |

**Returns:** [*WritableStream*](writablestream.md)<Consumes\>

Inherited from: Writable.prependListener

Defined in: node_modules/@types/node/stream.d.ts:206

▸ **prependListener**(`event`: ``"drain"``, `listener`: () => *void*): [*WritableStream*](writablestream.md)<Consumes\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"drain"`` |
| `listener` | () => *void* |

**Returns:** [*WritableStream*](writablestream.md)<Consumes\>

Inherited from: Writable.prependListener

Defined in: node_modules/@types/node/stream.d.ts:207

▸ **prependListener**(`event`: ``"error"``, `listener`: (`err`: Error) => *void*): [*WritableStream*](writablestream.md)<Consumes\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"error"`` |
| `listener` | (`err`: Error) => *void* |

**Returns:** [*WritableStream*](writablestream.md)<Consumes\>

Inherited from: Writable.prependListener

Defined in: node_modules/@types/node/stream.d.ts:208

▸ **prependListener**(`event`: ``"finish"``, `listener`: () => *void*): [*WritableStream*](writablestream.md)<Consumes\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"finish"`` |
| `listener` | () => *void* |

**Returns:** [*WritableStream*](writablestream.md)<Consumes\>

Inherited from: Writable.prependListener

Defined in: node_modules/@types/node/stream.d.ts:209

▸ **prependListener**(`event`: ``"pipe"``, `listener`: (`src`: *Readable*) => *void*): [*WritableStream*](writablestream.md)<Consumes\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"pipe"`` |
| `listener` | (`src`: *Readable*) => *void* |

**Returns:** [*WritableStream*](writablestream.md)<Consumes\>

Inherited from: Writable.prependListener

Defined in: node_modules/@types/node/stream.d.ts:210

▸ **prependListener**(`event`: ``"unpipe"``, `listener`: (`src`: *Readable*) => *void*): [*WritableStream*](writablestream.md)<Consumes\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"unpipe"`` |
| `listener` | (`src`: *Readable*) => *void* |

**Returns:** [*WritableStream*](writablestream.md)<Consumes\>

Inherited from: Writable.prependListener

Defined in: node_modules/@types/node/stream.d.ts:211

▸ **prependListener**(`event`: *string* \| *symbol*, `listener`: (...`args`: *any*[]) => *void*): [*WritableStream*](writablestream.md)<Consumes\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | *string* \| *symbol* |
| `listener` | (...`args`: *any*[]) => *void* |

**Returns:** [*WritableStream*](writablestream.md)<Consumes\>

Inherited from: Writable.prependListener

Defined in: node_modules/@types/node/stream.d.ts:212

___

### prependOnceListener

▸ **prependOnceListener**(`event`: ``"close"``, `listener`: () => *void*): [*WritableStream*](writablestream.md)<Consumes\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"close"`` |
| `listener` | () => *void* |

**Returns:** [*WritableStream*](writablestream.md)<Consumes\>

Inherited from: Writable.prependOnceListener

Defined in: node_modules/@types/node/stream.d.ts:214

▸ **prependOnceListener**(`event`: ``"drain"``, `listener`: () => *void*): [*WritableStream*](writablestream.md)<Consumes\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"drain"`` |
| `listener` | () => *void* |

**Returns:** [*WritableStream*](writablestream.md)<Consumes\>

Inherited from: Writable.prependOnceListener

Defined in: node_modules/@types/node/stream.d.ts:215

▸ **prependOnceListener**(`event`: ``"error"``, `listener`: (`err`: Error) => *void*): [*WritableStream*](writablestream.md)<Consumes\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"error"`` |
| `listener` | (`err`: Error) => *void* |

**Returns:** [*WritableStream*](writablestream.md)<Consumes\>

Inherited from: Writable.prependOnceListener

Defined in: node_modules/@types/node/stream.d.ts:216

▸ **prependOnceListener**(`event`: ``"finish"``, `listener`: () => *void*): [*WritableStream*](writablestream.md)<Consumes\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"finish"`` |
| `listener` | () => *void* |

**Returns:** [*WritableStream*](writablestream.md)<Consumes\>

Inherited from: Writable.prependOnceListener

Defined in: node_modules/@types/node/stream.d.ts:217

▸ **prependOnceListener**(`event`: ``"pipe"``, `listener`: (`src`: *Readable*) => *void*): [*WritableStream*](writablestream.md)<Consumes\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"pipe"`` |
| `listener` | (`src`: *Readable*) => *void* |

**Returns:** [*WritableStream*](writablestream.md)<Consumes\>

Inherited from: Writable.prependOnceListener

Defined in: node_modules/@types/node/stream.d.ts:218

▸ **prependOnceListener**(`event`: ``"unpipe"``, `listener`: (`src`: *Readable*) => *void*): [*WritableStream*](writablestream.md)<Consumes\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"unpipe"`` |
| `listener` | (`src`: *Readable*) => *void* |

**Returns:** [*WritableStream*](writablestream.md)<Consumes\>

Inherited from: Writable.prependOnceListener

Defined in: node_modules/@types/node/stream.d.ts:219

▸ **prependOnceListener**(`event`: *string* \| *symbol*, `listener`: (...`args`: *any*[]) => *void*): [*WritableStream*](writablestream.md)<Consumes\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | *string* \| *symbol* |
| `listener` | (...`args`: *any*[]) => *void* |

**Returns:** [*WritableStream*](writablestream.md)<Consumes\>

Inherited from: Writable.prependOnceListener

Defined in: node_modules/@types/node/stream.d.ts:220

___

### rawListeners

▸ **rawListeners**(`event`: *string* \| *symbol*): Function[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | *string* \| *symbol* |

**Returns:** Function[]

Inherited from: Writable.rawListeners

Defined in: node_modules/@types/node/events.d.ts:66

___

### removeAllListeners

▸ **removeAllListeners**(`event?`: *string* \| *symbol*): [*WritableStream*](writablestream.md)<Consumes\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event?` | *string* \| *symbol* |

**Returns:** [*WritableStream*](writablestream.md)<Consumes\>

Inherited from: Writable.removeAllListeners

Defined in: node_modules/@types/node/events.d.ts:62

___

### removeListener

▸ **removeListener**(`event`: ``"close"``, `listener`: () => *void*): [*WritableStream*](writablestream.md)<Consumes\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"close"`` |
| `listener` | () => *void* |

**Returns:** [*WritableStream*](writablestream.md)<Consumes\>

Inherited from: Writable.removeListener

Defined in: node_modules/@types/node/stream.d.ts:222

▸ **removeListener**(`event`: ``"drain"``, `listener`: () => *void*): [*WritableStream*](writablestream.md)<Consumes\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"drain"`` |
| `listener` | () => *void* |

**Returns:** [*WritableStream*](writablestream.md)<Consumes\>

Inherited from: Writable.removeListener

Defined in: node_modules/@types/node/stream.d.ts:223

▸ **removeListener**(`event`: ``"error"``, `listener`: (`err`: Error) => *void*): [*WritableStream*](writablestream.md)<Consumes\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"error"`` |
| `listener` | (`err`: Error) => *void* |

**Returns:** [*WritableStream*](writablestream.md)<Consumes\>

Inherited from: Writable.removeListener

Defined in: node_modules/@types/node/stream.d.ts:224

▸ **removeListener**(`event`: ``"finish"``, `listener`: () => *void*): [*WritableStream*](writablestream.md)<Consumes\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"finish"`` |
| `listener` | () => *void* |

**Returns:** [*WritableStream*](writablestream.md)<Consumes\>

Inherited from: Writable.removeListener

Defined in: node_modules/@types/node/stream.d.ts:225

▸ **removeListener**(`event`: ``"pipe"``, `listener`: (`src`: *Readable*) => *void*): [*WritableStream*](writablestream.md)<Consumes\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"pipe"`` |
| `listener` | (`src`: *Readable*) => *void* |

**Returns:** [*WritableStream*](writablestream.md)<Consumes\>

Inherited from: Writable.removeListener

Defined in: node_modules/@types/node/stream.d.ts:226

▸ **removeListener**(`event`: ``"unpipe"``, `listener`: (`src`: *Readable*) => *void*): [*WritableStream*](writablestream.md)<Consumes\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | ``"unpipe"`` |
| `listener` | (`src`: *Readable*) => *void* |

**Returns:** [*WritableStream*](writablestream.md)<Consumes\>

Inherited from: Writable.removeListener

Defined in: node_modules/@types/node/stream.d.ts:227

▸ **removeListener**(`event`: *string* \| *symbol*, `listener`: (...`args`: *any*[]) => *void*): [*WritableStream*](writablestream.md)<Consumes\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | *string* \| *symbol* |
| `listener` | (...`args`: *any*[]) => *void* |

**Returns:** [*WritableStream*](writablestream.md)<Consumes\>

Inherited from: Writable.removeListener

Defined in: node_modules/@types/node/stream.d.ts:228

___

### setDefaultEncoding

▸ **setDefaultEncoding**(`encoding`: BufferEncoding): [*WritableStream*](writablestream.md)<Consumes\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `encoding` | BufferEncoding |

**Returns:** [*WritableStream*](writablestream.md)<Consumes\>

Inherited from: Writable.setDefaultEncoding

Defined in: node_modules/@types/node/stream.d.ts:156

___

### setMaxListeners

▸ **setMaxListeners**(`n`: *number*): [*WritableStream*](writablestream.md)<Consumes\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `n` | *number* |

**Returns:** [*WritableStream*](writablestream.md)<Consumes\>

Inherited from: Writable.setMaxListeners

Defined in: node_modules/@types/node/events.d.ts:63

___

### uncork

▸ **uncork**(): *void*

**Returns:** *void*

Inherited from: Writable.uncork

Defined in: node_modules/@types/node/stream.d.ts:161

___

### write

▸ **write**(`item`: Consumes, `cb?`: (`err?`: ``null`` \| Error) => *void*): *boolean*

#### Parameters

| Name | Type |
| :------ | :------ |
| `item` | Consumes |
| `cb?` | (`err?`: ``null`` \| Error) => *void* |

**Returns:** *boolean*

Overrides: Writable.write

Defined in: [packages/types/src/utils.ts:58](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/types/src/utils.ts#L58)

▸ **write**(`str`: *never*, `encoding`: *never*, `cb?`: (`err?`: ``null`` \| Error) => *void*): *boolean*

#### Parameters

| Name | Type |
| :------ | :------ |
| `str` | *never* |
| `encoding` | *never* |
| `cb?` | (`err?`: ``null`` \| Error) => *void* |

**Returns:** *boolean*

Overrides: Writable.write

Defined in: [packages/types/src/utils.ts:59](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/types/src/utils.ts#L59)
