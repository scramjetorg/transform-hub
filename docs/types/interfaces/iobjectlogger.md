[@scramjet/types](../README.md) / [Exports](../modules.md) / IObjectLogger

# Interface: IObjectLogger

## Table of contents

### Methods

- [addOutput](iobjectlogger.md#addoutput)
- [debug](iobjectlogger.md#debug)
- [error](iobjectlogger.md#error)
- [fatal](iobjectlogger.md#fatal)
- [info](iobjectlogger.md#info)
- [pipe](iobjectlogger.md#pipe)
- [trace](iobjectlogger.md#trace)
- [warn](iobjectlogger.md#warn)
- [write](iobjectlogger.md#write)

### Properties

- [inputLogStream](iobjectlogger.md#inputlogstream)
- [inputStringifiedLogStream](iobjectlogger.md#inputstringifiedlogstream)
- [output](iobjectlogger.md#output)
- [outputLogStream](iobjectlogger.md#outputlogstream)

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

[packages/types/src/object-logger.ts:26](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/object-logger.ts#L26)

___

### debug

▸ **debug**(`entry`, ...`optionalParams`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `entry` | `string` \| [`DeepPartial`](../modules.md#deeppartial)<`Object`\> |
| `...optionalParams` | `any`[] |

#### Returns

`void`

#### Defined in

[packages/types/src/object-logger.ts:29](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/object-logger.ts#L29)

___

### error

▸ **error**(`entry`, ...`optionalParams`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `entry` | `string` \| [`DeepPartial`](../modules.md#deeppartial)<`Object`\> |
| `...optionalParams` | `any`[] |

#### Returns

`void`

#### Defined in

[packages/types/src/object-logger.ts:30](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/object-logger.ts#L30)

___

### fatal

▸ **fatal**(`entry`, ...`optionalParams`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `entry` | `string` \| [`DeepPartial`](../modules.md#deeppartial)<`Object`\> |
| `...optionalParams` | `any`[] |

#### Returns

`void`

#### Defined in

[packages/types/src/object-logger.ts:31](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/object-logger.ts#L31)

___

### info

▸ **info**(`entry`, ...`optionalParams`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `entry` | `string` \| [`DeepPartial`](../modules.md#deeppartial)<`Object`\> |
| `...optionalParams` | `any`[] |

#### Returns

`void`

#### Defined in

[packages/types/src/object-logger.ts:32](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/object-logger.ts#L32)

___

### pipe

▸ **pipe**(`target`, `options?`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `target` | `Writable` \| [`IObjectLogger`](iobjectlogger.md) |
| `options?` | `Object` |
| `options.stringified?` | `boolean` |

#### Returns

`void`

#### Defined in

[packages/types/src/object-logger.ts:35](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/object-logger.ts#L35)

___

### trace

▸ **trace**(`entry`, ...`optionalParams`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `entry` | `string` \| [`DeepPartial`](../modules.md#deeppartial)<`Object`\> |
| `...optionalParams` | `any`[] |

#### Returns

`void`

#### Defined in

[packages/types/src/object-logger.ts:33](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/object-logger.ts#L33)

___

### warn

▸ **warn**(`entry`, ...`optionalParams`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `entry` | `string` \| [`DeepPartial`](../modules.md#deeppartial)<`Object`\> |
| `...optionalParams` | `any`[] |

#### Returns

`void`

#### Defined in

[packages/types/src/object-logger.ts:34](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/object-logger.ts#L34)

___

### write

▸ **write**(`level`, `entry`, ...`optionalParams`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `level` | `undefined` \| [`DeepPartial`](../modules.md#deeppartial)<[`LogLevel`](../modules.md#loglevel)\> |
| `entry` | `string` \| [`DeepPartial`](../modules.md#deeppartial)<`Object`\> |
| `...optionalParams` | `any`[] |

#### Returns

`void`

#### Defined in

[packages/types/src/object-logger.ts:28](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/object-logger.ts#L28)

## Properties

### inputLogStream

• **inputLogStream**: `PassThrough`

#### Defined in

[packages/types/src/object-logger.ts:21](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/object-logger.ts#L21)

___

### inputStringifiedLogStream

• **inputStringifiedLogStream**: `PassThrough`

#### Defined in

[packages/types/src/object-logger.ts:22](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/object-logger.ts#L22)

___

### output

• **output**: `DataStream`

#### Defined in

[packages/types/src/object-logger.ts:24](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/object-logger.ts#L24)

___

### outputLogStream

• **outputLogStream**: `PassThrough`

#### Defined in

[packages/types/src/object-logger.ts:23](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/object-logger.ts#L23)
