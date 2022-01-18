[@scramjet/types](../README.md) / [Exports](../modules.md) / STHRestAPI

# Namespace: STHRestAPI

## Table of contents

### Type aliases

- [DeleteSequenceResponse](sthrestapi.md#deletesequenceresponse)
- [GetInstancesResponse](sthrestapi.md#getinstancesresponse)
- [GetSequenceInstancesResponse](sthrestapi.md#getsequenceinstancesresponse)
- [GetSequenceResponse](sthrestapi.md#getsequenceresponse)
- [GetSequencesResponse](sthrestapi.md#getsequencesresponse)
- [OpResponse](sthrestapi.md#opresponse)
- [SendSequenceResponse](sthrestapi.md#sendsequenceresponse)
- [StartSequenceResponse](sthrestapi.md#startsequenceresponse)

## Type aliases

### DeleteSequenceResponse

Ƭ **DeleteSequenceResponse**: [`OpResponse`](sthrestapi.md#opresponse)<`Object`\>

#### Defined in

[packages/types/src/sth-rest-api/delete-sequence.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sth-rest-api/delete-sequence.ts#L3)

___

### GetInstancesResponse

Ƭ **GetInstancesResponse**: [`Instance`](../modules.md#instance)[]

#### Defined in

[packages/types/src/sth-rest-api/get-instances.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sth-rest-api/get-instances.ts#L3)

___

### GetSequenceInstancesResponse

Ƭ **GetSequenceInstancesResponse**: readonly `string`[] \| `undefined`

#### Defined in

[packages/types/src/sth-rest-api/get-sequence-instances.ts:1](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sth-rest-api/get-sequence-instances.ts#L1)

___

### GetSequenceResponse

Ƭ **GetSequenceResponse**: { `config`: [`SequenceConfig`](../modules.md#sequenceconfig) ; `id`: `string` ; `instances`: readonly `string`[]  } \| `undefined`

#### Defined in

[packages/types/src/sth-rest-api/get-sequence.ts:5](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sth-rest-api/get-sequence.ts#L5)

___

### GetSequencesResponse

Ƭ **GetSequencesResponse**: { `config`: [`SequenceConfig`](../modules.md#sequenceconfig) ; `id`: `string` ; `instances`: readonly `string`[]  }[]

#### Defined in

[packages/types/src/sth-rest-api/get-sequences.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sth-rest-api/get-sequences.ts#L3)

___

### OpResponse

Ƭ **OpResponse**<`PayloadType`\>: `PayloadType` & { `opStatus`: `ReasonPhrases.OK`  } \| { `error?`: `unknown` ; `opStatus`: `Exclude`<`ReasonPhrases`, `ReasonPhrases.OK`\>  }

#### Type parameters

| Name | Type |
| :------ | :------ |
| `PayloadType` | extends `Record`<`string`, `unknown`\> |

#### Defined in

[packages/types/src/sth-rest-api/common.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sth-rest-api/common.ts#L3)

___

### SendSequenceResponse

Ƭ **SendSequenceResponse**: { `id`: `string`  } \| { `error?`: `unknown` ; `opStatus`: `number`  }

#### Defined in

[packages/types/src/sth-rest-api/send-sequence.ts:2](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sth-rest-api/send-sequence.ts#L2)

___

### StartSequenceResponse

Ƭ **StartSequenceResponse**: [`OpResponse`](sthrestapi.md#opresponse)<`Object`\>

#### Defined in

[packages/types/src/sth-rest-api/start-sequence.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sth-rest-api/start-sequence.ts#L3)
