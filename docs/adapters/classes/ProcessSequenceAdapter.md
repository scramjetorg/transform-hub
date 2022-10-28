[@scramjet/adapters](../README.md) / [Exports](../modules.md) / ProcessSequenceAdapter

# Class: ProcessSequenceAdapter

Adapter for preparing Sequence to be run in process.

## Implements

- `ISequenceAdapter`

## Table of contents

### Properties

- [config](ProcessSequenceAdapter.md#config)
- [logger](ProcessSequenceAdapter.md#logger)
- [name](ProcessSequenceAdapter.md#name)

### Constructors

- [constructor](ProcessSequenceAdapter.md#constructor)

### Methods

- [identify](ProcessSequenceAdapter.md#identify)
- [init](ProcessSequenceAdapter.md#init)
- [list](ProcessSequenceAdapter.md#list)
- [remove](ProcessSequenceAdapter.md#remove)

## Properties

### config

• `Private` **config**: `STHConfiguration`

#### Defined in

[process-sequence-adapter.ts:60](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/process-sequence-adapter.ts#L60)

___

### logger

• **logger**: `IObjectLogger`

#### Implementation of

ISequenceAdapter.logger

#### Defined in

[process-sequence-adapter.ts:56](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/process-sequence-adapter.ts#L56)

___

### name

• **name**: `string` = `"ProcessSequenceAdapter"`

#### Implementation of

ISequenceAdapter.name

#### Defined in

[process-sequence-adapter.ts:58](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/process-sequence-adapter.ts#L58)

## Constructors

### constructor

• **new ProcessSequenceAdapter**(`config`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | `STHConfiguration` |

#### Defined in

[process-sequence-adapter.ts:60](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/process-sequence-adapter.ts#L60)

## Methods

### identify

▸ **identify**(`stream`, `id`, `override?`): `Promise`<`SequenceConfig`\>

Unpacks and identifies sequence.

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `stream` | `Readable` | `undefined` | Stream with packed sequence. |
| `id` | `string` | `undefined` | Sequence Id. |
| `override` | `boolean` | `false` | Removes previous sequence |

#### Returns

`Promise`<`SequenceConfig`\>

Promise resolving to identified sequence configuration.

#### Implementation of

ISequenceAdapter.identify

#### Defined in

[process-sequence-adapter.ts:105](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/process-sequence-adapter.ts#L105)

___

### init

▸ **init**(): `Promise`<`void`\>

Initializes adapter.

#### Returns

`Promise`<`void`\>

Promise resolving after initialization.

#### Implementation of

ISequenceAdapter.init

#### Defined in

[process-sequence-adapter.ts:69](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/process-sequence-adapter.ts#L69)

___

### list

▸ **list**(): `Promise`<`SequenceConfig`[]\>

Finds existing sequences.

#### Returns

`Promise`<`SequenceConfig`[]\>

Promise resolving to array of identified sequences.

#### Implementation of

ISequenceAdapter.list

#### Defined in

[process-sequence-adapter.ts:83](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/process-sequence-adapter.ts#L83)

___

### remove

▸ **remove**(`config`): `Promise`<`void`\>

Removes directory used to store sequence.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `config` | `SequenceConfig` | Sequence configuration. |

#### Returns

`Promise`<`void`\>

Promise resolving after directory deletion.

#### Implementation of

ISequenceAdapter.remove

#### Defined in

[process-sequence-adapter.ts:152](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/process-sequence-adapter.ts#L152)
