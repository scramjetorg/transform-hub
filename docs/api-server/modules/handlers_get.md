[@scramjet/api-server](../README.md) / handlers/get

# Module: handlers/get

## Table of contents

### Functions

- [createGetterHandler](handlers_get.md#creategetterhandler)

## Functions

### createGetterHandler

▸ **createGetterHandler**(`router`): <T\>(`path`: `string` \| `RegExp`, `msg`: `T` \| `GetResolver`, `conn?`: `ICommunicationHandler`) => `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `router` | [`SequentialCeroRouter`](../interfaces/lib_definitions.SequentialCeroRouter.md) |

#### Returns

`fn`

▸ <`T`\>(`path`, `msg`, `conn?`): `void`

##### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends `MonitoringMessageCode` |

##### Parameters

| Name | Type |
| :------ | :------ |
| `path` | `string` \| `RegExp` |
| `msg` | `T` \| `GetResolver` |
| `conn?` | `ICommunicationHandler` |

##### Returns

`void`

#### Defined in

[packages/api-server/src/handlers/get.ts:6](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/api-server/src/handlers/get.ts#L6)
