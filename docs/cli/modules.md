[@scramjet/cli](README.md) / Exports

# @scramjet/cli

## Table of contents

### Type aliases

- [CommandDefinition](modules.md#commanddefinition)
- [configEnv](modules.md#configenv)
- [configFormat](modules.md#configformat)

### Interfaces

- [GlobalConfigEntity](interfaces/GlobalConfigEntity.md)
- [SessionConfigEntity](interfaces/SessionConfigEntity.md)

### Functions

- [attachStdio](modules.md#attachstdio)
- [completion](modules.md#completion)
- [config](modules.md#config)
- [displayEntity](modules.md#displayentity)
- [displayObject](modules.md#displayobject)
- [displayStream](modules.md#displaystream)
- [getHostClient](modules.md#gethostclient)
- [getIgnoreFunction](modules.md#getignorefunction)
- [getInstance](modules.md#getinstance)
- [getInstanceId](modules.md#getinstanceid)
- [getPackagePath](modules.md#getpackagepath)
- [getReadStreamFromFile](modules.md#getreadstreamfromfile)
- [getSequenceId](modules.md#getsequenceid)
- [init](modules.md#init)
- [instance](modules.md#instance)
- [isConfigEnv](modules.md#isconfigenv)
- [isConfigFormat](modules.md#isconfigformat)
- [packAction](modules.md#packaction)
- [scope](modules.md#scope)
- [sequence](modules.md#sequence)
- [space](modules.md#space)
- [topic](modules.md#topic)
- [util](modules.md#util)

### Variables

- [globalConfig](modules.md#globalconfig)
- [sessionConfig](modules.md#sessionconfig)

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

___

### configEnv

Ƭ **configEnv**: ``"development"`` \| ``"production"``

#### Defined in

[types/index.ts:10](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/types/index.ts#L10)

___

### configFormat

Ƭ **configFormat**: ``"pretty"`` \| ``"json"``

#### Defined in

[types/index.ts:12](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/types/index.ts#L12)

## Functions

### attachStdio

▸ **attachStdio**(`instanceClient`): `Promise`<`void`\>

Attaches stdio to instance streams.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `instanceClient` | `InstanceClient` | Instance client. |

#### Returns

`Promise`<`void`\>

Promise resolving when all stdio streams finish.

#### Defined in

[lib/common.ts:71](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/common.ts#L71)

___

### completion

▸ **completion**(`program`): `void`

Initializes `completion` command.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `program` | `Command` | Commander object. |

#### Returns

`void`

#### Defined in

[lib/commands/completion.ts:14](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/commands/completion.ts#L14)

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

[lib/commands/config.ts:11](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/commands/config.ts#L11)

___

### displayEntity

▸ **displayEntity**(`response`): `Promise`<`void`\>

Displays reponse data.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `response` | `any` | Response object with data to be displayed. |

#### Returns

`Promise`<`void`\>

#### Defined in

[lib/output.ts:53](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/output.ts#L53)

___

### displayObject

▸ **displayObject**(`object`): `void`

Displays object.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `object` | `any` | returned object form |

#### Returns

`void`

#### Defined in

[lib/output.ts:11](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/output.ts#L11)

___

### displayStream

▸ **displayStream**(`response`, `output?`): `Promise`<`void`\>

Displays stream.

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `response` | `Stream` \| `ReadableStream`<`any`\> \| `Promise`<`Stream` \| `ReadableStream`<`any`\>\> | `undefined` | Response object with stream to be displayed. |
| `output` | `Writable` | `process.stdout` | Output stream. |

#### Returns

`Promise`<`void`\>

Promise resolving on stream finish or rejecting on error.

#### Defined in

[lib/output.ts:28](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/output.ts#L28)

___

### getHostClient

▸ **getHostClient**(): `HostClient`

Returns host client for host pointed by command options.

#### Returns

`HostClient`

Host client.

#### Defined in

[lib/common.ts:22](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/common.ts#L22)

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

[lib/common.ts:87](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/common.ts#L87)

___

### getInstance

▸ **getInstance**(`id`): `InstanceClient`

Returns instance client for instance with given `id` on default host.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `id` | `string` | Instance client. |

#### Returns

`InstanceClient`

Instance client.

#### Defined in

[lib/common.ts:63](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/common.ts#L63)

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

[lib/config.ts:290](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/config.ts#L290)

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

[lib/config.ts:298](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/config.ts#L298)

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

[lib/common.ts:150](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/common.ts#L150)

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

[lib/config.ts:282](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/config.ts#L282)

___

### init

▸ **init**(`program`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `program` | `Command` |

#### Returns

`void`

#### Defined in

[lib/commands/init.ts:3](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/commands/init.ts#L3)

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

### isConfigEnv

▸ **isConfigEnv**(`env`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `env` | `string` |

#### Returns

`boolean`

#### Defined in

[types/index.ts:11](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/types/index.ts#L11)

___

### isConfigFormat

▸ **isConfigFormat**(`format`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `format` | `string` |

#### Returns

`boolean`

#### Defined in

[types/index.ts:13](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/types/index.ts#L13)

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

[lib/common.ts:112](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/common.ts#L112)

___

### scope

▸ **scope**(`program`): `void`

Initializes `scope` command.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `program` | `Command` | Commander object. |

#### Returns

`void`

#### Defined in

[lib/commands/scope.ts:12](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/commands/scope.ts#L12)

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

[lib/commands/sequence.ts:50](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/commands/sequence.ts#L50)

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

[lib/commands/topic.ts:11](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/commands/topic.ts#L11)

___

### util

▸ **util**(`program`): `void`

Initializes `config` command.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `program` | `Command` | Commander object. |

#### Returns

`void`

#### Defined in

[lib/commands/util.ts:11](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/commands/util.ts#L11)

## Variables

### globalConfig

• `Const` **globalConfig**: `GlobalConfig`

#### Defined in

[lib/config.ts:266](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/config.ts#L266)

___

### sessionConfig

• `Const` **sessionConfig**: `SessionConfig`

#### Defined in

[lib/config.ts:267](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/config.ts#L267)
