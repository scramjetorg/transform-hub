[@scramjet/cli](README.md) / Exports

# @scramjet/cli

## Table of contents

### Type aliases

- [CommandDefinition](modules.md#commanddefinition)

### Functions

- [attachStdio](modules.md#attachstdio)
- [config](modules.md#config)
- [delConfigValue](modules.md#delconfigvalue)
- [displayEntity](modules.md#displayentity)
- [displayObject](modules.md#displayobject)
- [displayStream](modules.md#displaystream)
- [getConfig](modules.md#getconfig)
- [getHostClient](modules.md#gethostclient)
- [getIgnoreFunction](modules.md#getignorefunction)
- [getInstance](modules.md#getinstance)
- [getInstanceId](modules.md#getinstanceid)
- [getPackagePath](modules.md#getpackagepath)
- [getReadStreamFromFile](modules.md#getreadstreamfromfile)
- [getSequenceId](modules.md#getsequenceid)
- [host](modules.md#host)
- [instance](modules.md#instance)
- [pack](modules.md#pack)
- [packAction](modules.md#packaction)
- [sequence](modules.md#sequence)
- [setConfigValue](modules.md#setconfigvalue)
- [space](modules.md#space)
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

▸ **attachStdio**(`command`, `instanceClient`): `Promise`<`void`\>

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

[lib/common.ts:74](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/common.ts#L74)

___

### config

▸ **config**(`program`): `void`

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

### delConfigValue

▸ **delConfigValue**(`key`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | ``"log"`` \| ``"configVersion"`` \| ``"apiUrl"`` \| ``"format"`` \| ``"lastPackagePath"`` \| ``"lastInstanceId"`` \| ``"lastSequenceId"`` \| ``"middlewareApiUrl"`` \| ``"lastSpaceId"`` \| ``"lastHubId"`` \| ``"env"`` |

#### Returns

`void`

#### Defined in

[lib/config.ts:69](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/config.ts#L69)

___

### displayEntity

▸ **displayEntity**(`_program`, `response`): `Promise`<`void`\>

Displays reponse data.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `_program` | `Command` | commander object |
| `response` | `Promise`<`any`\> | Response object with data to be displayed. |

#### Returns

`Promise`<`void`\>

#### Defined in

[lib/output.ts:70](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/output.ts#L70)

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

[lib/output.ts:31](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/output.ts#L31)

___

### displayStream

▸ **displayStream**(`_program`, `response`, `output?`): `Promise`<`void`\>

Displays stream.

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `_program` | `Command` | `undefined` | commander object. |
| `response` | `Promise`<`Stream` \| `ReadableStream`<`any`\>\> | `undefined` | Response object with stream to be displayed. |
| `output` | `Writable` | `process.stdout` | Output stream. |

#### Returns

`Promise`<`void`\>

Promise resolving on stream finish or rejecting on error.

#### Defined in

[lib/output.ts:43](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/output.ts#L43)

___

### getConfig

▸ **getConfig**(): `Object`

Returns current configuration.
If configuration has not been loaded yet, it will be loaded from file.

#### Returns

`Object`

Configuration.

| Name | Type |
| :------ | :------ |
| `apiUrl` | `string` |
| `configVersion` | `number` |
| `env` | `string` |
| `format` | `string` |
| `lastHubId` | `string` |
| `lastInstanceId` | `string` |
| `lastPackagePath` | `string` |
| `lastSequenceId` | `string` |
| `lastSpaceId` | `string` |
| `log` | `boolean` |
| `middlewareApiUrl` | `string` |

#### Defined in

[lib/config.ts:37](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/config.ts#L37)

___

### getHostClient

▸ **getHostClient**(`command`): `HostClient`

Returns host client for host pointed by command options.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `command` | `Command` | Command object. |

#### Returns

`HostClient`

Host client.

#### Defined in

[lib/common.ts:24](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/common.ts#L24)

___

### getIgnoreFunction

▸ **getIgnoreFunction**(`file`): `Promise`<(`f`: `string`) => `boolean`\>

TODO: Comment.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `file` | `PathLike` | Filepath to read rules from. |

#### Returns

`Promise`<(`f`: `string`) => `boolean`\>

TODO: Comment.

#### Defined in

[lib/common.ts:91](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/common.ts#L91)

___

### getInstance

▸ **getInstance**(`command`, `id`): `InstanceClient`

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

[lib/common.ts:65](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/common.ts#L65)

___

### getInstanceId

▸ **getInstanceId**(`id`): `string`

Gets last instance id if dash is provided, otherwise returns the first argument

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `id` | `string` | dash or anything else |

#### Returns

`string`

the correct id

#### Defined in

[lib/config.ts:130](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/config.ts#L130)

___

### getPackagePath

▸ **getPackagePath**(`path`): `string`

Gets package file path if dash is provided, otherwise returns the first argument

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `path` | `string` | dash or anything else |

#### Returns

`string`

the correct id

#### Defined in

[lib/config.ts:138](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/config.ts#L138)

___

### getReadStreamFromFile

▸ **getReadStreamFromFile**(`file`): `Promise`<`Readable`\>

Get stream from file.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `file` | `string` | Path to file to read from. |

#### Returns

`Promise`<`Readable`\>

Promise resolving to stream with file contents.

#### Defined in

[lib/common.ts:159](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/common.ts#L159)

___

### getSequenceId

▸ **getSequenceId**(`id`): `string`

Gets last sequence id if dash is provided, otherwise returns the first argument

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `id` | `string` | dash or anything else |

#### Returns

`string`

the correct id

#### Defined in

[lib/config.ts:122](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/config.ts#L122)

___

### host

▸ **host**(`program`): `void`

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

▸ **instance**(`program`): `void`

Initializes `instance` command.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `program` | `Command` | Commander object. |

#### Returns

`void`

#### Defined in

[lib/commands/instance.ts:13](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/commands/instance.ts#L13)

___

### pack

▸ **pack**(`program`): `void`

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

▸ **packAction**(`directory`, `__namedParameters`): `Promise`<`void`\>

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

[lib/common.ts:118](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/common.ts#L118)

___

### sequence

▸ **sequence**(`program`): `void`

Initializes `sequence` command.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `program` | `Command` | Commander object. |

#### Returns

`void`

#### Defined in

[lib/commands/sequence.ts:17](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/commands/sequence.ts#L17)

___

### setConfigValue

▸ **setConfigValue**(`key`, `value`): `void`

Set custom value for config and write it to JSON file.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `key` | ``"log"`` \| ``"configVersion"`` \| ``"apiUrl"`` \| ``"format"`` \| ``"lastPackagePath"`` \| ``"lastInstanceId"`` \| ``"lastSequenceId"`` \| ``"middlewareApiUrl"`` \| ``"lastSpaceId"`` \| ``"lastHubId"`` \| ``"env"`` | Property to be set. |
| `value` | `string` \| `number` \| `boolean` | Value to be set. |

#### Returns

`void`

#### Defined in

[lib/config.ts:89](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/config.ts#L89)

___

### space

▸ **space**(`program`): `void`

Initializes `space` command.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `program` | `Command` | Commander object. |

#### Returns

`void`

#### Defined in

[lib/commands/space.ts:11](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/commands/space.ts#L11)

___

### topic

▸ **topic**(`program`): `void`

Initializes `topic` command.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `program` | `Command` | Commander object. |

#### Returns

`void`

#### Defined in

[lib/commands/topic.ts:10](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/commands/topic.ts#L10)
