[@scramjet/utility](../README.md) / [Exports](../modules.md) / ReadOnlyConfigFileDefault

# Class: ReadOnlyConfigFileDefault<Type\>

Configuration object held in file

## Type parameters

| Name | Type |
| :------ | :------ |
| `Type` | extends `Object` |

## Hierarchy

- [`ReadOnlyConfigFile`](ReadOnlyConfigFile.md)<`Type`\>

  ↳ **`ReadOnlyConfigFileDefault`**

## Table of contents

### Properties

- [configuration](ReadOnlyConfigFileDefault.md#configuration)
- [defaultConfiguration](ReadOnlyConfigFileDefault.md#defaultconfiguration)
- [file](ReadOnlyConfigFileDefault.md#file)
- [isValidConfig](ReadOnlyConfigFileDefault.md#isvalidconfig)

### Constructors

- [constructor](ReadOnlyConfigFileDefault.md#constructor)

### Methods

- [fileExist](ReadOnlyConfigFileDefault.md#fileexist)
- [get](ReadOnlyConfigFileDefault.md#get)
- [getDefault](ReadOnlyConfigFileDefault.md#getdefault)
- [getEntry](ReadOnlyConfigFileDefault.md#getentry)
- [has](ReadOnlyConfigFileDefault.md#has)
- [isValid](ReadOnlyConfigFileDefault.md#isvalid)
- [validate](ReadOnlyConfigFileDefault.md#validate)
- [validateEntry](ReadOnlyConfigFileDefault.md#validateentry)

## Properties

### configuration

• `Protected` `Readonly` **configuration**: `Type`

#### Inherited from

[ReadOnlyConfigFile](ReadOnlyConfigFile.md).[configuration](ReadOnlyConfigFile.md#configuration)

#### Defined in

[packages/utility/src/config/readOnlyConfig.ts:7](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/readOnlyConfig.ts#L7)

___

### defaultConfiguration

• `Protected` `Readonly` **defaultConfiguration**: `Type`

#### Defined in

[packages/utility/src/config/readOnlyConfigFileDefault.ts:7](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/readOnlyConfigFileDefault.ts#L7)

___

### file

• `Protected` `Readonly` **file**: [`File`](../interfaces/File.md)

#### Inherited from

[ReadOnlyConfigFile](ReadOnlyConfigFile.md).[file](ReadOnlyConfigFile.md#file)

#### Defined in

[packages/utility/src/config/readOnlyConfigFile.ts:8](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/readOnlyConfigFile.ts#L8)

___

### isValidConfig

• `Protected` `Readonly` **isValidConfig**: `boolean`

#### Inherited from

[ReadOnlyConfigFile](ReadOnlyConfigFile.md).[isValidConfig](ReadOnlyConfigFile.md#isvalidconfig)

#### Defined in

[packages/utility/src/config/readOnlyConfig.ts:8](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/readOnlyConfig.ts#L8)

## Constructors

### constructor

• **new ReadOnlyConfigFileDefault**<`Type`\>(`filePath`, `defaultConf`)

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

[ReadOnlyConfigFile](ReadOnlyConfigFile.md).[constructor](ReadOnlyConfigFile.md#constructor)

#### Defined in

[packages/utility/src/config/readOnlyConfigFileDefault.ts:9](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/readOnlyConfigFileDefault.ts#L9)

## Methods

### fileExist

▸ **fileExist**(): `boolean`

Check if path exists

#### Returns

`boolean`

true if path to config file exists

#### Inherited from

[ReadOnlyConfigFile](ReadOnlyConfigFile.md).[fileExist](ReadOnlyConfigFile.md#fileexist)

#### Defined in

[packages/utility/src/config/readOnlyConfigFile.ts:24](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/readOnlyConfigFile.ts#L24)

___

### get

▸ **get**(): `Type`

#### Returns

`Type`

#### Overrides

[ReadOnlyConfigFile](ReadOnlyConfigFile.md).[get](ReadOnlyConfigFile.md#get)

#### Defined in

[packages/utility/src/config/readOnlyConfigFileDefault.ts:14](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/readOnlyConfigFileDefault.ts#L14)

___

### getDefault

▸ **getDefault**(): `Type`

#### Returns

`Type`

#### Defined in

[packages/utility/src/config/readOnlyConfigFileDefault.ts:19](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/readOnlyConfigFileDefault.ts#L19)

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

[ReadOnlyConfigFile](ReadOnlyConfigFile.md).[getEntry](ReadOnlyConfigFile.md#getentry)

#### Defined in

[packages/utility/src/config/readOnlyConfig.ts:38](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/readOnlyConfig.ts#L38)

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

[ReadOnlyConfigFile](ReadOnlyConfigFile.md).[has](ReadOnlyConfigFile.md#has)

#### Defined in

[packages/utility/src/config/readOnlyConfig.ts:34](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/readOnlyConfig.ts#L34)

___

### isValid

▸ **isValid**(): `boolean`

#### Returns

`boolean`

#### Inherited from

[ReadOnlyConfigFile](ReadOnlyConfigFile.md).[isValid](ReadOnlyConfigFile.md#isvalid)

#### Defined in

[packages/utility/src/config/readOnlyConfigFile.ts:27](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/readOnlyConfigFile.ts#L27)

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

[ReadOnlyConfigFile](ReadOnlyConfigFile.md).[validate](ReadOnlyConfigFile.md#validate)

#### Defined in

[packages/utility/src/config/readOnlyConfig.ts:24](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/readOnlyConfig.ts#L24)

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

[ReadOnlyConfigFile](ReadOnlyConfigFile.md).[validateEntry](ReadOnlyConfigFile.md#validateentry)

#### Defined in

[packages/utility/src/config/readOnlyConfig.ts:48](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/readOnlyConfig.ts#L48)
