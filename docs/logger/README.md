@scramjet/logger

# @scramjet/logger

## Table of contents

### Type aliases

- [MessageFormatter](README.md#messageformatter)

### Functions

- [addLoggerOutput](README.md#addloggeroutput)
- [close](README.md#close)
- [getLogger](README.md#getlogger)

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

[index.ts:12](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/logger/src/index.ts#L12)

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

[index.ts:163](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/logger/src/index.ts#L163)

___

### close

▸ `Const` **close**(): `void`

#### Returns

`void`

#### Defined in

[index.ts:153](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/logger/src/index.ts#L153)

___

### getLogger

▸ **getLogger**(`reference`, `options?`): `Logger`

Creates a Console compatible logger with basic decorations

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `reference` | `any` | a reference object to get the name from |
| `options` | `LoggerOptions` | the logger options |

#### Returns

`Logger`

a Console compatible logger

#### Defined in

[index.ts:176](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/logger/src/index.ts#L176)
