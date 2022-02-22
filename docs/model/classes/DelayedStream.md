[@scramjet/model](../README.md) / [Exports](../modules.md) / DelayedStream

# Class: DelayedStream

## Table of contents

### Properties

- [\_stream](DelayedStream.md#_stream)

### Constructors

- [constructor](DelayedStream.md#constructor)

### Methods

- [getStream](DelayedStream.md#getstream)
- [run](DelayedStream.md#run)

## Properties

### \_stream

• `Private` `Optional` **\_stream**: `PassThrough`

#### Defined in

[packages/model/src/utils/delayed-stream.ts:4](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/utils/delayed-stream.ts#L4)

## Constructors

### constructor

• **new DelayedStream**()

## Methods

### getStream

▸ **getStream**(): `PassThrough`

#### Returns

`PassThrough`

#### Defined in

[packages/model/src/utils/delayed-stream.ts:6](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/utils/delayed-stream.ts#L6)

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

[packages/model/src/utils/delayed-stream.ts:15](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/model/src/utils/delayed-stream.ts#L15)
