[@scramjet/cli](../README.md) / [Exports](../modules.md) / ProfileConfig

# Class: ProfileConfig

## Hierarchy

- `ConfigFileDefault`<[`ProfileConfigEntity`](../interfaces/ProfileConfigEntity.md)\>

  ↳ **`ProfileConfig`**

## Table of contents

### Accessors

- [apiUrl](ProfileConfig.md#apiurl)
- [debug](ProfileConfig.md#debug)
- [env](ProfileConfig.md#env)
- [format](ProfileConfig.md#format)
- [log](ProfileConfig.md#log)
- [middlewareApiUrl](ProfileConfig.md#middlewareapiurl)
- [path](ProfileConfig.md#path)
- [scope](ProfileConfig.md#scope)
- [token](ProfileConfig.md#token)

### Properties

- [configuration](ProfileConfig.md#configuration)
- [defaultConfiguration](ProfileConfig.md#defaultconfiguration)
- [file](ProfileConfig.md#file)
- [isValidConfig](ProfileConfig.md#isvalidconfig)

### Constructors

- [constructor](ProfileConfig.md#constructor)

### Methods

- [deleteEntry](ProfileConfig.md#deleteentry)
- [fileExist](ProfileConfig.md#fileexist)
- [get](ProfileConfig.md#get)
- [getDefault](ProfileConfig.md#getdefault)
- [getEntry](ProfileConfig.md#getentry)
- [has](ProfileConfig.md#has)
- [isValid](ProfileConfig.md#isvalid)
- [restoreDefault](ProfileConfig.md#restoredefault)
- [set](ProfileConfig.md#set)
- [setApiUrl](ProfileConfig.md#setapiurl)
- [setDebug](ProfileConfig.md#setdebug)
- [setEntry](ProfileConfig.md#setentry)
- [setEnv](ProfileConfig.md#setenv)
- [setFormat](ProfileConfig.md#setformat)
- [setMiddlewareApiUrl](ProfileConfig.md#setmiddlewareapiurl)
- [setScope](ProfileConfig.md#setscope)
- [setToken](ProfileConfig.md#settoken)
- [validate](ProfileConfig.md#validate)
- [validateEntry](ProfileConfig.md#validateentry)

## Accessors

### apiUrl

• `get` **apiUrl**(): `string`

#### Returns

`string`

#### Defined in

[cli/src/lib/config/profileConfig.ts:13](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/config/profileConfig.ts#L13)

___

### debug

• `get` **debug**(): `boolean`

#### Returns

`boolean`

#### Defined in

[cli/src/lib/config/profileConfig.ts:19](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/config/profileConfig.ts#L19)

___

### env

• `get` **env**(): [`configEnv`](../modules.md#configenv)

#### Returns

[`configEnv`](../modules.md#configenv)

#### Defined in

[cli/src/lib/config/profileConfig.ts:15](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/config/profileConfig.ts#L15)

___

### format

• `get` **format**(): [`displayFormat`](../modules.md#displayformat)

#### Returns

[`displayFormat`](../modules.md#displayformat)

#### Defined in

[cli/src/lib/config/profileConfig.ts:20](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/config/profileConfig.ts#L20)

___

### log

• `Protected` `get` **log**(): `Object`

#### Returns

`Object`

| Name | Type |
| :------ | :------ |
| `debug` | `boolean` |
| `format` | [`displayFormat`](../modules.md#displayformat) |

#### Defined in

[cli/src/lib/config/profileConfig.ts:18](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/config/profileConfig.ts#L18)

___

### middlewareApiUrl

• `get` **middlewareApiUrl**(): `string`

#### Returns

`string`

#### Defined in

[cli/src/lib/config/profileConfig.ts:14](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/config/profileConfig.ts#L14)

___

### path

• `get` **path**(): `string`

#### Returns

`string`

#### Defined in

[cli/src/lib/config/profileConfig.ts:21](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/config/profileConfig.ts#L21)

___

### scope

• `get` **scope**(): `string`

#### Returns

`string`

#### Defined in

[cli/src/lib/config/profileConfig.ts:16](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/config/profileConfig.ts#L16)

___

### token

• `get` **token**(): `string`

#### Returns

`string`

#### Defined in

[cli/src/lib/config/profileConfig.ts:17](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/config/profileConfig.ts#L17)

## Properties

### configuration

• `Protected` **configuration**: [`ProfileConfigEntity`](../interfaces/ProfileConfigEntity.md)

#### Inherited from

ConfigFileDefault.configuration

#### Defined in

[utility/src/config/config.ts:7](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/config.ts#L7)

___

### defaultConfiguration

• `Protected` `Readonly` **defaultConfiguration**: [`ProfileConfigEntity`](../interfaces/ProfileConfigEntity.md) = `profileConfigDefault`

#### Overrides

ConfigFileDefault.defaultConfiguration

#### Defined in

[cli/src/lib/config/profileConfig.ts:7](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/config/profileConfig.ts#L7)

___

### file

• `Protected` **file**: `File`

#### Inherited from

ConfigFileDefault.file

#### Defined in

[utility/src/config/configFile.ts:8](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/configFile.ts#L8)

___

### isValidConfig

• `Protected` **isValidConfig**: `boolean`

#### Inherited from

ConfigFileDefault.isValidConfig

#### Defined in

[utility/src/config/config.ts:8](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/config.ts#L8)

## Constructors

### constructor

• **new ProfileConfig**(`configFile`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `configFile` | `string` |

#### Overrides

ConfigFileDefault&lt;ProfileConfigEntity\&gt;.constructor

#### Defined in

[cli/src/lib/config/profileConfig.ts:9](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/config/profileConfig.ts#L9)

## Methods

### deleteEntry

▸ **deleteEntry**(`key`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | keyof [`ProfileConfigEntity`](../interfaces/ProfileConfigEntity.md) |

#### Returns

`boolean`

#### Inherited from

ConfigFileDefault.deleteEntry

#### Defined in

[utility/src/config/configFile.ts:48](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/configFile.ts#L48)

___

### fileExist

▸ **fileExist**(): `boolean`

Check if path exists

#### Returns

`boolean`

true if path to config file exists

#### Inherited from

ConfigFileDefault.fileExist

#### Defined in

[utility/src/config/configFile.ts:26](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/configFile.ts#L26)

___

### get

▸ **get**(): [`ProfileConfigEntity`](../interfaces/ProfileConfigEntity.md)

#### Returns

[`ProfileConfigEntity`](../interfaces/ProfileConfigEntity.md)

File configuration if valid, default configuration otherwise

#### Inherited from

ConfigFileDefault.get

#### Defined in

[utility/src/config/configFileDefault.ts:17](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/configFileDefault.ts#L17)

___

### getDefault

▸ **getDefault**(): [`ProfileConfigEntity`](../interfaces/ProfileConfigEntity.md)

#### Returns

[`ProfileConfigEntity`](../interfaces/ProfileConfigEntity.md)

#### Inherited from

ConfigFileDefault.getDefault

#### Defined in

[utility/src/config/configFileDefault.ts:22](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/configFileDefault.ts#L22)

___

### getEntry

▸ **getEntry**(`key`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | keyof [`ProfileConfigEntity`](../interfaces/ProfileConfigEntity.md) |

#### Returns

`any`

#### Inherited from

ConfigFileDefault.getEntry

#### Defined in

[utility/src/config/config.ts:37](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/config.ts#L37)

___

### has

▸ **has**(`key`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | keyof [`ProfileConfigEntity`](../interfaces/ProfileConfigEntity.md) |

#### Returns

`boolean`

#### Inherited from

ConfigFileDefault.has

#### Defined in

[utility/src/config/config.ts:33](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/config.ts#L33)

___

### isValid

▸ **isValid**(): `boolean`

#### Returns

`boolean`

#### Inherited from

ConfigFileDefault.isValid

#### Defined in

[utility/src/config/configFile.ts:29](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/configFile.ts#L29)

___

### restoreDefault

▸ **restoreDefault**(): `boolean`

#### Returns

`boolean`

#### Inherited from

ConfigFileDefault.restoreDefault

#### Defined in

[utility/src/config/configFileDefault.ts:25](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/configFileDefault.ts#L25)

___

### set

▸ **set**(`config`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | `any` |

#### Returns

`boolean`

#### Overrides

ConfigFileDefault.set

#### Defined in

[cli/src/lib/config/profileConfig.ts:23](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/config/profileConfig.ts#L23)

___

### setApiUrl

▸ **setApiUrl**(`apiUrl`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `apiUrl` | `string` |

#### Returns

`boolean`

#### Defined in

[cli/src/lib/config/profileConfig.ts:31](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/config/profileConfig.ts#L31)

___

### setDebug

▸ **setDebug**(`debug`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `debug` | `boolean` |

#### Returns

`boolean`

#### Defined in

[cli/src/lib/config/profileConfig.ts:46](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/config/profileConfig.ts#L46)

___

### setEntry

▸ **setEntry**(`key`, `value`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | keyof [`ProfileConfigEntity`](../interfaces/ProfileConfigEntity.md) |
| `value` | `any` |

#### Returns

`boolean`

#### Inherited from

ConfigFileDefault.setEntry

#### Defined in

[utility/src/config/configFile.ts:44](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/configFile.ts#L44)

___

### setEnv

▸ **setEnv**(`env`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `env` | [`configEnv`](../modules.md#configenv) |

#### Returns

`boolean`

#### Defined in

[cli/src/lib/config/profileConfig.ts:37](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/config/profileConfig.ts#L37)

___

### setFormat

▸ **setFormat**(`format`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `format` | `string` |

#### Returns

`boolean`

#### Defined in

[cli/src/lib/config/profileConfig.ts:49](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/config/profileConfig.ts#L49)

___

### setMiddlewareApiUrl

▸ **setMiddlewareApiUrl**(`middlewareApiUrl`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `middlewareApiUrl` | `string` |

#### Returns

`boolean`

#### Defined in

[cli/src/lib/config/profileConfig.ts:34](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/config/profileConfig.ts#L34)

___

### setScope

▸ **setScope**(`scope`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `scope` | `string` |

#### Returns

`boolean`

#### Defined in

[cli/src/lib/config/profileConfig.ts:40](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/config/profileConfig.ts#L40)

___

### setToken

▸ **setToken**(`token`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `token` | `string` |

#### Returns

`boolean`

#### Defined in

[cli/src/lib/config/profileConfig.ts:43](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/config/profileConfig.ts#L43)

___

### validate

▸ **validate**(`config`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | `Object` |

#### Returns

`boolean`

#### Overrides

ConfigFileDefault.validate

#### Defined in

[cli/src/lib/config/profileConfig.ts:53](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/config/profileConfig.ts#L53)

___

### validateEntry

▸ `Protected` **validateEntry**(`key`, `value`): ``null`` \| `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |
| `value` | `any` |

#### Returns

``null`` \| `boolean`

#### Overrides

ConfigFileDefault.validateEntry

#### Defined in

[cli/src/lib/config/profileConfig.ts:59](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/config/profileConfig.ts#L59)
