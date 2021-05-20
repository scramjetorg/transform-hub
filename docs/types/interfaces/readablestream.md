[@scramjet/types](../README.md) / ReadableStream

# Interface: ReadableStream<Produces\>

A readable stream representation with generic chunks.

**`see`** https://nodejs.org/api/stream.html#stream_readable_streams Node.js Readable stream documentation

## Type parameters

Name |
------ |
`Produces` |

## Hierarchy

* *PipeableStream*<Produces\>

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

Defined in: packages/types/node_modules/@types/node/stream.d.ts:40

___

### readable

• **readable**: *boolean*

Defined in: packages/types/node_modules/@types/node/stream.d.ts:33

___

### readableEncoding

• `Readonly` **readableEncoding**: *null* \| *ascii* \| *utf8* \| *utf-8* \| *utf16le* \| *ucs2* \| *ucs-2* \| *base64* \| *latin1* \| *binary* \| *hex*

Defined in: packages/types/node_modules/@types/node/stream.d.ts:34

___

### readableEnded

• `Readonly` **readableEnded**: *boolean*

Defined in: packages/types/node_modules/@types/node/stream.d.ts:35

___

### readableFlowing

• `Readonly` **readableFlowing**: *null* \| *boolean*

Defined in: packages/types/node_modules/@types/node/stream.d.ts:36

___

### readableHighWaterMark

• `Readonly` **readableHighWaterMark**: *number*

Defined in: packages/types/node_modules/@types/node/stream.d.ts:37

___

### readableLength

• `Readonly` **readableLength**: *number*

Defined in: packages/types/node_modules/@types/node/stream.d.ts:38

___

### readableObjectMode

• `Readonly` **readableObjectMode**: *boolean*

Defined in: packages/types/node_modules/@types/node/stream.d.ts:39

## Methods

### [Symbol.asyncIterator]

▸ **[Symbol.asyncIterator]**(): *AsyncIterableIterator*<Produces\>

**Returns:** *AsyncIterableIterator*<Produces\>

