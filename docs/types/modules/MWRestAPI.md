[@scramjet/types](../README.md) / [Exports](../modules.md) / MWRestAPI

# Namespace: MWRestAPI

## Table of contents

### References

- [GetVersionResponse](MWRestAPI.md#getversionresponse)

### Type Aliases

- [MultiManagerResponse](MWRestAPI.md#multimanagerresponse)
- [MultiManagersResponse](MWRestAPI.md#multimanagersresponse)

## References

### GetVersionResponse

Re-exports [GetVersionResponse](MRestAPI.md#getversionresponse)

## Type Aliases

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
