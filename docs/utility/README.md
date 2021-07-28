@scramjet/utility

# @scramjet/utility

## Table of contents

### Functions

- [defer](README.md#defer)
- [merge](README.md#merge)
- [promiseTimeout](README.md#promisetimeout)

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

[defer.ts:1](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/utility/src/defer.ts#L1)

___

### merge

▸ `Const` **merge**<`T`\>(`objTo`, `objFrom`): `void`

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

[merge.ts:3](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/utility/src/merge.ts#L3)

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

[promise-timeout.ts:3](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/utility/src/promise-timeout.ts#L3)
