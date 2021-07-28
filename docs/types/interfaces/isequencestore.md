[@scramjet/types](../README.md) / ISequenceStore

# Interface: ISequenceStore

## Table of contents

### Methods

- [add](isequencestore.md#add)
- [delete](isequencestore.md#delete)
- [getById](isequencestore.md#getbyid)
- [getSequences](isequencestore.md#getsequences)

## Methods

### add

▸ **add**(`sequence`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `sequence` | [`ISequence`](isequence.md) |

#### Returns

`void`

#### Defined in

[packages/types/src/sequence-store.ts:25](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/types/src/sequence-store.ts#L25)

___

### delete

▸ **delete**(`id`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` |

#### Returns

`void`

#### Defined in

[packages/types/src/sequence-store.ts:26](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/types/src/sequence-store.ts#L26)

___

### getById

▸ **getById**(`id`): [`ISequence`](isequence.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` |

#### Returns

[`ISequence`](isequence.md)

#### Defined in

[packages/types/src/sequence-store.ts:24](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/types/src/sequence-store.ts#L24)

___

### getSequences

▸ **getSequences**(): [`ISequence`](isequence.md)[]

#### Returns

[`ISequence`](isequence.md)[]

#### Defined in

[packages/types/src/sequence-store.ts:23](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/types/src/sequence-store.ts#L23)
