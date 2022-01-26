[@scramjet/types](../README.md) / [Exports](../modules.md) / ISequenceAdapter

# Interface: ISequenceAdapter

## Table of contents

### Methods

- [identify](isequenceadapter.md#identify)
- [init](isequenceadapter.md#init)
- [list](isequenceadapter.md#list)
- [remove](isequenceadapter.md#remove)

### Properties

- [logger](isequenceadapter.md#logger)
- [name](isequenceadapter.md#name)

## Methods

### identify

▸ **identify**(`stream`, `id`): `Promise`<[`SequenceConfig`](../modules.md#sequenceconfig)\>

Identifies new sequence

#### Parameters

| Name | Type |
| :------ | :------ |
| `stream` | `Readable` |
| `id` | `string` |

#### Returns

`Promise`<[`SequenceConfig`](../modules.md#sequenceconfig)\>

#### Defined in

[packages/types/src/sequence-adapter.ts:27](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sequence-adapter.ts#L27)

___

### init

▸ **init**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/types/src/sequence-adapter.ts:17](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sequence-adapter.ts#L17)

___

### list

▸ **list**(): `Promise`<[`SequenceConfig`](../modules.md#sequenceconfig)[]\>

Identifies existing sequences

#### Returns

`Promise`<[`SequenceConfig`](../modules.md#sequenceconfig)[]\>

#### Defined in

[packages/types/src/sequence-adapter.ts:22](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sequence-adapter.ts#L22)

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

[packages/types/src/sequence-adapter.ts:29](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sequence-adapter.ts#L29)

## Properties

### logger

• **logger**: [`IObjectLogger`](iobjectlogger.md)

#### Defined in

[packages/types/src/sequence-adapter.ts:31](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sequence-adapter.ts#L31)

___

### name

• **name**: `string`

Adapter name.

#### Defined in

[packages/types/src/sequence-adapter.ts:15](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sequence-adapter.ts#L15)
