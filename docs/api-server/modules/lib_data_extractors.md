[@scramjet/api-server](../README.md) / lib/data-extractors

# Module: lib/data-extractors

## Table of contents

### Functions

- [getObject](lib_data_extractors.md#getobject)
- [getStream](lib_data_extractors.md#getstream)
- [getWritable](lib_data_extractors.md#getwritable)

## Functions

### getObject

▸ **getObject**(`object`, `req`): `Promise`<`any`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `object` | `any` |
| `req` | `IncomingMessage` |

#### Returns

`Promise`<`any`\>

#### Defined in

[packages/api-server/src/lib/data-extractors.ts:6](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/api-server/src/lib/data-extractors.ts#L6)

___

### getStream

▸ **getStream**(`req`, `res`, `stream`): `Promise`<`Readable`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `req` | `IncomingMessage` |
| `res` | `ServerResponse` |
| `stream` | `StreamInput` |

#### Returns

`Promise`<`Readable`\>

#### Defined in

[packages/api-server/src/lib/data-extractors.ts:22](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/api-server/src/lib/data-extractors.ts#L22)

___

### getWritable

▸ **getWritable**(`object`, `req`, `res`): `Promise`<`Writable` \| `Object`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `object` | `any` |
| `req` | `IncomingMessage` |
| `res` | `ServerResponse` |

#### Returns

`Promise`<`Writable` \| `Object`\>

#### Defined in

[packages/api-server/src/lib/data-extractors.ts:14](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/api-server/src/lib/data-extractors.ts#L14)
