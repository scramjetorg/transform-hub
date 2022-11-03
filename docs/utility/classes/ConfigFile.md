[@scramjet/utility](../README.md) / [Exports](../modules.md) / ConfigFile

# Class: ConfigFile<Type\>

Modifiable configuration object held in file

## Type parameters

| Name | Type |
| :------ | :------ |
| `Type` | extends `Object` |

## Hierarchy

- [`Config`](Config.md)<`Type`\>

  ↳ **`ConfigFile`**

  ↳↳ [`ConfigFileDefault`](ConfigFileDefault.md)

## Table of contents

### Properties

- [configuration](ConfigFile.md#configuration)
- [file](ConfigFile.md#file)
- [isValidConfig](ConfigFile.md#isvalidconfig)

### Constructors

- [constructor](ConfigFile.md#constructor)

### Methods

- [deleteEntry](ConfigFile.md#deleteentry)
- [fileExist](ConfigFile.md#fileexist)
- [get](ConfigFile.md#get)
- [getEntry](ConfigFile.md#getentry)
- [has](ConfigFile.md#has)
- [isValid](ConfigFile.md#isvalid)
- [set](ConfigFile.md#set)
- [setEntry](ConfigFile.md#setentry)
- [validate](ConfigFile.md#validate)
- [validateEntry](ConfigFile.md#validateentry)

## Properties

### configuration

• `Protected` **configuration**: `Type`

#### Inherited from

[Config](Config.md).[configuration](Config.md#configuration)

#### Defined in

[packages/utility/src/config/config.ts:7](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/config.ts#L7)

___

### file

• `Protected` **file**: [`File`](../interfaces/File.md)

#### Defined in

[packages/utility/src/config/configFile.ts:8](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/configFile.ts#L8)

___

### isValidConfig

• `Protected` **isValidConfig**: `boolean`

#### Inherited from

[Config](Config.md).[isValidConfig](Config.md#isvalidconfig)

#### Defined in

[packages/utility/src/config/config.ts:8](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/config.ts#L8)

## Constructors

### constructor

• **new ConfigFile**<`Type`\>(`filePath`, `defaultConfig?`)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `Type` | extends `Object` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `filePath` | `string` |
| `defaultConfig` | `Type` |

#### Overrides

[Config](Config.md).[constructor](Config.md#constructor)

#### Defined in

[packages/utility/src/config/configFile.ts:10](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/configFile.ts#L10)

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

#### Overrides

[Config](Config.md).[deleteEntry](Config.md#deleteentry)

#### Defined in

[packages/utility/src/config/configFile.ts:48](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/configFile.ts#L48)

___

### fileExist

▸ **fileExist**(): `boolean`

Check if path exists

#### Returns

`boolean`

true if path to config file exists

#### Defined in

[packages/utility/src/config/configFile.ts:26](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/configFile.ts#L26)

___

### get

▸ **get**(): `Type`

#### Returns

`Type`

#### Inherited from

[Config](Config.md).[get](Config.md#get)

#### Defined in

[packages/utility/src/config/config.ts:19](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/config.ts#L19)

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

[Config](Config.md).[getEntry](Config.md#getentry)

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

[Config](Config.md).[has](Config.md#has)

#### Defined in

[packages/utility/src/config/config.ts:33](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/config.ts#L33)

___

### isValid

▸ **isValid**(): `boolean`

#### Returns

`boolean`

#### Overrides

[Config](Config.md).[isValid](Config.md#isvalid)

#### Defined in

[packages/utility/src/config/configFile.ts:29](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/configFile.ts#L29)

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

#### Overrides

[Config](Config.md).[set](Config.md#set)

#### Defined in

[packages/utility/src/config/configFile.ts:40](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/configFile.ts#L40)

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

#### Overrides

[Config](Config.md).[setEntry](Config.md#setentry)

#### Defined in

[packages/utility/src/config/configFile.ts:44](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/configFile.ts#L44)

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

[Config](Config.md).[validate](Config.md#validate)

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

[Config](Config.md).[validateEntry](Config.md#validateentry)

#### Defined in

[packages/utility/src/config/config.ts:47](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/config.ts#L47)
