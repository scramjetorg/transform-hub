@scramjet/logger

# @scramjet/logger

## Table of contents

### Classes

- [Logger](classes/Logger.md)

### Type aliases

- [MessageFormatter](README.md#messageformatter)

### Functions

- [addLoggerOutput](README.md#addloggeroutput)
- [close](README.md#close)
- [getLogger](README.md#getlogger)
- [removeLoggerOutput](README.md#removeloggeroutput)

## Type aliases

### MessageFormatter

Ƭ **MessageFormatter**: <Z\>(`colors`: `boolean`, `ts`: `string`, `name`: `string`, `func`: `string`, `args`: `Z`) => `string`

#### Type declaration

▸ <`Z`\>(`colors`, `ts`, `name`, `func`, `args`): `string`

##### Type parameters

| Name | Type |
| :------ | :------ |
| `Z` | extends `any`[] |

##### Parameters

| Name | Type |
| :------ | :------ |
| `colors` | `boolean` |
| `ts` | `string` |
| `name` | `string` |
| `func` | `string` |
| `args` | `Z` |

##### Returns

`string`

#### Defined in

[index.ts:11](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/logger/src/index.ts#L11)

## Functions

### addLoggerOutput

▸ **addLoggerOutput**(`out`, `err?`): `void`

Pipes log streams to the provided outputs in serialized format

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `out` | `WritableStream`<`any`\> | `undefined` | stream for stdout logging |
| `err` | `WritableStream`<`any`\> | `out` | stream for stderr logging |

#### Returns

`void`

#### Defined in

[index.ts:199](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/logger/src/index.ts#L199)

___

### close

▸ `Const` **close**(): `void`

#### Returns

`void`

#### Defined in

[index.ts:187](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/logger/src/index.ts#L187)

___

### getLogger

▸ **getLogger**(`reference`, `options?`): [`Logger`](classes/Logger.md)

Creates a Console compatible logger with basic decorations

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `reference` | `any` | a reference object to get the name from |
| `options` | `LoggerOptions` | the logger options |

#### Returns

[`Logger`](classes/Logger.md)

a Console compatible logger

#### Defined in

[index.ts:224](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/logger/src/index.ts#L224)

___

### removeLoggerOutput

▸ **removeLoggerOutput**(`out`, `err?`, `end?`): `void`

Removes log outputs from the logger so that they will no longer receive logs

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `out` | `WritableStream`<`any`\> | `undefined` | stream for stdout logging |
| `err` | `WritableStream`<`any`\> | `out` | stream for stderr logging |
| `end` | `boolean` | `true` | if true, closes the stream after removing it |

#### Returns

`void`

#### Defined in

[index.ts:211](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/logger/src/index.ts#L211)
