[@scramjet/types](../README.md) / [Exports](../modules.md) / MWRestAPI

# Namespace: MWRestAPI

## Table of contents

### Type aliases

- [MultiManagerResponse](MWRestAPI.md#multimanagerresponse)
- [MultiManagersResponse](MWRestAPI.md#multimanagersresponse)
- [VersionResponse](MWRestAPI.md#versionresponse)

## Type aliases

### MultiManagerResponse

Ƭ **MultiManagerResponse**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `baseUrl` | `string` |
| `id` | `string` |
| `managers` | `any`[] |

#### Defined in

[packages/types/src/rest-api-middleware/get-multi-manager.ts:1](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-middleware/get-multi-manager.ts#L1)

___

### MultiManagersResponse

Ƭ **MultiManagersResponse**: [`MultiManagerResponse`](MWRestAPI.md#multimanagerresponse)[]

#### Defined in

[packages/types/src/rest-api-middleware/get-multi-managers.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-middleware/get-multi-managers.ts#L3)

___

### VersionResponse

Ƭ **VersionResponse**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `version` | `string` |

#### Defined in

[packages/types/src/rest-api-middleware/get-version.ts:1](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/rest-api-middleware/get-version.ts#L1)
