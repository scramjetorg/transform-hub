[@scramjet/cli](README.md) / Exports

# @scramjet/cli

## Table of contents

### Type Aliases

- [CommandDefinition](modules.md#commanddefinition)
- [ExtendedHelpConfiguration](modules.md#extendedhelpconfiguration)
- [configEnv](modules.md#configenv)
- [displayFormat](modules.md#displayformat)

### Classes

- [ProfileConfig](classes/ProfileConfig.md)
- [ReadOnlyProfileConfig](classes/ReadOnlyProfileConfig.md)

### Interfaces

- [ProfileConfigEntity](interfaces/ProfileConfigEntity.md)
- [SessionConfigEntity](interfaces/SessionConfigEntity.md)
- [SiConfigEntity](interfaces/SiConfigEntity.md)

### Functions

- [attachStdio](modules.md#attachstdio)
- [completion](modules.md#completion)
- [config](modules.md#config)
- [displayEntity](modules.md#displayentity)
- [displayError](modules.md#displayerror)
- [displayMessage](modules.md#displaymessage)
- [displayObject](modules.md#displayobject)
- [displayStream](modules.md#displaystream)
- [getHostClient](modules.md#gethostclient)
- [getInstance](modules.md#getinstance)
- [getInstanceId](modules.md#getinstanceid)
- [getPackagePath](modules.md#getpackagepath)
- [getReadStreamFromFile](modules.md#getreadstreamfromfile)
- [getSequenceId](modules.md#getsequenceid)
- [init](modules.md#init)
- [initConfig](modules.md#initconfig)
- [instance](modules.md#instance)
- [isConfigEnv](modules.md#isconfigenv)
- [isConfigFormat](modules.md#isconfigformat)
- [isDevelopmentEnv](modules.md#isdevelopmentenv)
- [isJsonFormat](modules.md#isjsonformat)
- [isPrettyFormat](modules.md#isprettyformat)
- [isProductionEnv](modules.md#isproductionenv)
- [isProfileConfig](modules.md#isprofileconfig)
- [scope](modules.md#scope)
- [sequence](modules.md#sequence)
- [space](modules.md#space)
- [topic](modules.md#topic)
- [util](modules.md#util)

### Variables

- [profileManager](modules.md#profilemanager)
- [sessionConfig](modules.md#sessionconfig)
- [siConfig](modules.md#siconfig)

## Type Aliases

### CommandDefinition

Ƭ **CommandDefinition**: (`program`: `ComplitingCommand`) => `void`

#### Type declaration

▸ (`program`): `void`

CommandDefinition is an object from commander.js
program.opts() - show options
program.args - show arguments passed by user

##### Parameters

| Name | Type |
| :------ | :------ |
| `program` | `ComplitingCommand` |

##### Returns

`void`

#### Defined in

[cli/src/types/index.ts:9](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/types/index.ts#L9)

___

### ExtendedHelpConfiguration

Ƭ **ExtendedHelpConfiguration**: `HelpConfiguration` & { `developersOnly?`: `boolean`  }

ExtendedHelpConfiguration is used to pass context options throughout commands

#### Defined in

[cli/src/types/index.ts:14](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/types/index.ts#L14)

___

### configEnv

Ƭ **configEnv**: ``"development"`` \| ``"production"``

#### Defined in

[cli/src/types/index.ts:16](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/types/index.ts#L16)

___

### displayFormat

Ƭ **displayFormat**: ``"pretty"`` \| ``"json"``

#### Defined in

[cli/src/types/index.ts:21](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/types/index.ts#L21)

## Functions

### attachStdio

▸ **attachStdio**(`instanceClient`): `Promise`<`void`\>

Attaches stdio to Instance streams.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `instanceClient` | `InstanceClient` | Instance client. |

#### Returns

`Promise`<`void`\>

Promise resolving when all stdio streams finish.

#### Defined in

[cli/src/lib/common.ts:75](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/common.ts#L75)

___

### completion

▸ **completion**(`program`): `void`

Initializes `completion` command.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `program` | `ComplitingCommand` | Commander object. |

#### Returns

`void`

#### Defined in

[cli/src/types/index.ts:9](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/types/index.ts#L9)

___

### config

▸ **config**(`program`): `void`

Initializes `config` command.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `program` | `ComplitingCommand` | Commander object. |

#### Returns

`void`

#### Defined in

[cli/src/types/index.ts:9](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/types/index.ts#L9)

___

### displayEntity

▸ **displayEntity**(`response`, `format`): `Promise`<`void`\>

Displays response data.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `response` | `any` | Response object with data to be displayed. |
| `format` | [`displayFormat`](modules.md#displayformat) | format of displayed data: pretty\|json |

#### Returns

`Promise`<`void`\>

#### Defined in

[cli/src/lib/output.ts:54](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/output.ts#L54)

___

### displayError

▸ **displayError**(`error`, `showStack?`): `void`

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `error` | `string` \| `Error` | `undefined` |
| `showStack` | `boolean` | `false` |

#### Returns

`void`

#### Defined in

[cli/src/lib/output.ts:74](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/output.ts#L74)

___

### displayMessage

▸ **displayMessage**(`message`, `...args`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `message` | `string` |
| `...args` | `any`[] |

#### Returns

`void`

#### Defined in

[cli/src/lib/output.ts:67](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/output.ts#L67)

___

### displayObject

▸ **displayObject**(`object`, `format`): `void`

Displays object.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `object` | `any` | returned object form |
| `format` | [`displayFormat`](modules.md#displayformat) | format of displayed data: pretty\|json |

#### Returns

`void`

#### Defined in

[cli/src/lib/output.ts:13](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/output.ts#L13)

___

### displayStream

▸ **displayStream**(`response`, `output?`): `Promise`<`void`\>

Displays stream.

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `response` | `ReadableStream`<`any`\> \| `Stream` \| `Promise`<`ReadableStream`<`any`\> \| `Stream`\> | `undefined` | Response object with stream to be displayed. |
| `output` | `Writable` | `process.stdout` | Output stream. |

#### Returns

`Promise`<`void`\>

Promise resolving on stream finish or rejecting on error.

#### Defined in

[cli/src/lib/output.ts:28](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/output.ts#L28)

___

### getHostClient

▸ **getHostClient**(): `HostClient`

Returns host client for host pointed by command options.

#### Returns

`HostClient`

Host client.

#### Defined in

[cli/src/lib/common.ts:21](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/common.ts#L21)

___

### getInstance

▸ **getInstance**(`id`): `InstanceClient`

Returns instance client for Instance with given `id` on default host.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `id` | `string` | Instance client. |

#### Returns

`InstanceClient`

Instance client.

#### Defined in

[cli/src/lib/common.ts:67](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/common.ts#L67)

___

### getInstanceId

▸ **getInstanceId**(`id`): `string`

Gets last Instance id if dash is provided, otherwise returns the first argument

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `id` | `string` | dash or anything else |

#### Returns

`string`

the correct id

#### Defined in

[cli/src/lib/config/index.ts:86](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/config/index.ts#L86)

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

[cli/src/lib/config/index.ts:94](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/config/index.ts#L94)

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

[cli/src/lib/common.ts:90](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/common.ts#L90)

___

### getSequenceId

▸ **getSequenceId**(`id`): `string`

Gets last Sequence id if dash is provided, otherwise returns the first argument

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `id` | `string` | dash or anything else |

#### Returns

`string`

the correct id

#### Defined in

[cli/src/lib/config/index.ts:78](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/config/index.ts#L78)

___

### init

▸ **init**(`program`): `void`

CommandDefinition is an object from commander.js
program.opts() - show options
program.args - show arguments passed by user

#### Parameters

| Name | Type |
| :------ | :------ |
| `program` | `ComplitingCommand` |

#### Returns

`void`

#### Defined in

[cli/src/types/index.ts:9](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/types/index.ts#L9)

___

### initConfig

▸ **initConfig**(): `void`

#### Returns

`void`

#### Defined in

[cli/src/lib/config/index.ts:21](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/config/index.ts#L21)

___

### instance

▸ **instance**(`program`): `void`

Initializes `instance` command.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `program` | `ComplitingCommand` | Commander object. |

#### Returns

`void`

#### Defined in

[cli/src/types/index.ts:9](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/types/index.ts#L9)

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

[cli/src/types/index.ts:17](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/types/index.ts#L17)

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

[cli/src/types/index.ts:22](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/types/index.ts#L22)

___

### isDevelopmentEnv

▸ **isDevelopmentEnv**(`env`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `env` | [`configEnv`](modules.md#configenv) |

#### Returns

`boolean`

#### Defined in

[cli/src/types/index.ts:18](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/types/index.ts#L18)

___

### isJsonFormat

▸ **isJsonFormat**(`format`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `format` | [`displayFormat`](modules.md#displayformat) |

#### Returns

`boolean`

#### Defined in

[cli/src/types/index.ts:23](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/types/index.ts#L23)

___

### isPrettyFormat

▸ **isPrettyFormat**(`format`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `format` | [`displayFormat`](modules.md#displayformat) |

#### Returns

`boolean`

#### Defined in

[cli/src/types/index.ts:24](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/types/index.ts#L24)

___

### isProductionEnv

▸ **isProductionEnv**(`env`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `env` | [`configEnv`](modules.md#configenv) |

#### Returns

`boolean`

#### Defined in

[cli/src/types/index.ts:19](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/types/index.ts#L19)

___

### isProfileConfig

▸ **isProfileConfig**(`profile`): profile is ProfileConfig

#### Parameters

| Name | Type |
| :------ | :------ |
| `profile` | [`ProfileConfig`](classes/ProfileConfig.md) \| [`ReadOnlyProfileConfig`](classes/ReadOnlyProfileConfig.md) |

#### Returns

profile is ProfileConfig

#### Defined in

[cli/src/lib/config/profileManager.ts:15](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/config/profileManager.ts#L15)

___

### scope

▸ **scope**(`program`): `void`

Initializes `scope` command.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `program` | `ComplitingCommand` | Commander object. |

#### Returns

`void`

#### Defined in

[cli/src/types/index.ts:9](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/types/index.ts#L9)

___

### sequence

▸ **sequence**(`program`): `void`

Initializes `sequence` command.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `program` | `ComplitingCommand` | Commander object. |

#### Returns

`void`

#### Defined in

[cli/src/types/index.ts:9](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/types/index.ts#L9)

___

### space

▸ **space**(`program`): `void`

Initializes `space` command.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `program` | `ComplitingCommand` | Commander object. |

#### Returns

`void`

#### Defined in

[cli/src/types/index.ts:9](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/types/index.ts#L9)

___

### topic

▸ **topic**(`program`): `void`

Initializes `topic` command.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `program` | `ComplitingCommand` | Commander object. |

#### Returns

`void`

#### Defined in

[cli/src/types/index.ts:9](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/types/index.ts#L9)

___

### util

▸ **util**(`program`): `void`

Initializes `config` command.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `program` | `ComplitingCommand` | Commander object. |

#### Returns

`void`

#### Defined in

[cli/src/types/index.ts:9](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/types/index.ts#L9)

## Variables

### profileManager

• `Const` **profileManager**: `ProfileManager`

#### Defined in

[cli/src/lib/config/index.ts:13](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/config/index.ts#L13)

___

### sessionConfig

• `Const` **sessionConfig**: `SessionConfig`

#### Defined in

[cli/src/lib/config/index.ts:15](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/config/index.ts#L15)

___

### siConfig

• `Const` **siConfig**: `SiConfig`

#### Defined in

[cli/src/lib/config/index.ts:14](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/config/index.ts#L14)
