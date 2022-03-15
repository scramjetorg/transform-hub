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

[packages/types/src/rest-api-sth/common.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-sth/common.ts#L3)

___

### DeleteSequenceResponse

Ƭ **DeleteSequenceResponse**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `id` | `string` |

#### Defined in

[packages/types/src/rest-api-sth/send-delete-sequence.ts:1](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-sth/send-delete-sequence.ts#L1)

___

### GetEventResponse

Ƭ **GetEventResponse**: `any`

#### Defined in

[packages/types/src/rest-api-sth/index.ts:18](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-sth/index.ts#L18)

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

[packages/types/src/rest-api-sth/get-health.ts:1](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-sth/get-health.ts#L1)

___

### GetInstanceResponse

Ƭ **GetInstanceResponse**: [`Instance`](../modules.md#instance)

#### Defined in

[packages/types/src/rest-api-sth/get-instance.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-sth/get-instance.ts#L3)

___

### GetInstancesResponse

Ƭ **GetInstancesResponse**: [`Instance`](../modules.md#instance)[]

#### Defined in

[packages/types/src/rest-api-sth/get-instances.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-sth/get-instances.ts#L3)

___

### GetLoadCheckResponse

Ƭ **GetLoadCheckResponse**: [`LoadCheckStat`](../modules.md#loadcheckstat)

#### Defined in

[packages/types/src/rest-api-sth/get-load-check.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-sth/get-load-check.ts#L3)

___

### GetNextEventResponse

Ƭ **GetNextEventResponse**: `any`

#### Defined in

[packages/types/src/rest-api-sth/index.ts:19](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-sth/index.ts#L19)

___

### GetSequenceInstancesResponse

Ƭ **GetSequenceInstancesResponse**: readonly `string`[] \| `undefined`

#### Defined in

[packages/types/src/rest-api-sth/get-sequence-instances.ts:1](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-sth/get-sequence-instances.ts#L1)

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

[packages/types/src/rest-api-sth/get-sequence.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-sth/get-sequence.ts#L3)

___

### GetSequencesResponse

Ƭ **GetSequencesResponse**: { `config`: [`SequenceConfig`](../modules.md#sequenceconfig) ; `id`: `string` ; `instances`: readonly `string`[]  }[]

#### Defined in

[packages/types/src/rest-api-sth/get-sequences.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-sth/get-sequences.ts#L3)

___

### GetVersionResponse

Ƭ **GetVersionResponse**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `version` | `string` |

#### Defined in

[packages/types/src/rest-api-sth/version.ts:1](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-sth/version.ts#L1)

___

### SendEventResponse

Ƭ **SendEventResponse**: [`ControlMessageResponse`](STHRestAPI.md#controlmessageresponse)

#### Defined in

[packages/types/src/rest-api-sth/send-event.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-sth/send-event.ts#L3)

___

### SendKillInstanceResponse

Ƭ **SendKillInstanceResponse**: [`ControlMessageResponse`](STHRestAPI.md#controlmessageresponse)

#### Defined in

[packages/types/src/rest-api-sth/send-kill-instance.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-sth/send-kill-instance.ts#L3)

___

### SendSequenceResponse

Ƭ **SendSequenceResponse**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `id` | `string` |

#### Defined in

[packages/types/src/rest-api-sth/send-sequence.ts:1](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-sth/send-sequence.ts#L1)

___

### SendStopInstanceResponse

Ƭ **SendStopInstanceResponse**: [`ControlMessageResponse`](STHRestAPI.md#controlmessageresponse)

#### Defined in

[packages/types/src/rest-api-sth/send-stop-instance.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-sth/send-stop-instance.ts#L3)

___

### StartSequenceResponse

Ƭ **StartSequenceResponse**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `id` | `string` |

#### Defined in

[packages/types/src/rest-api-sth/start-sequence.ts:1](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-sth/start-sequence.ts#L1)