Defined in: [packages/types/src/utils.ts:45](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/types/src/utils.ts#L45)

___

### \_destroy

▸ **_destroy**(`error`: *null* \| Error, `callback`: (`error?`: *null* \| Error) => *void*): *void*

#### Parameters:

Name | Type |
------ | ------ |
`error` | *null* \| Error |
`callback` | (`error?`: *null* \| Error) => *void* |

**Returns:** *void*

Defined in: packages/types/node_modules/@types/node/stream.d.ts:52

___

### \_read

▸ **_read**(`size`: *number*): *void*

#### Parameters:

Name | Type |
------ | ------ |
`size` | *number* |

**Returns:** *void*

Defined in: packages/types/node_modules/@types/node/stream.d.ts:42

___

### addListener

▸ **addListener**(`event`: *close*, `listener`: () => *void*): [*ReadableStream*](readablestream.md)<Produces\>

Event emitter
The defined events on documents including:
1. close
2. data
3. end
4. error
5. pause
6. readable
7. resume

#### Parameters:

Name | Type |
------ | ------ |
`event` | *close* |
`listener` | () => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Defined in: packages/types/node_modules/@types/node/stream.d.ts:66

▸ **addListener**(`event`: *data*, `listener`: (`chunk`: *any*) => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters:

Name | Type |
------ | ------ |
`event` | *data* |
`listener` | (`chunk`: *any*) => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Defined in: packages/types/node_modules/@types/node/stream.d.ts:67

▸ **addListener**(`event`: *end*, `listener`: () => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters:

Name | Type |
------ | ------ |
`event` | *end* |
`listener` | () => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Defined in: packages/types/node_modules/@types/node/stream.d.ts:68

▸ **addListener**(`event`: *error*, `listener`: (`err`: Error) => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters:

Name | Type |
------ | ------ |
`event` | *error* |
`listener` | (`err`: Error) => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Defined in: packages/types/node_modules/@types/node/stream.d.ts:69

▸ **addListener**(`event`: *pause*, `listener`: () => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters:

Name | Type |
------ | ------ |
`event` | *pause* |
`listener` | () => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Defined in: packages/types/node_modules/@types/node/stream.d.ts:70

▸ **addListener**(`event`: *readable*, `listener`: () => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters:

Name | Type |
------ | ------ |
`event` | *readable* |
`listener` | () => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Defined in: packages/types/node_modules/@types/node/stream.d.ts:71

▸ **addListener**(`event`: *resume*, `listener`: () => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters:

Name | Type |
------ | ------ |
`event` | *resume* |
`listener` | () => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Defined in: packages/types/node_modules/@types/node/stream.d.ts:72

▸ **addListener**(`event`: *string* \| *symbol*, `listener`: (...`args`: *any*[]) => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters:

Name | Type |
------ | ------ |
`event` | *string* \| *symbol* |
`listener` | (...`args`: *any*[]) => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Defined in: packages/types/node_modules/@types/node/stream.d.ts:73

___

### destroy

▸ **destroy**(): *void*

**Returns:** *void*

Defined in: [packages/types/src/utils.ts:46](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/types/src/utils.ts#L46)

___

### emit

▸ **emit**(`event`: *close*): *boolean*

#### Parameters:

Name | Type |
------ | ------ |
`event` | *close* |

**Returns:** *boolean*

Defined in: packages/types/node_modules/@types/node/stream.d.ts:75

▸ **emit**(`event`: *data*, `chunk`: *any*): *boolean*

#### Parameters:

Name | Type |
------ | ------ |
`event` | *data* |
`chunk` | *any* |

**Returns:** *boolean*

Defined in: packages/types/node_modules/@types/node/stream.d.ts:76

▸ **emit**(`event`: *end*): *boolean*

#### Parameters:

Name | Type |
------ | ------ |
`event` | *end* |

**Returns:** *boolean*

Defined in: packages/types/node_modules/@types/node/stream.d.ts:77

▸ **emit**(`event`: *error*, `err`: Error): *boolean*

#### Parameters:

Name | Type |
------ | ------ |
`event` | *error* |
`err` | Error |

**Returns:** *boolean*

Defined in: packages/types/node_modules/@types/node/stream.d.ts:78

▸ **emit**(`event`: *pause*): *boolean*

#### Parameters:

Name | Type |
------ | ------ |
`event` | *pause* |

**Returns:** *boolean*

Defined in: packages/types/node_modules/@types/node/stream.d.ts:79

▸ **emit**(`event`: *readable*): *boolean*

#### Parameters:

Name | Type |
------ | ------ |
`event` | *readable* |

**Returns:** *boolean*

Defined in: packages/types/node_modules/@types/node/stream.d.ts:80

▸ **emit**(`event`: *resume*): *boolean*

#### Parameters:

Name | Type |
------ | ------ |
`event` | *resume* |

**Returns:** *boolean*

Defined in: packages/types/node_modules/@types/node/stream.d.ts:81

▸ **emit**(`event`: *string* \| *symbol*, ...`args`: *any*[]): *boolean*

#### Parameters:

Name | Type |
------ | ------ |
`event` | *string* \| *symbol* |
`...args` | *any*[] |

**Returns:** *boolean*

Defined in: packages/types/node_modules/@types/node/stream.d.ts:82

___

### eventNames

▸ **eventNames**(): (*string* \| *symbol*)[]

**Returns:** (*string* \| *symbol*)[]

Defined in: packages/types/node_modules/@types/node/events.d.ts:77

___

### getMaxListeners

▸ **getMaxListeners**(): *number*

**Returns:** *number*

Defined in: packages/types/node_modules/@types/node/events.d.ts:69

___

### isPaused

▸ **isPaused**(): *boolean*

**Returns:** *boolean*

Defined in: packages/types/node_modules/@types/node/stream.d.ts:47

___

### listenerCount

▸ **listenerCount**(`event`: *string* \| *symbol*): *number*

#### Parameters:

Name | Type |
------ | ------ |
`event` | *string* \| *symbol* |

**Returns:** *number*

Defined in: packages/types/node_modules/@types/node/events.d.ts:73

___

### listeners

▸ **listeners**(`event`: *string* \| *symbol*): Function[]

#### Parameters:

Name | Type |
------ | ------ |
`event` | *string* \| *symbol* |

**Returns:** Function[]

Defined in: packages/types/node_modules/@types/node/events.d.ts:70

___

### off

▸ **off**(`event`: *string* \| *symbol*, `listener`: (...`args`: *any*[]) => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters:

Name | Type |
------ | ------ |
`event` | *string* \| *symbol* |
`listener` | (...`args`: *any*[]) => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Defined in: packages/types/node_modules/@types/node/events.d.ts:66

___

### on

▸ **on**(`event`: *close*, `listener`: () => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters:

Name | Type |
------ | ------ |
`event` | *close* |
`listener` | () => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Defined in: packages/types/node_modules/@types/node/stream.d.ts:84

▸ **on**(`event`: *data*, `listener`: (`chunk`: *any*) => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters:

Name | Type |
------ | ------ |
`event` | *data* |
`listener` | (`chunk`: *any*) => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Defined in: packages/types/node_modules/@types/node/stream.d.ts:85

▸ **on**(`event`: *end*, `listener`: () => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters:

Name | Type |
------ | ------ |
`event` | *end* |
`listener` | () => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Defined in: packages/types/node_modules/@types/node/stream.d.ts:86

▸ **on**(`event`: *error*, `listener`: (`err`: Error) => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters:

Name | Type |
------ | ------ |
`event` | *error* |
`listener` | (`err`: Error) => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Defined in: packages/types/node_modules/@types/node/stream.d.ts:87

▸ **on**(`event`: *pause*, `listener`: () => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters:

Name | Type |
------ | ------ |
`event` | *pause* |
`listener` | () => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Defined in: packages/types/node_modules/@types/node/stream.d.ts:88

▸ **on**(`event`: *readable*, `listener`: () => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters:

Name | Type |
------ | ------ |
`event` | *readable* |
`listener` | () => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Defined in: packages/types/node_modules/@types/node/stream.d.ts:89

▸ **on**(`event`: *resume*, `listener`: () => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters:

Name | Type |
------ | ------ |
`event` | *resume* |
`listener` | () => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Defined in: packages/types/node_modules/@types/node/stream.d.ts:90

▸ **on**(`event`: *string* \| *symbol*, `listener`: (...`args`: *any*[]) => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters:

Name | Type |
------ | ------ |
`event` | *string* \| *symbol* |
`listener` | (...`args`: *any*[]) => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Defined in: packages/types/node_modules/@types/node/stream.d.ts:91

___

### once

▸ **once**(`event`: *close*, `listener`: () => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters:

Name | Type |
------ | ------ |
`event` | *close* |
`listener` | () => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Defined in: packages/types/node_modules/@types/node/stream.d.ts:93

▸ **once**(`event`: *data*, `listener`: (`chunk`: *any*) => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters:

Name | Type |
------ | ------ |
`event` | *data* |
`listener` | (`chunk`: *any*) => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Defined in: packages/types/node_modules/@types/node/stream.d.ts:94

▸ **once**(`event`: *end*, `listener`: () => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters:

Name | Type |
------ | ------ |
`event` | *end* |
`listener` | () => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Defined in: packages/types/node_modules/@types/node/stream.d.ts:95

▸ **once**(`event`: *error*, `listener`: (`err`: Error) => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters:

Name | Type |
------ | ------ |
`event` | *error* |
`listener` | (`err`: Error) => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Defined in: packages/types/node_modules/@types/node/stream.d.ts:96

▸ **once**(`event`: *pause*, `listener`: () => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters:

Name | Type |
------ | ------ |
`event` | *pause* |
`listener` | () => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Defined in: packages/types/node_modules/@types/node/stream.d.ts:97

▸ **once**(`event`: *readable*, `listener`: () => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters:

Name | Type |
------ | ------ |
`event` | *readable* |
`listener` | () => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Defined in: packages/types/node_modules/@types/node/stream.d.ts:98

▸ **once**(`event`: *resume*, `listener`: () => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters:

Name | Type |
------ | ------ |
`event` | *resume* |
`listener` | () => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Defined in: packages/types/node_modules/@types/node/stream.d.ts:99

▸ **once**(`event`: *string* \| *symbol*, `listener`: (...`args`: *any*[]) => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters:

Name | Type |
------ | ------ |
`event` | *string* \| *symbol* |
`listener` | (...`args`: *any*[]) => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Defined in: packages/types/node_modules/@types/node/stream.d.ts:100

___

### pause

▸ **pause**(): [*ReadableStream*](readablestream.md)<Produces\>

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Defined in: packages/types/node_modules/@types/node/stream.d.ts:45

___

### pipe

▸ **pipe**<T\>(`destination`: T, `options?`: { `end?`: *undefined* \| *boolean*  }): T

#### Type parameters:

Name | Type |
------ | ------ |
`T` | *WritableStream*<T\> |

#### Parameters:

Name | Type |
------ | ------ |
`destination` | T |
`options?` | { `end?`: *undefined* \| *boolean*  } |

**Returns:** T

Defined in: [packages/types/src/utils.ts:33](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/types/src/utils.ts#L33)

▸ **pipe**<T\>(`destination`: T, `options?`: { `end?`: *undefined* \| *boolean*  }): T

#### Type parameters:

Name | Type |
------ | ------ |
`T` | [*WritableStream*](writablestream.md)<Produces, T\> |

#### Parameters:

Name | Type |
------ | ------ |
`destination` | T |
`options?` | { `end?`: *undefined* \| *boolean*  } |

**Returns:** T

Defined in: [packages/types/src/utils.ts:36](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/types/src/utils.ts#L36)

___

### prependListener

▸ **prependListener**(`event`: *close*, `listener`: () => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters:

Name | Type |
------ | ------ |
`event` | *close* |
`listener` | () => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Defined in: packages/types/node_modules/@types/node/stream.d.ts:102

▸ **prependListener**(`event`: *data*, `listener`: (`chunk`: *any*) => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters:

Name | Type |
------ | ------ |
`event` | *data* |
`listener` | (`chunk`: *any*) => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Defined in: packages/types/node_modules/@types/node/stream.d.ts:103

▸ **prependListener**(`event`: *end*, `listener`: () => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters:

Name | Type |
------ | ------ |
`event` | *end* |
`listener` | () => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Defined in: packages/types/node_modules/@types/node/stream.d.ts:104

▸ **prependListener**(`event`: *error*, `listener`: (`err`: Error) => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters:

Name | Type |
------ | ------ |
`event` | *error* |
`listener` | (`err`: Error) => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Defined in: packages/types/node_modules/@types/node/stream.d.ts:105

▸ **prependListener**(`event`: *pause*, `listener`: () => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters:

Name | Type |
------ | ------ |
`event` | *pause* |
`listener` | () => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Defined in: packages/types/node_modules/@types/node/stream.d.ts:106

▸ **prependListener**(`event`: *readable*, `listener`: () => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters:

Name | Type |
------ | ------ |
`event` | *readable* |
`listener` | () => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Defined in: packages/types/node_modules/@types/node/stream.d.ts:107

▸ **prependListener**(`event`: *resume*, `listener`: () => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters:

Name | Type |
------ | ------ |
`event` | *resume* |
`listener` | () => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Defined in: packages/types/node_modules/@types/node/stream.d.ts:108

▸ **prependListener**(`event`: *string* \| *symbol*, `listener`: (...`args`: *any*[]) => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters:

Name | Type |
------ | ------ |
`event` | *string* \| *symbol* |
`listener` | (...`args`: *any*[]) => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Defined in: packages/types/node_modules/@types/node/stream.d.ts:109

___

### prependOnceListener

▸ **prependOnceListener**(`event`: *close*, `listener`: () => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters:

Name | Type |
------ | ------ |
`event` | *close* |
`listener` | () => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Defined in: packages/types/node_modules/@types/node/stream.d.ts:111

▸ **prependOnceListener**(`event`: *data*, `listener`: (`chunk`: *any*) => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters:

Name | Type |
------ | ------ |
`event` | *data* |
`listener` | (`chunk`: *any*) => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Defined in: packages/types/node_modules/@types/node/stream.d.ts:112

▸ **prependOnceListener**(`event`: *end*, `listener`: () => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters:

Name | Type |
------ | ------ |
`event` | *end* |
`listener` | () => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Defined in: packages/types/node_modules/@types/node/stream.d.ts:113

▸ **prependOnceListener**(`event`: *error*, `listener`: (`err`: Error) => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters:

Name | Type |
------ | ------ |
`event` | *error* |
`listener` | (`err`: Error) => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Defined in: packages/types/node_modules/@types/node/stream.d.ts:114

▸ **prependOnceListener**(`event`: *pause*, `listener`: () => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters:

Name | Type |
------ | ------ |
`event` | *pause* |
`listener` | () => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Defined in: packages/types/node_modules/@types/node/stream.d.ts:115

▸ **prependOnceListener**(`event`: *readable*, `listener`: () => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters:

Name | Type |
------ | ------ |
`event` | *readable* |
`listener` | () => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Defined in: packages/types/node_modules/@types/node/stream.d.ts:116

▸ **prependOnceListener**(`event`: *resume*, `listener`: () => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters:

Name | Type |
------ | ------ |
`event` | *resume* |
`listener` | () => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Defined in: packages/types/node_modules/@types/node/stream.d.ts:117

▸ **prependOnceListener**(`event`: *string* \| *symbol*, `listener`: (...`args`: *any*[]) => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters:

Name | Type |
------ | ------ |
`event` | *string* \| *symbol* |
`listener` | (...`args`: *any*[]) => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Defined in: packages/types/node_modules/@types/node/stream.d.ts:118

___

### push

▸ **push**(`chunk`: *any*, `encoding?`: *ascii* \| *utf8* \| *utf-8* \| *utf16le* \| *ucs2* \| *ucs-2* \| *base64* \| *latin1* \| *binary* \| *hex*): *boolean*

#### Parameters:

Name | Type |
------ | ------ |
`chunk` | *any* |
`encoding?` | *ascii* \| *utf8* \| *utf-8* \| *utf16le* \| *ucs2* \| *ucs-2* \| *base64* \| *latin1* \| *binary* \| *hex* |

**Returns:** *boolean*

Defined in: packages/types/node_modules/@types/node/stream.d.ts:51

___

### rawListeners

▸ **rawListeners**(`event`: *string* \| *symbol*): Function[]

#### Parameters:

Name | Type |
------ | ------ |
`event` | *string* \| *symbol* |

**Returns:** Function[]

Defined in: packages/types/node_modules/@types/node/events.d.ts:71

___

### read

▸ **read**(`count?`: *number*): *null* \| Produces[]

#### Parameters:

Name | Type |
------ | ------ |
`count?` | *number* |

**Returns:** *null* \| Produces[]

Defined in: [packages/types/src/utils.ts:32](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/types/src/utils.ts#L32)

___

### removeAllListeners

▸ **removeAllListeners**(`event?`: *string* \| *symbol*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters:

Name | Type |
------ | ------ |
`event?` | *string* \| *symbol* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Defined in: packages/types/node_modules/@types/node/events.d.ts:67

___

### removeListener

▸ **removeListener**(`event`: *close*, `listener`: () => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters:

Name | Type |
------ | ------ |
`event` | *close* |
`listener` | () => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Defined in: packages/types/node_modules/@types/node/stream.d.ts:120

▸ **removeListener**(`event`: *data*, `listener`: (`chunk`: *any*) => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters:

Name | Type |
------ | ------ |
`event` | *data* |
`listener` | (`chunk`: *any*) => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Defined in: packages/types/node_modules/@types/node/stream.d.ts:121

▸ **removeListener**(`event`: *end*, `listener`: () => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters:

Name | Type |
------ | ------ |
`event` | *end* |
`listener` | () => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Defined in: packages/types/node_modules/@types/node/stream.d.ts:122

▸ **removeListener**(`event`: *error*, `listener`: (`err`: Error) => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters:

Name | Type |
------ | ------ |
`event` | *error* |
`listener` | (`err`: Error) => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Defined in: packages/types/node_modules/@types/node/stream.d.ts:123

▸ **removeListener**(`event`: *pause*, `listener`: () => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters:

Name | Type |
------ | ------ |
`event` | *pause* |
`listener` | () => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Defined in: packages/types/node_modules/@types/node/stream.d.ts:124

▸ **removeListener**(`event`: *readable*, `listener`: () => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters:

Name | Type |
------ | ------ |
`event` | *readable* |
`listener` | () => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Defined in: packages/types/node_modules/@types/node/stream.d.ts:125

▸ **removeListener**(`event`: *resume*, `listener`: () => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters:

Name | Type |
------ | ------ |
`event` | *resume* |
`listener` | () => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Defined in: packages/types/node_modules/@types/node/stream.d.ts:126

▸ **removeListener**(`event`: *string* \| *symbol*, `listener`: (...`args`: *any*[]) => *void*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters:

Name | Type |
------ | ------ |
`event` | *string* \| *symbol* |
`listener` | (...`args`: *any*[]) => *void* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Defined in: packages/types/node_modules/@types/node/stream.d.ts:127

___

### resume

▸ **resume**(): [*ReadableStream*](readablestream.md)<Produces\>

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Defined in: packages/types/node_modules/@types/node/stream.d.ts:46

___

### setEncoding

▸ **setEncoding**(`encoding`: BufferEncoding): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters:

Name | Type |
------ | ------ |
`encoding` | BufferEncoding |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Defined in: packages/types/node_modules/@types/node/stream.d.ts:44

___

### setMaxListeners

▸ **setMaxListeners**(`n`: *number*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters:

Name | Type |
------ | ------ |
`n` | *number* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Defined in: packages/types/node_modules/@types/node/events.d.ts:68

___

### unpipe

▸ **unpipe**(`destination?`: *WritableStream*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters:

Name | Type |
------ | ------ |
`destination?` | *WritableStream* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Defined in: packages/types/node_modules/@types/node/stream.d.ts:48

___

### unshift

▸ **unshift**(`chunk`: *any*, `encoding?`: *ascii* \| *utf8* \| *utf-8* \| *utf16le* \| *ucs2* \| *ucs-2* \| *base64* \| *latin1* \| *binary* \| *hex*): *void*

#### Parameters:

Name | Type |
------ | ------ |
`chunk` | *any* |
`encoding?` | *ascii* \| *utf8* \| *utf-8* \| *utf16le* \| *ucs2* \| *ucs-2* \| *base64* \| *latin1* \| *binary* \| *hex* |

**Returns:** *void*

Defined in: packages/types/node_modules/@types/node/stream.d.ts:49

___

### wrap

▸ **wrap**(`oldStream`: *ReadableStream*): [*ReadableStream*](readablestream.md)<Produces\>

#### Parameters:

Name | Type |
------ | ------ |
`oldStream` | *ReadableStream* |

**Returns:** [*ReadableStream*](readablestream.md)<Produces\>

Defined in: packages/types/node_modules/@types/node/stream.d.ts:50
