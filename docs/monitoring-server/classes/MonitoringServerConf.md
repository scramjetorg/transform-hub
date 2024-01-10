[@scramjet/monitoring-server](../README.md) / [Exports](../modules.md) / MonitoringServerConf

# Class: MonitoringServerConf

## Hierarchy

- `ReadOnlyConfig`<`MonitoringServerConfig`\>

  ↳ **`MonitoringServerConf`**

## Table of contents

### Accessors

- [config](MonitoringServerConf.md#config)
- [errors](MonitoringServerConf.md#errors)
- [host](MonitoringServerConf.md#host)
- [path](MonitoringServerConf.md#path)
- [port](MonitoringServerConf.md#port)

### Properties

- [configuration](MonitoringServerConf.md#configuration)
- [isValidConfig](MonitoringServerConf.md#isvalidconfig)

### Constructors

- [constructor](MonitoringServerConf.md#constructor)

### Methods

- [get](MonitoringServerConf.md#get)
- [getEntry](MonitoringServerConf.md#getentry)
- [has](MonitoringServerConf.md#has)
- [isValid](MonitoringServerConf.md#isvalid)
- [validate](MonitoringServerConf.md#validate)
- [validateEntry](MonitoringServerConf.md#validateentry)
- [validateEntry](MonitoringServerConf.md#validateentry-1)

## Accessors

### config

• `get` **config**(): `MonitoringServerConfig`

#### Returns

`MonitoringServerConfig`

#### Defined in

[monitoring-server/src/config/monitoringConfig.ts:23](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/monitoring-server/src/config/monitoringConfig.ts#L23)

___

### errors

• `get` **errors**(): `ValidationResult`[]

#### Returns

`ValidationResult`[]

#### Defined in

[monitoring-server/src/config/monitoringConfig.ts:20](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/monitoring-server/src/config/monitoringConfig.ts#L20)

___

### host

• `get` **host**(): `undefined` \| `string`

#### Returns

`undefined` \| `string`

#### Defined in

[monitoring-server/src/config/monitoringConfig.ts:14](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/monitoring-server/src/config/monitoringConfig.ts#L14)

___

### path

• `get` **path**(): `undefined` \| `string`

#### Returns

`undefined` \| `string`

#### Defined in

[monitoring-server/src/config/monitoringConfig.ts:17](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/monitoring-server/src/config/monitoringConfig.ts#L17)

___

### port

• `get` **port**(): `number`

#### Returns

`number`

#### Defined in

[monitoring-server/src/config/monitoringConfig.ts:11](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/monitoring-server/src/config/monitoringConfig.ts#L11)

## Properties

### configuration

• `Protected` `Readonly` **configuration**: `MonitoringServerConfig`

#### Inherited from

ReadOnlyConfig.configuration

#### Defined in

[utility/src/config/readOnlyConfig.ts:7](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/readOnlyConfig.ts#L7)

___

### isValidConfig

• `Protected` `Readonly` **isValidConfig**: `boolean`

#### Inherited from

ReadOnlyConfig.isValidConfig

#### Defined in

[utility/src/config/readOnlyConfig.ts:8](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/readOnlyConfig.ts#L8)

## Constructors

### constructor

• **new MonitoringServerConf**(`configuration`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `configuration` | `MonitoringServerConfig` |

#### Inherited from

ReadOnlyConfig<MonitoringServerConfig\>.constructor

#### Defined in

[utility/src/config/readOnlyConfig.ts:10](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/readOnlyConfig.ts#L10)

## Methods

### get

▸ **get**(): `MonitoringServerConfig`

#### Returns

`MonitoringServerConfig`

#### Inherited from

ReadOnlyConfig.get

#### Defined in

[utility/src/config/readOnlyConfig.ts:20](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/readOnlyConfig.ts#L20)

___

### getEntry

▸ **getEntry**(`key`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | keyof `MonitoringServerConfig` |

#### Returns

`any`

#### Inherited from

ReadOnlyConfig.getEntry

#### Defined in

[utility/src/config/readOnlyConfig.ts:38](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/readOnlyConfig.ts#L38)

___

### has

▸ **has**(`key`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | keyof `MonitoringServerConfig` |

#### Returns

`boolean`

#### Inherited from

ReadOnlyConfig.has

#### Defined in

[utility/src/config/readOnlyConfig.ts:34](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/readOnlyConfig.ts#L34)

___

### isValid

▸ **isValid**(): `boolean`

#### Returns

`boolean`

#### Inherited from

ReadOnlyConfig.isValid

#### Defined in

[utility/src/config/readOnlyConfig.ts:30](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/config/readOnlyConfig.ts#L30)

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

[monitoring-server/src/config/monitoringConfig.ts:27](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/monitoring-server/src/config/monitoringConfig.ts#L27)

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

[monitoring-server/src/config/monitoringConfig.ts:33](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/monitoring-server/src/config/monitoringConfig.ts#L33)

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

[monitoring-server/src/config/monitoringConfig.ts:30](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/monitoring-server/src/config/monitoringConfig.ts#L30)
