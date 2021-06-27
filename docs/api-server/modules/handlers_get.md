[@scramjet/api-server](../README.md) / handlers/get

# Module: handlers/get

## Table of contents

### Functions

- [createGetterHandler](handlers_get.md#creategetterhandler)

## Functions

### createGetterHandler

▸ **createGetterHandler**(`router`: [*SequentialCeroRouter*](../interfaces/lib_definitions.sequentialcerorouter.md)): *function*

#### Parameters

| Name | Type |
| :------ | :------ |
| `router` | [*SequentialCeroRouter*](../interfaces/lib_definitions.sequentialcerorouter.md) |

**Returns:** <T\>(`path`: *string* \| *RegExp*, `msg`: T \| GetResolver, `conn?`: *ICommunicationHandler*) => *void*

Defined in: [packages/api-server/src/handlers/get.ts:6](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/api-server/src/handlers/get.ts#L6)
