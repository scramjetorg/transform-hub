[@scramjet/utility](README.md) / Exports

# @scramjet/utility

## Table of contents

### Classes

- [FreePortsFinder](classes/FreePortsFinder.md)
- [TypedEmitter](classes/TypedEmitter.md)

### Functions

- [defer](modules.md#defer)
- [isDefined](modules.md#isdefined)
- [isStartSequenceDTO](modules.md#isstartsequencedto)
- [merge](modules.md#merge)
- [normalizeUrl](modules.md#normalizeurl)
- [promiseTimeout](modules.md#promisetimeout)
- [readConfigFile](modules.md#readconfigfile)
- [readJsonFile](modules.md#readjsonfile)
- [readStreamedJSON](modules.md#readstreamedjson)

## Functions

### defer

▸ **defer**(`timeout?`): `Promise`<`void`\>

Returns a promise that resolves after the specified duration.

**`example`**
// waits for 10 second
await defer(10 * 1000);

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `timeout?` | `number` | timeout in milliseconds. |

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
| `value` | `undefined` \| ``null`` \| `T` | Value to check. |

#### Returns

value is T

Returns true if given value is defined.

#### Defined in

[packages/utility/src/typeguards/is-defined.ts:7](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/typeguards/is-defined.ts#L7)

___

### isStartSequenceDTO

▸ **isStartSequenceDTO**(`arg`): arg is StartSequenceDTO

#### Parameters

| Name | Type |
| :------ | :------ |
| `arg` | `any` |

#### Returns

arg is StartSequenceDTO

#### Defined in

[packages/utility/src/typeguards/dto/sequence-start.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/typeguards/dto/sequence-start.ts#L3)

___

### merge

▸ **merge**<`T`\>(`target`, `source?`): `void`

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

### normalizeUrl

▸ **normalizeUrl**(`url`, `options?`): `string`

Normalizes provided URL.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `url` | `string` | URL to be normalized. |
| `options?` | `Options` | - |

#### Returns

`string`

Normalized URL.

#### Defined in

[packages/utility/src/normalize-url.ts:10](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/normalize-url.ts#L10)

___

### promiseTimeout

▸ **promiseTimeout**<`T`\>(`promise`, `timeout`): `Promise`<`T`\>

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

### readConfigFile

▸ **readConfigFile**(`filename`): `Promise`<`any`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `filename` | `string` |

#### Returns

`Promise`<`any`\>

#### Defined in

[packages/utility/src/read-config-file.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/read-config-file.ts#L3)

___

### readJsonFile

▸ **readJsonFile**(`fileName`, ...`path`): `Object`

#### Parameters

| Name | Type |
| :------ | :------ |
| `fileName` | `string` |
| `...path` | `string`[] |

#### Returns

`Object`

#### Defined in

[packages/utility/src/read-json-file.ts:4](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/read-json-file.ts#L4)

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
