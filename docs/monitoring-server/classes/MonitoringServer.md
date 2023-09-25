[@scramjet/monitoring-server](../README.md) / [Exports](../modules.md) / MonitoringServer

# Class: MonitoringServer

## Implements

- `IMonitoringServer`

## Table of contents

### Constructors

- [constructor](MonitoringServer.md#constructor)

### Methods

- [handleHealtzRequest](MonitoringServer.md#handlehealtzrequest)
- [start](MonitoringServer.md#start)

## Constructors

### constructor

• **new MonitoringServer**(`options`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | `MonitoringServerOptions` |

#### Defined in

[monitoring-server.ts:9](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/monitoring-server/src/monitoring-server.ts#L9)

## Methods

### handleHealtzRequest

▸ **handleHealtzRequest**(): `Promise`<`boolean`\>

#### Returns

`Promise`<`boolean`\>

#### Defined in

[monitoring-server.ts:31](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/monitoring-server/src/monitoring-server.ts#L31)

___

### start

▸ **start**(): `Promise`<`MonitoringServerConfig`\>

#### Returns

`Promise`<`MonitoringServerConfig`\>

#### Implementation of

IMonitoringServer.start

#### Defined in

[monitoring-server.ts:35](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/monitoring-server/src/monitoring-server.ts#L35)
