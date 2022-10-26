[@scramjet/utility](../README.md) / [Exports](../modules.md) / ConfigFileDefault

# Class: ConfigFileDefault<Type\>

Modifiable configuration object held in file. If file
is invalid, or not existing, default configuration is used.

## Type parameters

| Name | Type |
| :------ | :------ |
| `Type` | extends `Object` |

## Hierarchy

- [`ConfigFile`](ConfigFile.md)<`Type`\>

  ↳ **`ConfigFileDefault`**

## Table of contents

### Properties

- [configuration](ConfigFileDefault.md#configuration)
- [defaultConfiguration](ConfigFileDefault.md#defaultconfiguration)
- [file](ConfigFileDefault.md#file)
- [isValidConfig](ConfigFileDefault.md#isvalidconfig)

### Constructors

- [constructor](ConfigFileDefault.md#constructor)

### Methods

- [deleteEntry](ConfigFileDefault.md#deleteentry)
- [fileExist](ConfigFileDefault.md#fileexist)
- [get](ConfigFileDefault.md#get)
- [getDefault](ConfigFileDefault.md#getdefault)
- [getEntry](ConfigFileDefault.md#getentry)
- [has](ConfigFileDefault.md#has)
- [isValid](ConfigFileDefault.md#isvalid)
- [restoreDefault](ConfigFileDefault.md#restoredefault)
- [set](ConfigFileDefault.md#set)
- [setEntry](ConfigFileDefault.md#setentry)
- [validate](ConfigFileDefault.md#validate)
- [validateEntry](ConfigFileDefault.md#validateentry)

## Properties

### configuration

• `Protected` **configuration**: `Type`

#### Inherited from

[ConfigFile](ConfigFile.md).[configuration](ConfigFile.md#configuration)

#### Defined in

[packages/utility/src/config/config.ts:7](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/config.ts#L7)

___

### defaultConfiguration

• `Protected` `Readonly` **defaultConfiguration**: `Type`

#### Defined in

[packages/utility/src/config/configFileDefault.ts:8](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/configFileDefault.ts#L8)

___

### file

• `Protected` **file**: [`File`](../interfaces/File.md)

#### Inherited from

[ConfigFile](ConfigFile.md).[file](ConfigFile.md#file)

#### Defined in

[packages/utility/src/config/configFile.ts:8](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/configFile.ts#L8)

___

### isValidConfig

• `Protected` **isValidConfig**: `boolean`

#### Inherited from

[ConfigFile](ConfigFile.md).[isValidConfig](ConfigFile.md#isvalidconfig)

#### Defined in

[packages/utility/src/config/config.ts:8](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/config.ts#L8)

## Constructors

### constructor

• **new ConfigFileDefault**<`Type`\>(`filePath`, `defaultConf`)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `Type` | extends `Object` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `filePath` | `string` |
| `defaultConf` | `Type` |

#### Overrides

[ConfigFile](ConfigFile.md).[constructor](ConfigFile.md#constructor)

#### Defined in

[packages/utility/src/config/configFileDefault.ts:10](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/configFileDefault.ts#L10)

## Methods

### deleteEntry

▸ **deleteEntry**(`key`): `boolean`

Remove entry from configuration.
Configuration must be valid after removing entry

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `key` | keyof `Type` | entry key to remove |

#### Returns

`boolean`

false if removing entry would invalidate configuration, true otherwise

#### Inherited from

[ConfigFile](ConfigFile.md).[deleteEntry](ConfigFile.md#deleteentry)

#### Defined in

[packages/utility/src/config/configFile.ts:46](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/configFile.ts#L46)

___

### fileExist

▸ **fileExist**(): `boolean`

Check if path exists

#### Returns

`boolean`

true if path to config file exists

#### Inherited from

[ConfigFile](ConfigFile.md).[fileExist](ConfigFile.md#fileexist)

#### Defined in

[packages/utility/src/config/configFile.ts:24](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/configFile.ts#L24)

___

### get

▸ **get**(): `Type`

#### Returns

`Type`

File configuration if valid, default configuration otherwise

#### Overrides

[ConfigFile](ConfigFile.md).[get](ConfigFile.md#get)

#### Defined in

[packages/utility/src/config/configFileDefault.ts:17](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/configFileDefault.ts#L17)

___

### getDefault

▸ **getDefault**(): `Type`

#### Returns

`Type`

#### Defined in

[packages/utility/src/config/configFileDefault.ts:22](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/configFileDefault.ts#L22)

___

### getEntry

▸ **getEntry**(`key`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | keyof `Type` |

#### Returns

`any`

#### Inherited from

[ConfigFile](ConfigFile.md).[getEntry](ConfigFile.md#getentry)

#### Defined in

[packages/utility/src/config/config.ts:37](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/config.ts#L37)

___

### has

▸ **has**(`key`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | keyof `Type` |

#### Returns

`boolean`

#### Inherited from

[ConfigFile](ConfigFile.md).[has](ConfigFile.md#has)

#### Defined in

[packages/utility/src/config/config.ts:33](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/config.ts#L33)

___

### isValid

▸ **isValid**(): `boolean`

#### Returns

`boolean`

#### Inherited from

[ConfigFile](ConfigFile.md).[isValid](ConfigFile.md#isvalid)

#### Defined in

[packages/utility/src/config/configFile.ts:27](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/configFile.ts#L27)

___

### restoreDefault

▸ **restoreDefault**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/utility/src/config/configFileDefault.ts:25](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/configFileDefault.ts#L25)

___

### set

▸ **set**(`config`): `boolean`

Set configuration

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `config` | `any` | configuration to set |

#### Returns

`boolean`

true if config was valid and set

#### Inherited from

[ConfigFile](ConfigFile.md).[set](ConfigFile.md#set)

#### Defined in

[packages/utility/src/config/configFile.ts:38](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/configFile.ts#L38)

___

### setEntry

▸ **setEntry**(`key`, `value`): `boolean`

Set configuration entry

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `key` | keyof `Type` | key to set |
| `value` | `any` | value to set |

#### Returns

`boolean`

false if new entry is invalid, true otherwise

#### Inherited from

[ConfigFile](ConfigFile.md).[setEntry](ConfigFile.md#setentry)

#### Defined in

[packages/utility/src/config/configFile.ts:42](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/configFile.ts#L42)

___

### validate

▸ **validate**(`config`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | `Record`<`string`, `any`\> |

#### Returns

`boolean`

#### Inherited from

[ConfigFile](ConfigFile.md).[validate](ConfigFile.md#validate)

#### Defined in

[packages/utility/src/config/config.ts:23](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/config.ts#L23)

___

### validateEntry

▸ `Protected` `Abstract` **validateEntry**(`key`, `value`): ``null`` \| `boolean`

Validate entry

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `key` | `string` | entry key |
| `value` | `any` | entry value |

#### Returns

``null`` \| `boolean`

validation result or null if validation for key should be skipped

#### Inherited from

[ConfigFile](ConfigFile.md).[validateEntry](ConfigFile.md#validateentry)

#### Defined in

[packages/utility/src/config/config.ts:47](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/config.ts#L47)
