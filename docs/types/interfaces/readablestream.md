[@scramjet/types](../README.md) / [Exports](../modules.md) / ReadableStream

# Interface: ReadableStream<Produces\>

A readable stream representation with generic chunks.

**`see`** https://nodejs.org/api/stream.html#stream_readable_streams Node.js Readable stream documentation

## Type parameters

Name |
------ |
`Produces` |

## Hierarchy

* *PipeableStream*<Produces\>

  ↳ **ReadableStream**

## Table of contents

### Methods

- [[Symbol.asyncIterator]](readablestream.md#[symbol.asynciterator])
- [pipe](readablestream.md#pipe)
- [read](readablestream.md#read)

## Methods

### [Symbol.asyncIterator]

▸ **[Symbol.asyncIterator]**(): *AsyncIterableIterator*<Produces\>

**Returns:** *AsyncIterableIterator*<Produces\>

Defined in: [runner.ts:49](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/42b038e/src/types/runner.ts#L49)

___

### pipe

▸ **pipe**<T\>(`destination`: T, `options?`: { `end?`: *undefined* \| *boolean*  }): T

#### Type parameters:

Name | Type |
------ | ------ |
`T` | *WritableStream*<T\> |

#### Parameters:

Name | Type |
------ | ------ |
`destination` | T |
`options?` | { `end?`: *undefined* \| *boolean*  } |

**Returns:** T

Defined in: [runner.ts:37](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/42b038e/src/types/runner.ts#L37)

▸ **pipe**<T\>(`destination`: T, `options?`: { `end?`: *undefined* \| *boolean*  }): T

#### Type parameters:

Name | Type |
------ | ------ |
`T` | [*WritableStream*](writablestream.md)<Produces, T\> |

#### Parameters:

Name | Type |
------ | ------ |
`destination` | T |
`options?` | { `end?`: *undefined* \| *boolean*  } |

**Returns:** T

Defined in: [runner.ts:40](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/42b038e/src/types/runner.ts#L40)

___

### read

▸ **read**(`count?`: *number*): *null* \| Produces[]

#### Parameters:

Name | Type |
------ | ------ |
`count?` | *number* |

**Returns:** *null* \| Produces[]

Defined in: [runner.ts:36](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/42b038e/src/types/runner.ts#L36)
