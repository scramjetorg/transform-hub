[@scramjet/host](../README.md) / CommonLogsPipe

# Class: CommonLogsPipe

## Table of contents

### Constructors

- [constructor](CommonLogsPipe.md#constructor)

### Methods

- [addInStream](CommonLogsPipe.md#addinstream)
- [getIn](CommonLogsPipe.md#getin)
- [getOut](CommonLogsPipe.md#getout)

## Constructors

### constructor

• **new CommonLogsPipe**(`bufferLength?`)

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `bufferLength` | `number` | `1e5` |

#### Defined in

[packages/host/src/lib/common-logs-pipe.ts:9](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/common-logs-pipe.ts#L9)

## Methods

### addInStream

▸ **addInStream**(`instanceId`, `stream`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `instanceId` | `string` |
| `stream` | `Readable` |

#### Returns

`void`

#### Defined in

[packages/host/src/lib/common-logs-pipe.ts:15](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/common-logs-pipe.ts#L15)

___

### getIn

▸ **getIn**(): `Writable`

#### Returns

`Writable`

#### Defined in

[packages/host/src/lib/common-logs-pipe.ts:23](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/common-logs-pipe.ts#L23)

___

### getOut

▸ **getOut**(): `Readable`

#### Returns

`Readable`

#### Defined in

[packages/host/src/lib/common-logs-pipe.ts:27](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/common-logs-pipe.ts#L27)
