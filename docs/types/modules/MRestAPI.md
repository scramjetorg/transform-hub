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
- [GetListResponse](MRestAPI.md#getlistresponse)
- [GetLoadResponse](MRestAPI.md#getloadresponse)
- [GetSequenceIDSResponse](MRestAPI.md#getsequenceidsresponse)
- [GetSequenceResponse](MRestAPI.md#getsequenceresponse)
- [GetSequencesResponse](MRestAPI.md#getsequencesresponse)
- [GetStoreItemsResponse](MRestAPI.md#getstoreitemsresponse)
- [GetTopicsResponse](MRestAPI.md#gettopicsresponse)
- [GetVersionResponse](MRestAPI.md#getversionresponse)
- [HealthCheckInfo](MRestAPI.md#healthcheckinfo)
- [HubDeleteResponse](MRestAPI.md#hubdeleteresponse)
- [PostDisconnectPayload](MRestAPI.md#postdisconnectpayload)
- [PostDisconnectResponse](MRestAPI.md#postdisconnectresponse)
- [PutStoreItemResponse](MRestAPI.md#putstoreitemresponse)

## Type Aliases

### ConnectedSTHInfo

Ƭ **ConnectedSTHInfo**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `description?` | `string` |
| `disconnectReason?` | `string` |
| `healthy` | `boolean` |
| `id` | `string` |
| `info` | [`ConnectedSTHInfoDetails`](MRestAPI.md#connectedsthinfodetails) |
| `isConnectionActive` | `boolean` |
| `selfHosted` | `boolean` |
| `tags?` | `string`[] |

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

Ƭ **GetEntitiesResponse**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `hubs` | `string`[] |
| `instances` | `string`[] |
| `sequences` | `string`[] |
| `topics` | `string`[] |

#### Defined in

[packages/types/src/rest-api-manager/get-entities.ts:1](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-manager/get-entities.ts#L1)

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

Ƭ **GetInstanceResponse**: [`Instance`](../modules.md#instance)

#### Defined in

[packages/types/src/rest-api-manager/get-instance.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-manager/get-instance.ts#L3)

___

### GetInstancesResponse

Ƭ **GetInstancesResponse**: [`GetInstanceResponse`](STHRestAPI.md#getinstanceresponse)[]

#### Defined in

[packages/types/src/rest-api-manager/get-instances.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-manager/get-instances.ts#L3)

___

### GetListResponse

Ƭ **GetListResponse**: { `description?`: `string` ; `disconnectReason?`: `string` ; `healthy`: `boolean` ; `id`: `string` ; `info`: [`ConnectedSTHInfoDetails`](MRestAPI.md#connectedsthinfodetails) ; `instances`: `string`[] ; `isConnectionActive`: `boolean` ; `selfHosted`: `boolean` ; `sequences`: `string`[] ; `tags?`: `string`[] ; `topics`: `string`[]  }[]

#### Defined in

[packages/types/src/rest-api-manager/get-list.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-manager/get-list.ts#L3)

___

### GetLoadResponse

Ƭ **GetLoadResponse**: [`LoadCheckStat`](../modules.md#loadcheckstat)

#### Defined in

[packages/types/src/rest-api-manager/get-load.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-manager/get-load.ts#L3)

___

### GetSequenceIDSResponse

Ƭ **GetSequenceIDSResponse**: `string`[]

#### Defined in

[packages/types/src/rest-api-manager/get-sequence-ids.ts:1](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-manager/get-sequence-ids.ts#L1)

___

### GetSequenceResponse

Ƭ **GetSequenceResponse**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `config` | [`SequenceConfig`](../modules.md#sequenceconfig) |
| `id` | `string` |
| `instances` | `string`[] |
| `location` | `string` |
| `name?` | `string` |

#### Defined in

[packages/types/src/rest-api-manager/get-sequence.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-manager/get-sequence.ts#L3)

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

Ƭ **GetTopicsResponse**: { `actors`: { `hostId?`: `string` ; `retired`: `boolean` ; `role`: `string` ; `stream`: `boolean` ; `type`: `string`  }[] ; `contentType`: `string` ; `name`: `string`  }[]

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

[packages/types/src/rest-api-manager/common.ts:18](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-manager/common.ts#L18)

___

### HubDeleteResponse

Ƭ **HubDeleteResponse**: { `opStatus`: `ReasonPhrases`  } \| { `error`: `any` ; `opStatus`: `ReasonPhrases`  }

#### Defined in

[packages/types/src/rest-api-manager/delete-hub.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-manager/delete-hub.ts#L3)

___

### PostDisconnectPayload

Ƭ **PostDisconnectPayload**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `accessKey?` | `string` |
| `id?` | `string` |
| `limit?` | `number` |

#### Defined in

[packages/types/src/rest-api-manager/post-disconnect.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-manager/post-disconnect.ts#L3)

___

### PostDisconnectResponse

Ƭ **PostDisconnectResponse**: [`OpResponse`](MMRestAPI.md#opresponse)<{ `disconnected`: { `reason`: `string` ; `sthId`: `string`  }[] ; `managerId`: `string`  }\>

#### Defined in

[packages/types/src/rest-api-manager/post-disconnect.ts:9](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-manager/post-disconnect.ts#L9)

___

### PutStoreItemResponse

Ƭ **PutStoreItemResponse**: [`SequenceConfig`](../modules.md#sequenceconfig)

#### Defined in

[packages/types/src/rest-api-manager/put-store-item.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-manager/put-store-item.ts#L3)
