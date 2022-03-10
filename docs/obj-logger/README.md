@scramjet/obj-logger

# @scramjet/obj-logger

## Table of contents

### Classes

- [ObjLogger](classes/ObjLogger.md)

### Functions

- [prettyPrint](README.md#prettyprint)

## Functions

### prettyPrint

▸ **prettyPrint**(`opts`): (`obj`: `Partial`<{ `data`: `any`[] ; `error`: `string` ; `from`: `string` ; `id`: `string` ; `level`: `LogLevel` ; `msg`: `string` ; `ts`: `number`  }\>) => `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `opts` | `Object` |
| `opts.colors?` | `boolean` |

#### Returns

`fn`

▸ (`obj`): `string`

##### Parameters

| Name | Type |
| :------ | :------ |
| `obj` | `Partial`<{ `data`: `any`[] ; `error`: `string` ; `from`: `string` ; `id`: `string` ; `level`: `LogLevel` ; `msg`: `string` ; `ts`: `number`  }\> |

##### Returns

`string`

#### Defined in

[obj-logger/src/utils/pretty-print.ts:19](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/obj-logger/src/utils/pretty-print.ts#L19)
