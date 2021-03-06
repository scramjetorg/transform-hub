[@scramjet/types](../README.md) / [Exports](../modules.md) / ISequenceAdapter

# Interface: ISequenceAdapter

## Table of contents

### Methods

- [identify](ISequenceAdapter.md#identify)
- [init](ISequenceAdapter.md#init)
- [list](ISequenceAdapter.md#list)
- [remove](ISequenceAdapter.md#remove)

### Properties

- [logger](ISequenceAdapter.md#logger)
- [name](ISequenceAdapter.md#name)

## Methods

### identify

▸ **identify**(`stream`, `id`): `Promise`<[`SequenceConfig`](../modules.md#sequenceconfig)\>

Identifies new Sequence

#### Parameters

| Name | Type |
| :------ | :------ |
| `stream` | `Readable` |
| `id` | `string` |

#### Returns

`Promise`<[`SequenceConfig`](../modules.md#sequenceconfig)\>

#### Defined in

[packages/types/src/sequence-adapter.ts:28](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sequence-adapter.ts#L28)

___

### init

▸ **init**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/types/src/sequence-adapter.ts:18](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sequence-adapter.ts#L18)

___

### list

▸ **list**(): `Promise`<[`SequenceConfig`](../modules.md#sequenceconfig)[]\>

Identifies existing Sequences

#### Returns

`Promise`<[`SequenceConfig`](../modules.md#sequenceconfig)[]\>

#### Defined in

[packages/types/src/sequence-adapter.ts:23](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sequence-adapter.ts#L23)

___

### remove

▸ **remove**(`conifg`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `conifg` | [`SequenceConfig`](../modules.md#sequenceconfig) |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/types/src/sequence-adapter.ts:30](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sequence-adapter.ts#L30)

## Properties

### logger

• **logger**: [`IObjectLogger`](IObjectLogger.md)

#### Defined in

[packages/types/src/sequence-adapter.ts:32](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sequence-adapter.ts#L32)

___

### name

• **name**: `string`

Adapter name.

#### Defined in

[packages/types/src/sequence-adapter.ts:16](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sequence-adapter.ts#L16)
