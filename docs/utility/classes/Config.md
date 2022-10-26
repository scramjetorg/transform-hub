[@scramjet/utility](../README.md) / [Exports](../modules.md) / Config

# Class: Config<Type\>

Modifiable configuration object

## Type parameters

| Name | Type |
| :------ | :------ |
| `Type` | extends `Object` |

## Hierarchy

- **`Config`**

  ↳ [`ConfigFile`](ConfigFile.md)

## Implements

- `Configuration`<`Type`\>

## Table of contents

### Properties

- [configuration](Config.md#configuration)
- [isValidConfig](Config.md#isvalidconfig)

### Constructors

- [constructor](Config.md#constructor)

### Methods

- [deleteEntry](Config.md#deleteentry)
- [get](Config.md#get)
- [getEntry](Config.md#getentry)
- [has](Config.md#has)
- [isValid](Config.md#isvalid)
- [set](Config.md#set)
- [setEntry](Config.md#setentry)
- [validate](Config.md#validate)
- [validateEntry](Config.md#validateentry)

## Properties

### configuration

• `Protected` **configuration**: `Type`

#### Defined in

[packages/utility/src/config/config.ts:7](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/config.ts#L7)

___

### isValidConfig

• `Protected` **isValidConfig**: `boolean`

#### Defined in

[packages/utility/src/config/config.ts:8](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/config.ts#L8)

## Constructors

### constructor

• **new Config**<`Type`\>(`configuration`)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `Type` | extends `Object` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `configuration` | `Type` |

#### Defined in

[packages/utility/src/config/config.ts:10](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/config.ts#L10)

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

#### Implementation of

Configuration.deleteEntry

#### Defined in

[packages/utility/src/config/config.ts:76](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/config.ts#L76)

___

### get

▸ **get**(): `Type`

#### Returns

`Type`

#### Implementation of

Configuration.get

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

#### Implementation of

Configuration.getEntry

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

#### Implementation of

Configuration.has

#### Defined in

[packages/utility/src/config/config.ts:33](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/config.ts#L33)

___

### isValid

▸ **isValid**(): `boolean`

#### Returns

`boolean`

#### Implementation of

Configuration.isValid

#### Defined in

[packages/utility/src/config/config.ts:31](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/config.ts#L31)

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

#### Implementation of

Configuration.set

#### Defined in

[packages/utility/src/config/config.ts:53](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/config.ts#L53)

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

#### Implementation of

Configuration.setEntry

#### Defined in

[packages/utility/src/config/config.ts:65](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/config.ts#L65)

___

### validate

▸ **validate**(`config`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | `Record`<`string`, `any`\> |

#### Returns

`boolean`

#### Implementation of

Configuration.validate

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

#### Defined in

[packages/utility/src/config/config.ts:47](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/config.ts#L47)
