[@scramjet/types](../README.md) / [Exports](../modules.md) / WritableStream

# Interface: WritableStream<Consumes\>

Writable stream representation with generic chunks.

**`see`** https://nodejs.org/api/stream.html#stream_writable_streams Node.js Writable stream documentation

## Type parameters

Name |
------ |
`Consumes` |

## Hierarchy

* **WritableStream**

## Table of contents

### Properties

- [objectMode](writablestream.md#objectmode)
- [writable](writablestream.md#writable)

### Methods

- [end](writablestream.md#end)
- [write](writablestream.md#write)

## Properties

### objectMode

• **objectMode**: *true*

Defined in: [runner.ts:58](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/42b038e/src/types/runner.ts#L58)

___

### writable

• **writable**: *boolean*

Defined in: [runner.ts:59](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/42b038e/src/types/runner.ts#L59)

## Methods

### end

▸ **end**(`cb?`: () => *void*): *void*

#### Parameters:

Name | Type |
------ | ------ |
`cb?` | () => *void* |

**Returns:** *void*

Defined in: [runner.ts:62](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/42b038e/src/types/runner.ts#L62)

▸ **end**(`data`: Consumes, `cb?`: () => *void*): *void*

#### Parameters:

Name | Type |
------ | ------ |
`data` | Consumes |
`cb?` | () => *void* |

**Returns:** *void*

Defined in: [runner.ts:63](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/42b038e/src/types/runner.ts#L63)

▸ **end**(`str`: *never*, `encoding`: *never*, `cb?`: () => *void*): *void*

#### Parameters:

Name | Type |
------ | ------ |
`str` | *never* |
`encoding` | *never* |
`cb?` | () => *void* |

**Returns:** *void*

Defined in: [runner.ts:64](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/42b038e/src/types/runner.ts#L64)

___

### write

▸ **write**(`item`: Consumes, `cb?`: (`err?`: *null* \| Error) => *void*): *boolean*

#### Parameters:

Name | Type |
------ | ------ |
`item` | Consumes |
`cb?` | (`err?`: *null* \| Error) => *void* |

**Returns:** *boolean*

Defined in: [runner.ts:60](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/42b038e/src/types/runner.ts#L60)

▸ **write**(`str`: *never*, `encoding`: *never*, `cb?`: (`err?`: *null* \| Error) => *void*): *boolean*

#### Parameters:

Name | Type |
------ | ------ |
`str` | *never* |
`encoding` | *never* |
`cb?` | (`err?`: *null* \| Error) => *void* |

**Returns:** *boolean*

Defined in: [runner.ts:61](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/42b038e/src/types/runner.ts#L61)
