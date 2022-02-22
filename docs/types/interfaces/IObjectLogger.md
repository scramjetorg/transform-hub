[@scramjet/types](../README.md) / [Exports](../modules.md) / IObjectLogger

# Interface: IObjectLogger

## Table of contents

### Methods

- [addOutput](IObjectLogger.md#addoutput)
- [debug](IObjectLogger.md#debug)
- [error](IObjectLogger.md#error)
- [fatal](IObjectLogger.md#fatal)
- [info](IObjectLogger.md#info)
- [pipe](IObjectLogger.md#pipe)
- [trace](IObjectLogger.md#trace)
- [warn](IObjectLogger.md#warn)
- [write](IObjectLogger.md#write)

### Properties

- [inputLogStream](IObjectLogger.md#inputlogstream)
- [inputStringifiedLogStream](IObjectLogger.md#inputstringifiedlogstream)
- [output](IObjectLogger.md#output)
- [outputLogStream](IObjectLogger.md#outputlogstream)

## Methods

### addOutput

▸ **addOutput**(`output`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `output` | `Writable` |

#### Returns

`void`

#### Defined in

[packages/types/src/object-logger.ts:54](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/object-logger.ts#L54)

___

### debug

▸ **debug**(`entry`, ...`optionalParams`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `entry` | `string` \| `Partial`<{ `data`: `any`[] ; `error`: `string` ; `from`: `string` ; `id`: `string` ; `level`: [`LogLevel`](../modules.md#loglevel) ; `msg`: `string` ; `ts`: `number`  }\> |
| `...optionalParams` | `any`[] |

#### Returns

`void`

#### Defined in

[packages/types/src/object-logger.ts:57](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/object-logger.ts#L57)

___

### error

▸ **error**(`entry`, ...`optionalParams`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `entry` | `string` \| `Partial`<{ `data`: `any`[] ; `error`: `string` ; `from`: `string` ; `id`: `string` ; `level`: [`LogLevel`](../modules.md#loglevel) ; `msg`: `string` ; `ts`: `number`  }\> |
| `...optionalParams` | `any`[] |

#### Returns

`void`

#### Defined in

[packages/types/src/object-logger.ts:58](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/object-logger.ts#L58)

___

### fatal

▸ **fatal**(`entry`, ...`optionalParams`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `entry` | `string` \| `Partial`<{ `data`: `any`[] ; `error`: `string` ; `from`: `string` ; `id`: `string` ; `level`: [`LogLevel`](../modules.md#loglevel) ; `msg`: `string` ; `ts`: `number`  }\> |
| `...optionalParams` | `any`[] |

#### Returns

`void`

#### Defined in

[packages/types/src/object-logger.ts:59](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/object-logger.ts#L59)

___

### info

▸ **info**(`entry`, ...`optionalParams`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `entry` | `string` \| `Partial`<{ `data`: `any`[] ; `error`: `string` ; `from`: `string` ; `id`: `string` ; `level`: [`LogLevel`](../modules.md#loglevel) ; `msg`: `string` ; `ts`: `number`  }\> |
| `...optionalParams` | `any`[] |

#### Returns

`void`

#### Defined in

[packages/types/src/object-logger.ts:60](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/object-logger.ts#L60)

___

### pipe

▸ **pipe**(`target`, `options?`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `target` | `Writable` \| [`IObjectLogger`](IObjectLogger.md) |
| `options?` | `Object` |
| `options.stringified?` | `boolean` |

#### Returns

`void`

#### Defined in

[packages/types/src/object-logger.ts:63](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/object-logger.ts#L63)

___

### trace

▸ **trace**(`entry`, ...`optionalParams`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `entry` | `string` \| `Partial`<{ `data`: `any`[] ; `error`: `string` ; `from`: `string` ; `id`: `string` ; `level`: [`LogLevel`](../modules.md#loglevel) ; `msg`: `string` ; `ts`: `number`  }\> |
| `...optionalParams` | `any`[] |

#### Returns

`void`

#### Defined in

[packages/types/src/object-logger.ts:61](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/object-logger.ts#L61)

___

### warn

▸ **warn**(`entry`, ...`optionalParams`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `entry` | `string` \| `Partial`<{ `data`: `any`[] ; `error`: `string` ; `from`: `string` ; `id`: `string` ; `level`: [`LogLevel`](../modules.md#loglevel) ; `msg`: `string` ; `ts`: `number`  }\> |
| `...optionalParams` | `any`[] |

#### Returns

`void`

#### Defined in

[packages/types/src/object-logger.ts:62](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/object-logger.ts#L62)

___

### write

▸ **write**(`level`, `entry`, ...`optionalParams`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `level` | `undefined` \| [`LogLevel`](../modules.md#loglevel) |
| `entry` | `string` \| `Partial`<{ `data`: `any`[] ; `error`: `string` ; `from`: `string` ; `id`: `string` ; `level`: [`LogLevel`](../modules.md#loglevel) ; `msg`: `string` ; `ts`: `number`  }\> |
| `...optionalParams` | `any`[] |

#### Returns

`void`

#### Defined in

[packages/types/src/object-logger.ts:56](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/object-logger.ts#L56)

## Properties

### inputLogStream

• **inputLogStream**: `PassThrough`

#### Defined in

[packages/types/src/object-logger.ts:49](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/object-logger.ts#L49)

___

### inputStringifiedLogStream

• **inputStringifiedLogStream**: `PassThrough`

#### Defined in

[packages/types/src/object-logger.ts:50](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/object-logger.ts#L50)

___

### output

• **output**: `DataStream`

#### Defined in

[packages/types/src/object-logger.ts:52](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/object-logger.ts#L52)

___

### outputLogStream

• **outputLogStream**: `PassThrough`

#### Defined in

[packages/types/src/object-logger.ts:51](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/object-logger.ts#L51)
