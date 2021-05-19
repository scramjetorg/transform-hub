[@scramjet/host](../README.md) / [host](../modules/host.md) / SequenceStore

# Class: SequenceStore

[host](../modules/host.md).SequenceStore

An utility class for manipulation of the
Sequences stored on the CSH.

Question: Patryk raised an issue that we should think of
saving the Sequence information in the file (for the future sprints)

or, we could just try to reconnect instances after host restart.

## Hierarchy

* **SequenceStore**

## Table of contents

### Constructors

- [constructor](host.sequencestore.md#constructor)

### Properties

- [sequences](host.sequencestore.md#sequences)

### Methods

- [addSequence](host.sequencestore.md#addsequence)
- [deleteSequence](host.sequencestore.md#deletesequence)
- [getSequenceById](host.sequencestore.md#getsequencebyid)

## Constructors

### constructor

\+ **new SequenceStore**(): [*SequenceStore*](host.sequencestore.md)

**Returns:** [*SequenceStore*](host.sequencestore.md)

## Properties

### sequences

• **sequences**: { [key: string]: [*Sequence*](../modules/host.md#sequence);  }

Defined in: [src/lib/host.ts:40](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/host/src/lib/host.ts#L40)

## Methods

### addSequence

▸ **addSequence**(`sequence`: [*Sequence*](../modules/host.md#sequence)): *void*

#### Parameters:

Name | Type |
------ | ------ |
`sequence` | [*Sequence*](../modules/host.md#sequence) |

**Returns:** *void*

Defined in: [src/lib/host.ts:46](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/host/src/lib/host.ts#L46)

___

### deleteSequence

▸ **deleteSequence**(`id`: *string*): *void*

#### Parameters:

Name | Type |
------ | ------ |
`id` | *string* |

**Returns:** *void*

Defined in: [src/lib/host.ts:52](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/host/src/lib/host.ts#L52)

___

### getSequenceById

▸ **getSequenceById**(`key`: *string*): [*Sequence*](../modules/host.md#sequence)

#### Parameters:

Name | Type |
------ | ------ |
`key` | *string* |

**Returns:** [*Sequence*](../modules/host.md#sequence)

Defined in: [src/lib/host.ts:42](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/host/src/lib/host.ts#L42)
