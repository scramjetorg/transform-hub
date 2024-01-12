[@scramjet/types](../README.md) / [Exports](../modules.md) / IMonitoringServerConf

# Interface: IMonitoringServerConf

## Table of contents

### Properties

- [config](IMonitoringServerConf.md#config)
- [host](IMonitoringServerConf.md#host)
- [isValidConfig](IMonitoringServerConf.md#isvalidconfig)
- [path](IMonitoringServerConf.md#path)
- [port](IMonitoringServerConf.md#port)

### Methods

- [validate](IMonitoringServerConf.md#validate)
- [validateEntry](IMonitoringServerConf.md#validateentry)

## Properties

### config

• **config**: [`MonitoringServerConfig`](../modules.md#monitoringserverconfig)

#### Defined in

[packages/types/src/monitoring-server.ts:19](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/monitoring-server.ts#L19)

___

### host

• **host**: `string`

#### Defined in

[packages/types/src/monitoring-server.ts:17](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/monitoring-server.ts#L17)

___

### isValidConfig

• **isValidConfig**: `boolean`

#### Defined in

[packages/types/src/monitoring-server.ts:20](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/monitoring-server.ts#L20)

___

### path

• **path**: `string`

#### Defined in

[packages/types/src/monitoring-server.ts:18](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/monitoring-server.ts#L18)

___

### port

• **port**: `number`

#### Defined in

[packages/types/src/monitoring-server.ts:16](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/monitoring-server.ts#L16)

## Methods

### validate

▸ **validate**(`config`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | `Record`<`string`, `any`\> |

#### Returns

`boolean`

#### Defined in

[packages/types/src/monitoring-server.ts:22](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/monitoring-server.ts#L22)

___

### validateEntry

▸ **validateEntry**(`key`, `value`): ``null`` \| `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |
| `value` | `any` |

#### Returns

``null`` \| `boolean`

#### Defined in

[packages/types/src/monitoring-server.ts:23](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/monitoring-server.ts#L23)
