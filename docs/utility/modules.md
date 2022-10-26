[@scramjet/utility](README.md) / Exports

# @scramjet/utility

## Table of contents

### Type Aliases

- [CancellablePromise](modules.md#cancellablepromise)

### Classes

- [Config](classes/Config.md)
- [ConfigFile](classes/ConfigFile.md)
- [ConfigFileDefault](classes/ConfigFileDefault.md)
- [FreePortsFinder](classes/FreePortsFinder.md)
- [JsonFile](classes/JsonFile.md)
- [ReadOnlyConfig](classes/ReadOnlyConfig.md)
- [ReadOnlyConfigFile](classes/ReadOnlyConfigFile.md)
- [ReadOnlyConfigFileDefault](classes/ReadOnlyConfigFileDefault.md)
- [TextFile](classes/TextFile.md)
- [TypedEmitter](classes/TypedEmitter.md)
- [YamlFile](classes/YamlFile.md)

### Interfaces

- [File](interfaces/File.md)

### Functions

- [FileBuilder](modules.md#filebuilder)
- [cancellableDefer](modules.md#cancellabledefer)
- [defer](modules.md#defer)
- [isApiVersion](modules.md#isapiversion)
- [isDefined](modules.md#isdefined)
- [isIdString](modules.md#isidstring)
- [isLogLevel](modules.md#isloglevel)
- [isPort](modules.md#isport)
- [isStartSequenceDTO](modules.md#isstartsequencedto)
- [isUrlPath](modules.md#isurlpath)
- [merge](modules.md#merge)
- [normalizeUrl](modules.md#normalizeurl)
- [promiseTimeout](modules.md#promisetimeout)
- [readJsonFile](modules.md#readjsonfile)
- [readStreamedJSON](modules.md#readstreamedjson)
- [streamToString](modules.md#streamtostring)

### Variables

- [LogLevelStrings](modules.md#loglevelstrings)

## Type Aliases

### CancellablePromise

Ƭ **CancellablePromise**: `Promise`<`void`\> & { `cancel`: () => `boolean`  }

#### Defined in

[packages/utility/src/defer.ts:13](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/defer.ts#L13)

## Functions

### FileBuilder

▸ **FileBuilder**(`path`): [`File`](interfaces/File.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `path` | `string` |

#### Returns

[`File`](interfaces/File.md)

#### Defined in

[packages/utility/src/file/index.ts:9](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/file/index.ts#L9)

___

### cancellableDefer

▸ **cancellableDefer**(`timeout?`): [`CancellablePromise`](modules.md#cancellablepromise)

#### Parameters

| Name | Type |
| :------ | :------ |
| `timeout?` | `number` |

#### Returns

[`CancellablePromise`](modules.md#cancellablepromise)

#### Defined in

[packages/utility/src/defer.ts:17](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/defer.ts#L17)

___

### defer

▸ **defer**(`timeout?`): `Promise`<`void`\>

Returns a promise that resolves after the specified duration.

**`Example`**

```ts
// waits for 10 second
await defer(10 * 1000);
```

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

### isApiVersion

▸ **isApiVersion**(`version`): version is string

Function checking proper version format

Example valid formats: v1, v2.13, v3.333.111

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `version` | `string` | version to check |

#### Returns

version is string

true if valid version format

#### Defined in

[packages/utility/src/typeguards/is-api-version.ts:12](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/typeguards/is-api-version.ts#L12)

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

### isIdString

▸ **isIdString**(`id`): id is string

Function to check for valid id pattern

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `id` | `string` | Id to validate |

#### Returns

id is string

true if id is in valid format

#### Defined in

[packages/utility/src/typeguards/is-id-string.ts:14](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/typeguards/is-id-string.ts#L14)

___

### isLogLevel

▸ **isLogLevel**(`lvl`): lvl is LogLevel

#### Parameters

| Name | Type |
| :------ | :------ |
| `lvl` | `string` |

#### Returns

lvl is LogLevel

#### Defined in

[packages/utility/src/typeguards/is-log-level.ts:4](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/typeguards/is-log-level.ts#L4)

___

### isPort

▸ **isPort**(`port`): port is number

#### Parameters

| Name | Type |
| :------ | :------ |
| `port` | `string` \| `number` |

#### Returns

port is number

#### Defined in

[packages/utility/src/typeguards/is-port.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/typeguards/is-port.ts#L3)

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

### isUrlPath

▸ **isUrlPath**(`url`): url is string

Function checking slugs in url

Example valid paterns: /xx /xx/ /xxx/aa /xxx-ddd/ /xxx/aaa-ddd/ /xx-cc/aaa-ddd etc.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `url` | `string` | url to check |

#### Returns

url is string

true if valid slug format

#### Defined in

[packages/utility/src/typeguards/is-url-path.ts:12](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/typeguards/is-url-path.ts#L12)

___

### merge

▸ **merge**<`T`\>(`target`, `source?`, `strict?`): `void`

Deep merge objects.
Copies all properties from source to target.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends `Record`<`string`, `unknown`\> |

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `target` | `T` | `undefined` | Target object. |
| `source` | `DeepPartial`<`T`\> | `{}` | Source object. |
| `strict` | `boolean` | `false` | Throws an error if unknown value is found |

#### Returns

`void`

Returns nothing.

#### Defined in

[packages/utility/src/merge.ts:12](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/merge.ts#L12)

___

### normalizeUrl

▸ **normalizeUrl**(`url`, `options?`): `string`

Normalizes provided URL.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `url` | `string` | URL to be normalized. |
| `options?` | `Options` | Normalization options. |

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

### readJsonFile

▸ **readJsonFile**(`fileNameCandidate`, ...`path`): `Object`

#### Parameters

| Name | Type |
| :------ | :------ |
| `fileNameCandidate` | `string` |
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

___

### streamToString

▸ **streamToString**(`stream`): `Promise`<`string`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `stream` | `Readable` |

#### Returns

`Promise`<`string`\>

#### Defined in

[packages/utility/src/stream-to-string.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/stream-to-string.ts#L3)

## Variables

### LogLevelStrings

• `Const` **LogLevelStrings**: `LogLevel`[]

#### Defined in

[packages/utility/src/constants/object-logger.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/constants/object-logger.ts#L3)
