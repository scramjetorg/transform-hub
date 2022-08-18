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

▸ **identify**(`stream`, `id`, `override?`): `Promise`<[`SequenceConfig`](../modules.md#sequenceconfig)\>

Identifies new Sequence

#### Parameters

| Name | Type |
| :------ | :------ |
| `stream` | `Readable` |
| `id` | `string` |
| `override?` | `boolean` |

#### Returns

`Promise`<[`SequenceConfig`](../modules.md#sequenceconfig)\>

#### Defined in

[packages/types/src/sequence-adapter.ts:29](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sequence-adapter.ts#L29)

___

### init

▸ **init**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/types/src/sequence-adapter.ts:19](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sequence-adapter.ts#L19)

___

### list

▸ **list**(): `Promise`<[`SequenceConfig`](../modules.md#sequenceconfig)[]\>

Identifies existing Sequences

#### Returns

`Promise`<[`SequenceConfig`](../modules.md#sequenceconfig)[]\>

#### Defined in

[packages/types/src/sequence-adapter.ts:24](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sequence-adapter.ts#L24)

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

[packages/types/src/sequence-adapter.ts:31](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sequence-adapter.ts#L31)

## Properties

### logger

• **logger**: [`IObjectLogger`](IObjectLogger.md)

#### Defined in

[packages/types/src/sequence-adapter.ts:33](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sequence-adapter.ts#L33)

___

### name

• **name**: `string`

Adapter name.

#### Defined in

[packages/types/src/sequence-adapter.ts:17](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sequence-adapter.ts#L17)
