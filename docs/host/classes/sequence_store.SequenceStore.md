[@scramjet/host](../README.md) / [sequence-store](../modules/sequence_store.md) / SequenceStore

# Class: SequenceStore

[sequence-store](../modules/sequence_store.md).SequenceStore

An utility class for manipulation of the
Sequences stored on the CSH.

Question: Patryk raised an issue that we should think of
saving the Sequence information in the file (for the future sprints)

or, we could just try to reconnect instances after host restart.

## Implements

- `ISequenceStore`

## Table of contents

### Constructors

- [constructor](sequence_store.SequenceStore.md#constructor)

### Properties

- [dockerHelper](sequence_store.SequenceStore.md#dockerhelper)
- [instancesStore](sequence_store.SequenceStore.md#instancesstore)

### Methods

- [add](sequence_store.SequenceStore.md#add)
- [close](sequence_store.SequenceStore.md#close)
- [delete](sequence_store.SequenceStore.md#delete)
- [getById](sequence_store.SequenceStore.md#getbyid)
- [getSequences](sequence_store.SequenceStore.md#getsequences)

## Constructors

### constructor

• **new SequenceStore**()

## Properties

### dockerHelper

• **dockerHelper**: `DockerodeDockerHelper`

#### Defined in

[packages/host/src/lib/sequence-store.ts:20](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/host/src/lib/sequence-store.ts#L20)

___

### instancesStore

• **instancesStore**: `Object`

#### Index signature

▪ [key: `string`]: [`CSIController`](csi_controller.CSIController.md)

#### Defined in

[packages/host/src/lib/sequence-store.ts:22](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/host/src/lib/sequence-store.ts#L22)

## Methods

### add

▸ **add**(`sequence`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `sequence` | `ISequence` |

#### Returns

`void`

#### Implementation of

ISequenceStore.add

#### Defined in

[packages/host/src/lib/sequence-store.ts:35](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/host/src/lib/sequence-store.ts#L35)

___

### close

▸ **close**(): `Promise`<{ `error?`: `string` ; `id?`: `string` ; `opStatus`: `ReasonPhrases`  }[]\>

#### Returns

`Promise`<{ `error?`: `string` ; `id?`: `string` ; `opStatus`: `ReasonPhrases`  }[]\>

#### Defined in

[packages/host/src/lib/sequence-store.ts:89](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/host/src/lib/sequence-store.ts#L89)

___

### delete

▸ **delete**(`id`): `Promise`<`Object`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` |

#### Returns

`Promise`<`Object`\>

#### Implementation of

ISequenceStore.delete

#### Defined in

[packages/host/src/lib/sequence-store.ts:43](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/host/src/lib/sequence-store.ts#L43)

___

### getById

▸ **getById**(`key`): `ISequence`

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |

#### Returns

`ISequence`

#### Implementation of

ISequenceStore.getById

#### Defined in

[packages/host/src/lib/sequence-store.ts:31](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/host/src/lib/sequence-store.ts#L31)

___

### getSequences

▸ **getSequences**(): `ISequence`[]

#### Returns

`ISequence`[]

#### Implementation of

ISequenceStore.getSequences

#### Defined in

[packages/host/src/lib/sequence-store.ts:27](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/host/src/lib/sequence-store.ts#L27)
