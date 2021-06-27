[@scramjet/api-server](../README.md) / handlers/op

# Module: handlers/op

## Table of contents

### Functions

- [createOperationHandler](handlers_op.md#createoperationhandler)

## Functions

### createOperationHandler

▸ **createOperationHandler**(`router`: [*SequentialCeroRouter*](../interfaces/lib_definitions.sequentialcerorouter.md)): *function*

#### Parameters

| Name | Type |
| :------ | :------ |
| `router` | [*SequentialCeroRouter*](../interfaces/lib_definitions.sequentialcerorouter.md) |

**Returns:** <T\>(`method`: *string*, `path`: *string* \| *RegExp*, `message`: T \| OpResolver, `conn`: *ICommunicationHandler*) => *void*

Defined in: [packages/api-server/src/handlers/op.ts:12](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/api-server/src/handlers/op.ts#L12)
