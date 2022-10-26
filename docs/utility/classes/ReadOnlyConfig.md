[@scramjet/utility](../README.md) / [Exports](../modules.md) / ReadOnlyConfig

# Class: ReadOnlyConfig<Type\>

Read only configuration object

## Type parameters

| Name | Type |
| :------ | :------ |
| `Type` | extends `Object` |

## Hierarchy

- **`ReadOnlyConfig`**

  ↳ [`ReadOnlyConfigFile`](ReadOnlyConfigFile.md)

## Implements

- `ReadOnlyConfiguration`<`Type`\>

## Table of contents

### Properties

- [configuration](ReadOnlyConfig.md#configuration)
- [isValidConfig](ReadOnlyConfig.md#isvalidconfig)

### Constructors

- [constructor](ReadOnlyConfig.md#constructor)

### Methods

- [get](ReadOnlyConfig.md#get)
- [getEntry](ReadOnlyConfig.md#getentry)
- [has](ReadOnlyConfig.md#has)
- [isValid](ReadOnlyConfig.md#isvalid)
- [validate](ReadOnlyConfig.md#validate)
- [validateEntry](ReadOnlyConfig.md#validateentry)

## Properties

### configuration

• `Protected` `Readonly` **configuration**: `Type`

#### Defined in

[packages/utility/src/config/readOnlyConfig.ts:7](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/readOnlyConfig.ts#L7)

___

### isValidConfig

• `Protected` `Readonly` **isValidConfig**: `boolean`

#### Defined in

[packages/utility/src/config/readOnlyConfig.ts:8](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/readOnlyConfig.ts#L8)

## Constructors

### constructor

• **new ReadOnlyConfig**<`Type`\>(`configuration`)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `Type` | extends `Object` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `configuration` | `Type` |

#### Defined in

[packages/utility/src/config/readOnlyConfig.ts:10](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/readOnlyConfig.ts#L10)

## Methods

### get

▸ **get**(): `Type`

#### Returns

`Type`

#### Implementation of

ReadOnlyConfiguration.get

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

#### Implementation of

ReadOnlyConfiguration.getEntry

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

#### Implementation of

ReadOnlyConfiguration.has

#### Defined in

[packages/utility/src/config/readOnlyConfig.ts:34](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/readOnlyConfig.ts#L34)

___

### isValid

▸ **isValid**(): `boolean`

#### Returns

`boolean`

#### Implementation of

ReadOnlyConfiguration.isValid

#### Defined in

[packages/utility/src/config/readOnlyConfig.ts:32](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/readOnlyConfig.ts#L32)

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

ReadOnlyConfiguration.validate

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

#### Defined in

[packages/utility/src/config/readOnlyConfig.ts:48](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/readOnlyConfig.ts#L48)
