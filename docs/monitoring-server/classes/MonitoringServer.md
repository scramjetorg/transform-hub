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

### Properties

- [serverOptions](MonitoringServer.md#serveroptions)

## Constructors

### constructor

• **new MonitoringServer**(`serverOptions`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `serverOptions` | `MonitoringServerOptions` |

#### Defined in

[monitoring-server/src/monitoring-server.ts:11](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/monitoring-server/src/monitoring-server.ts#L11)

## Methods

### handleHealtzRequest

▸ **handleHealtzRequest**(): `Promise`<`boolean`\>

#### Returns

`Promise`<`boolean`\>

#### Defined in

[monitoring-server/src/monitoring-server.ts:46](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/monitoring-server/src/monitoring-server.ts#L46)

___

### start

▸ **start**(): `Promise`<`MonitoringServerConfig`\>

#### Returns

`Promise`<`MonitoringServerConfig`\>

#### Implementation of

IMonitoringServer.start

#### Defined in

[monitoring-server/src/monitoring-server.ts:50](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/monitoring-server/src/monitoring-server.ts#L50)

## Properties

### serverOptions

• **serverOptions**: `MonitoringServerOptions`

#### Defined in

[monitoring-server/src/monitoring-server.ts:8](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/monitoring-server/src/monitoring-server.ts#L8)
