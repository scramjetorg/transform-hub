[@scramjet/utility](README.md) / Exports

# @scramjet/utility

## Table of contents

### Classes

- [FreePortsFinder](classes/freeportsfinder.md)
- [TypedEmitter](classes/typedemitter.md)

### Functions

- [defer](modules.md#defer)
- [isDefined](modules.md#isdefined)
- [merge](modules.md#merge)
- [promiseTimeout](modules.md#promisetimeout)
- [readStreamedJSON](modules.md#readstreamedjson)

## Functions

### defer

▸ `Const` **defer**(`timeout`): `Promise`<`void`\>

Returns a promise that resolves after the specified duration.

**`example`**
// waits for 10 second
await defer(10 * 1000);

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `timeout` | `number` | timeout in milliseconds. |

#### Returns

`Promise`<`void`\>

- promise that resolves after timeout.

#### Defined in

[packages/utility/src/defer.ts:10](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/defer.ts#L10)

___

### isDefined

▸ **isDefined**<`T`\>(`value`): value is T

Returns true if given value is defined.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends `unknown` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `value` | `T` \| `undefined` \| ``null`` | Value to check. |

#### Returns

value is T

Returns true if given value is defined.

#### Defined in

[packages/utility/src/typeguards/is-defined.ts:7](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/typeguards/is-defined.ts#L7)

___

### merge

▸ `Const` **merge**<`T`\>(`target`, `source?`): `void`

Deep merge objects.
Copies all properties from source to target.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends `Record`<`string`, `unknown`\> |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `target` | `T` | Target object. |
| `source` | `DeepPartial`<`T`\> | Source object. |

#### Returns

`void`

Returns nothing.

#### Defined in

[packages/utility/src/merge.ts:11](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/merge.ts#L11)

___

### promiseTimeout

▸ `Const` **promiseTimeout**<`T`\>(`promise`, `timeout`): `Promise`<`T`\>

Returns a promise rejecting after the specified timeout or a given promise.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends `unknown` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `promise` | `Promise`<`T`\> | Promise to wait for. |
| `timeout` | `number` | Timeout in milliseconds. |

#### Returns

`Promise`<`T`\>

Promise that reject after timeout or.

#### Defined in

[packages/utility/src/promise-timeout.ts:10](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/promise-timeout.ts#L10)

___

### readStreamedJSON

▸ **readStreamedJSON**(`readable`): `Promise`<`unknown`\>

Reads and parses JSON from a stream.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `readable` | `Readable` | Stream to read from. |

#### Returns

`Promise`<`unknown`\>

Promise that resolves with the parsed JSON.

#### Defined in

[packages/utility/src/read-streamed-json.ts:10](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/read-streamed-json.ts#L10)
