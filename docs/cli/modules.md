[@scramjet/cli](README.md) / Exports

# @scramjet/cli

## Table of contents

### Type aliases

- [CommandDefinition](modules.md#commanddefinition)

### Functions

- [attachStdio](modules.md#attachstdio)
- [config](modules.md#config)
- [displayEntity](modules.md#displayentity)
- [displayObject](modules.md#displayobject)
- [displayStream](modules.md#displaystream)
- [getConfig](modules.md#getconfig)
- [getHostClient](modules.md#gethostclient)
- [getIgnoreFunction](modules.md#getignorefunction)
- [getInstance](modules.md#getinstance)
- [getReadStreamFromFile](modules.md#getreadstreamfromfile)
- [host](modules.md#host)
- [instance](modules.md#instance)
- [pack](modules.md#pack)
- [packAction](modules.md#packaction)
- [sequence](modules.md#sequence)
- [setConfigValue](modules.md#setconfigvalue)
- [topic](modules.md#topic)

## Type aliases

### CommandDefinition

Ƭ **CommandDefinition**: (`program`: `Command`) => `void`

#### Type declaration

▸ (`program`): `void`

CommandDefinition is an object from commander.js
program.opts() - show options
program.args - show arguments passed by user

##### Parameters

| Name | Type |
| :------ | :------ |
| `program` | `Command` |

##### Returns

`void`

#### Defined in

[types/index.ts:8](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/types/index.ts#L8)

## Functions

### attachStdio

▸ `Const` **attachStdio**(`command`, `instanceClient`): `Promise`<`void`\>

Attaches stdio to instance streams.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `command` | `Command` | Command object. |
| `instanceClient` | `InstanceClient` | Instance client. |

#### Returns

`Promise`<`void`\>

Promise resolving when all stdio streams finish.

#### Defined in

[lib/common.ts:66](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/common.ts#L66)

___

### config

▸ `Const` **config**(`program`): `void`

Initializes `config` command.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `program` | `Command` | Commander object. |

#### Returns

`void`

#### Defined in

[lib/commands/config.ts:10](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/commands/config.ts#L10)

___

### displayEntity

▸ **displayEntity**(`_program`, `response`): `Promise`<`void`\>

Displays reponse data.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `_program` | `Command` | commander object |
| `response` | `Promise`<`void` \| `Response`\> | Response object with data to be displayed. |

#### Returns

`Promise`<`void`\>

#### Defined in

[lib/output.ts:67](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/output.ts#L67)

___

### displayObject

▸ **displayObject**(`_program`, `object`): `Promise`<`void`\>

Displays object.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `_program` | `Command` | commander options object contains user input config etc. |
| `object` | `any` | returned object form |

#### Returns

`Promise`<`void`\>

#### Defined in

[lib/output.ts:32](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/output.ts#L32)

___

### displayStream

▸ **displayStream**(`_program`, `response`, `output?`): `Promise`<`void`\>

Displays stream.

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `_program` | `Command` | `undefined` | commander object. |
| `response` | `Promise`<`ResponseStream`\> | `undefined` | Response object with stream to be displayed. |
| `output` | `Writable` | `process.stdout` | Output stream. |

#### Returns

`Promise`<`void`\>

Promise resolving on stream finish or rejecting on error.

#### Defined in

[lib/output.ts:44](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/output.ts#L44)

___

### getConfig

▸ `Const` **getConfig**(): `Object`

Returns current configuration.
If configuration has not been loaded yet, it will be loaded from file.

#### Returns

`Object`

Configuration.

| Name | Type |
| :------ | :------ |
| `apiUrl` | `string` |
| `configVersion` | `number` |
| `format` | `string` |
| `log` | `boolean` |

#### Defined in

[lib/config.ts:30](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/config.ts#L30)

___

### getHostClient

▸ `Const` **getHostClient**(`command`): `HostClient`

Returns host client for host pointed by command options.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `command` | `Command` | Command object. |

#### Returns

`HostClient`

Host client.

#### Defined in

[lib/common.ts:22](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/common.ts#L22)

___

### getIgnoreFunction

▸ `Const` **getIgnoreFunction**(`file`): `Promise`<`fn`\>

TODO: Comment.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `file` | `PathLike` | Filepath to read rules from. |

#### Returns

`Promise`<`fn`\>

TODO: Comment.

#### Defined in

[lib/common.ts:83](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/common.ts#L83)

___

### getInstance

▸ `Const` **getInstance**(`command`, `id`): `InstanceClient`

Returns instance client for instance with given `id` on default host.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `command` | `Command` | Command object. |
| `id` | `string` | Instance client. |

#### Returns

`InstanceClient`

Instance client.

#### Defined in

[lib/common.ts:57](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/common.ts#L57)

___

### getReadStreamFromFile

▸ `Const` **getReadStreamFromFile**(`file`): `Promise`<`Readable`\>

Get stream from file.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `file` | `string` | Path to file to read from. |

#### Returns

`Promise`<`Readable`\>

Promise resolving to stream with file contents.

#### Defined in

[lib/common.ts:147](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/common.ts#L147)

___

### host

▸ `Const` **host**(`program`): `void`

Initializes `host` command.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `program` | `Command` | Commander object. |

#### Returns

`void`

#### Defined in

[lib/commands/host.ts:10](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/commands/host.ts#L10)

___

### instance

▸ `Const` **instance**(`program`): `void`

Initializes `instance` command.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `program` | `Command` | Commander object. |

#### Returns

`void`

#### Defined in

[lib/commands/instance.ts:12](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/commands/instance.ts#L12)

___

### pack

▸ `Const` **pack**(`program`): `void`

Initializes `pack` command.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `program` | `Command` | Commander object. |

#### Returns

`void`

#### Defined in

[lib/commands/pack.ts:9](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/commands/pack.ts#L9)

___

### packAction

▸ `Const` **packAction**(`directory`, `__namedParameters`): `Promise`<`void`\>

Creates package with contents of given directory.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `directory` | `string` | Directory to be packaged. |
| `__namedParameters` | `Object` | - |
| `__namedParameters.output` | `string` | - |
| `__namedParameters.stdout` | `boolean` | - |

#### Returns

`Promise`<`void`\>

#### Defined in

[lib/common.ts:110](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/common.ts#L110)

___

### sequence

▸ `Const` **sequence**(`program`): `void`

Initializes `sequence` command.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `program` | `Command` | Commander object. |

#### Returns

`void`

#### Defined in

[lib/commands/sequence.ts:12](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/commands/sequence.ts#L12)

___

### setConfigValue

▸ `Const` **setConfigValue**(`key`, `value`): `void`

Set custom value for config and write it to JSON file.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `key` | ``"log"`` \| ``"configVersion"`` \| ``"apiUrl"`` \| ``"format"`` | Property to be set. |
| `value` | `string` \| `number` \| `boolean` | Value to be set. |

#### Returns

`void`

#### Defined in

[lib/config.ts:53](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/config.ts#L53)

___

### topic

▸ `Const` **topic**(`program`): `void`

Initializes `topic` command.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `program` | `Command` | Commander object. |

#### Returns

`void`

#### Defined in

[lib/commands/topic.ts:10](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/commands/topic.ts#L10)
