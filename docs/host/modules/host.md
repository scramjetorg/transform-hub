[@scramjet/host](../README.md) / host

# Module: host

## Table of contents

### Classes

- [Host](../classes/host.host-1.md)
- [SequenceStore](../classes/host.sequencestore.md)

### Type aliases

- [Sequence](host.md#sequence)

## Type aliases

### Sequence

Ƭ **Sequence**: { `config`: RunnerConfig ; `id`: *string*  }

Sequence type describes the collection
of uncompressed developer's code files
and the configuration file attached to them
residing on certain volume.

The configuration file is required to run
Sequence Instance.

Question: this should probably moved to @scramjet/model, right?

#### Type declaration:

Name | Type |
------ | ------ |
`config` | RunnerConfig |
`id` | *string* |

Defined in: [src/lib/host.ts:24](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/host/src/lib/host.ts#L24)
