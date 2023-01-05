[@scramjet/types](../README.md) / [Exports](../modules.md) / MRestAPI

# Namespace: MRestAPI

## Table of contents

### Type Aliases

- [ConnectedSTHInfo](MRestAPI.md#connectedsthinfo)
- [ConnectedSTHInfoDetails](MRestAPI.md#connectedsthinfodetails)
- [GetConfigResponse](MRestAPI.md#getconfigresponse)
- [GetEntitiesResponse](MRestAPI.md#getentitiesresponse)
- [GetHealthCheckResponse](MRestAPI.md#gethealthcheckresponse)
- [GetHostInfoResponse](MRestAPI.md#gethostinforesponse)
- [GetInstanceResponse](MRestAPI.md#getinstanceresponse)
- [GetInstancesResponse](MRestAPI.md#getinstancesresponse)
- [GetLoadResponse](MRestAPI.md#getloadresponse)
- [GetSequenceResponse](MRestAPI.md#getsequenceresponse)
- [GetSequencesResponse](MRestAPI.md#getsequencesresponse)
- [GetStoreItemsResponse](MRestAPI.md#getstoreitemsresponse)
- [GetTopicsResponse](MRestAPI.md#gettopicsresponse)
- [GetVersionResponse](MRestAPI.md#getversionresponse)
- [HealthCheckInfo](MRestAPI.md#healthcheckinfo)
- [PutStoreItemResponse](MRestAPI.md#putstoreitemresponse)

## Type Aliases

### ConnectedSTHInfo

Ƭ **ConnectedSTHInfo**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `healthy` | `boolean` |
| `id` | `string` |
| `info` | [`ConnectedSTHInfoDetails`](MRestAPI.md#connectedsthinfodetails) |
| `isConnectionActive` | `boolean` |

#### Defined in

[packages/types/src/rest-api-manager/common.ts:7](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-manager/common.ts#L7)

___

### ConnectedSTHInfoDetails

Ƭ **ConnectedSTHInfoDetails**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `created?` | `Date` |
| `lastConnected?` | `Date` |
| `lastDisconnected?` | `Date` |

#### Defined in

[packages/types/src/rest-api-manager/common.ts:1](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-manager/common.ts#L1)

___

### GetConfigResponse

Ƭ **GetConfigResponse**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `config` | [`ManagerConfiguration`](../modules.md#managerconfiguration) |

#### Defined in

[packages/types/src/rest-api-manager/get-config.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-manager/get-config.ts#L3)

___

### GetEntitiesResponse

Ƭ **GetEntitiesResponse**: [`GetEntitiesResponse`](STHRestAPI.md#getentitiesresponse) & { `hostId`: `string`  }[]

#### Defined in

[packages/types/src/rest-api-manager/get-entities.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-manager/get-entities.ts#L3)

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

### GetStoreItemsResponse

Ƭ **GetStoreItemsResponse**: [`SequenceConfig`](../modules.md#sequenceconfig)[]

#### Defined in

[packages/types/src/rest-api-manager/get-store-items.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-manager/get-store-items.ts#L3)

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
| `apiVersion` | `string` |
| `build` | `string` |
| `service` | `string` |
| `version` | `string` |

#### Defined in

[packages/types/src/rest-api-commons/version.ts:1](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-commons/version.ts#L1)

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

[packages/types/src/rest-api-manager/common.ts:14](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-manager/common.ts#L14)

___

### PutStoreItemResponse

Ƭ **PutStoreItemResponse**: [`SequenceConfig`](../modules.md#sequenceconfig)

#### Defined in

[packages/types/src/rest-api-manager/put-store-item.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-manager/put-store-item.ts#L3)
