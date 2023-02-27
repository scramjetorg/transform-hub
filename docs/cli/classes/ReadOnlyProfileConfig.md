[@scramjet/cli](../README.md) / [Exports](../modules.md) / ReadOnlyProfileConfig

# Class: ReadOnlyProfileConfig

## Hierarchy

- `ReadOnlyConfigFileDefault`<[`ProfileConfigEntity`](../interfaces/ProfileConfigEntity.md)\>

  ↳ **`ReadOnlyProfileConfig`**

## Table of contents

### Accessors

- [apiUrl](ReadOnlyProfileConfig.md#apiurl)
- [debug](ReadOnlyProfileConfig.md#debug)
- [env](ReadOnlyProfileConfig.md#env)
- [format](ReadOnlyProfileConfig.md#format)
- [log](ReadOnlyProfileConfig.md#log)
- [middlewareApiUrl](ReadOnlyProfileConfig.md#middlewareapiurl)
- [path](ReadOnlyProfileConfig.md#path)
- [scope](ReadOnlyProfileConfig.md#scope)
- [token](ReadOnlyProfileConfig.md#token)

### Properties

- [configuration](ReadOnlyProfileConfig.md#configuration)
- [defaultConfiguration](ReadOnlyProfileConfig.md#defaultconfiguration)
- [file](ReadOnlyProfileConfig.md#file)
- [isValidConfig](ReadOnlyProfileConfig.md#isvalidconfig)

### Constructors

- [constructor](ReadOnlyProfileConfig.md#constructor)

### Methods

- [fileExist](ReadOnlyProfileConfig.md#fileexist)
- [get](ReadOnlyProfileConfig.md#get)
- [getDefault](ReadOnlyProfileConfig.md#getdefault)
- [getEntry](ReadOnlyProfileConfig.md#getentry)
- [has](ReadOnlyProfileConfig.md#has)
- [isValid](ReadOnlyProfileConfig.md#isvalid)
- [validate](ReadOnlyProfileConfig.md#validate)
- [validateEntry](ReadOnlyProfileConfig.md#validateentry)

## Accessors

### apiUrl

• `get` **apiUrl**(): `string`

#### Returns

`string`

#### Defined in

[cli/src/lib/config/readOnlyProfileConfig.ts:13](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/config/readOnlyProfileConfig.ts#L13)

___

### debug

• `get` **debug**(): `boolean`

#### Returns

`boolean`

#### Defined in

[cli/src/lib/config/readOnlyProfileConfig.ts:19](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/config/readOnlyProfileConfig.ts#L19)

___

### env

• `get` **env**(): [`configEnv`](../modules.md#configenv)

#### Returns

[`configEnv`](../modules.md#configenv)

#### Defined in

[cli/src/lib/config/readOnlyProfileConfig.ts:15](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/config/readOnlyProfileConfig.ts#L15)

___

### format

• `get` **format**(): [`displayFormat`](../modules.md#displayformat)

#### Returns

[`displayFormat`](../modules.md#displayformat)

#### Defined in

[cli/src/lib/config/readOnlyProfileConfig.ts:20](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/config/readOnlyProfileConfig.ts#L20)

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

[cli/src/lib/config/readOnlyProfileConfig.ts:18](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/config/readOnlyProfileConfig.ts#L18)

___

### middlewareApiUrl

• `get` **middlewareApiUrl**(): `string`

#### Returns

`string`

#### Defined in

[cli/src/lib/config/readOnlyProfileConfig.ts:14](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/config/readOnlyProfileConfig.ts#L14)

___

### path

• `get` **path**(): `string`

#### Returns

`string`

#### Defined in

[cli/src/lib/config/readOnlyProfileConfig.ts:21](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/config/readOnlyProfileConfig.ts#L21)

___

### scope

• `get` **scope**(): `string`

#### Returns

`string`

#### Defined in

[cli/src/lib/config/readOnlyProfileConfig.ts:16](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/config/readOnlyProfileConfig.ts#L16)

___

### token

• `get` **token**(): `string`

#### Returns

`string`

#### Defined in

[cli/src/lib/config/readOnlyProfileConfig.ts:17](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/config/readOnlyProfileConfig.ts#L17)

## Properties

### configuration

• `Protected` `Readonly` **configuration**: [`ProfileConfigEntity`](../interfaces/ProfileConfigEntity.md)

#### Inherited from

ReadOnlyConfigFileDefault.configuration

#### Defined in

[utility/src/config/readOnlyConfig.ts:7](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/readOnlyConfig.ts#L7)

___

### defaultConfiguration

• `Protected` `Readonly` **defaultConfiguration**: [`ProfileConfigEntity`](../interfaces/ProfileConfigEntity.md)

#### Overrides

ReadOnlyConfigFileDefault.defaultConfiguration

#### Defined in

[cli/src/lib/config/readOnlyProfileConfig.ts:7](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/config/readOnlyProfileConfig.ts#L7)

___

### file

• `Protected` `Readonly` **file**: `File`

#### Inherited from

ReadOnlyConfigFileDefault.file

#### Defined in

[utility/src/config/readOnlyConfigFile.ts:8](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/readOnlyConfigFile.ts#L8)

___

### isValidConfig

• `Protected` `Readonly` **isValidConfig**: `boolean`

#### Inherited from

ReadOnlyConfigFileDefault.isValidConfig

#### Defined in

[utility/src/config/readOnlyConfig.ts:8](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/readOnlyConfig.ts#L8)

## Constructors

### constructor

• **new ReadOnlyProfileConfig**(`configFile`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `configFile` | `string` |

#### Overrides

ReadOnlyConfigFileDefault&lt;ProfileConfigEntity\&gt;.constructor

#### Defined in

[cli/src/lib/config/readOnlyProfileConfig.ts:9](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/config/readOnlyProfileConfig.ts#L9)

## Methods

### fileExist

▸ **fileExist**(): `boolean`

Check if path exists

#### Returns

`boolean`

true if path to config file exists

#### Inherited from

ReadOnlyConfigFileDefault.fileExist

#### Defined in

[utility/src/config/readOnlyConfigFile.ts:24](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/readOnlyConfigFile.ts#L24)

___

### get

▸ **get**(): [`ProfileConfigEntity`](../interfaces/ProfileConfigEntity.md)

#### Returns

[`ProfileConfigEntity`](../interfaces/ProfileConfigEntity.md)

#### Inherited from

ReadOnlyConfigFileDefault.get

#### Defined in

[utility/src/config/readOnlyConfigFileDefault.ts:14](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/readOnlyConfigFileDefault.ts#L14)

___

### getDefault

▸ **getDefault**(): [`ProfileConfigEntity`](../interfaces/ProfileConfigEntity.md)

#### Returns

[`ProfileConfigEntity`](../interfaces/ProfileConfigEntity.md)

#### Inherited from

ReadOnlyConfigFileDefault.getDefault

#### Defined in

[utility/src/config/readOnlyConfigFileDefault.ts:19](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/readOnlyConfigFileDefault.ts#L19)

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

ReadOnlyConfigFileDefault.getEntry

#### Defined in

[utility/src/config/readOnlyConfig.ts:38](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/readOnlyConfig.ts#L38)

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

ReadOnlyConfigFileDefault.has

#### Defined in

[utility/src/config/readOnlyConfig.ts:34](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/readOnlyConfig.ts#L34)

___

### isValid

▸ **isValid**(): `boolean`

#### Returns

`boolean`

#### Inherited from

ReadOnlyConfigFileDefault.isValid

#### Defined in

[utility/src/config/readOnlyConfigFile.ts:27](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/readOnlyConfigFile.ts#L27)

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

ReadOnlyConfigFileDefault.validate

#### Defined in

[cli/src/lib/config/readOnlyProfileConfig.ts:23](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/config/readOnlyProfileConfig.ts#L23)

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

ReadOnlyConfigFileDefault.validateEntry

#### Defined in

[cli/src/lib/config/readOnlyProfileConfig.ts:29](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/cli/src/lib/config/readOnlyProfileConfig.ts#L29)
