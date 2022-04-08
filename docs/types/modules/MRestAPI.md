[@scramjet/types](../README.md) / [Exports](../modules.md) / MRestAPI

# Namespace: MRestAPI

## Table of contents

### Type aliases

- [ConnectedSTHInfo](MRestAPI.md#connectedsthinfo)
- [GetConfigResponse](MRestAPI.md#getconfigresponse)
- [GetHealthCheckResponse](MRestAPI.md#gethealthcheckresponse)
- [GetHostInfoResponse](MRestAPI.md#gethostinforesponse)
- [GetInstanceResponse](MRestAPI.md#getinstanceresponse)
- [GetInstancesResponse](MRestAPI.md#getinstancesresponse)
- [GetLoadResponse](MRestAPI.md#getloadresponse)
- [GetSequenceResponse](MRestAPI.md#getsequenceresponse)
- [GetSequencesResponse](MRestAPI.md#getsequencesresponse)
- [GetTopicsResponse](MRestAPI.md#gettopicsresponse)
- [GetVersionResponse](MRestAPI.md#getversionresponse)
- [HealthCheckInfo](MRestAPI.md#healthcheckinfo)

## Type aliases

### ConnectedSTHInfo

Ƭ **ConnectedSTHInfo**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `healthy` | `boolean` |
| `id` | `string` |
| `info` | { `[key: string]`: `any`;  } |
| `isConnectionActive` | `boolean` |

#### Defined in

[packages/types/src/rest-api-manager/common.ts:1](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-manager/common.ts#L1)

___

### GetConfigResponse

Ƭ **GetConfigResponse**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `config` | { `allowUnknownHosts`: `boolean` ; `apiBase`: `string` ; `hostname`: `string` ; `id`: `string` ; `logColors`: `boolean` ; `sthController`: { `unhealthyTimeoutMs`: `number`  } ; `sthServerPort`: `number`  } |
| `config.allowUnknownHosts` | `boolean` |
| `config.apiBase` | `string` |
| `config.hostname` | `string` |
| `config.id` | `string` |
| `config.logColors` | `boolean` |
| `config.sthController` | { `unhealthyTimeoutMs`: `number`  } |
| `config.sthController.unhealthyTimeoutMs` | `number` |
| `config.sthServerPort` | `number` |

#### Defined in

[packages/types/src/rest-api-manager/get-config.ts:1](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-manager/get-config.ts#L1)

___

### GetHealthCheckResponse

Ƭ **GetHealthCheckResponse**: [`HealthCheckInfo`](MRestAPI.md#healthcheckinfo)

#### Defined in

[packages/types/src/rest-api-manager/get-health.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-manager/get-health.ts#L3)

___

### GetHostInfoResponse

Ƭ **GetHostInfoResponse**: [`ConnectedSTHInfo`](MRestAPI.md#connectedsthinfo)

#### Defined in

[packages/types/src/rest-api-manager/get-host-info.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-manager/get-host-info.ts#L3)

___

### GetInstanceResponse

Ƭ **GetInstanceResponse**: `string`

#### Defined in

[packages/types/src/rest-api-manager/get-instance.ts:1](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-manager/get-instance.ts#L1)

___

### GetInstancesResponse

Ƭ **GetInstancesResponse**: [`GetSequencesResponse`](MRestAPI.md#getsequencesresponse)[][]

#### Defined in

[packages/types/src/rest-api-manager/get-instances.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-manager/get-instances.ts#L3)

___

### GetLoadResponse

Ƭ **GetLoadResponse**: [`LoadCheckStat`](../modules.md#loadcheckstat)

#### Defined in

[packages/types/src/rest-api-manager/get-load.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-manager/get-load.ts#L3)

___

### GetSequenceResponse

Ƭ **GetSequenceResponse**: `string`

#### Defined in

[packages/types/src/rest-api-manager/get-sequence.ts:1](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-manager/get-sequence.ts#L1)

___

### GetSequencesResponse

Ƭ **GetSequencesResponse**: [`GetSequenceResponse`](MRestAPI.md#getsequenceresponse)[]

#### Defined in

[packages/types/src/rest-api-manager/get-sequences.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-manager/get-sequences.ts#L3)

___

### GetTopicsResponse

Ƭ **GetTopicsResponse**: { `contentType`: `string` ; `name`: `string`  }[]

#### Defined in

[packages/types/src/rest-api-manager/get-topics.ts:1](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-manager/get-topics.ts#L1)

___

### GetVersionResponse

Ƭ **GetVersionResponse**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `version` | `string` |

#### Defined in

[packages/types/src/rest-api-manager/get-version.ts:1](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-manager/get-version.ts#L1)

___

### HealthCheckInfo

Ƭ **HealthCheckInfo**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `modules` | { `[key: string]`: `boolean`;  } |
| `timestamp` | `number` |
| `uptime` | `number` |

#### Defined in

[packages/types/src/rest-api-manager/common.ts:8](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-manager/common.ts#L8)
