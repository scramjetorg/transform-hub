[@scramjet/api-server](../README.md) / handlers/stream

# Module: handlers/stream

## Table of contents

### Functions

- [createStreamHandlers](handlers_stream.md#createstreamhandlers)

## Functions

### createStreamHandlers

▸ **createStreamHandlers**(`router`: [*SequentialCeroRouter*](../interfaces/lib_definitions.sequentialcerorouter.md)): *object*

#### Parameters:

Name | Type |
------ | ------ |
`router` | [*SequentialCeroRouter*](../interfaces/lib_definitions.sequentialcerorouter.md) |

**Returns:** *object*

Name | Type |
------ | ------ |
`downstream` | (`path`: *string* \| *RegExp*, `stream`: StreamOutput, `\_\_namedParameters`: StreamConfig) => *void* |
`upstream` | (`path`: *string* \| *RegExp*, `stream`: StreamInput, `\_\_namedParameters`: StreamConfig) => *void* |

Defined in: [packages/api-server/src/handlers/stream.ts:23](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/api-server/src/handlers/stream.ts#L23)
