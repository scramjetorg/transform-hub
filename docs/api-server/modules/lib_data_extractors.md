[@scramjet/api-server](../README.md) / lib/data-extractors

# Module: lib/data-extractors

## Table of contents

### Functions

- [getObject](lib_data_extractors.md#getobject)
- [getStream](lib_data_extractors.md#getstream)
- [getWritable](lib_data_extractors.md#getwritable)

## Functions

### getObject

▸ **getObject**(`object`: *any*, `req`: IncomingMessage): *Promise*<*any*\>

#### Parameters:

Name | Type |
------ | ------ |
`object` | *any* |
`req` | IncomingMessage |

**Returns:** *Promise*<*any*\>

Defined in: [packages/api-server/src/lib/data-extractors.ts:7](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/api-server/src/lib/data-extractors.ts#L7)

___

### getStream

▸ **getStream**(`req`: IncomingMessage, `stream`: StreamInput): *Promise*<Readable\>

#### Parameters:

Name | Type |
------ | ------ |
`req` | IncomingMessage |
`stream` | StreamInput |

**Returns:** *Promise*<Readable\>

Defined in: [packages/api-server/src/lib/data-extractors.ts:23](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/api-server/src/lib/data-extractors.ts#L23)

___

### getWritable

▸ **getWritable**(`object`: *any*, `req`: IncomingMessage, `res`: ServerResponse): *Promise*<Writable\>

#### Parameters:

Name | Type |
------ | ------ |
`object` | *any* |
`req` | IncomingMessage |
`res` | ServerResponse |

**Returns:** *Promise*<Writable\>

Defined in: [packages/api-server/src/lib/data-extractors.ts:15](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/api-server/src/lib/data-extractors.ts#L15)
