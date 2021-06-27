[@scramjet/types](../README.md) / ISequence

# Interface: ISequence

Sequence type describes the collection
of uncompressed developer's code files
and the configuration file attached to them
residing on certain volume.

The configuration file is required to run
Sequence Instance.

Question: this should probably moved to @scramjet/model, right?

## Table of contents

### Properties

- [config](isequence.md#config)
- [id](isequence.md#id)
- [instances](isequence.md#instances)

## Properties

### config

• **config**: [*RunnerConfig*](../README.md#runnerconfig)

Defined in: [packages/types/src/sequence-store.ts:18](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/types/src/sequence-store.ts#L18)

___

### id

• **id**: *string*

Defined in: [packages/types/src/sequence-store.ts:17](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/types/src/sequence-store.ts#L17)

___

### instances

• **instances**: *any*[]

Defined in: [packages/types/src/sequence-store.ts:19](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/types/src/sequence-store.ts#L19)
