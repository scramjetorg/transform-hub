[@scramjet/host](../README.md) / [sequence-store](../modules/sequence_store.md) / SequenceStore

# Class: SequenceStore

[sequence-store](../modules/sequence_store.md).SequenceStore

An utility class for manipulation of the
Sequences stored on the CSH.

Question: Patryk raised an issue that we should think of
saving the Sequence information in the file (for the future sprints)

or, we could just try to reconnect instances after host restart.

## Implements

- *ISequenceStore*

## Table of contents

### Constructors

- [constructor](sequence_store.sequencestore.md#constructor)

### Properties

- [dockerHelper](sequence_store.sequencestore.md#dockerhelper)
- [instancesStore](sequence_store.sequencestore.md#instancesstore)

### Methods

- [add](sequence_store.sequencestore.md#add)
- [close](sequence_store.sequencestore.md#close)
- [delete](sequence_store.sequencestore.md#delete)
- [getById](sequence_store.sequencestore.md#getbyid)
- [getSequences](sequence_store.sequencestore.md#getsequences)

## Constructors

### constructor

\+ **new SequenceStore**(): [*SequenceStore*](sequence_store.sequencestore.md)

**Returns:** [*SequenceStore*](sequence_store.sequencestore.md)

## Properties

### dockerHelper

• **dockerHelper**: *DockerodeDockerHelper*

Defined in: [packages/host/src/lib/sequence-store.ts:20](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/host/src/lib/sequence-store.ts#L20)

___

### instancesStore

• **instancesStore**: *object*

#### Type declaration

Defined in: [packages/host/src/lib/sequence-store.ts:22](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/host/src/lib/sequence-store.ts#L22)

## Methods

### add

▸ **add**(`sequence`: ISequence): *void*

#### Parameters

| Name | Type |
| :------ | :------ |
| `sequence` | ISequence |

**Returns:** *void*

Implementation of: ISequenceStore.add

Defined in: [packages/host/src/lib/sequence-store.ts:35](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/host/src/lib/sequence-store.ts#L35)

___

### close

▸ **close**(): *Promise*<{ `error?`: *string* ; `opStatus`: ReasonPhrases  }[]\>

**Returns:** *Promise*<{ `error?`: *string* ; `opStatus`: ReasonPhrases  }[]\>

Defined in: [packages/host/src/lib/sequence-store.ts:88](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/host/src/lib/sequence-store.ts#L88)

___

### delete

▸ **delete**(`id`: *string*): *Promise*<{ `error?`: *string* ; `opStatus`: ReasonPhrases  }\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | *string* |

**Returns:** *Promise*<{ `error?`: *string* ; `opStatus`: ReasonPhrases  }\>

Implementation of: ISequenceStore.delete

Defined in: [packages/host/src/lib/sequence-store.ts:43](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/host/src/lib/sequence-store.ts#L43)

___

### getById

▸ **getById**(`key`: *string*): ISequence

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | *string* |

**Returns:** ISequence

Implementation of: ISequenceStore.getById

Defined in: [packages/host/src/lib/sequence-store.ts:31](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/host/src/lib/sequence-store.ts#L31)

___

### getSequences

▸ **getSequences**(): ISequence[]

**Returns:** ISequence[]

Implementation of: ISequenceStore.getSequences

Defined in: [packages/host/src/lib/sequence-store.ts:27](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/host/src/lib/sequence-store.ts#L27)
