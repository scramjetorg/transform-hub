[@scramjet/types](../README.md) / STHRestAPI

# Namespace: STHRestAPI

## Table of contents

### Type aliases

- [DeleteSequenceResponse](sthrestapi.md#deletesequenceresponse)
- [GetInstancesResponse](sthrestapi.md#getinstancesresponse)
- [GetSequenceInstancesResponse](sthrestapi.md#getsequenceinstancesresponse)
- [GetSequenceResponse](sthrestapi.md#getsequenceresponse)
- [GetSequencesResponse](sthrestapi.md#getsequencesresponse)
- [SendSequenceResponse](sthrestapi.md#sendsequenceresponse)
- [StartSequenceResponse](sthrestapi.md#startsequenceresponse)

## Type aliases

### DeleteSequenceResponse

Ƭ **DeleteSequenceResponse**: `OpResponse`<`Object`\>

#### Defined in

[packages/types/src/sth-rest-api/delete-sequence.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sth-rest-api/delete-sequence.ts#L3)

___

### GetInstancesResponse

Ƭ **GetInstancesResponse**: [`Instance`](../README.md#instance)[]

#### Defined in

[packages/types/src/sth-rest-api/get-instances.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sth-rest-api/get-instances.ts#L3)

___

### GetSequenceInstancesResponse

Ƭ **GetSequenceInstancesResponse**: readonly `string`[] \| `undefined`

#### Defined in

[packages/types/src/sth-rest-api/get-sequence-instances.ts:1](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sth-rest-api/get-sequence-instances.ts#L1)

___

### GetSequenceResponse

Ƭ **GetSequenceResponse**: { `config`: [`SequenceConfig`](../README.md#sequenceconfig) ; `id`: `string` ; `instances`: readonly `string`[]  } \| `undefined`

#### Defined in

[packages/types/src/sth-rest-api/get-sequence.ts:5](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sth-rest-api/get-sequence.ts#L5)

___

### GetSequencesResponse

Ƭ **GetSequencesResponse**: { `config`: [`SequenceConfig`](../README.md#sequenceconfig) ; `id`: `string` ; `instances`: readonly `string`[]  }[]

#### Defined in

[packages/types/src/sth-rest-api/get-sequences.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sth-rest-api/get-sequences.ts#L3)

___

### SendSequenceResponse

Ƭ **SendSequenceResponse**: { `id`: `string`  } \| { `error?`: `unknown` ; `opStatus`: `number`  }

#### Defined in

[packages/types/src/sth-rest-api/send-sequence.ts:2](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sth-rest-api/send-sequence.ts#L2)

___

### StartSequenceResponse

Ƭ **StartSequenceResponse**: `OpResponse`<`Object`\>

#### Defined in

[packages/types/src/sth-rest-api/start-sequence.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sth-rest-api/start-sequence.ts#L3)
