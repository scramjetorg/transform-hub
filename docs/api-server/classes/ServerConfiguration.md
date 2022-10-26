[@scramjet/api-server](../README.md) / [Modules](../modules.md) / ServerConfiguration

# Class: ServerConfiguration

## Hierarchy

- `ReadOnlyConfig`<[`ServerConfig`](../modules.md#serverconfig)\>

  ↳ **`ServerConfiguration`**

## Table of contents

### Properties

- [configuration](ServerConfiguration.md#configuration)
- [isValidConfig](ServerConfiguration.md#isvalidconfig)

### Constructors

- [constructor](ServerConfiguration.md#constructor)

### Methods

- [get](ServerConfiguration.md#get)
- [getEntry](ServerConfiguration.md#getentry)
- [has](ServerConfiguration.md#has)
- [isValid](ServerConfiguration.md#isvalid)
- [validate](ServerConfiguration.md#validate)
- [validateEntry](ServerConfiguration.md#validateentry)
- [validateEntry](ServerConfiguration.md#validateentry-1)

## Properties

### configuration

• `Protected` `Readonly` **configuration**: [`ServerConfig`](../modules.md#serverconfig)

#### Inherited from

ReadOnlyConfig.configuration

#### Defined in

[packages/utility/src/config/readOnlyConfig.ts:7](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/readOnlyConfig.ts#L7)

___

### isValidConfig

• `Protected` `Readonly` **isValidConfig**: `boolean`

#### Inherited from

ReadOnlyConfig.isValidConfig

#### Defined in

[packages/utility/src/config/readOnlyConfig.ts:8](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/readOnlyConfig.ts#L8)

## Constructors

### constructor

• **new ServerConfiguration**(`configuration`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `configuration` | [`ServerConfig`](../modules.md#serverconfig) |

#### Inherited from

ReadOnlyConfig<ServerConfig\>.constructor

#### Defined in

[packages/utility/src/config/readOnlyConfig.ts:10](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/readOnlyConfig.ts#L10)

## Methods

### get

▸ **get**(): [`ServerConfig`](../modules.md#serverconfig)

#### Returns

[`ServerConfig`](../modules.md#serverconfig)

#### Inherited from

ReadOnlyConfig.get

#### Defined in

[packages/utility/src/config/readOnlyConfig.ts:20](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/readOnlyConfig.ts#L20)

___

### getEntry

▸ **getEntry**(`key`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | keyof [`ServerConfig`](../modules.md#serverconfig) |

#### Returns

`any`

#### Inherited from

ReadOnlyConfig.getEntry

#### Defined in

[packages/utility/src/config/readOnlyConfig.ts:38](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/readOnlyConfig.ts#L38)

___

### has

▸ **has**(`key`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | keyof [`ServerConfig`](../modules.md#serverconfig) |

#### Returns

`boolean`

#### Inherited from

ReadOnlyConfig.has

#### Defined in

[packages/utility/src/config/readOnlyConfig.ts:34](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/readOnlyConfig.ts#L34)

___

### isValid

▸ **isValid**(): `boolean`

#### Returns

`boolean`

#### Inherited from

ReadOnlyConfig.isValid

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

#### Inherited from

ReadOnlyConfig.validate

#### Defined in

[packages/utility/src/config/readOnlyConfig.ts:24](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/readOnlyConfig.ts#L24)

___

### validateEntry

▸ `Static` **validateEntry**(`key`, `value`): ``null`` \| `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |
| `value` | `any` |

#### Returns

``null`` \| `boolean`

#### Defined in

[packages/api-server/src/config/ServerConfiguration.ts:9](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-server/src/config/ServerConfiguration.ts#L9)

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

ReadOnlyConfig.validateEntry

#### Defined in

[packages/api-server/src/config/ServerConfiguration.ts:5](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-server/src/config/ServerConfiguration.ts#L5)
