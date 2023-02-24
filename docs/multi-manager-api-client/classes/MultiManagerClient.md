[@scramjet/multi-manager-api-client](../README.md) / [Exports](../modules.md) / MultiManagerClient

# Class: MultiManagerClient

## Implements

- `ClientProvider`

## Table of contents

### Properties

- [apiBase](MultiManagerClient.md#apibase)
- [client](MultiManagerClient.md#client)

### Constructors

- [constructor](MultiManagerClient.md#constructor)

### Methods

- [getInfo](MultiManagerClient.md#getinfo)
- [getLoad](MultiManagerClient.md#getload)
- [getLogStream](MultiManagerClient.md#getlogstream)
- [getManagerClient](MultiManagerClient.md#getmanagerclient)
- [getManagers](MultiManagerClient.md#getmanagers)
- [getVersion](MultiManagerClient.md#getversion)
- [startManager](MultiManagerClient.md#startmanager)

## Properties

### apiBase

• **apiBase**: `string`

#### Defined in

[multi-cpm-client.ts:8](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/multi-manager-api-client/src/multi-cpm-client.ts#L8)

___

### client

• **client**: `HttpClientNode`

#### Implementation of

ClientProvider.client

#### Defined in

[multi-cpm-client.ts:7](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/multi-manager-api-client/src/multi-cpm-client.ts#L7)

## Constructors

### constructor

• **new MultiManagerClient**(`apiBase`, `utils?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `apiBase` | `string` |
| `utils` | `ClientUtils` |

#### Defined in

[multi-cpm-client.ts:10](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/multi-manager-api-client/src/multi-cpm-client.ts#L10)

## Methods

### getInfo

▸ **getInfo**(): `Promise`<`GetInfoReposnse`\>

#### Returns

`Promise`<`GetInfoReposnse`\>

#### Defined in

[multi-cpm-client.ts:51](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/multi-manager-api-client/src/multi-cpm-client.ts#L51)

___

### getLoad

▸ **getLoad**(): `Promise`<`LoadCheckStat`\>

#### Returns

`Promise`<`LoadCheckStat`\>

#### Defined in

[multi-cpm-client.ts:43](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/multi-manager-api-client/src/multi-cpm-client.ts#L43)

___

### getLogStream

▸ **getLogStream**(): `Promise`<`Readable`\>

#### Returns

`Promise`<`Readable`\>

#### Defined in

[multi-cpm-client.ts:47](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/multi-manager-api-client/src/multi-cpm-client.ts#L47)

___

### getManagerClient

▸ **getManagerClient**(`id`, `managerApiBase?`): `ManagerClient`

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `id` | `string` | `undefined` |
| `managerApiBase` | `string` | `"/api/v1"` |

#### Returns

`ManagerClient`

#### Defined in

[multi-cpm-client.ts:16](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/multi-manager-api-client/src/multi-cpm-client.ts#L16)

___

### getManagers

▸ **getManagers**(): `Promise`<`GetManagersResponse`\>

#### Returns

`Promise`<`GetManagersResponse`\>

#### Defined in

[multi-cpm-client.ts:35](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/multi-manager-api-client/src/multi-cpm-client.ts#L35)

___

### getVersion

▸ **getVersion**(): `Promise`<`GetVersionResponse`\>

#### Returns

`Promise`<`GetVersionResponse`\>

#### Defined in

[multi-cpm-client.ts:39](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/multi-manager-api-client/src/multi-cpm-client.ts#L39)

___

### startManager

▸ **startManager**(`config`, `managersApiBase?`): `Promise`<`ManagerClient`\>

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `config` | `DeepPartial`<`ManagerConfiguration`\> | `undefined` |
| `managersApiBase` | `string` | `"/api/v1"` |

#### Returns

`Promise`<`ManagerClient`\>

#### Defined in

[multi-cpm-client.ts:20](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/multi-manager-api-client/src/multi-cpm-client.ts#L20)
