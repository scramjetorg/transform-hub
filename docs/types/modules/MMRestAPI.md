[@scramjet/types](../README.md) / [Exports](../modules.md) / MMRestAPI

# Namespace: MMRestAPI

## Table of contents

### Type aliases

- [ControlMessageResponse](MMRestAPI.md#controlmessageresponse)
- [GetInfoReposnse](MMRestAPI.md#getinforeposnse)
- [GetManagerResponse](MMRestAPI.md#getmanagerresponse)
- [GetManagersResponse](MMRestAPI.md#getmanagersresponse)
- [GetVersionResponse](MMRestAPI.md#getversionresponse)
- [OpResponse](MMRestAPI.md#opresponse)
- [SendStartManagerResponse](MMRestAPI.md#sendstartmanagerresponse)
- [SendStopManagerResponse](MMRestAPI.md#sendstopmanagerresponse)

## Type aliases

### ControlMessageResponse

Ƭ **ControlMessageResponse**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `accepted` | `ReasonPhrases.OK` \| `ReasonPhrases.ACCEPTED` |

#### Defined in

[packages/types/src/rest-api-multi-manager/common.ts:7](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-multi-manager/common.ts#L7)

___

### GetInfoReposnse

Ƭ **GetInfoReposnse**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `apiBase` | `string` |
| `apiPort` | `number` |
| `id` | `string` |
| `managersCount` | `number` |

#### Defined in

[packages/types/src/rest-api-multi-manager/get-info.ts:1](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-multi-manager/get-info.ts#L1)

___

### GetManagerResponse

Ƭ **GetManagerResponse**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `id` | `string` |

#### Defined in

[packages/types/src/rest-api-multi-manager/get-manager.ts:1](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-multi-manager/get-manager.ts#L1)

___

### GetManagersResponse

Ƭ **GetManagersResponse**: [`GetManagerResponse`](MMRestAPI.md#getmanagerresponse)[]

#### Defined in

[packages/types/src/rest-api-multi-manager/get-managers.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-multi-manager/get-managers.ts#L3)

___

### GetVersionResponse

Ƭ **GetVersionResponse**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `version` | `string` |

#### Defined in

[packages/types/src/rest-api-multi-manager/get-version.ts:1](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-multi-manager/get-version.ts#L1)

___

### OpResponse

Ƭ **OpResponse**<`PayloadType`\>: `PayloadType` & { `opStatus`: `ReasonPhrases.OK` \| `ReasonPhrases.ACCEPTED`  } \| { `error?`: `unknown` ; `opStatus`: `Exclude`<`ReasonPhrases`, `ReasonPhrases.OK` \| `ReasonPhrases.ACCEPTED`\>  }

#### Type parameters

| Name | Type |
| :------ | :------ |
| `PayloadType` | extends `Record`<`string`, `unknown`\> |

#### Defined in

[packages/types/src/rest-api-multi-manager/common.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-multi-manager/common.ts#L3)

___

### SendStartManagerResponse

Ƭ **SendStartManagerResponse**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `id` | `string` |

#### Defined in

[packages/types/src/rest-api-multi-manager/start-manager.ts:1](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-multi-manager/start-manager.ts#L1)

___

### SendStopManagerResponse

Ƭ **SendStopManagerResponse**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `id` | `string` |

#### Defined in

[packages/types/src/rest-api-multi-manager/stop-manager.ts:1](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-multi-manager/stop-manager.ts#L1)
