@scramjet/utility

# @scramjet/utility

## Table of contents

### Classes

- [FreePortsFinder](classes/freeportsfinder.md)

### Functions

- [defer](README.md#defer)
- [isDefined](README.md#isdefined)
- [merge](README.md#merge)
- [promiseTimeout](README.md#promisetimeout)
- [readStreamedJSON](README.md#readstreamedjson)

## Functions

### defer

▸ `Const` **defer**(`timeout`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `timeout` | `number` |

#### Returns

`Promise`<`void`\>

#### Defined in

[defer.ts:1](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/defer.ts#L1)

___

### isDefined

▸ **isDefined**<`T`\>(`value`): value is T

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends `unknown` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `T` \| `undefined` \| ``null`` |

#### Returns

value is T

#### Defined in

[typeguards/is-defined.ts:1](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/typeguards/is-defined.ts#L1)

___

### merge

▸ `Const` **merge**<`T`\>(`objTo`, `objFrom?`): `void`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends `Record`<`string`, `unknown`\> |

#### Parameters

| Name | Type |
| :------ | :------ |
| `objTo` | `T` |
| `objFrom` | `DeepPartial`<`T`\> |

#### Returns

`void`

#### Defined in

[merge.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/merge.ts#L3)

___

### promiseTimeout

▸ `Const` **promiseTimeout**<`T`\>(`promise`, `timeout`): `Promise`<`T`\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends `unknown` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `promise` | `Promise`<`T`\> |
| `timeout` | `number` |

#### Returns

`Promise`<`T`\>

#### Defined in

[promise-timeout.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/promise-timeout.ts#L3)

___

### readStreamedJSON

▸ **readStreamedJSON**(`readable`): `Promise`<`unknown`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `readable` | `Readable` |

#### Returns

`Promise`<`unknown`\>

#### Defined in

[read-streamed-json.ts:4](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/read-streamed-json.ts#L4)
