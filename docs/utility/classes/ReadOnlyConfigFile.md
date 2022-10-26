[@scramjet/utility](../README.md) / [Exports](../modules.md) / ReadOnlyConfigFile

# Class: ReadOnlyConfigFile<Type\>

Configuration object held in file

## Type parameters

| Name | Type |
| :------ | :------ |
| `Type` | extends `Object` |

## Hierarchy

- [`ReadOnlyConfig`](ReadOnlyConfig.md)<`Type`\>

  ↳ **`ReadOnlyConfigFile`**

  ↳↳ [`ReadOnlyConfigFileDefault`](ReadOnlyConfigFileDefault.md)

## Table of contents

### Properties

- [configuration](ReadOnlyConfigFile.md#configuration)
- [file](ReadOnlyConfigFile.md#file)
- [isValidConfig](ReadOnlyConfigFile.md#isvalidconfig)

### Constructors

- [constructor](ReadOnlyConfigFile.md#constructor)

### Methods

- [fileExist](ReadOnlyConfigFile.md#fileexist)
- [get](ReadOnlyConfigFile.md#get)
- [getEntry](ReadOnlyConfigFile.md#getentry)
- [has](ReadOnlyConfigFile.md#has)
- [isValid](ReadOnlyConfigFile.md#isvalid)
- [validate](ReadOnlyConfigFile.md#validate)
- [validateEntry](ReadOnlyConfigFile.md#validateentry)

## Properties

### configuration

• `Protected` `Readonly` **configuration**: `Type`

#### Inherited from

[ReadOnlyConfig](ReadOnlyConfig.md).[configuration](ReadOnlyConfig.md#configuration)

#### Defined in

[packages/utility/src/config/readOnlyConfig.ts:7](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/readOnlyConfig.ts#L7)

___

### file

• `Protected` `Readonly` **file**: [`File`](../interfaces/File.md)

#### Defined in

[packages/utility/src/config/readOnlyConfigFile.ts:8](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/readOnlyConfigFile.ts#L8)

___

### isValidConfig

• `Protected` `Readonly` **isValidConfig**: `boolean`

#### Inherited from

[ReadOnlyConfig](ReadOnlyConfig.md).[isValidConfig](ReadOnlyConfig.md#isvalidconfig)

#### Defined in

[packages/utility/src/config/readOnlyConfig.ts:8](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/readOnlyConfig.ts#L8)

## Constructors

### constructor

• **new ReadOnlyConfigFile**<`Type`\>(`filePath`)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `Type` | extends `Object` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `filePath` | `string` |

#### Overrides

[ReadOnlyConfig](ReadOnlyConfig.md).[constructor](ReadOnlyConfig.md#constructor)

#### Defined in

[packages/utility/src/config/readOnlyConfigFile.ts:10](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/readOnlyConfigFile.ts#L10)

## Methods

### fileExist

▸ **fileExist**(): `boolean`

Check if path exists

#### Returns

`boolean`

true if path to config file exists

#### Defined in

[packages/utility/src/config/readOnlyConfigFile.ts:24](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/readOnlyConfigFile.ts#L24)

___

### get

▸ **get**(): `Type`

#### Returns

`Type`

#### Inherited from

[ReadOnlyConfig](ReadOnlyConfig.md).[get](ReadOnlyConfig.md#get)

#### Defined in

[packages/utility/src/config/readOnlyConfig.ts:20](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/readOnlyConfig.ts#L20)

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

[ReadOnlyConfig](ReadOnlyConfig.md).[getEntry](ReadOnlyConfig.md#getentry)

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

[ReadOnlyConfig](ReadOnlyConfig.md).[has](ReadOnlyConfig.md#has)

#### Defined in

[packages/utility/src/config/readOnlyConfig.ts:34](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/readOnlyConfig.ts#L34)

___

### isValid

▸ **isValid**(): `boolean`

#### Returns

`boolean`

#### Overrides

[ReadOnlyConfig](ReadOnlyConfig.md).[isValid](ReadOnlyConfig.md#isvalid)

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

[ReadOnlyConfig](ReadOnlyConfig.md).[validate](ReadOnlyConfig.md#validate)

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

[ReadOnlyConfig](ReadOnlyConfig.md).[validateEntry](ReadOnlyConfig.md#validateentry)

#### Defined in

[packages/utility/src/config/readOnlyConfig.ts:48](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/readOnlyConfig.ts#L48)
