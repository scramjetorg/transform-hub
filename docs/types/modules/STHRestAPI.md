[@scramjet/types](../README.md) / [Exports](../modules.md) / STHRestAPI

# Namespace: STHRestAPI

## Table of contents

### Type aliases

- [ControlMessageResponse](STHRestAPI.md#controlmessageresponse)
- [DeleteSequenceResponse](STHRestAPI.md#deletesequenceresponse)
- [GetEventResponse](STHRestAPI.md#geteventresponse)
- [GetHealthResponse](STHRestAPI.md#gethealthresponse)
- [GetInstanceResponse](STHRestAPI.md#getinstanceresponse)
- [GetInstancesResponse](STHRestAPI.md#getinstancesresponse)
- [GetLoadCheckResponse](STHRestAPI.md#getloadcheckresponse)
- [GetNextEventResponse](STHRestAPI.md#getnexteventresponse)
- [GetSequenceInstancesResponse](STHRestAPI.md#getsequenceinstancesresponse)
- [GetSequenceResponse](STHRestAPI.md#getsequenceresponse)
- [GetSequencesResponse](STHRestAPI.md#getsequencesresponse)
- [GetVersionResponse](STHRestAPI.md#getversionresponse)
- [OpResponse](STHRestAPI.md#opresponse)
- [SendEventResponse](STHRestAPI.md#sendeventresponse)
- [SendKillInstanceResponse](STHRestAPI.md#sendkillinstanceresponse)
- [SendSequenceResponse](STHRestAPI.md#sendsequenceresponse)
- [SendStopInstanceResponse](STHRestAPI.md#sendstopinstanceresponse)
- [StartSequenceResponse](STHRestAPI.md#startsequenceresponse)

## Type aliases

### ControlMessageResponse

Ƭ **ControlMessageResponse**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `accepted` | `ReasonPhrases.OK` \| `ReasonPhrases.ACCEPTED` |

#### Defined in

[packages/types/src/sth-rest-api/common.ts:7](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sth-rest-api/common.ts#L7)

___

### DeleteSequenceResponse

Ƭ **DeleteSequenceResponse**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `id` | `string` |

#### Defined in

[packages/types/src/sth-rest-api/send-delete-sequence.ts:1](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sth-rest-api/send-delete-sequence.ts#L1)

___

### GetEventResponse

Ƭ **GetEventResponse**: `any`

#### Defined in

[packages/types/src/sth-rest-api/index.ts:18](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sth-rest-api/index.ts#L18)

___

### GetHealthResponse

Ƭ **GetHealthResponse**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `containerId?` | `string` |
| `cpuTotalUsage?` | `number` |
| `healthy` | `boolean` |
| `limit?` | `number` |
| `memoryMaxUsage?` | `number` |
| `memoryUsage?` | `number` |
| `networkRx?` | `number` |
| `networkTx?` | `number` |
| `processId?` | `number` |

#### Defined in

[packages/types/src/sth-rest-api/get-health.ts:1](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sth-rest-api/get-health.ts#L1)

___

### GetInstanceResponse

Ƭ **GetInstanceResponse**: [`Instance`](../modules.md#instance)

#### Defined in

[packages/types/src/sth-rest-api/get-instance.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sth-rest-api/get-instance.ts#L3)

___

### GetInstancesResponse

Ƭ **GetInstancesResponse**: [`Instance`](../modules.md#instance)[]

#### Defined in

[packages/types/src/sth-rest-api/get-instances.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sth-rest-api/get-instances.ts#L3)

___

### GetLoadCheckResponse

Ƭ **GetLoadCheckResponse**: [`LoadCheckStat`](../modules.md#loadcheckstat)

#### Defined in

[packages/types/src/sth-rest-api/get-load-check.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sth-rest-api/get-load-check.ts#L3)

___

### GetNextEventResponse

Ƭ **GetNextEventResponse**: `any`

#### Defined in

[packages/types/src/sth-rest-api/index.ts:19](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sth-rest-api/index.ts#L19)

___

### GetSequenceInstancesResponse

Ƭ **GetSequenceInstancesResponse**: readonly `string`[] \| `undefined`

#### Defined in

[packages/types/src/sth-rest-api/get-sequence-instances.ts:1](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sth-rest-api/get-sequence-instances.ts#L1)

___

### GetSequenceResponse

Ƭ **GetSequenceResponse**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `config` | [`SequenceConfig`](../modules.md#sequenceconfig) |
| `id` | `string` |
| `instances` | `string`[] |

#### Defined in

[packages/types/src/sth-rest-api/get-sequence.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sth-rest-api/get-sequence.ts#L3)

___

### GetSequencesResponse

Ƭ **GetSequencesResponse**: { `config`: [`SequenceConfig`](../modules.md#sequenceconfig) ; `id`: `string` ; `instances`: readonly `string`[]  }[]

#### Defined in

[packages/types/src/sth-rest-api/get-sequences.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sth-rest-api/get-sequences.ts#L3)

___

### GetVersionResponse

Ƭ **GetVersionResponse**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `version` | `string` |

#### Defined in

[packages/types/src/sth-rest-api/version.ts:1](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sth-rest-api/version.ts#L1)

___

### OpResponse

Ƭ **OpResponse**<`PayloadType`\>: `PayloadType` & { `opStatus`: `ReasonPhrases.OK` \| `ReasonPhrases.ACCEPTED`  } \| { `error?`: `unknown` ; `opStatus`: `Exclude`<`ReasonPhrases`, `ReasonPhrases.OK` \| `ReasonPhrases.ACCEPTED`\>  }

#### Type parameters

| Name | Type |
| :------ | :------ |
| `PayloadType` | extends `Record`<`string`, `unknown`\> |

#### Defined in

[packages/types/src/sth-rest-api/common.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sth-rest-api/common.ts#L3)

___

### SendEventResponse

Ƭ **SendEventResponse**: [`ControlMessageResponse`](STHRestAPI.md#controlmessageresponse)

#### Defined in

[packages/types/src/sth-rest-api/send-event.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sth-rest-api/send-event.ts#L3)

___

### SendKillInstanceResponse

Ƭ **SendKillInstanceResponse**: [`ControlMessageResponse`](STHRestAPI.md#controlmessageresponse)

#### Defined in

[packages/types/src/sth-rest-api/send-kill-instance.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sth-rest-api/send-kill-instance.ts#L3)

___

### SendSequenceResponse

Ƭ **SendSequenceResponse**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `id` | `string` |

#### Defined in

[packages/types/src/sth-rest-api/send-sequence.ts:1](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sth-rest-api/send-sequence.ts#L1)

___

### SendStopInstanceResponse

Ƭ **SendStopInstanceResponse**: [`ControlMessageResponse`](STHRestAPI.md#controlmessageresponse)

#### Defined in

[packages/types/src/sth-rest-api/send-stop-instance.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sth-rest-api/send-stop-instance.ts#L3)

___

### StartSequenceResponse

Ƭ **StartSequenceResponse**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `id` | `string` |

#### Defined in

[packages/types/src/sth-rest-api/start-sequence.ts:1](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/sth-rest-api/start-sequence.ts#L1)
