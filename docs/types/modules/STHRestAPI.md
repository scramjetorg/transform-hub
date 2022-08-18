[@scramjet/types](../README.md) / [Exports](../modules.md) / STHRestAPI

# Namespace: STHRestAPI

## Table of contents

### Type Aliases

- [ControlMessageResponse](STHRestAPI.md#controlmessageresponse)
- [DeleteSequenceResponse](STHRestAPI.md#deletesequenceresponse)
- [GetConfigResponse](STHRestAPI.md#getconfigresponse)
- [GetEventResponse](STHRestAPI.md#geteventresponse)
- [GetHealthResponse](STHRestAPI.md#gethealthresponse)
- [GetInstanceResponse](STHRestAPI.md#getinstanceresponse)
- [GetInstancesResponse](STHRestAPI.md#getinstancesresponse)
- [GetNextEventResponse](STHRestAPI.md#getnexteventresponse)
- [GetSequenceInstancesResponse](STHRestAPI.md#getsequenceinstancesresponse)
- [GetSequenceResponse](STHRestAPI.md#getsequenceresponse)
- [GetSequencesResponse](STHRestAPI.md#getsequencesresponse)
- [GetStatusResponse](STHRestAPI.md#getstatusresponse)
- [GetTopicsResponse](STHRestAPI.md#gettopicsresponse)
- [SendEventResponse](STHRestAPI.md#sendeventresponse)
- [SendKillInstanceResponse](STHRestAPI.md#sendkillinstanceresponse)
- [SendSequenceResponse](STHRestAPI.md#sendsequenceresponse)
- [SendStopInstanceResponse](STHRestAPI.md#sendstopinstanceresponse)
- [StartSequencePayload](STHRestAPI.md#startsequencepayload)
- [StartSequenceResponse](STHRestAPI.md#startsequenceresponse)

### References

- [GetLoadCheckResponse](STHRestAPI.md#getloadcheckresponse)
- [GetVersionResponse](STHRestAPI.md#getversionresponse)

## Type Aliases

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

### GetConfigResponse

Ƭ **GetConfigResponse**: [`PublicSTHConfiguration`](../modules.md#publicsthconfiguration)

#### Defined in

[packages/types/src/rest-api-sth/get-config.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-sth/get-config.ts#L3)

___

### GetEventResponse

Ƭ **GetEventResponse**: `any`

#### Defined in

[packages/types/src/rest-api-sth/index.ts:21](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-sth/index.ts#L21)

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

Ƭ **GetInstanceResponse**: [`Instance`](../modules.md#instance) & { `sequenceInfo`: [`DeepPartial`](../modules.md#deeppartial)<[`GetSequenceResponse`](STHRestAPI.md#getsequenceresponse)\>  }

#### Defined in

[packages/types/src/rest-api-sth/get-instance.ts:5](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-sth/get-instance.ts#L5)

___

### GetInstancesResponse

Ƭ **GetInstancesResponse**: [`Instance`](../modules.md#instance)[]

#### Defined in

[packages/types/src/rest-api-sth/get-instances.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-sth/get-instances.ts#L3)

___

### GetNextEventResponse

Ƭ **GetNextEventResponse**: `any`

#### Defined in

[packages/types/src/rest-api-sth/index.ts:22](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-sth/index.ts#L22)

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
| `instances` | readonly `string`[] |
| `name?` | `string` |

#### Defined in

[packages/types/src/rest-api-sth/get-sequence.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-sth/get-sequence.ts#L3)

___

### GetSequencesResponse

Ƭ **GetSequencesResponse**: { `config`: [`SequenceConfig`](../modules.md#sequenceconfig) ; `id`: `string` ; `instances`: readonly `string`[]  }[]

#### Defined in

[packages/types/src/rest-api-sth/get-sequences.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-sth/get-sequences.ts#L3)

___

### GetStatusResponse

Ƭ **GetStatusResponse**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `cpm` | { `connected?`: `boolean` ; `cpmId?`: `string`  } |
| `cpm.connected?` | `boolean` |
| `cpm.cpmId?` | `string` |

#### Defined in

[packages/types/src/rest-api-sth/get-status.ts:1](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-sth/get-status.ts#L1)

___

### GetTopicsResponse

Ƭ **GetTopicsResponse**: { `contentType`: `string` ; `name`: `string`  }[]

#### Defined in

[packages/types/src/rest-api-sth/get-topics.ts:1](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-sth/get-topics.ts#L1)

___

### SendEventResponse

Ƭ **SendEventResponse**: [`ControlMessageResponse`](STHRestAPI.md#controlmessageresponse)

#### Defined in

[packages/types/src/rest-api-sth/send-event.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-sth/send-event.ts#L3)

___

### SendKillInstanceResponse

Ƭ **SendKillInstanceResponse**: [`Instance`](../modules.md#instance)

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

Ƭ **SendStopInstanceResponse**: [`Instance`](../modules.md#instance)

#### Defined in

[packages/types/src/rest-api-sth/send-stop-instance.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-sth/send-stop-instance.ts#L3)

___

### StartSequencePayload

Ƭ **StartSequencePayload**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `appConfig` | [`AppConfig`](../modules.md#appconfig) |
| `args?` | `any`[] |
| `inputTopic?` | `string` |
| `limits?` | [`InstanceLimits`](../modules.md#instancelimits) |
| `outputTopic?` | `string` |

#### Defined in

[packages/types/src/rest-api-sth/start-sequence.ts:6](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-sth/start-sequence.ts#L6)

___

### StartSequenceResponse

Ƭ **StartSequenceResponse**: { `id`: `string` ; `result`: ``"success"``  } \| { `error`: `unknown` ; `result`: ``"error"``  }

#### Defined in

[packages/types/src/rest-api-sth/start-sequence.ts:4](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-sth/start-sequence.ts#L4)

## References

### GetLoadCheckResponse

Re-exports [GetLoadCheckResponse](MMRestAPI.md#getloadcheckresponse)

___

### GetVersionResponse

Re-exports [GetVersionResponse](MRestAPI.md#getversionresponse)
