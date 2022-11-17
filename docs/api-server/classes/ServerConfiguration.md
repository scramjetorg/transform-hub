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

### Accessors

- [errors](ServerConfiguration.md#errors)
- [router](ServerConfiguration.md#router)
- [schemaValidator](ServerConfiguration.md#schemavalidator)
- [server](ServerConfiguration.md#server)
- [sslCertPath](ServerConfiguration.md#sslcertpath)
- [sslKeyPath](ServerConfiguration.md#sslkeypath)
- [verbose](ServerConfiguration.md#verbose)

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

## Accessors

### errors

• `get` **errors**(): `ValidationResult`[]

#### Returns

`ValidationResult`[]

#### Defined in

[packages/api-server/src/config/ServerConfiguration.ts:43](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-server/src/config/ServerConfiguration.ts#L43)

___

### router

• `get` **router**(): `undefined` \| [`CeroRouter`](../interfaces/CeroRouter.md)

#### Returns

`undefined` \| [`CeroRouter`](../interfaces/CeroRouter.md)

#### Defined in

[packages/api-server/src/config/ServerConfiguration.ts:40](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-server/src/config/ServerConfiguration.ts#L40)

___

### schemaValidator

• `Static` `get` **schemaValidator**(): `SchemaValidator`

#### Returns

`SchemaValidator`

#### Defined in

[packages/api-server/src/config/ServerConfiguration.ts:46](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-server/src/config/ServerConfiguration.ts#L46)

___

### server

• `get` **server**(): `undefined` \| `Server` \| `Server`

#### Returns

`undefined` \| `Server` \| `Server`

#### Defined in

[packages/api-server/src/config/ServerConfiguration.ts:31](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-server/src/config/ServerConfiguration.ts#L31)

___

### sslCertPath

• `get` **sslCertPath**(): `undefined` \| `string`

#### Returns

`undefined` \| `string`

#### Defined in

[packages/api-server/src/config/ServerConfiguration.ts:37](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-server/src/config/ServerConfiguration.ts#L37)

___

### sslKeyPath

• `get` **sslKeyPath**(): `undefined` \| `string`

#### Returns

`undefined` \| `string`

#### Defined in

[packages/api-server/src/config/ServerConfiguration.ts:34](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-server/src/config/ServerConfiguration.ts#L34)

___

### verbose

• `get` **verbose**(): `undefined` \| `boolean`

#### Returns

`undefined` \| `boolean`

#### Defined in

[packages/api-server/src/config/ServerConfiguration.ts:28](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-server/src/config/ServerConfiguration.ts#L28)

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

[packages/utility/src/config/readOnlyConfig.ts:30](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/readOnlyConfig.ts#L30)

___

### validate

▸ **validate**(`config`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | `Record`<`string`, `any`\> |

#### Returns

`boolean`

#### Overrides

ReadOnlyConfig.validate

#### Defined in

[packages/api-server/src/config/ServerConfiguration.ts:49](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-server/src/config/ServerConfiguration.ts#L49)

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

[packages/api-server/src/config/ServerConfiguration.ts:55](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-server/src/config/ServerConfiguration.ts#L55)

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

[packages/api-server/src/config/ServerConfiguration.ts:52](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/api-server/src/config/ServerConfiguration.ts#L52)
