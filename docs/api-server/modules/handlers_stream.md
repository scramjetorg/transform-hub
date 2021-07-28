[@scramjet/api-server](../README.md) / handlers/stream

# Module: handlers/stream

## Table of contents

### Functions

- [createStreamHandlers](handlers_stream.md#createstreamhandlers)

## Functions

### createStreamHandlers

▸ **createStreamHandlers**(`router`): `Object`

#### Parameters

| Name | Type |
| :------ | :------ |
| `router` | [`SequentialCeroRouter`](../interfaces/lib_definitions.SequentialCeroRouter.md) |

#### Returns

`Object`

| Name | Type |
| :------ | :------ |
| `downstream` | (`path`: `string` \| `RegExp`, `stream`: `StreamOutput`, `__namedParameters`: `StreamConfig`) => `void` |
| `duplex` | (`path`: `string` \| `RegExp`, `callback`: (`stream`: `Duplex`, `headers`: `IncomingHttpHeaders`) => `void`) => `void` |
| `upstream` | (`path`: `string` \| `RegExp`, `stream`: `StreamInput`, `__namedParameters`: `StreamConfig`) => `void` |

#### Defined in

[packages/api-server/src/handlers/stream.ts:31](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/api-server/src/handlers/stream.ts#L31)
