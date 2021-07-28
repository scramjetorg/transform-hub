[@scramjet/model](../README.md) / DelayedStream

# Class: DelayedStream

## Table of contents

### Constructors

- [constructor](delayedstream.md#constructor)

### Properties

- [\_stream](delayedstream.md#_stream)

### Methods

- [getStream](delayedstream.md#getstream)
- [run](delayedstream.md#run)

## Constructors

### constructor

• **new DelayedStream**()

## Properties

### \_stream

• `Private` `Optional` **\_stream**: `PassThrough`

#### Defined in

[packages/model/src/utils/delayed-stream.ts:4](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/model/src/utils/delayed-stream.ts#L4)

## Methods

### getStream

▸ **getStream**(): `PassThrough`

#### Returns

`PassThrough`

#### Defined in

[packages/model/src/utils/delayed-stream.ts:6](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/model/src/utils/delayed-stream.ts#L6)

___

### run

▸ **run**(`inputStream`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `inputStream` | `Readable` \| `Writable` |

#### Returns

`void`

#### Defined in

[packages/model/src/utils/delayed-stream.ts:15](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/model/src/utils/delayed-stream.ts#L15)
