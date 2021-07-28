[@scramjet/api-server](../README.md) / handlers/op

# Module: handlers/op

## Table of contents

### Functions

- [createOperationHandler](handlers_op.md#createoperationhandler)

## Functions

### createOperationHandler

▸ **createOperationHandler**(`router`): <T\>(`method`: `string`, `path`: `string` \| `RegExp`, `message`: `T` \| `OpResolver`, `conn`: `ICommunicationHandler`) => `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `router` | [`SequentialCeroRouter`](../interfaces/lib_definitions.SequentialCeroRouter.md) |

#### Returns

`fn`

▸ <`T`\>(`method?`, `path`, `message`, `conn`): `void`

Simple POST request hook for static data in monitoring stream.

##### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends `ControlMessageCode` |

##### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `method` | `string` | `"post"` | request method |
| `path` | `string` \| `RegExp` | `undefined` | the request path as string or regex |
| `message` | `T` \| `OpResolver` | `undefined` | which operation |
| `conn` | `ICommunicationHandler` | `undefined` | the communication handler to use |

##### Returns

`void`

#### Defined in

[packages/api-server/src/handlers/op.ts:12](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/api-server/src/handlers/op.ts#L12)
