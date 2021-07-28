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

Ƭ **MessageFormatter**: <Z\>(`name`: `string`, `func`: `string`, `args`: `Z`) => `string`

#### Type declaration

▸ <`Z`\>(`name`, `func`, `args`): `string`

##### Type parameters

| Name | Type |
| :------ | :------ |
| `Z` | extends `any`[] |

##### Parameters

| Name | Type |
| :------ | :------ |
| `name` | `string` |
| `func` | `string` |
| `args` | `Z` |

##### Returns

`string`

#### Defined in

[index.ts:9](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/logger/src/index.ts#L9)

## Functions

### addLoggerOutput

▸ **addLoggerOutput**(`out`, `err?`): `void`

Pipes log streams to the provided outputs in serialized format

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `out` | `WritableStream`<`any`\> | stream for stdout logging |
| `err` | `WritableStream`<`any`\> | stream for stderr logging |

#### Returns

`void`

#### Defined in

[index.ts:138](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/logger/src/index.ts#L138)

___

### close

▸ `Const` **close**(): `void`

#### Returns

`void`

#### Defined in

[index.ts:128](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/logger/src/index.ts#L128)

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

[index.ts:151](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/logger/src/index.ts#L151)
